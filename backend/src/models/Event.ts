import mongoose, { Schema, Document } from 'mongoose';

export type EventType = 'bill' | 'cleaning' | 'social' | 'other';

export interface IEvent extends Document {
  householdId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: EventType;
  date: Date;
  endDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>({
  householdId: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['bill', 'cleaning', 'social', 'other'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Event = mongoose.model<IEvent>('Event', EventSchema);

