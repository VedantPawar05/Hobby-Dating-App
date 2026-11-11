import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { generateToken } from '../src/utils/token.js';
import bcrypt from 'bcryptjs';

describe('Authentication API (/api/auth)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      fullName: 'Sarah Connor',
      email: 'sarah@example.com',
      password: 'StrongPassword123',
      dateOfBirth: '1995-04-12',
      gender: 'female',
      city: 'Los Angeles',
      profilePicture: 'https://example.com/avatar.jpg',
    };

    it('rejects registration with missing required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'incomplete@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('rejects registration with invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        ...validRegistration,
        email: 'invalid-email-address',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ])
      );
    });

    it('rejects registration with weak password (missing uppercase or number)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        ...validRegistration,
        password: 'weakpassword',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('rejects registration for users under 18 years old', async () => {
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 16);

      const res = await request(app).post('/api/auth/register').send({
        ...validRegistration,
        dateOfBirth: underageDate.toISOString().split('T')[0],
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'dateOfBirth' }),
        ])
      );
    });

    it('successfully registers a user and returns safe data with JWT token', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue(null);

      const mockSavedUser = new User({
        _id: '507f191e810c19729de860ea',
        fullName: validRegistration.fullName,
        email: validRegistration.email,
        password: 'hashed_password_sample',
        dateOfBirth: new Date(validRegistration.dateOfBirth),
        gender: validRegistration.gender,
        city: validRegistration.city,
        profilePicture: validRegistration.profilePicture,
        role: 'user',
        isActive: true,
      });

      vi.spyOn(User, 'create').mockResolvedValue(mockSavedUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistration);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validRegistration.email);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue({
        _id: '507f191e810c19729de860ea',
        email: validRegistration.email,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistration);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects login with missing email or password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'sarah@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects unknown email with generic 401 message to prevent enumeration', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects incorrect password with generic 401 message', async () => {
      const mockUser = new User({
        _id: '507f191e810c19729de860ea',
        email: 'sarah@example.com',
        password: 'hashed_password',
        isActive: true,
      });
      vi.spyOn(mockUser, 'comparePassword').mockResolvedValue(false);

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'sarah@example.com',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('successfully logs in with valid credentials and returns token', async () => {
      const mockUser = new User({
        _id: '507f191e810c19729de860ea',
        fullName: 'Sarah Connor',
        email: 'sarah@example.com',
        password: 'hashed_password',
        dateOfBirth: new Date('1995-04-12'),
        city: 'Los Angeles',
        role: 'user',
        isActive: true,
      });
      vi.spyOn(mockUser, 'comparePassword').mockResolvedValue(true);

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'sarah@example.com',
        password: 'StrongPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('sarah@example.com');
      expect(res.body.data.user.password).toBeUndefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears access_token cookie and returns 200 success', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/auth/me (Protected)', () => {
    it('rejects unauthenticated request with 401 when no token is supplied', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No token provided');
    });

    it('rejects request with invalid or tampered token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid authentication token.');
    });

    it('accepts valid JWT and returns authenticated user info without password', async () => {
      const mockUser = new User({
        _id: '507f191e810c19729de860ea',
        fullName: 'Sarah Connor',
        email: 'sarah@example.com',
        password: 'hashed_password',
        dateOfBirth: new Date('1995-04-12'),
        city: 'Los Angeles',
        role: 'user',
        isActive: true,
      });

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const token = generateToken({
        id: mockUser._id.toString(),
        email: mockUser.email,
        role: mockUser.role,
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('sarah@example.com');
      expect(res.body.data.user.password).toBeUndefined();
    });
  });
});

