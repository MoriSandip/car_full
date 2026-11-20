import { rateLimit } from 'express-rate-limit';

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many image uploads. Please try again later.',
    });
  },
});

export default uploadRateLimiter;
