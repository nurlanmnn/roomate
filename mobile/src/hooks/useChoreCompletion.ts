import { useCallback } from 'react';
import { Alert } from 'react-native';
import { format, startOfWeek } from 'date-fns';
import type { Event } from '../api/eventsApi';
import { choresApi, ChoreRotation } from '../api/choresApi';
import {
  getChorePeriodStart,
  getChoreCompletionForDate,
} from '../utils/choreSchedule';
import { updateCached, invalidateCache } from '../utils/queryCache';

type CalendarSnapshot = { events: Event[]; chores: ChoreRotation[] };

export type ChoreCompletionCachePrefix = 'calendar' | 'chores';

const weekKeyForNow = () =>
  format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

export function useChoreCompletion(options: {
  selectedHousehold: { _id: string } | null;
  user: { _id: string } | null;
  setChores: React.Dispatch<React.SetStateAction<ChoreRotation[]>>;
  t: (key: string, params?: Record<string, string>) => string;
  cacheKeyPrefix: ChoreCompletionCachePrefix;
}) {
  const { selectedHousehold, user, setChores, t, cacheKeyPrefix } = options;

  const handleToggleChoreComplete = useCallback(
    async (chore: ChoreRotation, forDate: Date = new Date()) => {
      if (!selectedHousehold || !user) return;

      const periodStart = getChorePeriodStart(chore, forDate);
      if (!periodStart) return;

      const periodStartIso = periodStart.toISOString();
      const completion = getChoreCompletionForDate(chore, forDate);
      const wasCompleted = completion !== null;

      const todayPeriodStart = getChorePeriodStart(chore, new Date());
      const isCurrentPeriod =
        todayPeriodStart !== null &&
        todayPeriodStart.getTime() === periodStart.getTime();

      const patchOne = (c: ChoreRotation): ChoreRotation => {
        if (c._id !== chore._id) return c;
        const existing = c.completions ?? [];
        const withoutThis = existing.filter(
          (rec) =>
            new Date(rec.periodStart).getTime() !==
            new Date(periodStartIso).getTime()
        );
        return {
          ...c,
          ...(isCurrentPeriod ? { currentPeriodCompleted: !wasCompleted } : {}),
          completions: wasCompleted
            ? withoutThis
            : [
                ...withoutThis,
                {
                  periodStart: periodStartIso,
                  completedBy: user._id,
                  completedAt: new Date().toISOString(),
                },
              ],
        };
      };

      setChores((prev) => prev.map(patchOne));

      const weekKey = weekKeyForNow();
      const cacheKey = `${cacheKeyPrefix}:${selectedHousehold._id}:${weekKey}`;

      if (cacheKeyPrefix === 'calendar') {
        updateCached<CalendarSnapshot>(cacheKey, (prev) => ({
          ...prev,
          chores: prev.chores.map(patchOne),
        }));
      } else {
        updateCached<ChoreRotation[]>(cacheKey, (prev) => prev.map(patchOne));
      }

      try {
        const updated = wasCompleted
          ? await choresApi.markIncomplete(chore._id, periodStartIso)
          : await choresApi.markComplete(chore._id, periodStartIso);

        const replaceOne = (c: ChoreRotation): ChoreRotation =>
          c._id === updated._id ? { ...c, ...updated } : c;
        setChores((prev) => prev.map(replaceOne));

        if (cacheKeyPrefix === 'calendar') {
          updateCached<CalendarSnapshot>(cacheKey, (prev) => ({
            ...prev,
            chores: prev.chores.map(replaceOne),
          }));
          invalidateCache(`home:dashboard:${selectedHousehold._id}`);
        } else {
          updateCached<ChoreRotation[]>(cacheKey, (prev) => prev.map(replaceOne));
          invalidateCache(`calendar:${selectedHousehold._id}`);
        }
      } catch (error: any) {
        const rollback = (c: ChoreRotation): ChoreRotation =>
          c._id === chore._id ? chore : c;
        setChores((prev) => prev.map(rollback));

        if (cacheKeyPrefix === 'calendar') {
          updateCached<CalendarSnapshot>(cacheKey, (prev) => ({
            ...prev,
            chores: prev.chores.map(rollback),
          }));
        } else {
          updateCached<ChoreRotation[]>(cacheKey, (prev) => prev.map(rollback));
        }

        Alert.alert(
          t('common.error'),
          error?.response?.data?.error || t('alerts.somethingWentWrong')
        );
      }
    },
    [selectedHousehold, user, t, cacheKeyPrefix]
  );

  return { handleToggleChoreComplete };
}
