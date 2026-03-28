import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  otp: string; // 6-digit OTP code
  /** When set, OTP was sent to this address for an email change (user still has old email on account). */
  newEmail?: string;
  /** When true, OTP is for password reset (not signup or email change). */
  passwordReset?: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const emailVerificationTokenSchema = new Schema<IEmailVerificationToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otp: {
    type: String,
    required: true,
    length: 6,
  },
  newEmail: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
  },
  passwordReset: {
    type: Boolean,
    required: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

emailVerificationTokenSchema.index({ userId: 1, newEmail: 1 });

export const EmailVerificationToken = mongoose.model<IEmailVerificationToken>(
  'EmailVerificationToken',
  emailVerificationTokenSchema
);

