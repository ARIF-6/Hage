import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import tradeRoutes from './routes/tradeRoutes';
import journalRoutes from './routes/journalRoutes';
import adminRoutes from './routes/adminRoutes';
import supportRoutes from './routes/supportRoutes';
import paymentRoutes from './routes/paymentRoutes';
import aiSupportRoutes from './routes/aiSupportRoutes';
import communityRoutes from './routes/communityRoutes';
import { config } from './config/env';
import { dbManager } from './config/dbManager';

import { getPricing, updatePricing } from './controllers/adminController';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Root & Health Check
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.redirect('http://localhost:5173');
  }
  res.status(200).json({
    status: 'ok',
    message: 'HAGE API Server is running successfully',
    frontend: 'http://localhost:5173',
    health: '/api/health'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'HAGE API is running', mongo: dbManager.getIsMongoConnected() });
});

// Pricing endpoints (Public & Admin sync)
app.get('/api/pricing', getPricing);
app.put('/api/pricing', updatePricing);
app.post('/api/pricing', updatePricing);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai-support', aiSupportRoutes);
app.use('/api/community', communityRoutes);

// Global Error Handler & System Error Logger (Requirement 5)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload received.' });
  }

  console.error('Unhandled Server Error:', err);

  try {
    const store = dbManager.getStore();
    // Do not expose sensitive credentials or private user information
    store.systemErrors.unshift({
      _id: 'err_' + Date.now(),
      errorType: err.name === 'MongoError' ? 'Database' : 'Application',
      description: err.message || 'Internal server error occurred',
      endpoint: req.originalUrl,
      statusCode: err.status || 500,
      date: new Date().toISOString(),
      status: 'Unresolved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    dbManager.saveToDisk();
  } catch (logErr) {
    console.error('Error logging to system errors:', logErr);
  }

  res.status(err.status || 500).json({
    message: err.message || 'An unexpected internal error occurred',
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();