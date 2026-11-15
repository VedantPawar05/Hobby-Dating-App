import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';

const MAX_STORE_ENTRIES = 10000;

/**
 * Lightweight fixed-window in-memory rate limiter middleware factory.
 * Enforces strict memory bounds to prevent unbounded heap growth.
 * Skips enforcement in test mode unless `enabledInTest` is explicitly true.
 *
 * @param {Object} options
 * @param {number} [options.windowMs=900000] - Window duration in milliseconds (default 15m)
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
      // Prevent unbounded memory growth from attacker-generated arbitrary keys
      if (store.size >= MAX_STORE_ENTRIES) {
        for (const [k, v] of store.entries()) {
          if (now >= v.resetAt) store.delete(k);
        }
        if (store.size >= MAX_STORE_ENTRIES) {
          const oldestKey = store.keys().next().value;
          store.delete(oldestKey);
        }
      }

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

/**
 * IP-based rate limiter for general authentication endpoints (25 requests / 15 minutes).
 */
export const authIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many authentication attempts from this IP address. Please wait a few minutes and try again.',
  keyGenerator: (req) => `auth_ip:${req.ip || 'unknown'}`,
});

// Alias for backwards compatibility with existing route imports and test suites
export const authRateLimiter = authIpRateLimiter;

/**
 * Account-based rate limiter to protect targeted user accounts against distributed credential-stuffing
 * attacks across multiple IP addresses (10 attempts / 15 minutes per normalized email).
 */
export const authAccountRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many failed login attempts for this account. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => {
    const rawEmail = req.body?.email;
    if (typeof rawEmail === 'string' && rawEmail.length <= 150) {
      const normalized = rawEmail.toLowerCase().trim();
      if (normalized.length > 0) {
        return `auth_account:${normalized}`;
      }
    }
    return `auth_account_skip:${req.ip || 'unknown'}`;
  },
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

export const applicationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many organizer application requests. Please wait before submitting again.',
  keyGenerator: (req) => `application:${byUserOrIp(req)}`,
});

export const userSafetyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many account security requests. Please wait a few minutes before trying again.',
  keyGenerator: (req) => `user_safety:${byUserOrIp(req)}`,
});

export const taggingRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many mixer tags submitted. Please slow down.',
  keyGenerator: (req) => `tagging:${byUserOrIp(req)}`,
});
