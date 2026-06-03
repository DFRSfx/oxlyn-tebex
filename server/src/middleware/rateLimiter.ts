import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development';

// Generic per-IP limiter — applied globally.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // The app sets `trust proxy: true`; trust the framework hop behind nginx/Apache.
  validate: { trustProxy: true, xForwardedForHeader: false },
  skip: () => isDev,
});

// Lighter limit for analytics — same hop, just more headroom.
export const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many analytics requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true, xForwardedForHeader: false },
  skip: () => isDev,
});

// Auth endpoints: protect against credential stuffing / brute force on Discord
// callback and /me probing. Keep generous enough for legitimate retries.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many auth requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true, xForwardedForHeader: false },
  skip: () => isDev,
});

// Tebex proxy — enough for an interactive cart session, low enough that
// scraping the catalog at high rates is rejected.
export const tebexRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many Tebex requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true, xForwardedForHeader: false },
  skip: () => isDev,
});

// Download endpoints — file links are sensitive. Tight per-IP limit.
export const downloadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many download requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true, xForwardedForHeader: false },
  skip: () => isDev,
});
