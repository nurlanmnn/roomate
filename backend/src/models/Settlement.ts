import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  householdId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  amount: number;
  method?: string;
  note?: string;
  date: Date;
  proofImageUrl?: string;
  createdAt: Date;
}

const SettlementSchema = new Schema<ISettlement>({
  householdId: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: true,
  },
  fromUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  toUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  method: {
    type: String,
    trim: true,
  },
  note: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  proofImageUrl: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);

