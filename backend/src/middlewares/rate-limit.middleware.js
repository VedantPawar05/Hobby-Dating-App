import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';

/**
 * Lightweight fixed-window in-memory rate limiter middleware factory.
 * Skips enforcement in test mode unless `enabledInTest` is explicitly true.
 *
 * @param {Object} options
 * @param {number} [options.windowMs=900000] - Window duration in milliseconds
 * @param {number} [options.max=60] - Maximum requests allowed per window
 * @param {string} [options.message] - Error message when rate limit is exceeded
 * @param {(req: import('express').Request) => string} [options.keyGenerator] - Custom key builder
 * @param {boolean} [options.enabledInTest=false] - Enable enforcement when NODE_ENV === 'test'
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 60,
  message = 'Too many requests. Please try again later.',
  keyGenerator,
  enabledInTest = false,
} = {}) {
  const store = new Map();

  // Periodically prune expired windows without preventing Node process shutdown
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60 * 1000));
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    if (env.NODE_ENV === 'test' && !enabledInTest) {
      return next();
    }

    const now = Date.now();
    const key = keyGenerator
      ? keyGenerator(req)
      : `${req.ip || 'unknown'}:${req.baseUrl || ''}`;

    let entry = store.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return ApiResponse.error(res, {
        statusCode: 429,
        message,
      });
    }

    return next();
  };
}

const byUserOrIp = (req) =>
  req.user?._id ? `user:${req.user._id.toString()}` : `ip:${req.ip || 'unknown'}`;

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many authentication attempts. Please wait a few minutes and try again.',
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`,
});

export const bookingRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many booking requests. Please slow down and try again shortly.',
  keyGenerator: (req) => `booking:${byUserOrIp(req)}`,
});

export const reportRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Report submission limit reached. Please wait before submitting additional reports.',
  keyGenerator: (req) => `report:${byUserOrIp(req)}`,
});

export const checkInRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 180,
  message: 'Too many check-in scan requests. Please pause briefly and retry.',
  keyGenerator: (req) => `checkin:${byUserOrIp(req)}`,
});
