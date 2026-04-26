import { User } from '../models/User';
import { Household } from '../models/Household';
import { config } from '../config/env';
import mongoose from 'mongoose';

interface ExpoPushMessage {
  to: string;
  title: string;
  /** iOS shows this as a small, dimmer line above the title. Android ignores it. */
  subtitle?: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export type NotificationType =
  | 'expense_added'
  | 'debt_reminder'
  | 'event_added'
  | 'event_updated'
  | 'event_reminder'
  | 'household_updated'
  | 'household_deleted'
  | 'member_added'
  | 'member_removed';

/**
 * Buckets the four category toggles in the in-app NotificationSettings screen.
 * Every push goes through one of these — recipients whose category is OFF
 * (or whose master `enabled` is OFF) are filtered out before send.
 */
export type NotificationCategory = 'expenses' | 'calendar' | 'debts' | 'household';

interface NotificationPayload {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Household name shown as iOS subtitle and prefixed onto the body for Android. */
  householdName?: string;
  /** Pass the household id whenever the notification is scoped to one — used
   *  for per-household mute filtering and for in-app deep-link routing. */
  householdId?: string;
  data?: Record<string, any>;
}

class NotificationService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Send to a single user. Honours the user's notificationPreferences
   * and (when `householdId` is provided) any per-household mute.
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    if (!config.notificationsEnabled) return false;
    try {
      const user = await User.findById(userId);
      if (!user?.pushToken) {
        console.log(`No push token for user ${userId}`);
        return false;
      }

      if (!this.userAllowsCategory(user, payload.category)) return false;

      if (payload.householdId && (await this.userMutedHousehold(userId, payload.householdId))) {
        return false;
      }

      return this.sendPushNotification(user.pushToken, payload);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
    if (!config.notificationsEnabled) return;
    try {
      const users = await User.find({
        _id: { $in: userIds },
        pushToken: { $exists: true, $ne: null },
      });

      const allowedUsers = users.filter((u) => this.userAllowsCategory(u, payload.category));

      let recipients = allowedUsers;
      if (payload.householdId) {
        const muted = await this.usersMutingHousehold(
          allowedUsers.map((u) => u._id.toString()),
          payload.householdId
        );
        recipients = allowedUsers.filter((u) => !muted.has(u._id.toString()));
      }

      const tokens = recipients.map((u) => u.pushToken).filter(Boolean) as string[];
      if (tokens.length === 0) {
        console.log('No push tokens found for users (after preference + mute filtering)');
        return;
      }

      await this.sendBatchNotifications(tokens, payload);
    } catch (error) {
      console.error('Error sending notifications to users:', error);
    }
  }

  /**
   * Send to all household members except the actor.
   */
  async sendToHouseholdMembers(
    memberIds: string[],
    excludeUserId: string,
    payload: NotificationPayload
  ): Promise<void> {
    if (!config.notificationsEnabled) return;
    const recipientIds = memberIds.map((id) => id.toString()).filter((id) => id !== excludeUserId);
    if (recipientIds.length === 0) return;
    await this.sendToUsers(recipientIds, payload);
  }

  // ─── filtering helpers ──────────────────────────────────────────────────

  private userAllowsCategory(
    user: { notificationPreferences?: Partial<Record<NotificationCategory | 'enabled', boolean>> },
    category: NotificationCategory
  ): boolean {
    const prefs = user.notificationPreferences;
    if (!prefs) return true; // legacy users (pre-backfill) — default allow
    if (prefs.enabled === false) return false;
    return prefs[category] !== false;
  }

  private async userMutedHousehold(userId: string, householdId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(householdId)) return false;
    const household = await Household.findById(householdId).select('notificationMutedBy');
    if (!household) return false;
    return household.notificationMutedBy?.some((id) => id.toString() === userId) ?? false;
  }

  private async usersMutingHousehold(userIds: string[], householdId: string): Promise<Set<string>> {
    if (!mongoose.Types.ObjectId.isValid(householdId) || userIds.length === 0) return new Set();
    const household = await Household.findById(householdId).select('notificationMutedBy');
    if (!household?.notificationMutedBy?.length) return new Set();
    const muted = new Set(household.notificationMutedBy.map((id) => id.toString()));
    return new Set(userIds.filter((id) => muted.has(id)));
  }

  // ─── transport ──────────────────────────────────────────────────────────

  private buildMessage(token: string, payload: NotificationPayload): ExpoPushMessage {
    // iOS gets the household name in the native `subtitle` slot. Android
    // ignores subtitle, so we fold it into the body for those devices.
    // Doing both at the message level (not per-device) is fine — Expo's iOS
    // path uses subtitle and shows the body verbatim, and Android shows the
    // body with the prefix; iOS happens to also show the prefix, which is
    // acceptable redundancy and keeps the wire format simple.
    const body = payload.householdName
      ? `${payload.householdName} • ${payload.body}`
      : payload.body;

    return {
      to: token,
      title: payload.title,
      subtitle: payload.householdName,
      body,
      data: { ...payload.data, type: payload.type, householdId: payload.householdId },
      sound: 'default',
    };
  }

  private async sendPushNotification(
    token: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    if (!this.isExpoPushToken(token)) {
      console.log(`Invalid Expo push token: ${token}`);
      return false;
    }

    const message = this.buildMessage(token, payload);

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = (await response.json()) as { data: ExpoPushTicket };
      if (result.data.status === 'error') {
        console.error('Push notification error:', result.data.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  private async sendBatchNotifications(
    tokens: string[],
    payload: NotificationPayload
  ): Promise<void> {
    const validTokens = tokens.filter((t) => this.isExpoPushToken(t));
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map((token) => this.buildMessage(token, payload));

    // Expo recommends sending in batches of 100
    const batches = this.chunkArray(messages, 100);
    for (const batch of batches) {
      try {
        await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });
      } catch (error) {
        console.error('Failed to send batch notifications:', error);
      }
    }
  }

  private isExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ─── per-action helpers ────────────────────────────────────────────────

  async notifyExpenseAdded(
    householdMemberIds: string[],
    creatorId: string,
    creatorName: string,
    description: string,
    amount: number,
    householdId: string,
    householdName: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, creatorId, {
      type: 'expense_added',
      category: 'expenses',
      title: 'New Expense Added',
      body: `${creatorName} added "${description}" for $${amount.toFixed(2)}`,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyDebtReminder(
    userId: string,
    otherUserName: string,
    amount: number,
    isOwed: boolean,
    householdId: string,
    householdName: string
  ): Promise<void> {
    const title = 'Debt Reminder';
    const body = isOwed
      ? `${otherUserName} owes you $${amount.toFixed(2)}`
      : `You owe ${otherUserName} $${amount.toFixed(2)}`;

    await this.sendToUser(userId, {
      type: 'debt_reminder',
      category: 'debts',
      title,
      body,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyEventAdded(
    householdMemberIds: string[],
    creatorId: string,
    creatorName: string,
    eventTitle: string,
    eventDate: Date,
    householdId: string,
    householdName: string
  ): Promise<void> {
    const dateStr = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    await this.sendToHouseholdMembers(householdMemberIds, creatorId, {
      type: 'event_added',
      category: 'calendar',
      title: 'New Event',
      body: `${creatorName} added "${eventTitle}" on ${dateStr}`,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyEventUpdated(
    householdMemberIds: string[],
    updaterId: string,
    updaterName: string,
    eventTitle: string,
    householdId: string,
    householdName: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, updaterId, {
      type: 'event_updated',
      category: 'calendar',
      title: 'Event Updated',
      body: `${updaterName} updated "${eventTitle}"`,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyEventReminder(
    householdMemberIds: string[],
    eventTitle: string,
    minutesUntil: number,
    householdId: string,
    householdName: string
  ): Promise<void> {
    const timeStr =
      minutesUntil >= 60 ? `${Math.round(minutesUntil / 60)} hour(s)` : `${minutesUntil} minutes`;

    await this.sendToUsers(householdMemberIds, {
      type: 'event_reminder',
      category: 'calendar',
      title: 'Upcoming Event',
      body: `"${eventTitle}" starts in ${timeStr}`,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyHouseholdUpdated(
    householdMemberIds: string[],
    updaterId: string,
    householdName: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, updaterId, {
      type: 'household_updated',
      category: 'household',
      title: 'Household Updated',
      body: `"${householdName}" details have been updated`,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyHouseholdDeleted(
    memberIds: string[],
    ownerId: string,
    householdName: string
  ): Promise<void> {
    // No householdId here on purpose — the household no longer exists, so
    // per-household mute lookup would 404. We still pass the name in the body.
    await this.sendToHouseholdMembers(memberIds, ownerId, {
      type: 'household_deleted',
      category: 'household',
      title: 'Household Deleted',
      body: `"${householdName}" has been deleted by the owner`,
      data: {},
    });
  }

  async notifyMemberAdded(
    householdMemberIds: string[],
    newMemberId: string,
    newMemberName: string,
    householdName: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, newMemberId, {
      type: 'member_added',
      category: 'household',
      title: 'New member',
      body: `${newMemberName} joined "${householdName}"`,
      householdName,
      householdId,
      data: { householdId },
    });
  }

  async notifyMemberRemoved(removedUserId: string, householdName: string): Promise<void> {
    // No householdId — recipient is no longer a member, so mute lookup
    // wouldn't apply anyway.
    await this.sendToUser(removedUserId, {
      type: 'member_removed',
      category: 'household',
      title: 'Removed from Household',
      body: `You have been removed from "${householdName}"`,
      data: {},
    });
  }
}

export const notificationService = new NotificationService();
