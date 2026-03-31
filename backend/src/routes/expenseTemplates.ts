import express, { Request, Response } from 'express';
import { z } from 'zod';
import { ExpenseTemplate } from '../models/ExpenseTemplate';
import { Household } from '../models/Household';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';
import { objectIdSchema, optionalTrimmedString, trimmedString } from '../utils/validation';

const router = express.Router();

const expenseTemplateShareSchema = z.object({
  userId: objectIdSchema,
  amount: z.number().min(0).optional(),
});

const createExpenseTemplateSchema = z.object({
  householdId: objectIdSchema.optional(),
  name: trimmedString(1, 120),
  description: optionalTrimmedString(2000),
  category: optionalTrimmedString(80),
  splitMethod: z.enum(['even', 'manual']),
  defaultParticipants: z.array(objectIdSchema).min(1),
  defaultShares: z.array(expenseTemplateShareSchema).optional(),
});

const updateExpenseTemplateSchema = createExpenseTemplateSchema.partial().extend({
  name: trimmedString(1, 120).optional(),
});

const templateIdParamsSchema = z.object({
  id: objectIdSchema,
});

const templateQuerySchema = z.object({
  householdId: objectIdSchema.optional(),
});

// GET /expense-templates - Get all templates for user (household-specific and user-specific)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { householdId } = templateQuerySchema.parse(req.query);

    // Build query: user's templates, optionally filtered by household
    const query: any = {
      $or: [
        { userId: userId }, // User's personal templates
      ],
    };

    if (householdId) {
      // Also include household templates
      query.$or.push({ householdId: householdId });
    }

    const templates = await ExpenseTemplate.find(query)
      .populate('defaultParticipants', 'name email avatarUrl')
      .sort({ updatedAt: -1 });

    res.json(templates);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get expense templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /expense-templates/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = templateIdParamsSchema.parse(req.params);
    const template = await ExpenseTemplate.findById(id)
      .populate('defaultParticipants', 'name email avatarUrl');

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check access: user must be the creator or household member
    if (template.userId.toString() !== userId) {
      if (template.householdId) {
        const household = await Household.findById(template.householdId);
        if (!household || !household.members.some(m => m.toString() === userId)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get expense template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /expense-templates
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createExpenseTemplateSchema.parse(req.body);

    // Validate household access if householdId is provided
    if (data.householdId) {
      const household = await Household.findById(data.householdId);
      if (!household) {
        return res.status(404).json({ error: 'Household not found' });
      }

      const userIdObjectId = new mongoose.Types.ObjectId(userId);
      if (!household.members.some(m => m.equals(userIdObjectId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate participants are household members
      const memberIds = household.members.map(m => m.toString());
      for (const participantId of data.defaultParticipants) {
        if (!memberIds.includes(participantId)) {
          return res.status(400).json({ error: `User ${participantId} is not a member of this household` });
        }
      }
    }

    // Validate shares if manual split
    if (data.splitMethod === 'manual' && data.defaultShares) {
      if (data.defaultShares.length !== data.defaultParticipants.length) {
        return res.status(400).json({ error: 'Number of shares must match number of participants' });
      }

      const shareUserIds = data.defaultShares.map(s => s.userId);
      for (const shareUserId of shareUserIds) {
        if (!data.defaultParticipants.includes(shareUserId)) {
          return res.status(400).json({ error: 'All share userIds must be in participants' });
        }
      }
    }

    const template = new ExpenseTemplate({
      ...data,
      userId,
      householdId: data.householdId || undefined,
    });

    await template.save();
    await template.populate('defaultParticipants', 'name email avatarUrl');

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create expense template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /expense-templates/:id
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = templateIdParamsSchema.parse(req.params);
    const template = await ExpenseTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Only creator can update
    if (template.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateExpenseTemplateSchema.parse(req.body);

    // Validate household access if householdId is being updated
    if (data.householdId) {
      const household = await Household.findById(data.householdId);
      if (!household) {
        return res.status(404).json({ error: 'Household not found' });
      }

      const userIdObjectId = new mongoose.Types.ObjectId(userId);
      if (!household.members.some(m => m.equals(userIdObjectId))) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Validate participants if being updated
    if (data.defaultParticipants && data.householdId) {
      const household = await Household.findById(data.householdId);
      if (household) {
        const memberIds = household.members.map(m => m.toString());
        for (const participantId of data.defaultParticipants) {
          if (!memberIds.includes(participantId)) {
            return res.status(400).json({ error: `User ${participantId} is not a member of this household` });
          }
        }
      }
    }

    // Validate shares if manual split
    if (data.splitMethod === 'manual' && data.defaultShares && data.defaultParticipants) {
      if (data.defaultShares.length !== data.defaultParticipants.length) {
        return res.status(400).json({ error: 'Number of shares must match number of participants' });
      }

      const shareUserIds = data.defaultShares.map(s => s.userId);
      for (const shareUserId of shareUserIds) {
        if (!data.defaultParticipants.includes(shareUserId)) {
          return res.status(400).json({ error: 'All share userIds must be in participants' });
        }
      }
    }

    Object.assign(template, data);
    await template.save();
    await template.populate('defaultParticipants', 'name email avatarUrl');

    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update expense template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /expense-templates/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = templateIdParamsSchema.parse(req.params);
    const template = await ExpenseTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Only creator can delete
    if (template.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await template.deleteOne();
    res.json({ message: 'Template deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Delete expense template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

