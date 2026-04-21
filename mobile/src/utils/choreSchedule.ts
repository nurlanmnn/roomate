import type { ChoreRotation, ChoreRotationMember } from '../api/choresApi';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Midnight of the first day of the rotation period that contains `date`.
 * Returns null when `date` is before the rotation's `startDate`. Matches the
 * backend's `getPeriodStartForDate` so client-side completion lookups align
 * with the records persisted on the server.
 */
export const getChorePeriodStart = (
  chore: ChoreRotation,
  date: Date
): Date | null => {
  const start = new Date(chore.startDate);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  if (daysSinceStart < 0) return null;
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const periodIndex = Math.floor(daysSinceStart / periodDays);
  return new Date(start.getTime() + periodIndex * periodDays * MS_PER_DAY);
};

/**
 * True when the period containing `date` has a matching completion record.
 * Used to suppress "your turn" UI (dots, selected-day row) once the chore is
 * ticked off, regardless of who in the household actually marked it.
 */
export const isPeriodCompleted = (chore: ChoreRotation, date: Date): boolean => {
  const periodStart = getChorePeriodStart(chore, date);
  if (!periodStart) return false;
  const target = periodStart.getTime();
  const completions = chore.completions ?? [];
  return completions.some((c) => {
    const cs = new Date(c.periodStart);
    cs.setHours(0, 0, 0, 0);
    return cs.getTime() === target;
  });
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
  const start = new Date(chore.startDate);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  if (daysSinceStart < 0) return null;
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const periodIndex = Math.floor(daysSinceStart / periodDays);
  return order[periodIndex % order.length];
};

/**
 * The inclusive start and exclusive end of the rotation period that contains
 * `date`. Returns null when `date` is before the rotation's `startDate`.
 */
export const getChorePeriodBounds = (
  chore: ChoreRotation,
  date: Date
): { start: Date; end: Date } | null => {
  const start = new Date(chore.startDate);
  start.setHours(0, 0, 0, 0);
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
