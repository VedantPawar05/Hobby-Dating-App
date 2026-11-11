import { describe, it, expect, afterAll } from 'vitest';
import {
  sanitizeMongoUri,
  getDatabaseStatus,
  connectDatabase,
  disconnectDatabase,
} from '../src/config/database.js';

describe('Database Configuration & Connection Handling', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it('sanitizeMongoUri should mask username and password credentials', () => {
    const rawUri = 'mongodb://appUser:superSecretPassword@cluster0.mongodb.net/ricoz_prod';
    const sanitized = sanitizeMongoUri(rawUri);

    expect(sanitized).toBe('mongodb://appUser:******@cluster0.mongodb.net/ricoz_prod');
    expect(sanitized).not.toContain('superSecretPassword');
  });

  it('sanitizeMongoUri should leave URIs without credentials unmodified', () => {
    const rawUri = 'mongodb://127.0.0.1:27017/ricoz_dev';
    const sanitized = sanitizeMongoUri(rawUri);

    expect(sanitized).toBe('mongodb://127.0.0.1:27017/ricoz_dev');
  });

  it('sanitizeMongoUri should handle empty or undefined input', () => {
    expect(sanitizeMongoUri('')).toBe('');
    expect(sanitizeMongoUri(null)).toBe('');
  });

  it('getDatabaseStatus should report accurate state string', () => {
    const status = getDatabaseStatus();
    expect(['disconnected', 'connected', 'connecting', 'disconnecting']).toContain(status);
  });

  it('connectDatabase should fail fast with unreachable host', async () => {
    const unreachableUri = 'mongodb://127.0.0.1:27999/unreachable_db?serverSelectionTimeoutMS=1000';

    await expect(connectDatabase(unreachableUri)).rejects.toThrow();
  }, 10000);
});

