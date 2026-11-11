import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a JWT access token with the configured secret and expiration.
 * @param {Object} payload - Data to embed in the JWT
 * @param {Object} [options] - Additional jsonwebtoken sign options
 * @returns {string} Signed JWT token
 */
export function generateToken(payload, options = {}) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    ...options,
  });
}

/**
 * Synchronously or asynchronously verifies a JWT token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Standard cookie configuration for authentication.
 * @param {number} [maxAgeMs=900000] - 15 minutes default
 * @returns {import('express').CookieOptions}
 */
export function getAuthCookieOptions(maxAgeMs = 15 * 60 * 1000) {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAgeMs,
  };
}

/**
 * Cookie configuration for clearing authentication cookies.
 * Omits maxAge to comply with Express 5 standards.
 * @returns {import('express').CookieOptions}
 */
export function getClearCookieOptions() {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
}
