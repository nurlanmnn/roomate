import { format, startOfWeek } from 'date-fns';
import type { Locale } from 'date-fns';
import type { ChoreCompletion, ChoreRotation, ChoreRotationMember, PeriodOverride } from '../api/choresApi';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Monday 00:00 of the calendar week containing `startDate`. */
function getRotationAnchor(startDate: Date): Date {
  const anchor = startOfWeek(startDate, { weekStartsOn: 1 });
  anchor.setHours(0, 0, 0, 0);
  return anchor;
}

/**
 * Midnight of the first day of the rotation period that contains `date`.
 * Returns null when `date` is before the rotation anchor week. Matches the
 * backend's `getPeriodStartForDate` so client-side completion lookups align
 * with the records persisted on the server.
 */
export const getChorePeriodStart = (
  chore: ChoreRotation,
  date: Date
): Date | null => {
  const start = getRotationAnchor(new Date(chore.startDate));
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  if (daysSinceStart < 0) return null;
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const periodIndex = Math.floor(daysSinceStart / periodDays);
  return new Date(start.getTime() + periodIndex * periodDays * MS_PER_DAY);
};

function findCompletionForPeriodStart(
  chore: ChoreRotation,
  periodStart: Date
): ChoreCompletion | null {
  const target = periodStart.getTime();
  return (
    (chore.completions ?? []).find((c) => {
      const cs = new Date(c.periodStart);
      cs.setHours(0, 0, 0, 0);
      return cs.getTime() === target;
    }) ?? null
  );
}

export const getChoreCompletionForDate = (
  chore: ChoreRotation,
  date: Date
): ChoreCompletion | null => {
  const periodStart = getChorePeriodStart(chore, date);
  if (!periodStart) return null;
  return findCompletionForPeriodStart(chore, periodStart);
};

/**
 * True when the period containing `date` has a matching completion record.
 * Used to suppress "your turn" UI (dots, selected-day row) once the chore is
 * ticked off, regardless of who in the household actually marked it.
 */
export const isPeriodCompleted = (chore: ChoreRotation, date: Date): boolean =>
  getChoreCompletionForDate(chore, date) !== null;

export const getOverrideForPeriod = (
  chore: ChoreRotation,
  periodStart: Date
): PeriodOverride | null => {
  const target = periodStart.getTime();
  return (
    (chore.periodOverrides ?? []).find((o) => {
      const ps = new Date(o.periodStart);
      ps.setHours(0, 0, 0, 0);
      return ps.getTime() === target;
    }) ?? null
  );
};

/**
 * Resolves the rotation assignee for `date`. Returns null when the rotation
 * hasn't started yet on that date — this is important for UI surfaces like
 * the calendar grid, which should NOT paint dates before `startDate` (those
 * days aren't actually assigned to anyone).
 *
 * Note: the backend's `currentAssignee` field separately clamps pre-start
 * lookups to period 0 for the "this week" summary, but we intentionally
 * diverge here so per-day markers only reflect real, scheduled periods.
 */
export const getChoreAssigneeAt = (
  chore: ChoreRotation,
  date: Date
): ChoreRotationMember | null => {
  const order = chore.rotationOrder;
  if (!order || order.length === 0) return null;
  const start = getRotationAnchor(new Date(chore.startDate));
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  if (daysSinceStart < 0) return null;
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const periodIndex = Math.floor(daysSinceStart / periodDays);
  const defaultAssignee = order[periodIndex % order.length];

  const periodStart = new Date(start.getTime() + periodIndex * periodDays * MS_PER_DAY);
  const override = getOverrideForPeriod(chore, periodStart);
  if (override) {
    return (
      order.find((m) => m._id === override.assigneeId) ?? {
        _id: override.assigneeId,
        name: '?',
      }
    );
  }

  return defaultAssignee;
};

/**
 * The inclusive start and exclusive end of the rotation period that contains
 * `date`. Returns null when `date` is before the rotation's `startDate`.
 */
export const getChorePeriodBounds = (
  chore: ChoreRotation,
  date: Date
): { start: Date; end: Date } | null => {
  const start = getRotationAnchor(new Date(chore.startDate));
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  if (daysSinceStart < 0) return null;
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const periodIndex = Math.floor(daysSinceStart / periodDays);
  const periodStart = new Date(start.getTime() + periodIndex * periodDays * MS_PER_DAY);
  const periodEnd = new Date(periodStart.getTime() + periodDays * MS_PER_DAY);
  return { start: periodStart, end: periodEnd };
};

export const isChorePeriodOverdue = (chore: ChoreRotation, date: Date): boolean => {
  const bounds = getChorePeriodBounds(chore, date);
  if (!bounds) return false;
  if (isPeriodCompleted(chore, date)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= bounds.end.getTime();
};

export const formatChorePeriodRange = (
  start: Date,
  end: Date,
  locale?: Locale
): string => {
  const lastDay = new Date(end.getTime() - MS_PER_DAY);
  const sameMonth = start.getMonth() === lastDay.getMonth();
  if (sameMonth) {
    return `${format(start, 'MMM d', { locale })} – ${format(lastDay, 'd', { locale })}`;
  }
  return `${format(start, 'MMM d', { locale })} – ${format(lastDay, 'MMM d', { locale })}`;
};

export const getUpcomingAssignees = (
  chore: ChoreRotation,
  fromDate: Date,
  count: number,
  locale?: Locale
): Array<{ periodStart: Date; label: string; assignee: ChoreRotationMember }> => {
  const results: Array<{ periodStart: Date; label: string; assignee: ChoreRotationMember }> = [];
  let cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);

  const currentBounds = getChorePeriodBounds(chore, fromDate);
  if (!currentBounds) return [];
  cursor = new Date(currentBounds.end);

  while (results.length < count) {
    const assignee = getChoreAssigneeAt(chore, cursor);
    const bounds = getChorePeriodBounds(chore, cursor);
    if (!assignee || !bounds) break;
    const dateLabel = format(bounds.start, 'MMM d', { locale });
    results.push({ periodStart: bounds.start, label: `${assignee.name} (${dateLabel})`, assignee });
    cursor = new Date(bounds.end);
  }
  return results;
};
