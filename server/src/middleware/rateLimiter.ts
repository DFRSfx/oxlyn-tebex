import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Trust X-Forwarded-For header from Apache/nginx
  validate: { trustProxy: false },
});

// More permissive rate limiter for analytics endpoints
export const analyticsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Allow 1000 analytics events per minute
  message: 'Too many analytics requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  // Skip rate limiting for analytics endpoints in development
  skip: (req) => process.env.NODE_ENV === 'development',
});
