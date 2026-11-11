import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { errorMiddleware } from '../src/middlewares/error.middleware.js';

describe('Centralized Error Middleware', () => {
  function createTestApp(errorToThrow) {
    const app = express();
    app.use(express.json());

    app.get('/test-error', (req, res, next) => {
      next(errorToThrow);
    });

    app.use(errorMiddleware);
    return app;
  }

  it('handles Zod validation errors with 400 and structured fields', async () => {
    const dummySchema = z.object({
      age: z.number({ error: 'Age is required' }),
    });

    let zodErr;
    try {
      dummySchema.parse({});
    } catch (err) {
      zodErr = err;
    }

    const testApp = createTestApp(zodErr);
    const res = await request(testApp).get('/test-error');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [
        {
          field: 'age',
          message: 'Age is required',
        },
      ],
    });
  });

  it('handles Mongoose CastError with 400', async () => {
    const castErr = new Error('Cast to ObjectId failed');
    castErr.name = 'CastError';
    castErr.path = '_id';

    const testApp = createTestApp(castErr);
    const res = await request(testApp).get('/test-error');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid value for field '_id'",
    });
  });

  it('handles MongoDB duplicate key error (code 11000) with 409', async () => {
    const dupErr = new Error('Duplicate key');
    dupErr.code = 11000;
    dupErr.keyValue = { email: 'user@example.com' };

    const testApp = createTestApp(dupErr);
    const res = await request(testApp).get('/test-error');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: 'Duplicate field value: email',
    });
  });

  it('handles generic unexpected errors with 500 status', async () => {
    const genericErr = new Error('Unexpected crash');
    const testApp = createTestApp(genericErr);
    const res = await request(testApp).get('/test-error');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Unexpected crash');
  });
});


