import path from 'path';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import householdRoutes from './routes/households';
import geoRoutes from './routes/geo';
import expenseRoutes from './routes/expenses';
import expenseTemplateRoutes from './routes/expenseTemplates';
import settlementRoutes from './routes/settlements';
import shoppingRoutes from './routes/shopping';
import eventRoutes from './routes/events';
import choreRoutes from './routes/chores';
import { schedulerService } from './services/schedulerService';
import { globalApiLimiter } from './middleware/security';
import { Household } from './models/Household';
import { User, DEFAULT_NOTIFICATION_PREFERENCES } from './models/User';

/**
 * Idempotent backfill — older households predate the `currency` field, so the
 * first boot after deploy stamps them with `USD` (our previous hard-coded
 * default). New documents get `USD` via the schema default, so this only ever
 * hits legacy rows once.
 */
const backfillHouseholdCurrency = async () => {
  try {
    const result = await Household.updateMany(
      { currency: { $exists: false } },
      { $set: { currency: 'USD' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Backfilled currency on ${result.modifiedCount} household(s).`);
    }
  } catch (err) {
    console.error('Household currency backfill failed:', err);
  }
};

/**
 * Stamp default notification preferences on any pre-feature user docs so the
 * mobile NotificationSettings screen never sees `undefined`. New signups
 * already get defaults via the schema.
 */
const backfillNotificationPreferences = async () => {
  try {
    const result = await User.updateMany(
      { notificationPreferences: { $exists: false } },
      { $set: { notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES } } }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `Backfilled notificationPreferences on ${result.modifiedCount} user(s).`
      );
    }
  } catch (err) {
    console.error('User notificationPreferences backfill failed:', err);
  }
};

/**
 * Older household docs predate the per-household mute list — make sure the
 * field exists as an empty array so reads don't return undefined.
 */
const backfillHouseholdNotificationMute = async () => {
  try {
    const result = await Household.updateMany(
      { notificationMutedBy: { $exists: false } },
      { $set: { notificationMutedBy: [] } }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `Backfilled notificationMutedBy on ${result.modifiedCount} household(s).`
      );
    }
  } catch (err) {
    console.error('Household notificationMutedBy backfill failed:', err);
  }
};

let readyPromise: Promise<void> | null = null;

/**
 * Connect to MongoDB and run the one-off backfills, once per process. On a
 * long-running server this happens at boot; on Vercel each new function
 * instance runs it on its first request and reuses the connection afterwards.
 * A failed attempt is forgotten so the next request retries.
 */
export const ensureReady = (): Promise<void> => {
  if (!readyPromise) {
    readyPromise = (async () => {
      await connectDB();
      await backfillHouseholdCurrency();
      await backfillNotificationPreferences();
      await backfillHouseholdNotificationMute();
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
};

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>`. */
const hasCronSecret = (header: string | undefined): boolean => {
  const secret = config.cronSecret;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const app = express();

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  app.set('trust proxy', 1);
}

// Middleware — React Native often sends no Origin; browsers send the web app origin
const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (process.env.NODE_ENV !== 'production') {
    callback(null, true);
    return;
  }
  if (!origin) {
    callback(null, true);
    return;
  }
  const allowed =
    origin === config.frontendUrl ||
    config.allowedOrigins.includes(origin);
  callback(null, allowed);
};

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.disable('x-powered-by');

// Health check and legal pages don't touch the database, so they sit before
// the DB gate and stay up even if Atlas is unreachable.
// Health check — includes notification flag so release QA can verify server config.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    notificationsEnabled: config.notificationsEnabled,
  });
});

/** Public privacy policy (App Store Connect). */
app.get('/legal/privacy', (req, res) => {
  res.type('html');
  res.sendFile(path.join(__dirname, '..', 'public', 'legal', 'privacy.html'));
});

/** Public support page (App Store Connect Support URL). */
app.get('/legal/support', (req, res) => {
  res.type('html');
  res.sendFile(path.join(__dirname, '..', 'public', 'legal', 'support.html'));
});

app.get('/privacy', (_req, res) => {
  res.redirect(301, '/legal/privacy');
});

app.use(async (_req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    console.error('Database not ready:', err);
    res.status(503).json({ error: 'Service temporarily unavailable, please try again.' });
  }
});

/**
 * Runs the reminder scheduler once. On Vercel there is no long-running process
 * for `setInterval`, so a Vercel Schedule calls this hourly with
 * `Authorization: Bearer $CRON_SECRET` (see vercel.json). Registered before the
 * rate limiter so scheduled calls never count against a client's quota.
 */
app.get('/internal/run-scheduler', async (req, res) => {
  if (!hasCronSecret(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!config.notificationsEnabled) {
    res.json({ ran: false, reason: 'notifications disabled' });
    return;
  }
  await schedulerService.runOnce();
  res.json({ ran: true });
});

app.use(globalApiLimiter);
// Body size limit for base64 image data URLs. Note: Vercel caps request bodies
// at 4.5 MB regardless of this setting.
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/auth', authRoutes);
app.use('/households', householdRoutes);
app.use('/geo', geoRoutes);
app.use('/expenses', expenseRoutes);
app.use('/expense-templates', expenseTemplateRoutes);
app.use('/settlements', settlementRoutes);
app.use('/shopping', shoppingRoutes);
app.use('/events', eventRoutes);
app.use('/chores', choreRoutes);

export default app;
