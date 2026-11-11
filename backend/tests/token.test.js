import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, getAuthCookieOptions } from '../src/utils/token.js';
import { env } from '../src/config/env.js';

describe('Token Utility (JWT & Cookies)', () => {
  it('generates a valid signed JWT containing payload data', () => {
    const payload = { id: 'user_123', email: 'test@example.com', role: 'user' };
    const token = generateToken(payload);

    expect(typeof token).toBe('string');
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('rejects an invalid or tampered JWT', () => {
    const validToken = generateToken({ id: 'user_123' });
    const tamperedToken = validToken.slice(0, -5) + 'abcde';

    expect(() => verifyToken(tamperedToken)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejects an expired JWT', async () => {
    // Generate token that expired 1 second ago
    const expiredToken = jwt.sign({ id: 'user_123' }, env.JWT_SECRET, { expiresIn: '0s' });

    expect(() => verifyToken(expiredToken)).toThrow(jwt.TokenExpiredError);
  });

  it('returns secure cookie options conforming to environment', () => {
    const cookieOptions = getAuthCookieOptions(60000);

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.maxAge).toBe(60000);
    expect(cookieOptions.sameSite).toBeDefined();
    expect(cookieOptions.secure).toBe(env.NODE_ENV === 'production');
  });
});

