import mongoose, { Schema, Document } from 'mongoose';

/**
 * Persistent dedupe ledger for the notification scheduler.
 *
 * Replaces the in-memory `Map` that used to track when each
 * (event reminder / debt reminder) was last sent — that map was wiped on
 * every PM2 restart and caused a burst of duplicate pushes on every deploy.
 *
 * Keys we use:
 *  - `event:<eventId>`                              → last reminder ping for an upcoming event
 *  - `debt:<fromUserId>:<toUserId>:<householdId>`   → last debt reminder ping for a debtor/household pair
 *
 * The collection is intentionally small (one doc per active reminder pair)
 * and self-cleans because we upsert on every send.
 */
export interface INotificationLog extends Document {
  key: string;
  lastSentAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  lastSentAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

export const NotificationLog = mongoose.model<INotificationLog>(
  'NotificationLog',
  NotificationLogSchema
);
