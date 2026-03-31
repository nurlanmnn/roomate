import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Goal } from '../models/Goal';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import mongoose from 'mongoose';
import { isoDateSchema, objectIdSchema, optionalTrimmedString, trimmedString } from '../utils/validation';

const router = express.Router();

const createGoalSchema = z.object({
  householdId: objectIdSchema,
  title: trimmedString(1, 120),
  description: optionalTrimmedString(2000),
  status: z.enum(['idea', 'planned', 'in_progress', 'done']).default('idea'),
  targetDate: isoDateSchema.optional(),
});

const updateGoalSchema = z.object({
  title: trimmedString(1, 120).optional(),
  description: optionalTrimmedString(2000),
  status: z.enum(['idea', 'planned', 'in_progress', 'done']).optional(),
  targetDate: isoDateSchema.optional(),
});

const householdParamsSchema = z.object({
  householdId: objectIdSchema,
});

const goalIdParamsSchema = z.object({
  id: objectIdSchema,
});

// GET /goals/household/:householdId
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = householdParamsSchema.parse(req.params);
    const household = await Household.findById(householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const goals = await Goal.find({
      householdId,
    })
      .populate('createdBy', 'name email avatarUrl')
      .populate('upvotes', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(goals);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
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

    await goal.populate('createdBy', 'name email avatarUrl');
    await goal.populate('upvotes', 'name email avatarUrl');

    // Send notification to household members
    const creator = await User.findById(userId);
    if (creator) {
      notificationService.notifyGoalAdded(
        household.members.map(m => m.toString()),
        userId,
        creator.name,
        data.title,
        data.householdId
      ).catch(err => console.error('Notification error:', err));
    }

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

    const { id } = goalIdParamsSchema.parse(req.params);
    const goal = await Goal.findById(id);
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

    const previousStatus = goal.status;

    // Update fields
    if (data.title !== undefined) goal.title = data.title;
    if (data.description !== undefined) goal.description = data.description;
    if (data.status !== undefined) goal.status = data.status;
    if (data.targetDate !== undefined) {
      goal.targetDate = data.targetDate;
    }

    await goal.save();

    await goal.populate('createdBy', 'name email avatarUrl');
    await goal.populate('upvotes', 'name email avatarUrl');

    // Send notification
    const updater = await User.findById(userId);
    if (updater) {
      // Check if goal was just completed
      if (data.status === 'done' && previousStatus !== 'done') {
        notificationService.notifyGoalCompleted(
          household.members.map(m => m.toString()),
          goal.title,
          goal.householdId.toString()
        ).catch(err => console.error('Notification error:', err));
      } else {
        notificationService.notifyGoalUpdated(
          household.members.map(m => m.toString()),
          userId,
          updater.name,
          goal.title,
          goal.householdId.toString()
        ).catch(err => console.error('Notification error:', err));
      }
    }

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

    const { id } = goalIdParamsSchema.parse(req.params);
    const goal = await Goal.findById(id);
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

    await goal.populate('createdBy', 'name email avatarUrl');
    await goal.populate('upvotes', 'name email avatarUrl');

    res.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Upvote goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

