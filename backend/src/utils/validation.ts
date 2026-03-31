import { z } from 'zod';
import mongoose from 'mongoose';

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: 'Invalid identifier',
  });

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'OTP must be a 6-digit code');

export const emailSchema = z.string().email().transform((value) => value.trim().toLowerCase());

export const trimmedString = (min = 1, max = 500) =>
  z.string().transform(collapseWhitespace).pipe(z.string().min(min).max(max));

export const optionalTrimmedString = (max = 500) =>
  z
    .string()
    .transform(collapseWhitespace)
    .pipe(z.string().max(max))
    .optional();

export const isoDateSchema = z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
  message: 'Invalid date',
});

export const booleanQuerySchema = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => {
  if (typeof value === 'boolean') return value;
  return value === 'true';
});
