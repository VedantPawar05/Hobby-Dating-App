import { describe, it, expect } from 'vitest';
import { validateEnv } from '../src/config/env.js';

describe('Environment Validation (validateEnv)', () => {
  it('should successfully parse and apply defaults for valid configuration', () => {
    const raw = {
      NODE_ENV: 'development',
      PORT: '5000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ricoz_test',
      CLIENT_URL: 'http://localhost:3000',
      JWT_SECRET: 'super_secret_jwt_key_at_least_32_characters_long',
      JWT_EXPIRES_IN: '15m',
    };

    const config = validateEnv(raw);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(5000);
    expect(config.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/ricoz_test');
    expect(config.CLIENT_URL).toBe('http://localhost:3000');
    expect(config.JWT_SECRET).toBe('super_secret_jwt_key_at_least_32_characters_long');
    expect(config.JWT_EXPIRES_IN).toBe('15m');
  });

  it('should apply default values when optional fields are omitted', () => {
    const raw = {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ricoz_test',
    };

    const config = validateEnv(raw);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(5000);
    expect(config.CLIENT_URL).toBe('http://localhost:3000');
    expect(config.JWT_SECRET).toBeDefined();
    expect(config.JWT_EXPIRES_IN).toBe('15m');
  });

  it('should fail fast if MONGODB_URI is missing', () => {
    const raw = {
      PORT: '5000',
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it('should fail fast if MONGODB_URI is empty', () => {
    const raw = {
      MONGODB_URI: '',
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it('should reject invalid NODE_ENV values', () => {
    const raw = {
      NODE_ENV: 'staging',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ricoz_test',
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it('should reject invalid PORT numbers out of range', () => {
    const raw = {
      PORT: '999999',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ricoz_test',
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it('should reject JWT_SECRET if shorter than 16 characters', () => {
    const raw = {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ricoz_test',
      JWT_SECRET: 'short_key',
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it('should fail fast in production if JWT_SECRET or COOKIE_SECRET are omitted', () => {
    const raw = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod',
    };

    expect(() => validateEnv(raw)).toThrowError(/must be explicitly set in production/);
  });

  it('should pass in production when explicit secrets and Atlas URI are provided', () => {
    const raw = {
      NODE_ENV: 'production',
      PORT: '10000',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod',
      CLIENT_URL: 'https://hobby-dating.vercel.app',
      JWT_SECRET: 'prod_jwt_secret_key_minimum_32_characters_long_12345',
      COOKIE_SECRET: 'prod_cookie_secret_key_minimum_32_characters_long_67890',
    };

    const config = validateEnv(raw);
    expect(config.NODE_ENV).toBe('production');
    expect(config.PORT).toBe(10000);
    expect(config.CLIENT_URL).toBe('https://hobby-dating.vercel.app');
  });
});
