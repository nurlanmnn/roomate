import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  otpHash?: string;
  otp?: string; // Legacy plaintext OTP field kept temporarily for backwards compatibility
  /** When set, OTP was sent to this address for an email change (user still has old email on account). */
  newEmail?: string;
  /** When true, OTP is for password reset (not signup or email change). */
  passwordReset?: boolean;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const emailVerificationTokenSchema = new Schema<IEmailVerificationToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: false,
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
  attempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
    min: 1,
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

