import mongoose, { Schema, Document } from 'mongoose';

/**
 * Per-user push notification preferences. Mirrors the four category toggles
 * the mobile NotificationSettingsScreen exposes plus a master switch. The
 * backend filters every push via `notificationService` against these values
 * before sending — turning a category off here means the user simply doesn't
 * receive that push on any of their devices.
 *
 * Defaults to all-true so existing users (pre-feature) and new signups behave
 * exactly like before until they explicitly opt out.
 */
export interface INotificationPreferences {
  enabled: boolean;
  expenses: boolean;
  calendar: boolean;
  debts: boolean;
  household: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: INotificationPreferences = {
  enabled: true,
  expenses: true,
  calendar: true,
  debts: true,
  household: true,
};

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  avatarUrl?: string;
  pushToken?: string;
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    enabled: { type: Boolean, default: true },
    expenses: { type: Boolean, default: true },
    calendar: { type: Boolean, default: true },
    debts: { type: Boolean, default: true },
    household: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  avatarUrl: {
    type: String,
    required: false,
    trim: true,
  },
  pushToken: {
    type: String,
    required: false,
    trim: true,
  },
  notificationPreferences: {
    type: NotificationPreferencesSchema,
    default: () => ({ ...DEFAULT_NOTIFICATION_PREFERENCES }),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
