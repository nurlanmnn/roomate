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
import goalRoutes from './routes/goals';
import eventRoutes from './routes/events';
import choreRoutes from './routes/chores';
import { schedulerService } from './services/schedulerService';
import { authRateLimiter, globalApiLimiter } from './middleware/security';

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
app.use('/auth', authRateLimiter, authRoutes);
app.use('/households', householdRoutes);
app.use('/expenses', expenseRoutes);
app.use('/expense-templates', expenseTemplateRoutes);
app.use('/settlements', settlementRoutes);
app.use('/shopping', shoppingRoutes);
app.use('/goals', goalRoutes);
app.use('/events', eventRoutes);
app.use('/chores', choreRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    const port = typeof config.port === 'string' ? parseInt(config.port, 10) : config.port;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      console.log(`Accessible at http://localhost:${port} or http://192.168.1.187:${port}`);
      
      // Start notification scheduler
      schedulerService.start();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

