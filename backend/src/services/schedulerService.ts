import { Expense } from '../models/Expense';
import { Settlement } from '../models/Settlement';
import { Event } from '../models/Event';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { NotificationLog } from '../models/NotificationLog';
import { computeBalances } from '../utils/balances';
import { notificationService } from './notificationService';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour
const EVENT_REMINDER_MINUTES = 60;
const EVENT_REMINDER_DEDUPE_HOURS = 12;
const DEBT_REMINDER_DAYS = 7;
/** Don't bother pinging anyone for sub-dollar debts — likely rounding noise. */
const DEBT_REMINDER_MIN_AMOUNT = 1;

const recordSent = async (key: string): Promise<void> => {
  await NotificationLog.updateOne(
    { key },
    { $set: { lastSentAt: new Date() } },
    { upsert: true }
  );
};

/**
 * Batch variant of the old per-key `wasRecentlySent`: given candidate keys,
 * return the subset that are NOT within their dedupe window using a single
 * `$in` query instead of one round trip per key.
 */
const filterKeysDue = async (keys: string[], withinMs: number): Promise<Set<string>> => {
  if (keys.length === 0) return new Set();
  const logs = await NotificationLog.find({ key: { $in: keys } })
    .select('key lastSentAt')
    .lean();
  const lastSentByKey = new Map<string, number>();
  for (const log of logs) {
    lastSentByKey.set(log.key, new Date(log.lastSentAt).getTime());
  }
  const now = Date.now();
  const due = new Set<string>();
  for (const key of keys) {
    const last = lastSentByKey.get(key);
    if (last === undefined || now - last >= withinMs) {
      due.add(key);
    }
  }
  return due;
};

class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    console.log('Starting notification scheduler...');
    this.runScheduledTasks();
    this.intervalId = setInterval(() => {
      this.runScheduledTasks();
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Notification scheduler stopped');
    }
  }

  private async runScheduledTasks(): Promise<void> {
    try {
      await Promise.all([this.sendEventReminders(), this.sendDebtReminders()]);
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  }

  /**
   * Send a 1-hour-ahead reminder for any upcoming event. Per-event 12h
   * dedupe via NotificationLog so we don't re-send on every tick.
   */
  private async sendEventReminders(): Promise<void> {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + EVENT_REMINDER_MINUTES * 60 * 1000);

      const upcomingEvents = await Event.find({
        date: { $gt: now, $lte: reminderTime },
      })
        .select('title date householdId')
        .lean();
      if (upcomingEvents.length === 0) return;

      // One query to find which events are still within their dedupe window.
      const dueKeys = await filterKeysDue(
        upcomingEvents.map((e) => `event:${e._id}`),
        EVENT_REMINDER_DEDUPE_HOURS * 60 * 60 * 1000
      );
      const dueEvents = upcomingEvents.filter((e) => dueKeys.has(`event:${e._id}`));
      if (dueEvents.length === 0) return;

      // One query to load every household referenced by the due events.
      const householdIds = Array.from(
        new Set(dueEvents.map((e) => e.householdId.toString()))
      );
      const households = await Household.find({ _id: { $in: householdIds } })
        .select('members name')
        .lean();
      const householdById = new Map(households.map((h) => [h._id.toString(), h]));

      for (const event of dueEvents) {
        const household = householdById.get(event.householdId.toString());
        if (!household) continue;

        const minutesUntil = Math.round(
          (new Date(event.date).getTime() - now.getTime()) / (1000 * 60)
        );

        await notificationService.notifyEventReminder(
          household.members.map((m) => m.toString()),
          event.title,
          minutesUntil,
          event.householdId.toString(),
          household.name
        );

        await recordSent(`event:${event._id}`);
      }
    } catch (error) {
      console.error('Event reminder error:', error);
    }
  }

  /**
   * Walk every household, compute balances, and ping the *debtor* once
   * per 7 days for any debt of at least $1. The creditor is intentionally
   * not pinged — they can already see the debt in the app, so a recurring
   * push to "X owes you Y" was just noise. Dedupe is persistent so PM2
   * restarts no longer cause a flood of duplicate reminders.
   */
  private async sendDebtReminders(): Promise<void> {
    try {
      const households = await Household.find({}).select('members name').lean();
      if (households.length === 0) return;

      const householdIds = households.map((h) => h._id);

      // Two batched reads (projected + lean) instead of 2 queries per household.
      const [expenses, settlements] = await Promise.all([
        Expense.find({ householdId: { $in: householdIds } })
          .select('householdId paidBy participants shares')
          .lean(),
        Settlement.find({ householdId: { $in: householdIds } })
          .select('householdId fromUserId toUserId amount')
          .lean(),
      ]);

      const expensesByHousehold = new Map<string, typeof expenses>();
      for (const expense of expenses) {
        const id = expense.householdId.toString();
        const bucket = expensesByHousehold.get(id);
        if (bucket) bucket.push(expense);
        else expensesByHousehold.set(id, [expense]);
      }
      const settlementsByHousehold = new Map<string, typeof settlements>();
      for (const settlement of settlements) {
        const id = settlement.householdId.toString();
        const bucket = settlementsByHousehold.get(id);
        if (bucket) bucket.push(settlement);
        else settlementsByHousehold.set(id, [settlement]);
      }

      // Build every candidate reminder first, then dedupe + resolve names in
      // batches so the whole job is a handful of queries regardless of size.
      const candidates: {
        key: string;
        fromUserId: string;
        toUserId: string;
        amount: number;
        householdId: string;
        householdName: string;
      }[] = [];

      for (const household of households) {
        const id = household._id.toString();
        const householdExpenses = expensesByHousehold.get(id);
        if (!householdExpenses || householdExpenses.length === 0) continue;

        const householdSettlements = settlementsByHousehold.get(id) ?? [];
        const balances = computeBalances(
          householdExpenses as never,
          householdSettlements as never
        );

        for (const balance of balances) {
          if (balance.amount < DEBT_REMINDER_MIN_AMOUNT) continue;
          candidates.push({
            key: `debt:${balance.fromUserId}:${balance.toUserId}:${id}`,
            fromUserId: balance.fromUserId,
            toUserId: balance.toUserId,
            amount: balance.amount,
            householdId: id,
            householdName: household.name,
          });
        }
      }

      if (candidates.length === 0) return;

      const dueKeys = await filterKeysDue(
        candidates.map((c) => c.key),
        DEBT_REMINDER_DAYS * 24 * 60 * 60 * 1000
      );
      const dueCandidates = candidates.filter((c) => dueKeys.has(c.key));
      if (dueCandidates.length === 0) return;

      const creditorIds = Array.from(new Set(dueCandidates.map((c) => c.toUserId)));
      const creditors = await User.find({ _id: { $in: creditorIds } })
        .select('name')
        .lean();
      const creditorNameById = new Map(creditors.map((u) => [u._id.toString(), u.name]));

      for (const candidate of dueCandidates) {
        const toName = creditorNameById.get(candidate.toUserId);
        if (!toName) continue;

        await notificationService.notifyDebtReminder(
          candidate.fromUserId,
          toName,
          candidate.amount,
          false, // debtor side only
          candidate.householdId,
          candidate.householdName
        );

        await recordSent(candidate.key);
      }
    } catch (error) {
      console.error('Debt reminder error:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
