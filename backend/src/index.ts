import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import householdRoutes from './routes/households';
import expenseRoutes from './routes/expenses';
import settlementRoutes from './routes/settlements';
import shoppingRoutes from './routes/shopping';
import goalRoutes from './routes/goals';
import eventRoutes from './routes/events';
import speechRoutes from './routes/speech';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
// Speech transcription sends base64 audio; default JSON limit (100kb) is too small.
app.use(express.json({ limit: '15mb' }));

// Routes
app.use('/auth', authRoutes);
app.use('/households', householdRoutes);
app.use('/expenses', expenseRoutes);
app.use('/settlements', settlementRoutes);
app.use('/shopping', shoppingRoutes);
app.use('/goals', goalRoutes);
app.use('/events', eventRoutes);
app.use('/speech', speechRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

