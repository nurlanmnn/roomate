import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ChoreRotation } from '../models/ChoreRotation';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

const createChoreSchema = z.object({
  householdId: z.string(),
  name: z.string().min(1).max(100),
  rotationOrder: z.array(z.string()), // user IDs
  frequency: z.enum(['weekly', 'biweekly']),
  startDate: z.string().datetime().or(z.date()),
});

const updateChoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rotationOrder: z.array(z.string()).optional(),
  frequency: z.enum(['weekly', 'biweekly']).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
});

// Helper: get assignee index for a given date
function getAssigneeIndexForDate(chore: { startDate: Date; frequency: string; rotationOrder: mongoose.Types.ObjectId[] }, date: Date): number {
  const start = new Date(chore.startDate);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / msPerDay);
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const periodIndex = Math.floor(daysSinceStart / periodDays);
  const order = chore.rotationOrder || [];
  if (order.length === 0) return -1;
  const index = ((periodIndex % order.length) + order.length) % order.length;
  return index;
}

// GET /chores/household/:householdId — list chores with current assignee for "this week"
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const household = await Household.findById(req.params.householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chores = await ChoreRotation.find({ householdId: req.params.householdId })
      .populate('rotationOrder', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    const refDate = req.query.week ? new Date(req.query.week as string) : new Date();

    const list = chores.map((chore) => {
      const rotationOrder = (chore.rotationOrder as unknown as { _id: mongoose.Types.ObjectId; name: string }[]);
      const ids = rotationOrder.map((u: { _id: mongoose.Types.ObjectId }) => u._id);
      const index = getAssigneeIndexForDate(
        { startDate: chore.startDate, frequency: chore.frequency, rotationOrder: ids },
        refDate
      );
      const assignee = index >= 0 && index < rotationOrder.length ? rotationOrder[index] : null;
      return {
        _id: chore._id,
        householdId: chore.householdId,
        name: chore.name,
        rotationOrder: rotationOrder.map((u: { _id: mongoose.Types.ObjectId; name: string; email?: string; avatarUrl?: string }) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
        })),
        frequency: chore.frequency,
        startDate: chore.startDate,
        createdAt: chore.createdAt,
        currentAssignee: assignee ? { _id: assignee._id, name: assignee.name } : null,
      };
    });

    res.json(list);
  } catch (error) {
    console.error('Get chores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chores/household/:householdId/schedule — assignments for a date range (for calendar)
router.get('/household/:householdId/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const household = await Household.findById(req.params.householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to ? new Date(req.query.to as string) : new Date(from.getTime() + 28 * 24 * 60 * 60 * 1000);
    const fromTime = from.getTime();
    const toTime = to.getTime();
    const msPerDay = 24 * 60 * 60 * 1000;

    const chores = await ChoreRotation.find({ householdId: req.params.householdId })
      .populate('rotationOrder', 'name')
      .sort({ createdAt: 1 });

    const assignments: { choreId: string; choreName: string; assigneeId: string; assigneeName: string; periodStart: string; periodEnd: string }[] = [];

    for (const chore of chores) {
      const order = chore.rotationOrder as unknown as { _id: mongoose.Types.ObjectId; name: string }[];
      const ids = order.map((u) => u._id);
      const pDays = chore.frequency === 'biweekly' ? 14 : 7;
      const start = new Date(chore.startDate);
      start.setHours(0, 0, 0, 0);
      const startTime = start.getTime();
      // periodIndex such that period overlaps [from, to]
      let periodIndex = Math.floor((fromTime - startTime) / msPerDay / pDays);
      if (periodIndex < 0) periodIndex = 0;
      for (;;) {
        const periodStart = new Date(startTime + periodIndex * pDays * msPerDay);
        const periodEnd = new Date(periodStart.getTime() + pDays * msPerDay);
        if (periodStart.getTime() > toTime) break;
        const index = ((periodIndex % order.length) + order.length) % order.length;
        assignments.push({
          choreId: chore._id.toString(),
          choreName: chore.name,
          assigneeId: order[index]._id.toString(),
          assigneeName: order[index].name,
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: periodEnd.toISOString().slice(0, 10),
        });
        periodIndex++;
      }
    }

    res.json(assignments);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /chores
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = createChoreSchema.parse(req.body);

    const household = await Household.findById(data.householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startDate = new Date(data.startDate);
    startDate.setHours(0, 0, 0, 0);

    const chore = new ChoreRotation({
      householdId: data.householdId,
      name: data.name.trim(),
      rotationOrder: data.rotationOrder.map((id) => new mongoose.Types.ObjectId(id)),
      frequency: data.frequency,
      startDate,
    });
    await chore.save();
    await chore.populate('rotationOrder', 'name email avatarUrl');

    res.status(201).json(chore);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /chores/:id
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const chore = await ChoreRotation.findById(req.params.id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    const household = await Household.findById(chore.householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateChoreSchema.parse(req.body);
    if (data.name !== undefined) chore.name = data.name.trim();
    if (data.rotationOrder !== undefined) chore.rotationOrder = data.rotationOrder.map((id) => new mongoose.Types.ObjectId(id));
    if (data.frequency !== undefined) chore.frequency = data.frequency;
    if (data.startDate !== undefined) {
      const start = new Date(data.startDate);
      start.setHours(0, 0, 0, 0);
      chore.startDate = start;
    }
    await chore.save();
    await chore.populate('rotationOrder', 'name email avatarUrl');

    res.json(chore);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /chores/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const chore = await ChoreRotation.findById(req.params.id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    const household = await Household.findById(chore.householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await ChoreRotation.deleteOne({ _id: chore._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
