const rateLimit = require('express-rate-limit');

const message = { message: 'Too many requests. Please wait a moment and try again.' };

// Tight limit on credential endpoints; brute force is the threat here.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

// Refresh is called on every app boot, so it needs far more headroom than login.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

module.exports = { authLimiter, refreshLimiter, apiLimiter };
