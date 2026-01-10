import { User } from '../models/User';

// Expo Push Notification types
interface ExpoPushMessage {
  to: string;
  title: string;
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

// Notification types for the app
export type NotificationType = 
  | 'expense_added'
  | 'debt_reminder'
  | 'event_added'
  | 'event_updated'
  | 'event_reminder'
  | 'goal_added'
  | 'goal_updated'
  | 'goal_completed'
  | 'household_updated'
  | 'household_deleted'
  | 'member_added'
  | 'member_removed';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Send push notification to a single user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user?.pushToken) {
        console.log(`No push token for user ${userId}`);
        return false;
      }

      return this.sendPushNotification(user.pushToken, payload);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
    try {
      const users = await User.find({ 
        _id: { $in: userIds },
        pushToken: { $exists: true, $ne: null }
      });

      const tokens = users.map(u => u.pushToken).filter(Boolean) as string[];
      
      if (tokens.length === 0) {
        console.log('No push tokens found for users');
        return;
      }

      await this.sendBatchNotifications(tokens, payload);
    } catch (error) {
      console.error('Error sending notifications to users:', error);
    }
  }

  /**
   * Send push notification to all household members except the actor
   */
  async sendToHouseholdMembers(
    memberIds: string[], 
    excludeUserId: string, 
    payload: NotificationPayload
  ): Promise<void> {
    const recipientIds = memberIds
      .map(id => id.toString())
      .filter(id => id !== excludeUserId);
    
    if (recipientIds.length === 0) return;
    
    await this.sendToUsers(recipientIds, payload);
  }

  /**
   * Send a single push notification
   */
  private async sendPushNotification(token: string, payload: NotificationPayload): Promise<boolean> {
    if (!this.isExpoPushToken(token)) {
      console.log(`Invalid Expo push token: ${token}`);
      return false;
    }

    const message: ExpoPushMessage = {
      to: token,
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: payload.type },
      sound: 'default',
    };

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json() as { data: ExpoPushTicket };
      
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

  /**
   * Send batch push notifications
   */
  private async sendBatchNotifications(tokens: string[], payload: NotificationPayload): Promise<void> {
    const validTokens = tokens.filter(t => this.isExpoPushToken(t));
    
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: payload.type },
      sound: 'default',
    }));

    // Expo recommends sending in batches of 100
    const batches = this.chunkArray(messages, 100);

    for (const batch of batches) {
      try {
        await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
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

  /**
   * Check if a token is a valid Expo push token
   */
  private isExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================
  // Specific notification helpers
  // ============================================

  /**
   * Expense added notification
   */
  async notifyExpenseAdded(
    householdMemberIds: string[],
    creatorId: string,
    creatorName: string,
    description: string,
    amount: number,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, creatorId, {
      type: 'expense_added',
      title: 'New Expense Added',
      body: `${creatorName} added "${description}" for $${amount.toFixed(2)}`,
      data: { householdId },
    });
  }

  /**
   * Debt reminder notification (sent to both lender and borrower)
   */
  async notifyDebtReminder(
    userId: string,
    otherUserName: string,
    amount: number,
    isOwed: boolean,
    householdId: string
  ): Promise<void> {
    const title = 'Debt Reminder';
    const body = isOwed
      ? `${otherUserName} owes you $${amount.toFixed(2)}`
      : `You owe ${otherUserName} $${amount.toFixed(2)}`;

    await this.sendToUser(userId, {
      type: 'debt_reminder',
      title,
      body,
      data: { householdId },
    });
  }

  /**
   * Event added notification
   */
  async notifyEventAdded(
    householdMemberIds: string[],
    creatorId: string,
    creatorName: string,
    eventTitle: string,
    eventDate: Date,
    householdId: string
  ): Promise<void> {
    const dateStr = eventDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    await this.sendToHouseholdMembers(householdMemberIds, creatorId, {
      type: 'event_added',
      title: 'New Event',
      body: `${creatorName} added "${eventTitle}" on ${dateStr}`,
      data: { householdId },
    });
  }

  /**
   * Event updated notification
   */
  async notifyEventUpdated(
    householdMemberIds: string[],
    updaterId: string,
    updaterName: string,
    eventTitle: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, updaterId, {
      type: 'event_updated',
      title: 'Event Updated',
      body: `${updaterName} updated "${eventTitle}"`,
      data: { householdId },
    });
  }

  /**
   * Event reminder notification (before event starts)
   */
  async notifyEventReminder(
    householdMemberIds: string[],
    eventTitle: string,
    minutesUntil: number,
    householdId: string
  ): Promise<void> {
    const timeStr = minutesUntil >= 60 
      ? `${Math.round(minutesUntil / 60)} hour(s)` 
      : `${minutesUntil} minutes`;

    await this.sendToUsers(householdMemberIds, {
      type: 'event_reminder',
      title: 'Upcoming Event',
      body: `"${eventTitle}" starts in ${timeStr}`,
      data: { householdId },
    });
  }

  /**
   * Goal added notification
   */
  async notifyGoalAdded(
    householdMemberIds: string[],
    creatorId: string,
    creatorName: string,
    goalTitle: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, creatorId, {
      type: 'goal_added',
      title: 'New Goal',
      body: `${creatorName} added a new goal: "${goalTitle}"`,
      data: { householdId },
    });
  }

  /**
   * Goal updated notification
   */
  async notifyGoalUpdated(
    householdMemberIds: string[],
    updaterId: string,
    updaterName: string,
    goalTitle: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, updaterId, {
      type: 'goal_updated',
      title: 'Goal Updated',
      body: `${updaterName} updated "${goalTitle}"`,
      data: { householdId },
    });
  }

  /**
   * Goal completed notification
   */
  async notifyGoalCompleted(
    householdMemberIds: string[],
    goalTitle: string,
    householdId: string
  ): Promise<void> {
    await this.sendToUsers(householdMemberIds, {
      type: 'goal_completed',
      title: '🎉 Goal Achieved!',
      body: `"${goalTitle}" has been completed!`,
      data: { householdId },
    });
  }

  /**
   * Household updated notification (name/location changed)
   */
  async notifyHouseholdUpdated(
    householdMemberIds: string[],
    updaterId: string,
    householdName: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, updaterId, {
      type: 'household_updated',
      title: 'Household Updated',
      body: `"${householdName}" details have been updated`,
      data: { householdId },
    });
  }

  /**
   * Household deleted notification
   */
  async notifyHouseholdDeleted(
    memberIds: string[],
    ownerId: string,
    householdName: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(memberIds, ownerId, {
      type: 'household_deleted',
      title: 'Household Deleted',
      body: `"${householdName}" has been deleted by the owner`,
      data: {},
    });
  }

  /**
   * Member added notification
   */
  async notifyMemberAdded(
    householdMemberIds: string[],
    newMemberId: string,
    newMemberName: string,
    householdName: string,
    householdId: string
  ): Promise<void> {
    await this.sendToHouseholdMembers(householdMemberIds, newMemberId, {
      type: 'member_added',
      title: 'New Roommate',
      body: `${newMemberName} joined "${householdName}"`,
      data: { householdId },
    });
  }

  /**
   * Member removed notification
   */
  async notifyMemberRemoved(
    removedUserId: string,
    householdName: string
  ): Promise<void> {
    await this.sendToUser(removedUserId, {
      type: 'member_removed',
      title: 'Removed from Household',
      body: `You have been removed from "${householdName}"`,
      data: {},
    });
  }
}

export const notificationService = new NotificationService();
