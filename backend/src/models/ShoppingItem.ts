import mongoose, { Schema, Document } from 'mongoose';

export interface IShoppingItem extends Document {
  householdId: mongoose.Types.ObjectId;
  listId: mongoose.Types.ObjectId;
  name: string;
  quantity?: number;
  weight?: number;
  weightUnit?: string;
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
  listId: {
    type: Schema.Types.ObjectId,
    ref: 'ShoppingList',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    min: 0,
  },
  weight: {
    type: Number,
    min: 0,
    set: function(value: any) {
      // Prevent invalid values from being set
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      if (typeof value === 'string') {
        // Reject strings that look like units
        const weightUnits = ['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon', 'k'];
        if (weightUnits.includes(value.toLowerCase().trim())) {
          return undefined;
        }
        const num = parseFloat(value);
        return isNaN(num) || num <= 0 ? undefined : num;
      }
      if (typeof value === 'number' && !isNaN(value) && value > 0) {
        return value;
      }
      return undefined;
    },
  },
  weightUnit: {
    type: String,
    trim: true,
    enum: ['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon'],
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

