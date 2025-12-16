import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ShoppingItem } from '../models/ShoppingItem';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

const createShoppingItemSchema = z.object({
  householdId: z.string(),
  name: z.string().min(1),
  quantity: z.string().optional(),
  category: z.string().optional(),
  isShared: z.boolean().default(true),
  ownerId: z.string().optional(),
});

const updateShoppingItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.string().optional(),
  category: z.string().optional(),
  isShared: z.boolean().optional(),
  ownerId: z.string().optional(),
  completed: z.boolean().optional(),
});

// GET /shopping/household/:householdId
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
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

    const { completed } = req.query;
    const query: any = { householdId: req.params.householdId };
    
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    const items = await ShoppingItem.find(query)
      .populate('addedBy', 'name email')
      .populate('ownerId', 'name email')
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

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
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
      householdId: data.householdId,
      name: data.name,
      quantity: data.quantity,
      category: data.category,
      isShared: data.isShared,
      ownerId: data.ownerId,
      addedBy: userId,
      completed: false,
    });
    await item.save();

    await item.populate('addedBy', 'name email');
    await item.populate('ownerId', 'name email');

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
    if (data.category !== undefined) item.category = data.category;
    if (data.isShared !== undefined) item.isShared = data.isShared;
    if (data.ownerId !== undefined) item.ownerId = data.ownerId;
    if (data.completed !== undefined) item.completed = data.completed;

    await item.save();

    await item.populate('addedBy', 'name email');
    await item.populate('ownerId', 'name email');

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

