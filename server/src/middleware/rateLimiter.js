/**
 * @module middleware/rateLimiter
 * @description Rate limiting middleware using express-rate-limit.
 * Exports pre-configured limiters for auth, general API, and file upload endpoints.
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints (login, register, etc.).
 * 10 requests per 15-minute window.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
  keyGenerator: (req) => {
    // Use IP + email (if present) as the key to prevent per-account brute force
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  },
});

/**
 * Rate limiter for general API endpoints.
 * 100 requests per 15-minute window.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again later.',
    },
  },
  keyGenerator: (req) => {
    // Use authenticated user ID if available, otherwise fall back to IP
    return req.user?.id || req.ip;
  },
});

/**
 * Rate limiter for file upload endpoints.
 * 20 requests per 15-minute window.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many upload requests. Please try again later.',
    },
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };
