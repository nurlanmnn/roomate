import mongoose, { Schema, Document } from 'mongoose';

export interface IShoppingItem extends Document {
  householdId: mongoose.Types.ObjectId;
  name: string;
  quantity?: string;
  category?: string;
  isShared: boolean;
  ownerId?: mongoose.Types.ObjectId;
  addedBy: mongoose.Types.ObjectId;
  completed: boolean;
  createdAt: Date;
}

const ShoppingItemSchema = new Schema<IShoppingItem>({
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
  quantity: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  isShared: {
    type: Boolean,
    default: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ShoppingItem = mongoose.model<IShoppingItem>('ShoppingItem', ShoppingItemSchema);

