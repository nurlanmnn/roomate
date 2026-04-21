import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ChoreRotation } from '../models/ChoreRotation';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';
import { isoDateSchema, objectIdSchema, trimmedString } from '../utils/validation';

const router = express.Router();

const createChoreSchema = z.object({
  householdId: objectIdSchema,
  name: trimmedString(1, 100),
  rotationOrder: z.array(objectIdSchema).min(1), // user IDs
  frequency: z.enum(['weekly', 'biweekly']),
  startDate: isoDateSchema,
});

const updateChoreSchema = z.object({
  name: trimmedString(1, 100).optional(),
  rotationOrder: z.array(objectIdSchema).min(1).optional(),
  frequency: z.enum(['weekly', 'biweekly']).optional(),
  startDate: isoDateSchema.optional(),
});

const householdParamsSchema = z.object({
  householdId: objectIdSchema,
});

const choreIdParamsSchema = z.object({
  id: objectIdSchema,
});

const choresWeekQuerySchema = z.object({
  week: isoDateSchema.optional(),
});

const choresScheduleQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper: get assignee index for a given date
function getAssigneeIndexForDate(chore: { startDate: Date; frequency: string; rotationOrder: mongoose.Types.ObjectId[] }, date: Date): number {
  const start = new Date(chore.startDate);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  // When `date` falls before the rotation's start date, the raw periodIndex
  // is negative and JS's modulo wraps backwards (e.g. -1 % 3 === -1, which
  // would then point at the LAST person in the rotation). Clamp to 0 so the
  // UI shows whoever is first in the rotation as the upcoming assignee —
  // matches the behaviour of the /schedule endpoint below.
  const periodIndex = Math.max(0, Math.floor(daysSinceStart / periodDays));
  const order = chore.rotationOrder || [];
  if (order.length === 0) return -1;
  const index = periodIndex % order.length;
  return index;
}

/** Midnight of the first day of the rotation period containing `date`. */
function getPeriodStartForDate(chore: { startDate: Date; frequency: string }, date: Date): Date {
  const start = new Date(chore.startDate);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const periodDays = chore.frequency === 'biweekly' ? 14 : 7;
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  // Mirror the assignee clamp: treat pre-start dates as period 0 so the UI's
  // "this week" toggle still targets a consistent period record.
  const periodIndex = Math.max(0, Math.floor(daysSinceStart / periodDays));
  return new Date(start.getTime() + periodIndex * periodDays * MS_PER_DAY);
}

/** True when `completions` contains a record for the exact `periodStart` date. */
function isPeriodCompleted(completions: { periodStart: Date }[] | undefined, periodStart: Date): boolean {
  if (!completions || completions.length === 0) return false;
  const target = periodStart.getTime();
  return completions.some((c) => new Date(c.periodStart).getTime() === target);
}

// GET /chores/household/:householdId — list chores with current assignee for "this week"
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { householdId } = householdParamsSchema.parse(req.params);
    const { week } = choresWeekQuerySchema.parse(req.query);
    const household = await Household.findById(householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chores = await ChoreRotation.find({ householdId })
      .populate('rotationOrder', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    const refDate = week ?? new Date();

    const list = chores.map((chore) => {
      const rotationOrder = (chore.rotationOrder as unknown as { _id: mongoose.Types.ObjectId; name: string }[]);
      const ids = rotationOrder.map((u: { _id: mongoose.Types.ObjectId }) => u._id);
      const index = getAssigneeIndexForDate(
        { startDate: chore.startDate, frequency: chore.frequency, rotationOrder: ids },
        refDate
      );
      const assignee = index >= 0 && index < rotationOrder.length ? rotationOrder[index] : null;
      const currentPeriodStart = getPeriodStartForDate(
        { startDate: chore.startDate, frequency: chore.frequency },
        refDate
      );
      const completions = chore.completions ?? [];
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
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodCompleted: isPeriodCompleted(completions, currentPeriodStart),
        completions: completions.map((c) => ({
          periodStart: new Date(c.periodStart).toISOString(),
          completedBy: c.completedBy?.toString(),
          completedAt: c.completedAt ? new Date(c.completedAt).toISOString() : null,
        })),
      };
    });

    res.json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get chores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chores/household/:householdId/schedule — assignments for a date range (for calendar)
router.get('/household/:householdId/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { householdId } = householdParamsSchema.parse(req.params);
    const { from, to } = choresScheduleQuerySchema.parse(req.query);
    const household = await Household.findById(householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fromDate = from ?? new Date();
    const toDate = to ?? new Date(fromDate.getTime() + 28 * 24 * 60 * 60 * 1000);
    const fromTime = fromDate.getTime();
    const toTime = toDate.getTime();
    const msPerDay = 24 * 60 * 60 * 1000;

    const chores = await ChoreRotation.find({ householdId })
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
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

    const { id } = choreIdParamsSchema.parse(req.params);
    const chore = await ChoreRotation.findById(id);
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

const completeBodySchema = z.object({
  /** Optional — if omitted, server uses the current period relative to "now". */
  periodStart: isoDateSchema.optional(),
});

/** Shared handler body for complete / uncomplete endpoints. */
async function toggleChoreCompletion(
  req: Request,
  res: Response,
  action: 'complete' | 'uncomplete'
) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = choreIdParamsSchema.parse(req.params);
    const { periodStart: periodStartInput } = completeBodySchema.parse(req.body ?? {});

    const chore = await ChoreRotation.findById(id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    const household = await Household.findById(chore.householdId);
    if (!household) return res.status(404).json({ error: 'Household not found' });

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (!household.members.some((m: mongoose.Types.ObjectId) => m.equals(userIdObj))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const refDate = periodStartInput ? new Date(periodStartInput) : new Date();
    const periodStart = getPeriodStartForDate(
      { startDate: chore.startDate, frequency: chore.frequency },
      refDate
    );
    const periodTime = periodStart.getTime();

    if (action === 'complete') {
      const already = (chore.completions ?? []).some(
        (c) => new Date(c.periodStart).getTime() === periodTime
      );
      if (!already) {
        chore.completions.push({
          periodStart,
          completedBy: userIdObj,
          completedAt: new Date(),
        });
      }
    } else {
      chore.completions = (chore.completions ?? []).filter(
        (c) => new Date(c.periodStart).getTime() !== periodTime
      ) as typeof chore.completions;
    }

    await chore.save();
    await chore.populate('rotationOrder', 'name email avatarUrl');

    // Return the same shape as the list endpoint so the client can just swap
    // the updated record into its cached snapshot.
    const rotationOrder = chore.rotationOrder as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      email?: string;
      avatarUrl?: string;
    }[];
    const ids = rotationOrder.map((u) => u._id);
    const assigneeIndex = getAssigneeIndexForDate(
      { startDate: chore.startDate, frequency: chore.frequency, rotationOrder: ids },
      new Date()
    );
    const assignee =
      assigneeIndex >= 0 && assigneeIndex < rotationOrder.length
        ? rotationOrder[assigneeIndex]
        : null;
    const nowPeriodStart = getPeriodStartForDate(
      { startDate: chore.startDate, frequency: chore.frequency },
      new Date()
    );

    res.json({
      _id: chore._id,
      householdId: chore.householdId,
      name: chore.name,
      rotationOrder: rotationOrder.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
      })),
      frequency: chore.frequency,
      startDate: chore.startDate,
      createdAt: chore.createdAt,
      currentAssignee: assignee ? { _id: assignee._id, name: assignee.name } : null,
      currentPeriodStart: nowPeriodStart.toISOString(),
      currentPeriodCompleted: isPeriodCompleted(chore.completions, nowPeriodStart),
      completions: (chore.completions ?? []).map((c) => ({
        periodStart: new Date(c.periodStart).toISOString(),
        completedBy: c.completedBy?.toString(),
        completedAt: c.completedAt ? new Date(c.completedAt).toISOString() : null,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error(`${action} chore error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /chores/:id/complete — mark the current (or given) period as done
router.post('/:id/complete', authMiddleware, (req, res) => toggleChoreCompletion(req, res, 'complete'));

// POST /chores/:id/uncomplete — unmark the current (or given) period
router.post('/:id/uncomplete', authMiddleware, (req, res) => toggleChoreCompletion(req, res, 'uncomplete'));

// DELETE /chores/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = choreIdParamsSchema.parse(req.params);
    const chore = await ChoreRotation.findById(id);
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Delete chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
