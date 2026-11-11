import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { generateToken } from '../src/utils/token.js';

describe('User Profile & Authorization API (/api/users)', () => {
  const normalUser = new User({
    _id: '507f191e810c19729de860ea',
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    dateOfBirth: new Date('1994-06-20'),
    city: 'New York',
    bio: 'Avid runner and marathon enthusiast',
    interests: ['running', 'hiking'],
    role: 'user',
    isActive: true,
  });

  const adminUser = new User({
    _id: '507f191e810c19729de860eb',
    fullName: 'System Admin',
    email: 'admin@example.com',
    password: 'hashed_admin_password',
    dateOfBirth: new Date('1990-01-01'),
    city: 'Chicago',
    role: 'admin',
    isActive: true,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/profile', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns the authenticated user profile without password', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const token = generateToken({
        id: normalUser._id.toString(),
        email: normalUser.email,
        role: normalUser.role,
      });

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.fullName).toBe('John Doe');
      expect(res.body.data.profile.email).toBe('john@example.com');
      expect(res.body.data.profile.password).toBeUndefined();
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('rejects unauthenticated profile update with 401', async () => {
      const res = await request(app)
        .patch('/api/users/profile')
        .send({ city: 'San Francisco' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('prevents users from changing their role (rejects unauthorized fields with 400)', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const token = generateToken({
        id: normalUser._id.toString(),
        email: normalUser.email,
        role: normalUser.role,
      });

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('successfully updates permitted fields (city, bio, interests)', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const updatedUser = new User({
        ...normalUser.toObject(),
        city: 'Seattle',
        bio: 'Updated runner bio',
        interests: ['running', 'climbing'],
      });

      vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedUser);

      const token = generateToken({
        id: normalUser._id.toString(),
        email: normalUser.email,
        role: normalUser.role,
      });

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          city: 'Seattle',
          bio: 'Updated runner bio',
          interests: ['running', 'climbing'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.city).toBe('Seattle');
      expect(res.body.data.profile.bio).toBe('Updated runner bio');
      expect(res.body.data.profile.interests).toEqual(['running', 'climbing']);
      expect(res.body.data.profile.password).toBeUndefined();
    });
  });

  describe('Role-Based Authorization (/api/users/admin-test)', () => {
    it('denies access to normal users with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const userToken = generateToken({
        id: normalUser._id.toString(),
        email: normalUser.email,
        role: normalUser.role,
      });

      const res = await request(app)
        .get('/api/users/admin-test')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('grants access to admin users with 200 OK', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const adminToken = generateToken({
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role,
      });

      const res = await request(app)
        .get('/api/users/admin-test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Admin access authorized');
    });
  });
});

