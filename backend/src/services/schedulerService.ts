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

/**
 * Returns true if `key` was already logged within `withinMs` and we should
 * skip sending again. Otherwise records the send timestamp (idempotent
 * upsert) and returns false.
 */
const wasRecentlySent = async (key: string, withinMs: number): Promise<boolean> => {
  const log = await NotificationLog.findOne({ key });
  if (log && Date.now() - log.lastSentAt.getTime() < withinMs) {
    return true;
  }
  return false;
};

const recordSent = async (key: string): Promise<void> => {
  await NotificationLog.updateOne(
    { key },
    { $set: { lastSentAt: new Date() } },
    { upsert: true }
  );
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
      });

      for (const event of upcomingEvents) {
        const key = `event:${event._id}`;
        if (await wasRecentlySent(key, EVENT_REMINDER_DEDUPE_HOURS * 60 * 60 * 1000)) continue;

        const household = await Household.findById(event.householdId);
        if (!household) continue;

        const minutesUntil = Math.round((event.date.getTime() - now.getTime()) / (1000 * 60));

        await notificationService.notifyEventReminder(
          household.members.map((m) => m.toString()),
          event.title,
          minutesUntil,
          event.householdId.toString(),
          household.name
        );

        await recordSent(key);
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
      const households = await Household.find({});

      for (const household of households) {
        const expenses = await Expense.find({ householdId: household._id });
        if (expenses.length === 0) continue;

        const settlements = await Settlement.find({ householdId: household._id });
        const balances = computeBalances(expenses, settlements);

        for (const balance of balances) {
          if (balance.amount < DEBT_REMINDER_MIN_AMOUNT) continue;

          const key = `debt:${balance.fromUserId}:${balance.toUserId}:${household._id}`;
          if (await wasRecentlySent(key, DEBT_REMINDER_DAYS * 24 * 60 * 60 * 1000)) continue;

          const toUser = await User.findById(balance.toUserId).select('name');
          if (!toUser) continue;

          await notificationService.notifyDebtReminder(
            balance.fromUserId,
            toUser.name,
            balance.amount,
            false, // debtor side only
            household._id.toString(),
            household.name
          );

          await recordSent(key);
        }
      }
    } catch (error) {
      console.error('Debt reminder error:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
