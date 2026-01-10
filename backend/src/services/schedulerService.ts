import { Expense } from '../models/Expense';
import { Settlement } from '../models/Settlement';
import { Event } from '../models/Event';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { computeBalances } from '../utils/balances';
import { notificationService } from './notificationService';

// How often to check for scheduled tasks (in milliseconds)
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

// Time before event to send reminder (in minutes)
const EVENT_REMINDER_MINUTES = 60; // 1 hour before

// Days between debt reminders
const DEBT_REMINDER_DAYS = 7;

// Track last debt reminder sent per user pair
const lastDebtReminders = new Map<string, Date>();

class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler
   */
  start(): void {
    console.log('Starting notification scheduler...');
    
    // Run immediately on start
    this.runScheduledTasks();
    
    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runScheduledTasks();
    }, CHECK_INTERVAL);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Notification scheduler stopped');
    }
  }

  /**
   * Run all scheduled tasks
   */
  private async runScheduledTasks(): Promise<void> {
    try {
      await Promise.all([
        this.sendEventReminders(),
        this.sendDebtReminders(),
      ]);
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  }

  /**
   * Send reminders for upcoming events
   */
  private async sendEventReminders(): Promise<void> {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + EVENT_REMINDER_MINUTES * 60 * 1000);
      
      // Find events starting within the reminder window that haven't passed
      const upcomingEvents = await Event.find({
        date: {
          $gt: now,
          $lte: reminderTime,
        },
      });

      for (const event of upcomingEvents) {
        // Check if we should skip (already sent reminder recently)
        const eventKey = `event:${event._id}`;
        const lastReminder = lastDebtReminders.get(eventKey);
        
        if (lastReminder) {
          const hoursSinceLast = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLast < 12) continue; // Don't resend within 12 hours
        }

        const household = await Household.findById(event.householdId);
        if (!household) continue;

        const minutesUntil = Math.round((event.date.getTime() - now.getTime()) / (1000 * 60));

        await notificationService.notifyEventReminder(
          household.members.map(m => m.toString()),
          event.title,
          minutesUntil,
          event.householdId.toString()
        );

        lastDebtReminders.set(eventKey, now);
      }
    } catch (error) {
      console.error('Event reminder error:', error);
    }
  }

  /**
   * Send debt reminders every 7 days
   */
  private async sendDebtReminders(): Promise<void> {
    try {
      const households = await Household.find({});
      const now = new Date();

      for (const household of households) {
        const expenses = await Expense.find({ householdId: household._id });
        const settlements = await Settlement.find({ householdId: household._id });
        
        if (expenses.length === 0) continue;

        const balances = computeBalances(expenses, settlements);

        // For each balance, check if we should send a reminder
        for (const balance of balances) {
          if (balance.amount <= 0) continue;

          const reminderKey = `debt:${balance.fromUserId}:${balance.toUserId}:${household._id}`;
          const lastReminder = lastDebtReminders.get(reminderKey);

          if (lastReminder) {
            const daysSinceLast = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLast < DEBT_REMINDER_DAYS) continue;
          }

          // Get user names
          const fromUser = await User.findById(balance.fromUserId);
          const toUser = await User.findById(balance.toUserId);

          if (!fromUser || !toUser) continue;

          // Send reminder to the person who owes money
          await notificationService.notifyDebtReminder(
            balance.fromUserId,
            toUser.name,
            balance.amount,
            false, // They owe money
            household._id.toString()
          );

          // Send reminder to the person who is owed money
          await notificationService.notifyDebtReminder(
            balance.toUserId,
            fromUser.name,
            balance.amount,
            true, // They are owed money
            household._id.toString()
          );

          lastDebtReminders.set(reminderKey, now);
        }
      }
    } catch (error) {
      console.error('Debt reminder error:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
