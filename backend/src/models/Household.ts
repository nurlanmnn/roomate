import mongoose, { Schema, Document } from 'mongoose';

export interface IHousehold extends Document {
  name: string;
  address?: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  joinCode: string;
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Household = mongoose.model<IHousehold>('Household', HouseholdSchema);

