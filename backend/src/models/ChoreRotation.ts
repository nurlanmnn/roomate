import mongoose, { Schema, Document } from 'mongoose';

export type ChoreFrequency = 'weekly' | 'biweekly';

export interface IChoreRotation extends Document {
  householdId: mongoose.Types.ObjectId;
  name: string;           // e.g. "Kitchen", "Bathroom", "Living room"
  rotationOrder: mongoose.Types.ObjectId[];  // member IDs in rotation order
  frequency: ChoreFrequency;
  startDate: Date;        // start of first period (e.g. Monday of first week)
  createdAt: Date;
}

const ChoreRotationSchema = new Schema<IChoreRotation>({
  householdId: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  rotationOrder: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  frequency: {
    type: String,
    enum: ['weekly', 'biweekly'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ChoreRotation = mongoose.model<IChoreRotation>('ChoreRotation', ChoreRotationSchema);
