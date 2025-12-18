import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Goal } from '../models/Goal';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

const createGoalSchema = z.object({
  householdId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['idea', 'planned', 'in_progress', 'done']).default('idea'),
  // Mobile sends YYYY-MM-DD; also accept full ISO datetime strings.
  targetDate: z.coerce.date().optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['idea', 'planned', 'in_progress', 'done']).optional(),
  targetDate: z.coerce.date().optional(),
});

// GET /goals/household/:householdId
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

    const goals = await Goal.find({
      householdId: req.params.householdId,
    })
      .populate('createdBy', 'name email')
      .populate('upvotes', 'name email')
      .sort({ createdAt: -1 });

    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /goals
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createGoalSchema.parse(req.body);

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create goal
    const goal = new Goal({
      householdId: data.householdId,
      title: data.title,
      description: data.description,
      status: data.status || 'idea',
      createdBy: userId,
      upvotes: [],
      targetDate: data.targetDate,
    });
    await goal.save();

    await goal.populate('createdBy', 'name email');
    await goal.populate('upvotes', 'name email');

    res.status(201).json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /goals/:id
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = updateGoalSchema.parse(req.body);

    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(goal.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields
    if (data.title !== undefined) goal.title = data.title;
    if (data.description !== undefined) goal.description = data.description;
    if (data.status !== undefined) goal.status = data.status;
    if (data.targetDate !== undefined) {
      goal.targetDate = data.targetDate;
    }

    await goal.save();

    await goal.populate('createdBy', 'name email');
    await goal.populate('upvotes', 'name email');

    res.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /goals/:id/upvote
router.post('/:id/upvote', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(goal.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    const upvoteIndex = goal.upvotes.findIndex(u => u.toString() === userId);

    // Toggle upvote
    if (upvoteIndex >= 0) {
      goal.upvotes.splice(upvoteIndex, 1);
    } else {
      goal.upvotes.push(userIdObj);
    }

    await goal.save();

    await goal.populate('createdBy', 'name email');
    await goal.populate('upvotes', 'name email');

    res.json(goal);
  } catch (error) {
    console.error('Upvote goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

