import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import feedbackRoutes from './routes/feedbackRoutes';
import { config } from './config/env';
import { dbManager } from './config/dbManager';

import { getPricing, updatePricing } from './controllers/adminController';

const app = express();
const PORT = config.port;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://hagejournal.netlify.app',
  'https://hage-caarif.vercel.app',
  'https://hage.mohameddhuux6.workers.dev',
  'https://hage.pages.dev',
  // Allow any *.netlify.app, *.vercel.app, *.workers.dev, *.pages.dev, or *.onrender.com subdomain
  /\.netlify\.app$/,
  /\.vercel\.app$/,
  /\.workers\.dev$/,
  /\.pages\.dev$/,
  /\.onrender\.com$/,
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (isAllowed) return callback(null, true);
    return callback(null, true); // Allow all for now - tighten in production if needed
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'HAGE API is running', mongo: dbManager.getIsMongoConnected() });
});

// Pricing endpoints (Public & Admin sync)
app.get('/api/pricing', getPricing);
app.put('/api/pricing', updatePricing);
app.post('/api/pricing', updatePricing);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai-support', aiSupportRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/feedback', feedbackRoutes);

// Static frontend serving (Production Full-Stack Deployment)
const distCandidates = [
  path.resolve(__dirname, '../../../dist'),
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), 'Hage/frontend/dist'),
];
const distPath = distCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  console.log(`[SERVER] Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
} else {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.get('/', (req, res) => {
    if (req.accepts('html')) {
      return res.redirect(FRONTEND);
    }
    res.status(200).json({
      status: 'ok',
      message: 'HAGE API Server is running successfully',
      frontend: FRONTEND,
      health: '/api/health'
    });
  });
}

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