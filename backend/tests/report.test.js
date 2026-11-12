import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Report } from '../src/models/report.model.js';
import { createRateLimiter } from '../src/middlewares/rate-limit.middleware.js';
import { generateToken } from '../src/utils/token.js';

describe('User Reporting Pipeline (/api/reports) & Rate Limiting', () => {
  const reporterId = new mongoose.Types.ObjectId().toString();
  const targetUserId = new mongoose.Types.ObjectId().toString();
  const targetEventId = new mongoose.Types.ObjectId().toString();

  const reporter = new User({
    _id: reporterId,
    fullName: 'Reporter Maya',
    email: 'maya@example.com',
    role: 'user',
    isActive: true,
  });

  const reporterToken = generateToken({ id: reporterId, role: 'user' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requires authentication for submitting and viewing reports', async () => {
    const postRes = await request(app).post('/api/reports').send({
      targetType: 'user',
      targetId: targetUserId,
      reason: 'Harassment',
    });
    expect(postRes.status).toBe(401);

    const getRes = await request(app).get('/api/reports/my-reports');
    expect(getRes.status).toBe(401);
  });

  it('creates a report against another user and rejects duplicate active reports', async () => {
    vi.spyOn(User, 'findById').mockImplementation(async (id) => {
      if (id.toString() === reporterId) return reporter;
      return null;
    });

    // Target user lookup uses .select('_id role isActive')
    const selectMock = vi.fn().mockResolvedValue({ _id: targetUserId, role: 'user', isActive: true });
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id.toString() === reporterId) {
        return Promise.resolve(reporter);
      }
      return { select: selectMock };
    });

    vi.spyOn(Report, 'findOne').mockResolvedValueOnce(null);
    const createdReport = {
      _id: new mongoose.Types.ObjectId(),
      targetType: 'user',
      targetId: targetUserId,
      reportedBy: reporterId,
      reason: 'Inappropriate behavior',
      details: 'Sent unsolicited messages.',
      status: 'open',
    };
    vi.spyOn(Report, 'create').mockResolvedValue(createdReport);

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'user',
        targetId: targetUserId,
        reason: 'Inappropriate behavior',
        details: 'Sent unsolicited messages.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report.status).toBe('open');

    // Duplicate active report returns 409
    vi.spyOn(Report, 'findOne').mockResolvedValueOnce(createdReport);
    const dupRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'user',
        targetId: targetUserId,
        reason: 'Inappropriate behavior',
      });

    expect(dupRes.status).toBe(409);
  });

  it('blocks self-reporting, own-event reporting, missing targets, and strict unknown fields', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id.toString() === reporterId) return Promise.resolve(reporter);
      return { select: vi.fn().mockResolvedValue(null) };
    });

    const selfRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'user',
        targetId: reporterId,
        reason: 'Testing self report',
      });
    expect(selfRes.status).toBe(400);

    const missingUserRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'user',
        targetId: targetUserId,
        reason: 'Nonexistent account',
      });
    expect(missingUserRes.status).toBe(404);

    vi.spyOn(Event, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: targetEventId,
        organizer: reporterId,
        status: 'published',
      }),
    });

    const ownEventRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'event',
        targetId: targetEventId,
        reason: 'Own event report',
      });
    expect(ownEventRes.status).toBe(400);

    const strictRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'user',
        targetId: targetUserId,
        reason: 'Valid reason',
        status: 'resolved',
      });
    expect(strictRes.status).toBe(400);
  });

  it('retrieves paginated reports submitted by the authenticated user', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(reporter);

    const mockReports = [
      {
        _id: new mongoose.Types.ObjectId(),
        targetType: 'event',
        targetId: targetEventId,
        reportedBy: reporterId,
        reason: 'Misleading venue details',
        status: 'open',
      },
    ];

    vi.spyOn(Report, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockReports),
    });
    vi.spyOn(Report, 'countDocuments').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/reports/my-reports?status=open')
      .set('Authorization', `Bearer ${reporterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reports).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('enforces createRateLimiter when enabledInTest is true', async () => {
    const testApp = express();
    testApp.use(
      '/limited',
      createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: 'Rate limit exceeded',
        enabledInTest: true,
        keyGenerator: () => 'fixed-test-key',
      }),
      (_req, res) => res.status(200).json({ ok: true })
    );

    const first = await request(testApp).get('/limited');
    expect(first.status).toBe(200);
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-remaining']).toBe('1');

    const second = await request(testApp).get('/limited');
    expect(second.status).toBe(200);
    expect(second.headers['x-ratelimit-remaining']).toBe('0');

    const third = await request(testApp).get('/limited');
    expect(third.status).toBe(429);
    expect(third.headers['retry-after']).toBeDefined();
    expect(third.body.success).toBe(false);
  });
});
