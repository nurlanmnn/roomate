import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import householdRoutes from './routes/households';
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

const app = express();

if (process.env.NODE_ENV === 'production') {
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
app.use(globalApiLimiter);
// Increase body size limit to handle base64 image data URLs (can be several MB)
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/auth', authRoutes);
app.use('/households', householdRoutes);
app.use('/expenses', expenseRoutes);
app.use('/expense-templates', expenseTemplateRoutes);
app.use('/settlements', settlementRoutes);
app.use('/shopping', shoppingRoutes);
app.use('/events', eventRoutes);
app.use('/chores', choreRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/** Public privacy policy (App Store Connect). Canonical: https://api.roomate.us/legal/privacy */
app.get('/legal/privacy', (req, res) => {
  res.type('html');
  res.sendFile(path.join(__dirname, '..', 'public', 'legal', 'privacy.html'));
});

app.get('/privacy', (_req, res) => {
  res.redirect(301, '/legal/privacy');
});


// Connect to database and start server
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
 * mobile NotificationSettings screen never sees `undefined`. Runs once per
 * deploy; new signups already get defaults via the schema.
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

const startServer = async () => {
  try {
    await connectDB();
    await backfillHouseholdCurrency();
    await backfillNotificationPreferences();
    await backfillHouseholdNotificationMute();
    const port = typeof config.port === 'string' ? parseInt(config.port, 10) : config.port;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      console.log(`Accessible at http://localhost:${port} or http://192.168.1.187:${port}`);

      if (config.notificationsEnabled) {
        schedulerService.start();
      } else {
        console.log('Notifications disabled (NOTIFICATIONS_ENABLED!=true); scheduler skipped.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

