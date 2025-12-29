import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Expense, IExpenseShare } from '../models/Expense';
import { Settlement } from '../models/Settlement';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';
import { computeBalances } from '../utils/balances';
import { calculateExpenseInsights } from '../utils/expenseInsights';
import mongoose from 'mongoose';

const router = express.Router();

const expenseShareSchema = z.object({
  userId: z.string(),
  amount: z.number().min(0),
});

const createExpenseSchema = z.object({
  householdId: z.string(),
  description: z.string().min(1),
  totalAmount: z.number().min(0.01),
  paidBy: z.string(),
  participants: z.array(z.string()).min(1),
  splitMethod: z.enum(['even', 'manual']),
  shares: z.array(expenseShareSchema),
  date: z.string().datetime().or(z.date()),
  category: z.string().optional(),
});

// GET /expenses/household/:householdId
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

    const expenses = await Expense.find({
      householdId: req.params.householdId,
    })
      .populate('paidBy', 'name email avatarUrl')
      .populate('participants', 'name email avatarUrl')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
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

    const household = await Household.findById(req.params.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const expenses = await Expense.find({
      householdId: req.params.householdId,
    });
    const settlements = await Settlement.find({
      householdId: req.params.householdId,
    });

    const balances = computeBalances(expenses, settlements);

    // Calculate oldest expense date for each balance (when the debt started)
    const balancesWithSinceDate = balances.map(balance => {
      // Find all expenses that contribute to this balance
      const contributingExpenses = expenses.filter(expense => {
        const paidById = expense.paidBy.toString();
        return expense.shares.some(share => {
          const shareUserId = share.userId.toString();
          // Check if this expense creates debt from fromUserId to toUserId
          return (shareUserId === balance.fromUserId && paidById === balance.toUserId);
        });
      });

      // Find the oldest expense date (when expense was created, not when it was made)
      const oldestDate = contributingExpenses.length > 0
        ? contributingExpenses.reduce((oldest, expense) => {
            const expenseDate = expense.createdAt || expense.date;
            return expenseDate < oldest ? expenseDate : oldest;
          }, contributingExpenses[0].createdAt || contributingExpenses[0].date)
        : null;

      return {
        ...balance,
        sinceDate: oldestDate ? oldestDate.toISOString() : null,
      };
    });

    res.json(balancesWithSinceDate);
  } catch (error) {
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
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

    await expense.populate('paidBy', 'name email avatarUrl');
    await expense.populate('participants', 'name email avatarUrl');

    res.status(201).json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create expense error:', error);
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

    const household = await Household.findById(req.params.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const expenses = await Expense.find({
      householdId: req.params.householdId,
    });

    const insights = calculateExpenseInsights(expenses);

    res.json(insights);
  } catch (error) {
    console.error('Get insights error:', error);
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

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user is member of household
    const household = await Household.findById(expense.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Expense.deleteOne({ _id: expense._id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

