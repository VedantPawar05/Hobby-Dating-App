import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Report } from '../src/models/report.model.js';
import { ModerationLog } from '../src/models/moderation-log.model.js';
import { generateToken } from '../src/utils/token.js';

/**
 * Helper to mock Mongoose fluent query chains (.sort().skip().limit().select().populate()).
 */
function mockQueryChain(resolvedValue) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
  };
  return chain;
}

describe('Admin Panel API (/api/admin)', () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const anotherAdminId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const organizerId = new mongoose.Types.ObjectId().toString();
  const eventId = new mongoose.Types.ObjectId().toString();
  const reportId = new mongoose.Types.ObjectId().toString();

  const adminUser = new User({
    _id: adminId,
    fullName: 'Platform Admin',
    email: 'admin@ricoz.app',
    dateOfBirth: new Date('1991-03-10'),
    city: 'Mumbai',
    role: 'admin',
    isActive: true,
  });

  const anotherAdmin = new User({
    _id: anotherAdminId,
    fullName: 'Secondary Admin',
    email: 'admin2@ricoz.app',
    dateOfBirth: new Date('1990-01-01'),
    city: 'Delhi',
    role: 'admin',
    isActive: true,
  });

  const normalUser = new User({
    _id: userId,
    fullName: 'Rohan Member',
    email: 'rohan@example.com',
    dateOfBirth: new Date('1996-07-14'),
    city: 'Pune',
    role: 'user',
    isActive: true,
  });

  const organizerUser = new User({
    _id: organizerId,
    fullName: 'Aarav Organizer',
    email: 'aarav@runclub.app',
    dateOfBirth: new Date('1994-05-15'),
    city: 'Mumbai',
    role: 'organizer',
    isActive: true,
  });

  const adminToken = generateToken({ id: adminId, email: adminUser.email, role: 'admin' });
  const userToken = generateToken({ id: userId, email: normalUser.email, role: 'user' });
  const organizerToken = generateToken({
    id: organizerId,
    email: organizerUser.email,
    role: 'organizer',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Admin Authentication & Route Protection', () => {
    it('rejects unauthenticated access to /api/admin/stats with 401', async () => {
      const res = await request(app).get('/api/admin/stats');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects regular users from /api/admin/stats with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('rejects organizers from /api/admin/users with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents users from self-assigning admin role via registration or role endpoint', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        fullName: 'Sneaky User',
        email: 'sneaky@example.com',
        password: 'StrongPassword123',
        dateOfBirth: '1995-04-12',
        city: 'Mumbai',
        role: 'admin',
      });
      expect(regRes.status).toBe(400);

      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);
      const roleRes = await request(app)
        .patch(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' });
      expect(roleRes.status).toBe(403);
    });
  });

  describe('Dashboard Overview (GET /api/admin/stats)', () => {
    it('returns live platform statistics from database counts', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(User, 'countDocuments')
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(22)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(19)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1);

      vi.spyOn(Event, 'countDocuments')
        .mockResolvedValueOnce(14)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(9)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      vi.spyOn(Booking, 'countDocuments')
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(34);

      vi.spyOn(Report, 'countDocuments')
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      vi.spyOn(ModerationLog, 'find').mockReturnValue(mockQueryChain([]));

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.users).toMatchObject({
        total: 25,
        active: 22,
        suspended: 3,
        organizers: 5,
      });
      expect(res.body.data.stats.events).toMatchObject({
        total: 14,
        upcoming: 8,
        pendingApprovals: 2,
      });
      expect(res.body.data.stats.reports.userReportingAvailable).toBe(true);
    });
  });

  describe('User Management & Suspension (/api/admin/users)', () => {
    it('lists users with pagination and filtering', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(User, 'find').mockReturnValue(mockQueryChain([normalUser.toSafeObject()]));
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/users?search=Rohan&role=user&isActive=true&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('suspends an active user and records a moderation log', async () => {
      const mutableUser = new User({ ...normalUser.toObject(), isActive: true });
      mutableUser.save = vi.fn().mockResolvedValue(mutableUser);

      vi.spyOn(User, 'findById')
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(mutableUser);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({ _id: 'log1' });

      const res = await request(app)
        .patch(`/api/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Repeated event no-shows and spam reports' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.isActive).toBe(false);
      expect(mutableUser.save).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'suspend_user',
          targetType: 'user',
          reason: 'Repeated event no-shows and spam reports',
        })
      );
    });

    it('reactivates a suspended user and records a moderation log', async () => {
      const suspendedUser = new User({ ...normalUser.toObject(), isActive: false });
      suspendedUser.save = vi.fn().mockResolvedValue(suspendedUser);

      vi.spyOn(User, 'findById')
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(suspendedUser);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({ _id: 'log2' });

      const res = await request(app)
        .patch(`/api/admin/users/${userId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Appeal verified' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.isActive).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'reactivate_user',
          targetType: 'user',
        })
      );
    });

    it('prevents admin from suspending themselves or another admin', async () => {
      vi.spyOn(User, 'findById')
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(adminUser);

      const selfRes = await request(app)
        .patch(`/api/admin/users/${adminId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Testing self suspend' });

      expect(selfRes.status).toBe(400);

      vi.spyOn(User, 'findById')
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(anotherAdmin);

      const otherAdminRes = await request(app)
        .patch(`/api/admin/users/${anotherAdminId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Testing admin suspend' });

      expect(otherAdminRes.status).toBe(403);
    });

    it('rejects invalid ObjectId and missing suspension reason with 400', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const badIdRes = await request(app)
        .patch('/api/admin/users/not-an-object-id/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Valid reason' });
      expect(badIdRes.status).toBe(400);

      const missingReasonRes = await request(app)
        .patch(`/api/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(missingReasonRes.status).toBe(400);
    });

    it('retrieves single user details without password and returns 404 for unknown user', async () => {
      vi.spyOn(User, 'findById').mockImplementation((id) => {
        if (id.toString() === adminId) {
          return Promise.resolve(adminUser);
        }
        return mockQueryChain(normalUser);
      });
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(2);
      vi.spyOn(Booking, 'countDocuments').mockResolvedValue(3);
      vi.spyOn(ModerationLog, 'find').mockReturnValue(mockQueryChain([]));

      const okRes = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(okRes.status).toBe(200);
      expect(okRes.body.data.user.email).toBe('rohan@example.com');
      expect(okRes.body.data.user.password).toBeUndefined();
      expect(okRes.body.data.activitySummary).toEqual({
        hostedEventsCount: 2,
        bookingsCount: 3,
      });

      vi.spyOn(User, 'findById').mockImplementation((id) => {
        if (id.toString() === adminId) {
          return Promise.resolve(adminUser);
        }
        return mockQueryChain(null);
      });
      const missingRes = await request(app)
        .get(`/api/admin/users/${new mongoose.Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(missingRes.status).toBe(404);
    });
  });

  describe('Organizer Management (/api/admin/organizers)', () => {
    it('lists organizer accounts with aggregated hosted event counts', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(User, 'find').mockReturnValue(mockQueryChain([organizerUser]));
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Event, 'aggregate').mockResolvedValue([
        {
          _id: organizerUser._id,
          totalEvents: 4,
          publishedEvents: 3,
          pendingEvents: 1,
        },
      ]);

      const res = await request(app)
        .get('/api/admin/organizers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.organizers).toHaveLength(1);
      expect(res.body.data.organizers[0].eventStats).toEqual({
        totalEvents: 4,
        publishedEvents: 3,
        pendingEvents: 1,
      });
      expect(res.body.data.applicationWorkflowAvailable).toBe(false);
    });
  });

  describe('Event Moderation & Approvals (/api/admin/events)', () => {
    const buildMockEvent = (status) => {
      const event = new Event({
        _id: eventId,
        title: 'Sunset Trail Run',
        description: 'Community 7K sunset run across coastal hills.',
        category: 'Running',
        location: { city: 'Mumbai', address: 'Worli Seaface' },
        startDateTime: new Date(Date.now() + 86400000),
        endDateTime: new Date(Date.now() + 90000000),
        capacity: 25,
        bookedCount: 0,
        price: 0,
        status,
        organizer: organizerId,
      });
      event.save = vi.fn().mockResolvedValue(event);
      event.populate = vi.fn().mockResolvedValue(event);
      return event;
    };

    it('approves a pending event and publishes it', async () => {
      const pendingEvent = buildMockEvent('pending');
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(Event, 'findById').mockResolvedValue(pendingEvent);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({ _id: 'log3' });

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Verified venue and organizer' });

      expect(res.status).toBe(200);
      expect(res.body.data.event.status).toBe('published');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'approve_event', targetType: 'event' })
      );
    });

    it('rejects a pending event when given a moderation reason', async () => {
      const pendingEvent = buildMockEvent('pending');
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(Event, 'findById').mockResolvedValue(pendingEvent);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({ _id: 'log4' });

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Incomplete venue address details' });

      expect(res.status).toBe(200);
      expect(res.body.data.event.status).toBe('rejected');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'reject_event' })
      );
    });

    it('rejects approving an already published event with 400', async () => {
      const publishedEvent = buildMockEvent('published');
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(Event, 'findById').mockResolvedValue(publishedEvent);

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('cancels an inappropriate published event with reason', async () => {
      const publishedEvent = buildMockEvent('published');
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(Event, 'findById').mockResolvedValue(publishedEvent);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({ _id: 'log5' });

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violated community safety guidelines' });

      expect(res.status).toBe(200);
      expect(res.body.data.event.status).toBe('cancelled');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'cancel_event' })
      );
    });
  });

  describe('Reports & Moderation Logs Foundation (/api/admin/reports)', () => {
    it('lists reports with explicit userReportingAvailable dependency flag', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(Report, 'find').mockReturnValue(mockQueryChain([]));
      vi.spyOn(Report, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reports).toEqual([]);
      expect(res.body.data.reportingDependency.userReportingAvailable).toBe(true);
    });

    it('reviews an existing report and records a moderation log', async () => {
      const mockReport = new Report({
        _id: reportId,
        targetType: 'event',
        targetId: eventId,
        reportedBy: userId,
        reason: 'Misleading location info',
        status: 'open',
      });
      mockReport.save = vi.fn().mockResolvedValue(mockReport);
      mockReport.populate = vi.fn().mockResolvedValue(mockReport);

      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(Report, 'findById').mockResolvedValue(mockReport);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({ _id: 'log6' });

      const res = await request(app)
        .patch(`/api/admin/reports/${reportId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved', resolutionNotes: 'Event details corrected with organizer' });

      expect(res.status).toBe(200);
      expect(res.body.data.report.status).toBe('resolved');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'resolve_report', targetType: 'report' })
      );
    });
  });

  describe('Booking Management (/api/admin/bookings)', () => {
    const bookingId = new mongoose.Types.ObjectId().toString();

    it('rejects unauthenticated and regular user access to /api/admin/bookings', async () => {
      const unauthRes = await request(app).get('/api/admin/bookings');
      expect(unauthRes.status).toBe(401);

      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);
      const userRes = await request(app)
        .get('/api/admin/bookings')
        .set('Authorization', `Bearer ${userToken}`);
      expect(userRes.status).toBe(403);
    });

    it('lists bookings with status filter, search, and pagination', async () => {
      const mockBooking = {
        _id: bookingId,
        user: { _id: userId, fullName: 'Rohan Member', email: 'rohan@example.com' },
        event: {
          _id: eventId,
          title: 'Marine Drive 5K Run',
          capacity: 30,
          bookedCount: 12,
        },
        status: 'confirmed',
        checkedIn: false,
        bookedAt: new Date('2026-05-20T09:00:00.000Z'),
      };

      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(User, 'find').mockReturnValue(mockQueryChain([{ _id: userId }]));
      vi.spyOn(Event, 'find').mockReturnValue(mockQueryChain([]));
      const bookingFindSpy = vi.spyOn(Booking, 'find').mockReturnValue(mockQueryChain([mockBooking]));
      vi.spyOn(Booking, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/bookings?status=confirmed&search=Rohan&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.pagination).toMatchObject({ total: 1, page: 1, limit: 10 });
      expect(bookingFindSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' })
      );
    });

    it('returns booking details without exposing checkInCode and rejects invalid IDs', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const badIdRes = await request(app)
        .get('/api/admin/bookings/not-an-object-id')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(badIdRes.status).toBe(400);

      const detailBooking = {
        _id: bookingId,
        user: { _id: userId, fullName: 'Rohan Member', email: 'rohan@example.com' },
        event: { _id: eventId, title: 'Marine Drive 5K Run', capacity: 30, bookedCount: 12 },
        status: 'confirmed',
      };
      const selectSpy = vi.fn().mockReturnValue(mockQueryChain(detailBooking));
      vi.spyOn(Booking, 'findById').mockReturnValue({
        select: selectSpy,
        populate: vi.fn().mockReturnThis(),
      });

      const okRes = await request(app)
        .get(`/api/admin/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(okRes.status).toBe(200);
      expect(selectSpy).toHaveBeenCalledWith('-checkInCode');
      expect(okRes.body.data.booking._id).toBe(bookingId);
    });
  });

  describe('Moderation Activity Logs (/api/admin/moderation-logs)', () => {
    it('prevents non-admin users from accessing moderation logs with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const res = await request(app)
        .get('/api/admin/moderation-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('lists moderation logs with actionType, adminId, date range, and search filters', async () => {
      const mockLog = {
        _id: new mongoose.Types.ObjectId().toString(),
        admin: { _id: adminId, fullName: 'Platform Admin', email: 'admin@ricoz.app' },
        actionType: 'suspend_user',
        targetType: 'user',
        targetId: userId,
        reason: 'Repeated spam reports',
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
      };

      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(User, 'find').mockReturnValue(mockQueryChain([]));
      const logFindSpy = vi
        .spyOn(ModerationLog, 'find')
        .mockReturnValue(mockQueryChain([mockLog]));
      vi.spyOn(ModerationLog, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get(
          `/api/admin/moderation-logs?actionType=suspend_user&adminId=${adminId}&startDate=2026-06-01&endDate=2026-06-02&search=spam`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs).toHaveLength(1);
      expect(logFindSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'suspend_user',
          admin: adminId,
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );
    });

    it('rejects inverted date ranges with 400 Bad Request', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const res = await request(app)
        .get('/api/admin/moderation-logs?startDate=2026-06-10&endDate=2026-06-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Admin Account Settings (Profile & Password)', () => {
    it('allows admin to update permitted profile fields and blocks unauthorized role/field changes', async () => {
      const updatedAdmin = new User({
        ...adminUser.toObject(),
        fullName: 'Updated Platform Admin',
        city: 'Bengaluru',
      });

      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedAdmin);

      const okRes = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Updated Platform Admin', city: 'Bengaluru' });

      expect(okRes.status).toBe(200);
      expect(okRes.body.data.profile.fullName).toBe('Updated Platform Admin');
      expect(okRes.body.data.profile.password).toBeUndefined();

      const blockedRes = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(blockedRes.status).toBe(400);
    });

    it('changes password using bcrypt verification and rejects wrong current or weak new passwords', async () => {
      const mutableAdmin = new User({
        _id: adminId,
        fullName: 'Platform Admin',
        email: 'admin@ricoz.app',
        dateOfBirth: new Date('1991-03-10'),
        city: 'Mumbai',
        role: 'admin',
        isActive: true,
        password: 'hashed-password',
      });
      mutableAdmin.comparePassword = vi.fn(async (candidate) => candidate === 'CurrentPass1');
      mutableAdmin.save = vi.fn().mockResolvedValue(mutableAdmin);

      const unauthRes = await request(app)
        .patch('/api/auth/password')
        .send({ currentPassword: 'CurrentPass1', newPassword: 'NewStrongPass1' });
      expect(unauthRes.status).toBe(401);

      vi.spyOn(User, 'findById').mockImplementation(() => {
        const result = Promise.resolve(adminUser);
        result.select = vi.fn().mockResolvedValue(mutableAdmin);
        return result;
      });

      const wrongPassRes = await request(app)
        .patch('/api/auth/password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ currentPassword: 'WrongPassword1', newPassword: 'NewStrongPass1' });
      expect(wrongPassRes.status).toBe(400);

      const weakPassRes = await request(app)
        .patch('/api/auth/password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ currentPassword: 'CurrentPass1', newPassword: 'weak' });
      expect(weakPassRes.status).toBe(400);

      const okRes = await request(app)
        .patch('/api/auth/password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ currentPassword: 'CurrentPass1', newPassword: 'NewStrongPass1' });
      expect(okRes.status).toBe(200);
      expect(mutableAdmin.save).toHaveBeenCalledTimes(1);
      expect(okRes.body.data.user.password).toBeUndefined();
    });
  });

  describe('Event Details & CORS Origin Protection', () => {
    it('retrieves single event details and returns 404 when missing', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      const populatedEvent = {
        _id: eventId,
        title: 'Sunset Trail Run',
        organizer: { _id: organizerId, fullName: 'Aarav Organizer' },
        capacity: 25,
        bookedCount: 5,
        status: 'published',
      };
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(populatedEvent));
      vi.spyOn(ModerationLog, 'find').mockReturnValue(mockQueryChain([]));

      const okRes = await request(app)
        .get(`/api/admin/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(okRes.status).toBe(200);
      expect(okRes.body.data.event.title).toBe('Sunset Trail Run');

      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(null));
      const notFoundRes = await request(app)
        .get(`/api/admin/events/${new mongoose.Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundRes.status).toBe(404);
    });

    it('rejects disallowed cross-origin requests via CORS and permits configured CLIENT_URL with credentials', async () => {
      const blockedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-untrusted-site.example');
      expect(blockedRes.status).toBe(403);

      const allowedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');
      expect(allowedRes.status).toBe(200);
      expect(allowedRes.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(allowedRes.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Admin Role Management (PATCH /api/admin/users/:userId/role)', () => {
    it('promotes a user to organizer and records a moderation log', async () => {
      const targetUser = new User({
        _id: userId,
        fullName: 'Rohan Member',
        email: 'rohan@example.com',
        role: 'user',
        isActive: true,
      });

      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === adminId) return adminUser;
        return targetUser;
      });
      vi.spyOn(targetUser, 'save').mockResolvedValue(targetUser);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'organizer', reason: 'Approved host application' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('organizer');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'update_user_role',
          targetId: targetUser._id,
        })
      );
    });

    it('blocks self-demotion, peer-admin role changes, and invalid target roles', async () => {
      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === adminId) return adminUser;
        if (id.toString() === anotherAdminId) return anotherAdmin;
        return normalUser;
      });

      const selfRes = await request(app)
        .patch(`/api/admin/users/${adminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });
      expect(selfRes.status).toBe(400);

      const peerRes = await request(app)
        .patch(`/api/admin/users/${anotherAdminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'organizer' });
      expect(peerRes.status).toBe(403);

      const invalidRes = await request(app)
        .patch(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });
      expect(invalidRes.status).toBe(400);
    });
  });

  describe('Admin Booking Cancellation (PATCH /api/admin/bookings/:bookingId/cancel)', () => {
    const bookingId = new mongoose.Types.ObjectId().toString();

    it('cancels a confirmed booking, decrements bookedCount safely, and records an audit log', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const cancelledDoc = {
        _id: bookingId,
        status: 'cancelled',
        cancelledAt: new Date(),
        user: { _id: userId, fullName: 'Rohan Member', email: 'rohan@example.com' },
        event: {
          _id: eventId,
          title: 'Sunrise 5K',
          bookedCount: 5,
          capacity: 20,
        },
      };

      vi.spyOn(Booking, 'findOneAndUpdate').mockReturnValue(mockQueryChain(cancelledDoc));
      const eventUpdateSpy = vi.spyOn(Event, 'findOneAndUpdate').mockResolvedValue({
        _id: eventId,
        bookedCount: 4,
      });
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/admin/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate booking requested by attendee' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('cancelled');
      expect(eventUpdateSpy).toHaveBeenCalledWith(
        { _id: eventId, bookedCount: { $gt: 0 } },
        { $inc: { bookedCount: -1 } }
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'cancel_booking',
          targetType: 'booking',
          targetId: bookingId,
        })
      );
    });

    it('rejects duplicate cancellation and missing moderation reason', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const missingReasonRes = await request(app)
        .patch(`/api/admin/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'no' });
      expect(missingReasonRes.status).toBe(400);

      vi.spyOn(Booking, 'findOneAndUpdate').mockReturnValue(mockQueryChain(null));
      vi.spyOn(Booking, 'findById').mockResolvedValue({
        _id: bookingId,
        status: 'cancelled',
      });

      const alreadyCancelledRes = await request(app)
        .patch(`/api/admin/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate cancellation attempt' });
      expect(alreadyCancelledRes.status).toBe(400);
    });
  });
});
