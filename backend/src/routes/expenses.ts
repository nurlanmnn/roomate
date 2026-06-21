import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Expense, IExpenseShare } from '../models/Expense';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { computeBalancesWithSince } from '../utils/balancesAggregate';
import { computeExpenseInsights } from '../utils/expenseInsightsAggregate';
import { computeHomeExpenseSummary } from '../utils/expenseHomeSummary';
import { checkHouseholdMember } from '../utils/householdAccess';
import { notificationService } from '../services/notificationService';
import mongoose from 'mongoose';
import { isoDateSchema, objectIdSchema, optionalTrimmedString, trimmedString } from '../utils/validation';

const router = express.Router();

const expenseShareSchema = z.object({
  userId: objectIdSchema,
  amount: z.number().min(0),
});

const createExpenseSchema = z.object({
  householdId: objectIdSchema,
  description: trimmedString(1, 200),
  totalAmount: z.number().min(0.01),
  paidBy: objectIdSchema,
  participants: z.array(objectIdSchema).min(1),
  splitMethod: z.enum(['even', 'manual']),
  shares: z.array(expenseShareSchema),
  date: isoDateSchema,
  category: optionalTrimmedString(80),
});

const updateExpenseSchema = z.object({
  description: trimmedString(1, 200),
  totalAmount: z.number().min(0.01),
  paidBy: objectIdSchema,
  participants: z.array(objectIdSchema).min(1),
  splitMethod: z.enum(['even', 'manual']),
  shares: z.array(expenseShareSchema),
  date: isoDateSchema,
  category: optionalTrimmedString(80),
});

const householdParamsSchema = z.object({
  householdId: objectIdSchema,
});

const expenseIdParamsSchema = z.object({
  id: objectIdSchema,
});

const householdExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).max(100000).optional(),
});

// GET /expenses/household/:householdId
// Optional ?limit=&skip= for pagination (newest first). Omit both for full list (e.g. home aggregates).
router.get('/household/:householdId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = householdParamsSchema.parse(req.params);
    const access = await checkHouseholdMember(householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const query = householdExpensesQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: 'Invalid query', details: query.error.flatten() });
    }

    const { limit, skip } = query.data;
    // Cap unpaginated reads so a large household can't pull thousands of fully
    // populated expense docs in one response. Callers that need the full list
    // (home aggregates) now go through the dedicated aggregation endpoints.
    const DEFAULT_UNPAGINATED_CAP = 500;
    const usePagination = limit !== undefined;

    const filter = { householdId };

    if (usePagination) {
      const take = limit ?? 50;
      const offset = skip ?? 0;
      const [items, total] = await Promise.all([
        Expense.find(filter)
          .populate('createdBy', 'name email avatarUrl')
          .populate('paidBy', 'name email avatarUrl')
          .populate('participants', 'name email avatarUrl')
          .sort({ date: -1 })
          .skip(offset)
          .limit(take)
          .lean()
          .exec(),
        Expense.countDocuments(filter),
      ]);
      res.json({ items, total });
      return;
    }

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'name email avatarUrl')
      .populate('paidBy', 'name email avatarUrl')
      .populate('participants', 'name email avatarUrl')
      .sort({ date: -1 })
      .limit(DEFAULT_UNPAGINATED_CAP)
      .lean()
      .exec();
    res.json(expenses);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /expenses/household/:householdId/balances
router.get('/household/:householdId/balances', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = householdParamsSchema.parse(req.params);
    const access = await checkHouseholdMember(householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const balancesWithSinceDate = await computeBalancesWithSince(householdId);

    res.json(balancesWithSinceDate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get balances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /expenses
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createExpenseSchema.parse(req.body);

    // Verify household exists and user is member
    const access = await checkHouseholdMember(data.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }
    const household = access.household;
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    // Validate participants are all members
    const participantIds = data.participants.map(p => p.toString());
    const memberIds = household.members.map(m => m.toString());
    
    for (const participantId of participantIds) {
      if (!memberIds.includes(participantId)) {
        return res.status(400).json({ error: `User ${participantId} is not a member of this household` });
      }
    }

    // Validate paidBy is a member
    if (!memberIds.includes(data.paidBy)) {
      return res.status(400).json({ error: 'Payer must be a member of the household' });
    }

    // Validate shares
    if (data.shares.length !== data.participants.length) {
      return res.status(400).json({ error: 'Number of shares must match number of participants' });
    }

    // Validate all share userIds are in participants
    const shareUserIds = data.shares.map(s => s.userId);
    for (const shareUserId of shareUserIds) {
      if (!participantIds.includes(shareUserId)) {
        return res.status(400).json({ error: 'All share userIds must be in participants' });
      }
    }

    // Validate sum of shares equals totalAmount
    const sumShares = data.shares.reduce((sum, share) => sum + share.amount, 0);
    if (Math.abs(sumShares - data.totalAmount) > 0.02) {
      return res.status(400).json({ error: 'Share amounts must add up to totalAmount' });
    }

    // Create expense
    const expense = new Expense({
      householdId: data.householdId,
      createdBy: userIdObjectId,
      description: data.description,
      totalAmount: data.totalAmount,
      paidBy: data.paidBy,
      participants: data.participants,
      splitMethod: data.splitMethod,
      shares: data.shares.map(share => ({
        userId: share.userId,
        amount: share.amount,
      })),
      date: new Date(data.date),
      category: data.category,
    });
    await expense.save();

    await expense.populate('createdBy', 'name email avatarUrl');
    await expense.populate('paidBy', 'name email avatarUrl');
    await expense.populate('participants', 'name email avatarUrl');

    // Send notification to household members
    const creator = await User.findById(userId);
    if (creator) {
      notificationService.notifyExpenseAdded(
        household.members.map(m => m.toString()),
        userId,
        creator.name,
        data.description,
        data.totalAmount,
        data.householdId,
        household.name
      ).catch(err => console.error('Notification error:', err));
    }

    res.status(201).json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /expenses/household/:householdId/home-summary — aggregates only (mobile home dashboard)
router.get('/household/:householdId/home-summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = householdParamsSchema.parse(req.params);
    const access = await checkHouseholdMember(householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const summary = await computeHomeExpenseSummary(householdId);
    res.json(summary);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get home expense summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /expenses/household/:householdId/insights
router.get('/household/:householdId/insights', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = householdParamsSchema.parse(req.params);
    const access = await checkHouseholdMember(householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const insights = await computeExpenseInsights(householdId);

    res.json(insights);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /expenses/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = expenseIdParamsSchema.parse(req.params);
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const access = await checkHouseholdMember(expense.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }
    const household = access.household;

    const creatorId = (expense as any).createdBy ? (expense as any).createdBy.toString() : expense.paidBy.toString();
    if (creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can edit this expense' });
    }

    const data = updateExpenseSchema.parse(req.body);

    const memberIds = household.members.map(m => m.toString());
    const participantIds = data.participants.map(p => p.toString());
    for (const pid of participantIds) {
      if (!memberIds.includes(pid)) {
        return res.status(400).json({ error: `User ${pid} is not a member of this household` });
      }
    }

    if (!memberIds.includes(data.paidBy)) {
      return res.status(400).json({ error: 'Payer must be a member of the household' });
    }

    if (data.shares.length !== data.participants.length) {
      return res.status(400).json({ error: 'Number of shares must match number of participants' });
    }

    const shareUserIds = data.shares.map(s => s.userId);
    for (const shareUserId of shareUserIds) {
      if (!participantIds.includes(shareUserId)) {
        return res.status(400).json({ error: 'All share userIds must be in participants' });
      }
    }

    const sumShares = data.shares.reduce((sum, share) => sum + share.amount, 0);
    if (Math.abs(sumShares - data.totalAmount) > 0.02) {
      return res.status(400).json({ error: 'Share amounts must add up to totalAmount' });
    }

    expense.description = data.description;
    expense.totalAmount = data.totalAmount;
    expense.paidBy = data.paidBy as any;
    expense.participants = data.participants as any;
    expense.splitMethod = data.splitMethod;
    expense.shares = data.shares.map(s => ({ userId: s.userId as any, amount: s.amount }));
    expense.date = new Date(data.date);
    expense.category = data.category;

    await expense.save();

    await expense.populate('createdBy', 'name email avatarUrl');
    await expense.populate('paidBy', 'name email avatarUrl');
    await expense.populate('participants', 'name email avatarUrl');

    res.json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /expenses/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = expenseIdParamsSchema.parse(req.params);
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user is member of household
    const access = await checkHouseholdMember(expense.householdId, userId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    // Only the creator of the expense can delete it.
    // For legacy expenses that don't have createdBy, fall back to paidBy to avoid blocking deletes.
    const creatorId = (expense as any).createdBy ? (expense as any).createdBy.toString() : expense.paidBy.toString();
    if (creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this expense' });
    }

    await Expense.deleteOne({ _id: expense._id });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

