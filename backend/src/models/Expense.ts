import mongoose, { Schema, Document } from 'mongoose';

export type ExpenseSplitMethod = 'even' | 'manual';

export interface IExpenseShare {
  userId: mongoose.Types.ObjectId;
  amount: number;
}

export interface IExpense extends Document {
  householdId: mongoose.Types.ObjectId;
  description: string;
  totalAmount: number;
  paidBy: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  splitMethod: ExpenseSplitMethod;
  shares: IExpenseShare[];
  date: Date;
  category?: string;
  createdAt: Date;
}

const ExpenseShareSchema = new Schema<IExpenseShare>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const ExpenseSchema = new Schema<IExpense>({
  householdId: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  splitMethod: {
    type: String,
    enum: ['even', 'manual'],
    required: true,
  },
  shares: [ExpenseShareSchema],
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  category: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);

