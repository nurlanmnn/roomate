import mongoose, { Schema, Document } from 'mongoose';

export type ChoreFrequency = 'weekly' | 'biweekly';

export interface IChoreCompletion {
  /** Midnight of the first day of the rotation period that was completed. */
  periodStart: Date;
  completedBy: mongoose.Types.ObjectId;
  completedAt: Date;
}

export interface IChoreRotation extends Document {
  householdId: mongoose.Types.ObjectId;
  name: string;           // e.g. "Kitchen", "Bathroom", "Living room"
  rotationOrder: mongoose.Types.ObjectId[];  // member IDs in rotation order
  frequency: ChoreFrequency;
  startDate: Date;        // start of first period (e.g. Monday of first week)
  /** One record per completed period. Members can toggle on/off. */
  completions: IChoreCompletion[];
  createdAt: Date;
}

const ChoreCompletionSchema = new Schema<IChoreCompletion>(
  {
    periodStart: { type: Date, required: true },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
  completions: {
    type: [ChoreCompletionSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ChoreRotation = mongoose.model<IChoreRotation>('ChoreRotation', ChoreRotationSchema);
