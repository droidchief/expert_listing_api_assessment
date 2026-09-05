import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { RateLimitError } from '../errors/AppError.js';

// Same envelope errorHandler.ts produces — this response never reaches errorHandler
// since express-rate-limit short-circuits before next(), so the shape has to be
// built by hand here to stay consistent with every other error response.
function rateLimitHandler(req: Request, res: Response): void {
  const err = new RateLimitError();
  res.status(err.status).json({
    error: { code: err.code, message: err.message, retryable: err.retryable },
    meta: { request_id: req.id, server_time: new Date().toISOString() },
  });
}

// /health is Vercel's own uptime probe target; rate-limiting it would trip under
// routine platform health checks rather than real client traffic. rateLimiter is
// mounted at the top level (before the /api/v1 router strips its prefix), so
// req.path here is still the full path.
const skipHealth = (req: Request): boolean => req.path === '/api/v1/health';

const readLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHealth,
  handler: rateLimitHandler,
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.RATE_LIMIT_WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHealth,
  handler: rateLimitHandler,
});

// GET and POST are tracked in separate buckets — a client's read traffic never
// eats into its write allowance and vice versa. The memory store behind each is
// per-instance; see the README's rate-limiting section for what that means on
// Vercel's serverless runtime.
export function rateLimiter(req: Request, res: Response, next: (err?: unknown) => void): void {
  if (req.method === 'GET') {
    readLimiter(req, res, next);
  } else if (req.method === 'POST') {
    writeLimiter(req, res, next);
  } else {
    next();
  }
}
