import mongoose, { Schema, Document } from 'mongoose';

export type GoalStatus = 'idea' | 'planned' | 'in_progress' | 'done';

export interface IGoal extends Document {
  householdId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: GoalStatus;
  createdBy: mongoose.Types.ObjectId;
  upvotes: mongoose.Types.ObjectId[];
  targetDate?: Date;
  createdAt: Date;
}

const GoalSchema = new Schema<IGoal>({
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
  status: {
    type: String,
    enum: ['idea', 'planned', 'in_progress', 'done'],
    default: 'idea',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  upvotes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  targetDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);

