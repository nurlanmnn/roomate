import mongoose, { Schema, Document } from 'mongoose';

export interface IShoppingList extends Document {
  householdId: mongoose.Types.ObjectId;
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ShoppingListSchema = new Schema<IShoppingList>({
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

export const ShoppingList = mongoose.model<IShoppingList>('ShoppingList', ShoppingListSchema);

