import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Event } from '../models/Event';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { isoDateSchema, objectIdSchema, optionalTrimmedString, trimmedString } from '../utils/validation';

const router = express.Router();

const createEventSchema = z.object({
  householdId: objectIdSchema,
  title: trimmedString(1, 120),
  description: optionalTrimmedString(2000),
  type: z.enum(['bill', 'cleaning', 'social', 'meal', 'meeting', 'maintenance', 'shopping', 'trip', 'birthday', 'reminder', 'other']),
  date: isoDateSchema,
  endDate: isoDateSchema.optional(),
});

const householdParamsSchema = z.object({
  householdId: objectIdSchema,
});

const eventIdParamsSchema = z.object({
  id: objectIdSchema,
});

const eventsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).max(100000).optional(),
  upcoming: z.enum(['0', '1', 'true', 'false']).optional(),
});

// GET /events/household/:householdId
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = householdParamsSchema.parse(req.params);
    const query = eventsListQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: 'Invalid query', details: query.error.flatten() });
    }

    const household = await Household.findById(householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit, skip, upcoming } = query.data;
    const usePagination = limit !== undefined;
    const upcomingOnly =
      upcoming === '1' || upcoming === 'true';

    const filter: Record<string, unknown> = { householdId };
    if (upcomingOnly) {
      filter.date = { $gte: new Date() };
    }

    const base = Event.find(filter)
      .populate('createdBy', 'name email avatarUrl')
      .sort({ date: 1 });

    if (usePagination) {
      const take = limit ?? 100;
      const offset = skip ?? 0;
      const [items, total] = await Promise.all([
        base.clone().skip(offset).limit(take).exec(),
        Event.countDocuments(filter),
      ]);
      res.json({ items, total });
      return;
    }

    const events = await base.exec();
    res.json(events);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /events
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createEventSchema.parse(req.body);

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create event
    const event = new Event({
      householdId: data.householdId,
      title: data.title,
      description: data.description,
      type: data.type,
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy: userId,
    });
    await event.save();

    await event.populate('createdBy', 'name email avatarUrl');

    // Send notification to household members
    const creator = await User.findById(userId);
    if (creator) {
      notificationService.notifyEventAdded(
        household.members.map(m => m.toString()),
        userId,
        creator.name,
        data.title,
        new Date(data.date),
        data.householdId
      ).catch(err => console.error('Notification error:', err));
    }

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /events/:id (creator only)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = eventIdParamsSchema.parse(req.params);
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only creator can edit
    if (event.createdBy?.toString() !== userId) {
      return res.status(403).json({ error: 'Only the creator can edit this event' });
    }

    const data = createEventSchema.parse(req.body);

    // Update the event
    event.title = data.title;
    event.description = data.description;
    event.type = data.type;
    event.date = new Date(data.date);
    event.endDate = data.endDate ? new Date(data.endDate) : undefined;
    await event.save();

    await event.populate('createdBy', 'name email avatarUrl');

    // Send notification to household members
    const household = await Household.findById(event.householdId);
    const updater = await User.findById(userId);
    if (household && updater) {
      notificationService.notifyEventUpdated(
        household.members.map(m => m.toString()),
        userId,
        updater.name,
        data.title,
        event.householdId.toString()
      ).catch(err => console.error('Notification error:', err));
    }

    res.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /events/:id (creator only)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = eventIdParamsSchema.parse(req.params);
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only creator can delete
    if (event.createdBy?.toString() !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this event' });
    }

    await Event.deleteOne({ _id: event._id });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

