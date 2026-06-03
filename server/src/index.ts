import './config/env.js'; // MUST be first — loads .env.local overrides, then .env
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
import analyticsRoutes from './routes/analytics.js';
import packageTagsRoutes from './routes/packageTags.js';
import packageOrderRoutes from './routes/packageOrder.js';
import bundlesRoutes from './routes/bundles.js';
import categoriesRoutes from './routes/categories.js';
import promoCountdownRoutes from './routes/promoCountdown.js';
import topSellersRoutes from './routes/topSellers.js';
import recentPaymentsRoutes from './routes/recentPayments.js';
import ipConnectionsRoutes from './routes/ipConnections.js';
import currencyRoutes from './routes/currency.js';
import tebexRoutes from './routes/tebex.js';
import tebexClaimRoutes from './routes/tebexClaim.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  rateLimiter,
  analyticsRateLimiter,
  authRateLimiter,
  tebexRateLimiter,
  downloadRateLimiter,
} from './middleware/rateLimiter.js';
import { initializeDatabase } from './config/database.js';
import { ensureAnalyticsSchema } from './models/analytics.js';

dotenv.config();

// Fail fast in production if any critical secret is missing or left as a placeholder.
// These secrets gate token forgery and session integrity — booting with the
// stock placeholder values is equivalent to no authentication at all.
const PLACEHOLDER_PATTERNS = [
  /change.?this/i,
  /your[_-]?(super[_-]?)?secret/i,
  /^changeme$/i,
];
const REQUIRED_SECRETS: { name: string; minLength: number }[] = [
  { name: 'JWT_SECRET', minLength: 32 },
  { name: 'SESSION_SECRET', minLength: 32 },
  { name: 'TEBEX_PUBLIC_TOKEN', minLength: 8 },
  { name: 'DISCORD_CLIENT_SECRET', minLength: 8 },
];
function validateSecrets() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  for (const { name, minLength } of REQUIRED_SECRETS) {
    const value = process.env[name];
    if (!value) {
      errors.push(`${name} is not set`);
      continue;
    }
    if (value.length < minLength) {
      errors.push(`${name} is too short (min ${minLength} chars)`);
    }
    if (PLACEHOLDER_PATTERNS.some((re) => re.test(value))) {
      errors.push(`${name} looks like a placeholder — replace with a real secret`);
    }
  }
  if (errors.length) {
    const banner = '⚠️  Security configuration problems:\n  - ' + errors.join('\n  - ');
    if (isProd) {
      console.error(banner);
      console.error('Refusing to start in production with insecure secrets.');
      process.exit(1);
    } else {
      console.warn(banner);
    }
  }
}
validateSecrets();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first proxy hop (nginx/Apache). Required for correct rate-limit
// keying and `req.ip` resolution. Setting `1` rather than `true` blocks
// X-Forwarded-For spoofing past the first hop.
app.set('trust proxy', 1);

// CORS DEVE VIR ANTES DO HELMET!
// Production locks to CLIENT_URL (the site domain). In dev we also accept ANY
// localhost/127.0.0.1 port, because Vite picks the next free port (5173 →
// 5174 → …) when one is busy — a fixed single-port allowlist would silently
// CORS-block the storefront (packages show "Coming soon", login/cart break).
const CONFIGURED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';
const IS_PROD = process.env.NODE_ENV === 'production';
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header → same-origin / curl / server-to-server. Allow.
    if (!origin) return cb(null, true);
    if (origin === CONFIGURED_ORIGIN) return cb(null, true);
    if (!IS_PROD && LOCALHOST_RE.test(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
}));

// Security headers. We ship JSON only — no HTML — so a strict CSP is fine.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 60 * 60 * 24 * 365, includeSubDomains: true, preload: true }
    : false,
}));
// Body size limits — defense against large-payload DoS / memory exhaustion.
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(cookieParser());

// Apply different rate limiters based on route. More-specific paths must be
// declared first because the global `rateLimiter` would otherwise shadow them.
app.use('/api/analytics', analyticsRateLimiter);
app.use('/api/statistics', analyticsRateLimiter);
app.use('/api/auth', authRateLimiter);
app.use('/api/tebex', tebexRateLimiter);
app.use('/api/tebex-claim', tebexRateLimiter);
app.use('/api/downloads', downloadRateLimiter);
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
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tebex', tebexRoutes);
app.use('/api/tebex-claim', tebexClaimRoutes);
app.use('/api', packageTagsRoutes);
app.use('/api', packageOrderRoutes);
app.use('/api', cfxRoutes);
app.use('/api', bundlesRoutes);
app.use('/api', categoriesRoutes);
app.use('/api', promoCountdownRoutes);
app.use('/api', topSellersRoutes);
app.use('/api', recentPaymentsRoutes);
app.use('/api', ipConnectionsRoutes);
app.use('/api', currencyRoutes);

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

  try {
    await ensureAnalyticsSchema();
    console.log('✅ Analytics schema ensured');
  } catch (error) {
    console.error('❌ Error ensuring analytics schema:', error);
  }
});

export default app;
