import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { EmailVerificationToken } from '../models/EmailVerificationToken';
import { Household } from '../models/Household';
import { authMiddleware, JWTPayload } from '../middleware/auth';
import { sendVerificationEmail } from '../config/mail';
import { config } from '../config/env';
import mongoose from 'mongoose';

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1),
});

const resendVerificationSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
});

const verifyOtpSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  otp: z.string().length(6),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().max(1000000).optional(), // Accept data URLs (base64 images can be large)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      passwordHash,
      isEmailVerified: false,
    });
    await user.save();

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    const verificationToken = new EmailVerificationToken({
      userId: user._id,
      otp,
      expiresAt,
    });
    await verificationToken.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, otp);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request resend
    }

    // Return user (no password)
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.warn('[auth/login] user not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.warn('[auth/login] password mismatch for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const payload: JWTPayload = { userId: user._id.toString() };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /auth/me (update profile)
router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = updateProfileSchema.parse(req.body);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (typeof data.name === 'string') {
      user.name = data.name.trim();
    }
    if (typeof data.avatarUrl === 'string') {
      user.avatarUrl = data.avatarUrl.trim();
    }
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/change-password
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = changePasswordSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/delete-account
router.post('/delete-account', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = deleteAccountSchema.parse(req.body);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userIdObj);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Prevent orphaning households
    const ownsHousehold = await Household.exists({ ownerId: userIdObj });
    if (ownsHousehold) {
      return res.status(400).json({
        error: 'You must transfer or delete your household(s) before deleting your account.',
      });
    }

    // Remove user from any household memberships
    await Household.updateMany(
      { members: userIdObj },
      { $pull: { members: userIdObj } }
    );

    // Cleanup verification tokens
    await EmailVerificationToken.deleteMany({ userId: userIdObj });

    // Delete user
    await User.deleteOne({ _id: userIdObj });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find OTP
    const verificationToken = await EmailVerificationToken.findOne({ 
      userId: user._id,
      otp,
    });
    
    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check expiration
    if (verificationToken.expiresAt < new Date()) {
      await EmailVerificationToken.deleteOne({ _id: verificationToken._id });
      return res.status(410).json({ error: 'OTP has expired' });
    }

    // Update user
    user.isEmailVerified = true;
    await user.save();

    // Delete OTP
    await EmailVerificationToken.deleteOne({ _id: verificationToken._id });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/resend-verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists and is not verified, a verification email has been sent' });
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Email is already verified' });
    }

    // Delete old OTPs
    await EmailVerificationToken.deleteMany({ userId: user._id });

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    const verificationToken = new EmailVerificationToken({
      userId: user._id,
      otp,
      expiresAt,
    });
    await verificationToken.save();

    // Send email
    try {
      await sendVerificationEmail(user.email, user.name, otp);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

