import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Report } from '../src/models/report.model.js';
import { ModerationLog } from '../src/models/moderation-log.model.js';
import { seedAdminAccount } from '../src/services/admin-seed.service.js';

function mockQueryChain(resolvedValue) {
  return {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
  };
}

describe('Environment-Configured Admin Seeding & Auth Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing ADMIN_EMAIL or ADMIN_PASSWORD without falling back to hardcoded credentials', async () => {
    await expect(seedAdminAccount({ email: '', password: '' })).rejects.toThrow(
      /Missing ADMIN_EMAIL or ADMIN_PASSWORD/i
    );
    await expect(
      seedAdminAccount({ email: 'admin@ricoz.app', password: '' })
    ).rejects.toThrow(/Missing ADMIN_EMAIL or ADMIN_PASSWORD/i);
  });

  it('rejects weak ADMIN_PASSWORD values that violate password security rules', async () => {
    await expect(
      seedAdminAccount({
        email: 'admin@ricoz.app',
        password: 'password',
      })
    ).rejects.toThrow(/Invalid admin seed configuration/i);
  });

  it('creates an admin user with role admin and hashes password using User pre-save hook', async () => {
    const plainPassword = 'StrongAdminPassword99';

    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const createSpy = vi.spyOn(User, 'create').mockImplementation(async (doc) => {
      const userDoc = new User({
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      });
      // Exercise bcrypt hashing as Mongoose pre('save') does before persisting
      const salt = await bcrypt.genSalt(10);
      userDoc.password = await bcrypt.hash(doc.password, salt);
      return userDoc;
    });

    const result = await seedAdminAccount({
      email: 'Admin@Ricoz.App',
      password: plainPassword,
      fullName: 'Ricoz Platform Admin',
      city: 'Mumbai',
    });

    expect(result.created).toBe(true);
    expect(result.status).toBe('created');
    expect(result.user.email).toBe('admin@ricoz.app');
    expect(result.user.role).toBe('admin');
    expect(result.user.password).toBeUndefined();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@ricoz.app',
        role: 'admin',
        isActive: true,
      })
    );

    const createdInstance = await createSpy.mock.results[0].value;
    expect(createdInstance.password).not.toBe(plainPassword);
    await expect(createdInstance.comparePassword(plainPassword)).resolves.toBe(true);
  });

  it('is idempotent when the configured admin account already exists', async () => {
    const existingAdmin = new User({
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Existing Admin',
      email: 'admin@ricoz.app',
      password: 'hashed-value-preserved',
      dateOfBirth: new Date('1992-01-15'),
      city: 'Mumbai',
      role: 'admin',
      isActive: true,
    });

    vi.spyOn(User, 'findOne').mockResolvedValue(existingAdmin);
    const createSpy = vi.spyOn(User, 'create');

    const result = await seedAdminAccount({
      email: 'admin@ricoz.app',
      password: 'AnotherStrongPassword99',
    });

    expect(result.created).toBe(false);
    expect(result.status).toBe('exists');
    expect(result.user.role).toBe('admin');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('refuses to overwrite an existing non-admin user sharing ADMIN_EMAIL', async () => {
    const existingMember = new User({
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Regular User',
      email: 'member@ricoz.app',
      password: 'hashed-member-password',
      dateOfBirth: new Date('1995-05-05'),
      city: 'Pune',
      role: 'user',
      isActive: true,
    });

    vi.spyOn(User, 'findOne').mockResolvedValue(existingMember);
    const createSpy = vi.spyOn(User, 'create');

    await expect(
      seedAdminAccount({
        email: 'member@ricoz.app',
        password: 'StrongAdminPassword99',
      })
    ).rejects.toThrow(/already holds role 'user'/i);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('allows seeded admin to log in and access protected /api/admin/stats endpoint', async () => {
    const plainPassword = 'StrongAdminPassword99';
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const adminId = new mongoose.Types.ObjectId();

    const persistedAdmin = new User({
      _id: adminId,
      fullName: 'Ricoz Platform Admin',
      email: 'admin@ricoz.app',
      password: passwordHash,
      dateOfBirth: new Date('1992-01-15'),
      city: 'Mumbai',
      role: 'admin',
      isActive: true,
    });

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(persistedAdmin),
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ricoz.app',
      password: plainPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('admin');
    const token = loginRes.body.data.token;
    expect(token).toBeTruthy();

    vi.spyOn(User, 'findById').mockResolvedValue(persistedAdmin);
    vi.spyOn(User, 'countDocuments').mockResolvedValue(5);
    vi.spyOn(Event, 'countDocuments').mockResolvedValue(9);
    vi.spyOn(Booking, 'countDocuments').mockResolvedValue(4);
    vi.spyOn(Report, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(ModerationLog, 'find').mockReturnValue(mockQueryChain([]));

    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data.stats.users.total).toBe(5);
  });
});

