/**
 * Long-running server entry (local dev, or any VM). On Vercel the app is
 * served from api/index.ts instead, and the scheduler runs via Vercel Cron.
 */
import { config } from './config/env';
import app, { ensureReady } from './app';
import { schedulerService } from './services/schedulerService';

const startServer = async () => {
  try {
    await ensureReady();
    const port = typeof config.port === 'string' ? parseInt(config.port, 10) : config.port;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);

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
