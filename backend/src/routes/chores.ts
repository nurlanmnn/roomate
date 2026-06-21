import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ChoreRotation } from '../models/ChoreRotation';
import { authMiddleware } from '../middleware/auth';
import { checkHouseholdMember } from '../utils/householdAccess';
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

/** Monday 00:00 of the calendar week containing `startDate`. */
function getRotationAnchor(startDate: Date): Date {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// Helper: get assignee index for a given date
function getAssigneeIndexForDate(chore: { startDate: Date; frequency: string; rotationOrder: mongoose.Types.ObjectId[] }, date: Date): number {
  const start = getRotationAnchor(chore.startDate);
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
  const start = getRotationAnchor(chore.startDate);
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

function filterRotationToMembers(
  rotationOrder: mongoose.Types.ObjectId[],
  memberIds: mongoose.Types.ObjectId[]
): mongoose.Types.ObjectId[] {
  const memberSet = new Set(memberIds.map((id) => id.toString()));
  return rotationOrder.filter((id) => memberSet.has(id.toString()));
}

function validateRotationOrder(
  rotationOrder: mongoose.Types.ObjectId[],
  memberIds: mongoose.Types.ObjectId[]
): string | null {
  if (rotationOrder.length < 1) return 'Rotation must include at least one member';
  const memberSet = new Set(memberIds.map((id) => id.toString()));
  for (const id of rotationOrder) {
    if (!memberSet.has(id.toString())) return 'Rotation includes a user who is not in this household';
  }
  return null;
}

// GET /chores/household/:householdId — list chores with current assignee for "this week"
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { householdId } = householdParamsSchema.parse(req.params);
    const { week } = choresWeekQuerySchema.parse(req.query);
    const access = await checkHouseholdMember(householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const chores = await ChoreRotation.find({ householdId })
      .populate('rotationOrder', 'name email avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    const refDate = week ?? new Date();
    const memberIds = access.household.members;

    const list = chores.map((chore) => mapChoreToListItem(chore, refDate, memberIds));

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
    const access = await checkHouseholdMember(householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const fromDate = from ?? new Date();
    const toDate = to ?? new Date(fromDate.getTime() + 28 * 24 * 60 * 60 * 1000);
    const fromTime = fromDate.getTime();
    const toTime = toDate.getTime();
    const msPerDay = 24 * 60 * 60 * 1000;

    const chores = await ChoreRotation.find({ householdId })
      .populate('rotationOrder', 'name')
      .sort({ createdAt: 1 })
      .lean();

    const assignments: { choreId: string; choreName: string; assigneeId: string; assigneeName: string; periodStart: string; periodEnd: string }[] = [];

    for (const chore of chores) {
      const order = chore.rotationOrder as unknown as { _id: mongoose.Types.ObjectId; name: string }[];
      const ids = order.map((u) => u._id);
      const pDays = chore.frequency === 'biweekly' ? 14 : 7;
      const start = getRotationAnchor(chore.startDate);
      const startTime = start.getTime();
      // periodIndex such that period overlaps [from, to]
      let periodIndex = Math.floor((fromTime - startTime) / msPerDay / pDays);
      if (periodIndex < 0) periodIndex = 0;
      for (;;) {
        const periodStart = new Date(startTime + periodIndex * pDays * msPerDay);
        const periodEnd = new Date(periodStart.getTime() + pDays * msPerDay);
        if (periodStart.getTime() > toTime) break;
        const index = ((periodIndex % order.length) + order.length) % order.length;
        const defaultAssignee = order[index];
        const override = findOverrideForPeriod(chore.periodOverrides, periodStart);
        const assignee = override
          ? order.find((u) => u._id.toString() === override.assigneeId.toString()) ?? defaultAssignee
          : defaultAssignee;
        assignments.push({
          choreId: chore._id.toString(),
          choreName: chore.name,
          assigneeId: assignee._id.toString(),
          assigneeName: assignee.name,
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

    const access = await checkHouseholdMember(data.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const rotationOrder = data.rotationOrder.map((id) => new mongoose.Types.ObjectId(id));
    const rotationError = validateRotationOrder(rotationOrder, access.household.members);
    if (rotationError) {
      return res.status(400).json({ error: rotationError });
    }

    const startDate = new Date(data.startDate);
    startDate.setHours(0, 0, 0, 0);

    const chore = new ChoreRotation({
      householdId: data.householdId,
      name: data.name.trim(),
      rotationOrder,
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

    const access = await checkHouseholdMember(chore.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const data = updateChoreSchema.parse(req.body);
    if (data.name !== undefined) chore.name = data.name.trim();
    if (data.rotationOrder !== undefined) {
      const rotationOrder = data.rotationOrder.map((id) => new mongoose.Types.ObjectId(id));
      const rotationError = validateRotationOrder(rotationOrder, access.household.members);
      if (rotationError) {
        return res.status(400).json({ error: rotationError });
      }
      chore.rotationOrder = rotationOrder;
    }
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

const overrideBodySchema = z.object({
  periodStart: isoDateSchema,
  assigneeId: objectIdSchema,
});

type PopulatedRotationMember = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  avatarUrl?: string;
};

function findOverrideForPeriod(
  periodOverrides: { periodStart: Date; assigneeId: mongoose.Types.ObjectId }[] | undefined,
  periodStart: Date
): { periodStart: Date; assigneeId: mongoose.Types.ObjectId } | null {
  if (!periodOverrides || periodOverrides.length === 0) return null;
  const target = periodStart.getTime();
  return (
    periodOverrides.find((o) => new Date(o.periodStart).getTime() === target) ?? null
  );
}

/** Resolve assignee for a date, applying period overrides when present. */
function resolveAssigneeForPeriod(
  chore: {
    startDate: Date;
    frequency: string;
    rotationOrder: mongoose.Types.ObjectId[];
    periodOverrides?: { periodStart: Date; assigneeId: mongoose.Types.ObjectId }[];
  },
  refDate: Date,
  populatedOrder: PopulatedRotationMember[]
): PopulatedRotationMember | null {
  const periodStart = getPeriodStartForDate(
    { startDate: chore.startDate, frequency: chore.frequency },
    refDate
  );
  const override = findOverrideForPeriod(chore.periodOverrides, periodStart);
  if (override) {
    const member = populatedOrder.find(
      (u) => u._id.toString() === override.assigneeId.toString()
    );
    return member ?? null;
  }
  const index =
    chore.rotationOrder.length > 0
      ? getAssigneeIndexForDate(
          { startDate: chore.startDate, frequency: chore.frequency, rotationOrder: chore.rotationOrder },
          refDate
        )
      : -1;
  return index >= 0 && index < populatedOrder.length ? populatedOrder[index] : null;
}

function mapChoreToListItem(
  chore: {
    _id: mongoose.Types.ObjectId;
    householdId: mongoose.Types.ObjectId;
    name: string;
    frequency: string;
    startDate: Date;
    createdAt: Date;
    completions?: { periodStart: Date; completedBy?: mongoose.Types.ObjectId; completedAt?: Date }[];
    periodOverrides?: { periodStart: Date; assigneeId: mongoose.Types.ObjectId; createdBy: mongoose.Types.ObjectId }[];
    rotationOrder: unknown;
  },
  refDate: Date,
  memberIds: mongoose.Types.ObjectId[]
) {
  const populatedOrder = chore.rotationOrder as unknown as PopulatedRotationMember[];
  const allIds = populatedOrder.map((u) => u._id);
  const filteredIds = filterRotationToMembers(allIds, memberIds);
  const filteredIdSet = new Set(filteredIds.map((id) => id.toString()));
  const rotationOrder = populatedOrder.filter((u) => filteredIdSet.has(u._id.toString()));
  const assignee = resolveAssigneeForPeriod(
    {
      startDate: chore.startDate,
      frequency: chore.frequency,
      rotationOrder: filteredIds,
      periodOverrides: chore.periodOverrides,
    },
    refDate,
    rotationOrder
  );
  const currentPeriodStart = getPeriodStartForDate(
    { startDate: chore.startDate, frequency: chore.frequency },
    refDate
  );
  const completions = chore.completions ?? [];
  const periodOverrides = chore.periodOverrides ?? [];
  return {
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
    currentPeriodStart: currentPeriodStart.toISOString(),
    currentPeriodCompleted: isPeriodCompleted(completions, currentPeriodStart),
    completions: completions.map((c) => ({
      periodStart: new Date(c.periodStart).toISOString(),
      completedBy: c.completedBy?.toString(),
      completedAt: c.completedAt ? new Date(c.completedAt).toISOString() : null,
    })),
    periodOverrides: periodOverrides.map((o) => ({
      periodStart: new Date(o.periodStart).toISOString(),
      assigneeId: o.assigneeId.toString(),
      createdBy: o.createdBy.toString(),
    })),
  };
}

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

    const access = await checkHouseholdMember(chore.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }
    const userIdObj = new mongoose.Types.ObjectId(userId);

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

    res.json(mapChoreToListItem(chore, new Date(), access.household.members));
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

// POST /chores/:id/override — swap assignee for a specific period
router.post('/:id/override', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = choreIdParamsSchema.parse(req.params);
    const { periodStart: periodStartInput, assigneeId } = overrideBodySchema.parse(req.body);

    const chore = await ChoreRotation.findById(id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    const access = await checkHouseholdMember(chore.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const assigneeIdObj = new mongoose.Types.ObjectId(assigneeId);
    const memberSet = new Set(access.household.members.map((m) => m.toString()));
    if (!memberSet.has(assigneeId)) {
      return res.status(400).json({ error: 'Assignee is not a member of this household' });
    }

    const periodStart = getPeriodStartForDate(
      { startDate: chore.startDate, frequency: chore.frequency },
      new Date(periodStartInput)
    );
    const periodTime = periodStart.getTime();

    const overrides = chore.periodOverrides ?? [];
    const existingIdx = overrides.findIndex(
      (o) => new Date(o.periodStart).getTime() === periodTime
    );
    const entry = {
      periodStart,
      assigneeId: assigneeIdObj,
      createdBy: new mongoose.Types.ObjectId(userId),
    };
    if (existingIdx >= 0) {
      overrides[existingIdx] = entry;
    } else {
      overrides.push(entry);
    }
    chore.periodOverrides = overrides;

    await chore.save();
    await chore.populate('rotationOrder', 'name email avatarUrl');

    res.json(mapChoreToListItem(chore, new Date(), access.household.members));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Override chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /chores/:id/override — remove assignee override for a period
router.delete('/:id/override', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = choreIdParamsSchema.parse(req.params);
    const { periodStart: periodStartInput } = overrideBodySchema.pick({ periodStart: true }).parse(req.body);

    const chore = await ChoreRotation.findById(id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    const access = await checkHouseholdMember(chore.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const periodStart = getPeriodStartForDate(
      { startDate: chore.startDate, frequency: chore.frequency },
      new Date(periodStartInput)
    );
    const periodTime = periodStart.getTime();

    chore.periodOverrides = (chore.periodOverrides ?? []).filter(
      (o) => new Date(o.periodStart).getTime() !== periodTime
    ) as typeof chore.periodOverrides;

    await chore.save();
    await chore.populate('rotationOrder', 'name email avatarUrl');

    res.json(mapChoreToListItem(chore, new Date(), access.household.members));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Clear override chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /chores/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = choreIdParamsSchema.parse(req.params);
    const chore = await ChoreRotation.findById(id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    const access = await checkHouseholdMember(chore.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
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
