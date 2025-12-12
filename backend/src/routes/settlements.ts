import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Settlement } from '../models/Settlement';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

const createSettlementSchema = z.object({
  householdId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.number().min(0.01),
  method: z.string().optional(),
  note: z.string().optional(),
  date: z.string().datetime().or(z.date()),
});

// GET /settlements/household/:householdId
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

    if (!household.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const settlements = await Settlement.find({
      householdId: req.params.householdId,
    })
      .populate('fromUserId', 'name email')
      .populate('toUserId', 'name email')
      .sort({ date: -1 });

    res.json(settlements);
  } catch (error) {
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

    if (!household.members.some(m => m.toString() === userId)) {
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
    });
    await settlement.save();

    await settlement.populate('fromUserId', 'name email');
    await settlement.populate('toUserId', 'name email');

    res.status(201).json(settlement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

