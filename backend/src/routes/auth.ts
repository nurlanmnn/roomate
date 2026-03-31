import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { EmailVerificationToken } from '../models/EmailVerificationToken';
import { Household } from '../models/Household';
import { authMiddleware, JWTPayload } from '../middleware/auth';
import { sendVerificationEmail, sendEmailChangeVerificationEmail, sendPasswordResetEmail } from '../config/mail';
import { config } from '../config/env';
import mongoose from 'mongoose';
import { emailSchema, optionalTrimmedString, otpSchema, trimmedString } from '../utils/validation';
import { otpRateLimiter } from '../middleware/security';

const router = express.Router();
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

const generateOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const hashOtp = (otp: string): string => crypto.createHash('sha256').update(otp).digest('hex');

const createExpiresAt = (): Date => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiresAt;
};

const buildOtpToken = (data: {
  userId: mongoose.Types.ObjectId;
  otp: string;
  newEmail?: string;
  passwordReset?: boolean;
}) =>
  new EmailVerificationToken({
    userId: data.userId,
    otpHash: hashOtp(data.otp),
    newEmail: data.newEmail,
    passwordReset: data.passwordReset,
    expiresAt: createExpiresAt(),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
  });

const matchesOtp = (token: { otpHash?: string; otp?: string }, otp: string): boolean =>
  token.otpHash === hashOtp(otp) || token.otp === otp;

const registerFailedOtpAttempt = async (token: InstanceType<typeof EmailVerificationToken>) => {
  token.attempts += 1;
  if (token.attempts >= token.maxAttempts) {
    await EmailVerificationToken.deleteOne({ _id: token._id });
    return false;
  }

  await token.save();
  return true;
};

const signupSchema = z.object({
  name: trimmedString(1, 80),
  email: emailSchema,
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const resendVerificationSchema = z.object({
  email: emailSchema,
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

const updateProfileSchema = z.object({
  name: trimmedString(1, 80).optional(),
  avatarUrl: z.string().trim().max(1000000).optional(), // Accept data URLs (base64 images can be large)
});

const requestEmailChangeSchema = z.object({
  newEmail: emailSchema,
});

const confirmEmailChangeSchema = z.object({
  newEmail: emailSchema,
  otp: otpSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: z.string().min(8),
});

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
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
    const otp = generateOtp();
    const verificationToken = buildOtpToken({
      userId: user._id,
      otp,
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

// POST /auth/request-email-change (send OTP to new address; must confirm with /confirm-email-change)
router.post('/request-email-change', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { newEmail } = requestEmailChangeSchema.parse(req.body);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userIdObj);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (newEmail === user.email) {
      return res.status(400).json({ error: 'This is already your email address' });
    }

    const taken = await User.findOne({
      email: newEmail,
      _id: { $ne: userIdObj },
    });
    if (taken) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    await EmailVerificationToken.deleteMany({ userId: userIdObj });

    const otp = generateOtp();
    const verificationToken = buildOtpToken({
      userId: userIdObj,
      otp,
      newEmail,
    });
    await verificationToken.save();

    try {
      await sendEmailChangeVerificationEmail(newEmail, user.name, otp);
    } catch (emailError) {
      console.error('Failed to send email change verification:', emailError);
      await EmailVerificationToken.deleteOne({ _id: verificationToken._id });
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Request email change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/confirm-email-change
router.post('/confirm-email-change', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { newEmail, otp } = confirmEmailChangeSchema.parse(req.body);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userIdObj);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (newEmail === user.email) {
      return res.status(400).json({ error: 'This is already your email address' });
    }

    const verificationToken = await EmailVerificationToken.findOne({
      userId: userIdObj,
      newEmail,
    });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (verificationToken.expiresAt < new Date()) {
      await EmailVerificationToken.deleteOne({ _id: verificationToken._id });
      return res.status(410).json({ error: 'OTP has expired' });
    }

    if (!matchesOtp(verificationToken, otp)) {
      const canRetry = await registerFailedOtpAttempt(verificationToken);
      return res.status(400).json({
        error: canRetry ? 'Invalid OTP' : 'Too many invalid attempts. Request a new code.',
      });
    }

    const taken = await User.findOne({
      email: newEmail,
      _id: { $ne: userIdObj },
    });
    if (taken) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    user.email = newEmail;
    user.isEmailVerified = true;
    await user.save();

    await EmailVerificationToken.deleteOne({ _id: verificationToken._id });

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
    console.error('Confirm email change error:', error);
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
router.post('/verify-email', otpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Signup / resend verification tokens only (not email-change OTPs)
    const verificationToken = await EmailVerificationToken.findOne({
      userId: user._id,
      newEmail: { $exists: false },
      passwordReset: { $ne: true },
    });
    
    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check expiration
    if (verificationToken.expiresAt < new Date()) {
      await EmailVerificationToken.deleteOne({ _id: verificationToken._id });
      return res.status(410).json({ error: 'OTP has expired' });
    }

    if (!matchesOtp(verificationToken, otp)) {
      const canRetry = await registerFailedOtpAttempt(verificationToken);
      return res.status(400).json({
        error: canRetry ? 'Invalid OTP' : 'Too many invalid attempts. Request a new code.',
      });
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
router.post('/resend-verification', otpRateLimiter, async (req: Request, res: Response) => {
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

    // Delete old signup OTPs only (keep pending email-change and password-reset tokens)
    await EmailVerificationToken.deleteMany({
      userId: user._id,
      newEmail: { $exists: false },
      passwordReset: { $ne: true },
    });

    // Generate new 6-digit OTP
    const otp = generateOtp();
    const verificationToken = buildOtpToken({
      userId: user._id,
      otp,
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

// POST /auth/forgot-password
router.post('/forgot-password', otpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message: 'If an account exists for this email, a reset code has been sent',
      });
    }

    await EmailVerificationToken.deleteMany({ userId: user._id, passwordReset: true });

    const otp = generateOtp();
    const verificationToken = buildOtpToken({
      userId: user._id,
      otp,
      passwordReset: true,
    });
    await verificationToken.save();

    try {
      await sendPasswordResetEmail(user.email, user.name, otp);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      await EmailVerificationToken.deleteOne({ _id: verificationToken._id });
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({
      message: 'If an account exists for this email, a reset code has been sent',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', otpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const verificationToken = await EmailVerificationToken.findOne({
      userId: user._id,
      passwordReset: true,
    });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (verificationToken.expiresAt < new Date()) {
      await EmailVerificationToken.deleteOne({ _id: verificationToken._id });
      return res.status(410).json({ error: 'Reset code has expired' });
    }

    if (!matchesOtp(verificationToken, otp)) {
      const canRetry = await registerFailedOtpAttempt(verificationToken);
      return res.status(400).json({
        error: canRetry ? 'Invalid or expired reset code' : 'Too many invalid attempts. Request a new reset code.',
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await EmailVerificationToken.deleteOne({ _id: verificationToken._id });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/push-token - Register push notification token
const pushTokenSchema = z.object({
  pushToken: optionalTrimmedString(400).refine((value) => !!value, {
    message: 'Push token is required',
  }),
});

router.post('/push-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pushToken } = pushTokenSchema.parse(req.body);

    await User.findByIdAndUpdate(userId, { pushToken });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Push token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /auth/push-token - Remove push notification token (logout)
router.delete('/push-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await User.findByIdAndUpdate(userId, { $unset: { pushToken: 1 } });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove push token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

