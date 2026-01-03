import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseTemplateShare {
  userId: mongoose.Types.ObjectId;
  amount?: number; // Optional for even split templates
}

export interface IExpenseTemplate extends Document {
  householdId?: mongoose.Types.ObjectId; // Optional - can be user-specific or household-specific
  userId: mongoose.Types.ObjectId; // Creator
  name: string; // Template name
  description?: string; // Default description
  category?: string;
  splitMethod: 'even' | 'manual';
  defaultParticipants: mongoose.Types.ObjectId[]; // Default participant IDs
  defaultShares?: IExpenseTemplateShare[]; // For manual split
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseTemplateShareSchema = new Schema<IExpenseTemplateShare>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    min: 0,
  },
}, { _id: false });

const ExpenseTemplateSchema = new Schema<IExpenseTemplate>({
  householdId: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: false,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  splitMethod: {
    type: String,
    enum: ['even', 'manual'],
    required: true,
  },
  defaultParticipants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  defaultShares: [ExpenseTemplateShareSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ExpenseTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const ExpenseTemplate = mongoose.model<IExpenseTemplate>('ExpenseTemplate', ExpenseTemplateSchema);

