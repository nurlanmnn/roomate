import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingList } from '../models/ShoppingList';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// ========== SCHEMAS ==========
const createShoppingListSchema = z.object({
  householdId: z.string(),
  name: z.string().min(1),
});

const updateShoppingListSchema = z.object({
  name: z.string().min(1),
});

// ========== SHOPPING LISTS ROUTES ==========

// GET /shopping/lists/household/:householdId
router.get('/lists/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const household = await Household.findById(req.params.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const lists = await ShoppingList.find({ householdId: req.params.householdId })
      .populate('createdBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(lists);
  } catch (error) {
    console.error('Get shopping lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /shopping/lists
router.post('/lists', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createShoppingListSchema.parse(req.body);

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create list
    const list = new ShoppingList({
      householdId: new mongoose.Types.ObjectId(data.householdId),
      name: data.name.trim(),
      createdBy: userIdObjectId,
    });
    await list.save();

    await list.populate('createdBy', 'name email avatarUrl');

    res.status(201).json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create shopping list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

// PATCH /shopping/lists/:id
router.patch('/lists/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = updateShoppingListSchema.parse(req.body);

    const list = await ShoppingList.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(list.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    list.name = data.name.trim();
    await list.save();

    await list.populate('createdBy', 'name email avatarUrl');

    res.json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /shopping/lists/:id
router.delete('/lists/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const list = await ShoppingList.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(list.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all items in the list
    await ShoppingItem.deleteMany({ listId: list._id });
    
    // Delete the list
    await ShoppingList.deleteOne({ _id: list._id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== SHOPPING ITEMS ROUTES ==========

const createShoppingItemSchema = z.object({
  householdId: z.string(),
  listId: z.string(),
  name: z.string().min(1),
  quantity: z.union([
    z.number().int().positive(),
    z.string().transform((val) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }),
  ]).optional(),
  weight: z.union([
    z.number().int().positive(),
    z.string().transform((val) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }),
  ]).optional(),
  weightUnit: z.enum(['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon']).optional(),
  category: z.string().optional(),
  isShared: z.boolean().default(true),
  ownerId: z
    .string()
    .transform((val) => {
      const trimmed = val?.trim();
      return trimmed ? trimmed : undefined;
    })
    .optional(),
});

const updateShoppingItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.union([
    z.number().int().positive(),
    z.string().transform((val) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }),
  ]).optional(),
  weight: z.union([
    z.number().int().positive(),
    z.string().transform((val) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }),
  ]).optional(),
  weightUnit: z.enum(['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon']).optional(),
  category: z.string().optional(),
  isShared: z.boolean().optional(),
  ownerId: z
    .string()
    .transform((val) => {
      const trimmed = val?.trim();
      return trimmed ? trimmed : undefined;
    })
    .optional(),
  completed: z.boolean().optional(),
});

// GET /shopping/items/list/:listId
router.get('/items/list/:listId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const list = await ShoppingList.findById(req.params.listId);
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(list.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { completed } = req.query;
    const query: any = { listId: req.params.listId };
    
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    const items = await ShoppingItem.find(query)
      .populate('addedBy', 'name email avatarUrl')
      .populate('ownerId', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    console.error('Get shopping items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /shopping
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createShoppingItemSchema.parse(req.body);

    // Verify list exists
    const list = await ShoppingList.findById(data.listId);
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Verify list belongs to household
    if (list.householdId.toString() !== data.householdId) {
      return res.status(400).json({ error: 'Shopping list does not belong to this household' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If not shared, require ownerId
    if (!data.isShared && !data.ownerId) {
      return res.status(400).json({ error: 'ownerId is required when isShared is false' });
    }

    // Create item
    const item = new ShoppingItem({
      householdId: new mongoose.Types.ObjectId(data.householdId),
      listId: new mongoose.Types.ObjectId(data.listId),
      name: data.name,
      quantity: data.quantity,
      weight: data.weight,
      weightUnit: data.weightUnit,
      category: data.category,
      isShared: data.isShared,
      ownerId: data.ownerId ? new mongoose.Types.ObjectId(data.ownerId) : undefined,
      addedBy: userId,
      completed: false,
    });
    await item.save();

    await item.populate('addedBy', 'name email avatarUrl');
    await item.populate('ownerId', 'name email avatarUrl');

    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create shopping item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /shopping/:id
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = updateShoppingItemSchema.parse(req.body);

    const item = await ShoppingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Shopping item not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(item.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields
    if (data.name !== undefined) item.name = data.name;
    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.weight !== undefined) item.weight = data.weight;
    if (data.weightUnit !== undefined) item.weightUnit = data.weightUnit;
    if (data.category !== undefined) item.category = data.category;
    if (data.isShared !== undefined) item.isShared = data.isShared;
    if (data.ownerId !== undefined) {
      item.ownerId = data.ownerId ? new mongoose.Types.ObjectId(data.ownerId) : undefined;
    }
    if (data.completed !== undefined) item.completed = data.completed;

    await item.save();

    await item.populate('addedBy', 'name email avatarUrl');
    await item.populate('ownerId', 'name email avatarUrl');

    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update shopping item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /shopping/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const item = await ShoppingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Shopping item not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(item.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await ShoppingItem.deleteOne({ _id: item._id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete shopping item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

