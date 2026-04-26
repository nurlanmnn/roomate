import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Household, SUPPORTED_CURRENCIES } from '../models/Household';
import { Expense } from '../models/Expense';
import { Settlement } from '../models/Settlement';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { objectIdSchema, optionalTrimmedString, trimmedString } from '../utils/validation';

const router = express.Router();

const currencySchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .refine(
    (val) => (SUPPORTED_CURRENCIES as readonly string[]).includes(val),
    { message: 'Unsupported currency' }
  );

const createHouseholdSchema = z.object({
  name: trimmedString(1, 120),
  address: optionalTrimmedString(200),
  currency: currencySchema.optional(),
});

const joinHouseholdSchema = z.object({
  joinCode: z.string().trim().regex(/^[A-Za-z0-9]{6,12}$/),
});

const householdIdParamsSchema = z.object({
  id: objectIdSchema,
});

const householdMemberParamsSchema = z.object({
  id: objectIdSchema,
  memberId: objectIdSchema,
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

    const { name, address, currency } = createHouseholdSchema.parse(req.body);

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
      currency: currency || 'USD',
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

    // Notify existing members about new member
    const newMember = await User.findById(userId);
    if (newMember) {
      notificationService.notifyMemberAdded(
        household.members.map(m => m._id?.toString() || m.toString()),
        userId,
        newMember.name,
        household.name,
        household._id.toString()
      ).catch(err => console.error('Notification error:', err));
    }

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

    const { id } = householdIdParamsSchema.parse(req.params);
    const household = await Household.findById(id);
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /households/:id - Update household (owner only)
const updateHouseholdSchema = z.object({
  name: trimmedString(1, 120).optional(),
  address: optionalTrimmedString(200),
  currency: currencySchema.optional(),
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = householdIdParamsSchema.parse(req.params);
    const household = await Household.findById(id);
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
    if (updates.currency !== undefined && updates.currency !== household.currency) {
      // Currency is locked once the household has any expenses or settlements —
      // existing numeric amounts are not converted, so changing the currency
      // would silently relabel historical data.
      const [expenseCount, settlementCount] = await Promise.all([
        Expense.countDocuments({ householdId: household._id }),
        Settlement.countDocuments({ householdId: household._id }),
      ]);
      if (expenseCount > 0 || settlementCount > 0) {
        return res.status(409).json({
          error:
            'Currency is locked once this household has expenses or settlements. To use a different currency, create a new household.',
          code: 'CURRENCY_LOCKED',
          expenseCount,
          settlementCount,
        });
      }
      household.currency = updates.currency as typeof household.currency;
    }

    await household.save();

    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    // Notify members about household update
    notificationService.notifyHouseholdUpdated(
      household.members.map(m => m._id?.toString() || m.toString()),
      userId,
      household.name,
      household._id.toString()
    ).catch(err => console.error('Notification error:', err));

    res.json(household);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /households/:id/transaction-count — returns counts the mobile settings
// screen uses to decide whether currency can still be changed.
router.get('/:id/transaction-count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = householdIdParamsSchema.parse(req.params);
    const household = await Household.findById(id).select('_id members');
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    if (!household.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [expenseCount, settlementCount] = await Promise.all([
      Expense.countDocuments({ householdId: household._id }),
      Settlement.countDocuments({ householdId: household._id }),
    ]);

    res.json({ expenseCount, settlementCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Transaction count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /households/:id/notification-mute — set whether the *current user* mutes
// notifications for this specific household. Combined with each user's global
// notificationPreferences server-side.
const householdMuteSchema = z.object({
  muted: z.boolean(),
});

router.put('/:id/notification-mute', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = householdIdParamsSchema.parse(req.params);
    const { muted } = householdMuteSchema.parse(req.body);

    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    if (!household.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    const alreadyMuted = household.notificationMutedBy?.some((id) => id.toString() === userId);

    if (muted && !alreadyMuted) {
      household.notificationMutedBy = [...(household.notificationMutedBy || []), userIdObj];
      await household.save();
    } else if (!muted && alreadyMuted) {
      household.notificationMutedBy = (household.notificationMutedBy || []).filter(
        (id) => id.toString() !== userId
      );
      await household.save();
    }

    res.json({ muted: !!muted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Toggle household mute error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /households/:id/regenerate-invite — new join code (owner only)
router.post('/:id/regenerate-invite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = householdIdParamsSchema.parse(req.params);
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    if (household.ownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the owner can regenerate the invite code' });
    }

    let joinCode = generateJoinCode();
    let attempts = 0;
    while (
      (await Household.findOne({
        joinCode,
        _id: { $ne: household._id },
      })) &&
      attempts < 10
    ) {
      joinCode = generateJoinCode();
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique join code' });
    }

    household.joinCode = joinCode;
    await household.save();

    await household.populate('ownerId', 'name email avatarUrl');
    await household.populate('members', 'name email avatarUrl');

    res.json(household);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Regenerate invite error:', error);
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

    const { id } = householdIdParamsSchema.parse(req.params);
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Check if user is a member
    if (!household.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Not a member of this household' });
    }

    const isOwner = household.ownerId.toString() === userId;

    if (isOwner) {
      // Owner is leaving - transfer ownership or delete household
      if (household.members.length === 1) {
        // Owner is the only member - delete the household
        await Household.findByIdAndDelete(id);
        return res.json({ success: true, deleted: true });
      }

      // Transfer ownership to the next member (2nd person who joined)
      const remainingMembers = household.members.filter(m => m.toString() !== userId);
      const newOwner = remainingMembers[0]; // First remaining member becomes owner
      
      household.ownerId = newOwner;
      household.members = remainingMembers;
      await household.save();

      return res.json({ success: true, newOwnerId: newOwner.toString() });
    }

    // Regular member leaving
    household.members = household.members.filter(m => m.toString() !== userId);
    await household.save();

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
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

    const { id, memberId } = householdMemberParamsSchema.parse(req.params);
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

    // Notify the removed member
    notificationService.notifyMemberRemoved(
      memberId,
      household.name
    ).catch(err => console.error('Notification error:', err));

    res.json(household);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
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

    const { id } = householdIdParamsSchema.parse(req.params);
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Only owner can delete household
    if (household.ownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete the household' });
    }

    // Notify all members before deletion
    const memberIds = household.members.map(m => m.toString());
    const householdName = household.name;

    await Household.findByIdAndDelete(id);

    // Notify members about deletion
    notificationService.notifyHouseholdDeleted(
      memberIds,
      userId,
      householdName
    ).catch(err => console.error('Notification error:', err));

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Delete household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

