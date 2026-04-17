import mongoose, { Schema, Document } from 'mongoose';

/**
 * Supported ISO 4217 currency codes for a household.
 *
 * Currency is locked once the household has any expenses or settlements — so
 * keeping the list here (and in the mobile `currencies.ts` constant) in sync
 * is sufficient; we don't need per-expense currency stamps.
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'TRY',
  'AZN',
  'RUB',
  'UAH',
  'JPY',
  'CNY',
  'KRW',
  'SGD',
  'HKD',
  'TWD',
  'INR',
  'THB',
  'IDR',
  'PHP',
  'VND',
  'AED',
  'SAR',
  'ILS',
  'EGP',
  'ZAR',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'COP',
  'PEN',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface IHousehold extends Document {
  name: string;
  address?: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  joinCode: string;
  currency: SupportedCurrency;
  createdAt: Date;
}

const HouseholdSchema = new Schema<IHousehold>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  joinCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  currency: {
    type: String,
    enum: SUPPORTED_CURRENCIES,
    default: 'USD',
    required: true,
    uppercase: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Household = mongoose.model<IHousehold>('Household', HouseholdSchema);

