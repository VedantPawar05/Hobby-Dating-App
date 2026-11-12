import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Event } from '../src/models/event.model.js';
import { User } from '../src/models/user.model.js';
import { syncCompletedEvents } from '../src/services/event-lifecycle.service.js';
import { generateToken } from '../src/utils/token.js';

describe('Event Lifecycle & Profile Validation', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const normalUser = new User({
    _id: userId,
    fullName: 'Profile User',
    email: 'profile@example.com',
    role: 'user',
    isActive: true,
    city: 'Seattle',
    interests: ['Running'],
  });
  const userToken = generateToken({ id: userId, role: 'user' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Lifecycle (syncCompletedEvents)', () => {
    it('transitions only ended published events to completed without touching cancelled or rejected events', async () => {
      const now = new Date('2026-11-12T10:00:00.000Z');
      const updateSpy = vi.spyOn(Event, 'updateMany').mockResolvedValue({
        matchedCount: 3,
        modifiedCount: 3,
      });

      const outcome = await syncCompletedEvents(now);

      expect(updateSpy).toHaveBeenCalledWith(
        {
          status: 'published',
          endDateTime: { $lte: now },
        },
        {
          $set: { status: 'completed' },
        }
      );
      expect(outcome).toEqual({
        matchedCount: 3,
        modifiedCount: 3,
        checkedAt: now,
      });
    });
  });

  describe('Profile Management (PATCH /api/users/profile)', () => {
    it('accepts valid HTTPS profilePicture URLs and permitted profile fields', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const updatedDoc = new User({
        _id: userId,
        fullName: 'Updated Name',
        email: 'profile@example.com',
        role: 'user',
        isActive: true,
        city: 'Portland',
        profilePicture: 'https://cdn.example.com/avatar.png',
      });

      vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedDoc);

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Updated Name',
          city: 'Portland',
          profilePicture: 'https://cdn.example.com/avatar.png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.profilePicture).toBe('https://cdn.example.com/avatar.png');
      expect(res.body.data.profile.fullName).toBe('Updated Name');
      expect(res.body.data.profile.city).toBe('Portland');
      expect(res.body.data.profile.password).toBeUndefined();
    });

    it('rejects non-HTTP/HTTPS profilePicture URLs and protected fields like role or email', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const badUrlRes = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          profilePicture: 'javascript:alert(1)',
        });
      expect(badUrlRes.status).toBe(400);

      const protectedRoleRes = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: 'admin',
        });
      expect(protectedRoleRes.status).toBe(400);

      const protectedEmailRes = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'hacked@example.com',
        });
      expect(protectedEmailRes.status).toBe(400);
    });
  });
});
