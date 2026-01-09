import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';
import crypto from 'crypto';

const router = express.Router();

const createHouseholdSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

const joinHouseholdSchema = z.object({
  joinCode: z.string().min(1),
});

// Generate unique join code
const generateJoinCode = (): string => {
  return crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
};

// GET /households
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const households = await Household.find({
      members: new mongoose.Types.ObjectId(userId),
    }).populate('ownerId', 'name email avatarUrl').populate('members', 'name email avatarUrl');

    res.json(households);
  } catch (error) {
    console.error('Get households error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /households
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, address } = createHouseholdSchema.parse(req.body);

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (await Household.findOne({ joinCode }) && attempts < 10) {
      joinCode = generateJoinCode();
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique join code' });
    }

    const household = new Household({
      name,
      address,
      ownerId: userId,
      members: [userId],
      joinCode,
    });
    await household.save();

    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    res.status(201).json(household);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /households/join
router.post('/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { joinCode } = joinHouseholdSchema.parse(req.body);

    const household = await Household.findOne({ joinCode: joinCode.toUpperCase() });
    if (!household) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    // Check if already a member
    if (household.members.some(m => m.toString() === userId)) {
      await household.populate('ownerId', 'name email');
      await household.populate('members', 'name email');
      return res.json(household);
    }

    // Add user to members
    household.members.push(userIdObj);
    await household.save();

    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    res.json(household);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Join household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /households/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Check if user is a member
    if (!household.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    res.json(household);
  } catch (error) {
    console.error('Get household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /households/:id - Update household (owner only)
const updateHouseholdSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Only owner can update household
    if (household.ownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the owner can update household settings' });
    }

    const updates = updateHouseholdSchema.parse(req.body);

    if (updates.name !== undefined) {
      household.name = updates.name;
    }
    if (updates.address !== undefined) {
      household.address = updates.address;
    }

    await household.save();

    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    res.json(household);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /households/:id/leave
router.post('/:id/leave', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Check if user is a member
    if (!household.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Not a member of this household' });
    }

    // Check if user is owner
    if (household.ownerId.toString() === userId) {
      return res.status(400).json({ error: 'Owner cannot leave the household' });
    }

    // Remove user from members
    household.members = household.members.filter(m => m.toString() !== userId);
    await household.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Leave household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /households/:id/members/:memberId - Remove a member (owner only)
router.delete('/:id/members/:memberId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, memberId } = req.params;
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Only owner can remove members
    if (household.ownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the owner can remove members' });
    }

    // Prevent removing the owner from the members list
    if (household.ownerId.toString() === memberId) {
      return res.status(400).json({ error: 'Owner cannot be removed from the household' });
    }

    const beforeCount = household.members.length;
    household.members = household.members.filter((m) => m.toString() !== memberId);

    // If no change, member was not found
    if (household.members.length === beforeCount) {
      return res.status(404).json({ error: 'Member not found in this household' });
    }

    await household.save();
    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    res.json(household);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /households/:id - Delete household (owner only)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Only owner can delete household
    if (household.ownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete the household' });
    }

    await Household.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

