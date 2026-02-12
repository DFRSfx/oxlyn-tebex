import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import downloadRoutes from './routes/downloads.js';
import ordersRoutes from './routes/orders.js';
import cfxRoutes from './routes/cfx.js';
import documentationRoutes from './routes/documentation.js';
import statisticsRoutes from './routes/statistics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { initializeDatabase } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required when behind Apache/nginx
app.set('trust proxy', true);

// CORS DEVE VIR ANTES DO HELMET!
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
}));

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/documentation', documentationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api', cfxRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    await initializeDatabase();
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
});

export default app;
