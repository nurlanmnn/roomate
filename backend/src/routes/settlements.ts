import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Settlement } from '../models/Settlement';
import { Household } from '../models/Household';
import { Expense } from '../models/Expense';
import { authMiddleware } from '../middleware/auth';
import { computeBalances } from '../utils/balances';
import { isoDateSchema, objectIdSchema, optionalTrimmedString } from '../utils/validation';

const router = express.Router();

const createSettlementSchema = z.object({
  householdId: objectIdSchema,
  fromUserId: objectIdSchema,
  toUserId: objectIdSchema,
  amount: z.number().min(0.01),
  method: optionalTrimmedString(120),
  note: optionalTrimmedString(2000),
  date: isoDateSchema,
  proofImageUrl: z.string().trim().max(1000000).optional(), // Accept data URLs (base64 images can be large)
});

const netBalanceSchema = z.object({
  householdId: objectIdSchema,
  otherUserId: objectIdSchema,
});

const householdParamsSchema = z.object({
  householdId: objectIdSchema,
});

const householdSettlementsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).max(100000).optional(),
  fromDate: isoDateSchema.optional(),
  toDate: isoDateSchema.optional(),
  toUserId: objectIdSchema.optional(),
  proofOnly: z
    .preprocess((v) => (v === 'true' || v === true ? true : v === 'false' || v === false ? false : v), z.boolean())
    .optional(),
});

// GET /settlements/household/:householdId
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

    const query = householdSettlementsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: 'Invalid query', details: query.error.flatten() });
    }

    const { limit, skip, fromDate, toDate, toUserId, proofOnly } = query.data;
    const filter: Record<string, unknown> = { householdId };

    if (fromDate || toDate) {
      filter.date = {
        ...(fromDate ? { $gte: new Date(fromDate) } : {}),
        ...(toDate ? { $lte: new Date(toDate) } : {}),
      };
    }
    if (toUserId) {
      filter.toUserId = toUserId;
    }
    if (proofOnly) {
      filter.proofImageUrl = { $exists: true, $nin: [null, ''] };
    }

    if (limit !== undefined) {
      const [items, total] = await Promise.all([
        Settlement.find(filter)
          .populate('fromUserId', 'name email avatarUrl')
          .populate('toUserId', 'name email avatarUrl')
          .sort({ date: -1 })
          .skip(skip ?? 0)
          .limit(limit)
          .exec(),
        Settlement.countDocuments(filter),
      ]);
      res.json({ items, total });
      return;
    }

    const settlements = await Settlement.find(filter)
      .populate('fromUserId', 'name email avatarUrl')
      .populate('toUserId', 'name email avatarUrl')
      .sort({ date: -1 })
      .exec();

    res.json(settlements);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /settlements
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createSettlementSchema.parse(req.body);

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate fromUserId and toUserId are members and different
    const memberIds = household.members.map(m => m.toString());
    if (!memberIds.includes(data.fromUserId)) {
      return res.status(400).json({ error: 'fromUserId must be a member of the household' });
    }
    if (!memberIds.includes(data.toUserId)) {
      return res.status(400).json({ error: 'toUserId must be a member of the household' });
    }
    if (data.fromUserId === data.toUserId) {
      return res.status(400).json({ error: 'fromUserId and toUserId must be different' });
    }

    // Create settlement
    const settlement = new Settlement({
      householdId: data.householdId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      method: data.method,
      note: data.note,
      date: new Date(data.date),
      proofImageUrl: data.proofImageUrl,
    });
    await settlement.save();

    await settlement.populate('fromUserId', 'name email avatarUrl');
    await settlement.populate('toUserId', 'name email avatarUrl');

    res.status(201).json(settlement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /settlements/net-balance
router.post('/net-balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = netBalanceSchema.parse(req.body);

    // Verify household exists and user is member
    const household = await Household.findById(data.householdId);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    if (!household.members.some(m => m.equals(userIdObjectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const otherUserIdObjectId = new mongoose.Types.ObjectId(data.otherUserId);
    if (!household.members.some(m => m.equals(otherUserIdObjectId))) {
      return res.status(400).json({ error: 'otherUserId must be a member of the household' });
    }

    if (userId === data.otherUserId) {
      return res.status(400).json({ error: 'Cannot net balance with yourself' });
    }

    // Get all expenses and settlements
    const expenses = await Expense.find({ householdId: data.householdId });
    const existingSettlements = await Settlement.find({ householdId: data.householdId });

    // Calculate raw debts (before settlements) between the two users
    let debtUserToOther = 0;
    let debtOtherToUser = 0;

    expenses.forEach(expense => {
      const paidById = expense.paidBy.toString();
      
      expense.shares.forEach(share => {
        const shareUserId = share.userId.toString();
        if (shareUserId === userId && paidById === data.otherUserId) {
          debtUserToOther += share.amount;
        } else if (shareUserId === data.otherUserId && paidById === userId) {
          debtOtherToUser += share.amount;
        }
      });
    });

    // Subtract existing settlements
    existingSettlements.forEach(settlement => {
      const fromId = settlement.fromUserId.toString();
      const toId = settlement.toUserId.toString();
      
      if (fromId === userId && toId === data.otherUserId) {
        debtUserToOther -= settlement.amount;
      } else if (fromId === data.otherUserId && toId === userId) {
        debtOtherToUser -= settlement.amount;
      }
    });

    // Calculate net balance
    const netBalance = debtUserToOther - debtOtherToUser;

    // If there are mutual debts (both > 0), create settlement to net them
    if (debtUserToOther > 0.01 && debtOtherToUser > 0.01) {
      const smallerDebt = Math.min(debtUserToOther, debtOtherToUser);
      
      // Create settlement for the smaller amount from the person who owes more
      // to the person who owes less. This nets out the smaller debt.
      // Example: A owes B $20, B owes A $15 -> Create settlement $15 from A to B
      // Result: A owes B $5, B owes A $0
      let fromUserId: string;
      let toUserId: string;
      
      if (debtUserToOther >= debtOtherToUser) {
        // User owes more, so user pays the smaller amount to other
        fromUserId = userId;
        toUserId = data.otherUserId;
      } else {
        // Other owes more, so other pays the smaller amount to user
        fromUserId = data.otherUserId;
        toUserId = userId;
      }

      const settlement = new Settlement({
        householdId: data.householdId,
        fromUserId,
        toUserId,
        amount: smallerDebt,
        method: 'Net Balance',
        note: `Automated net balance settlement`,
        date: new Date(),
      });
      await settlement.save();

      await settlement.populate('fromUserId', 'name email');
      await settlement.populate('toUserId', 'name email');

      // Calculate the new net balance after settlement
      // After settlement: the smaller debt is cancelled, leaving only the difference
      const newNetBalance = Math.abs(debtUserToOther - debtOtherToUser);
      
      res.status(201).json({
        settlement,
        newNetBalance: newNetBalance,
      });
    } else {
      return res.status(400).json({ error: 'No mutual debts to net. One person already owes the other.' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Net balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

