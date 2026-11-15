import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Booking } from '../src/models/booking.model.js';
import { ModerationLog } from '../src/models/moderation-log.model.js';
import { generateToken } from '../src/utils/token.js';

describe('Event Management & Discovery API (/api/events)', () => {
  const normalUserId = new mongoose.Types.ObjectId().toString();
  const organizerId = new mongoose.Types.ObjectId().toString();
  const anotherOrganizerId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();

  const normalUser = new User({
    _id: normalUserId,
    fullName: 'Normal User',
    email: 'user@example.com',
    role: 'user',
    isActive: true,
  });

  const organizerUser = new User({
    _id: organizerId,
    fullName: 'Organizer Bob',
    email: 'bob@runclub.com',
    role: 'organizer',
    isActive: true,
  });

  const anotherOrganizerUser = new User({
    _id: anotherOrganizerId,
    fullName: 'Organizer Alice',
    email: 'alice@runclub.com',
    role: 'organizer',
    isActive: true,
  });

  const adminUser = new User({
    _id: adminId,
    fullName: 'Admin Dave',
    email: 'admin@ricoz.com',
    role: 'admin',
    isActive: true,
  });

  const userToken = generateToken({ id: normalUserId, role: 'user' });
  const organizerToken = generateToken({ id: organizerId, role: 'organizer' });
  const anotherOrganizerToken = generateToken({ id: anotherOrganizerId, role: 'organizer' });
  const adminToken = generateToken({ id: adminId, role: 'admin' });

  const futureStart = new Date(Date.now() + 86400000).toISOString(); // +1 day
  const futureEnd = new Date(Date.now() + 90000000).toISOString();

  const validEventPayload = {
    title: 'Morning 5K Sunrise Run',
    description: 'Join us for a relaxing 5K run around the park followed by coffee.',
    category: 'Running',
    activityType: 'Road Running',
    location: {
      city: 'Seattle',
      address: 'Green Lake Park, Seattle, WA',
    },
    startDateTime: futureStart,
    endDateTime: futureEnd,
    capacity: 20,
    price: 0,
    status: 'published',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Organizer Permissions & Event Creation (POST /api/events)', () => {
    it('denies event creation to normal users with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validEventPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('allows verified organizers to create events', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const createdMock = new Event({
        _id: new mongoose.Types.ObjectId(),
        ...validEventPayload,
        organizer: organizerId,
        bookedCount: 0,
      });

      vi.spyOn(Event, 'create').mockResolvedValue(createdMock);

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(validEventPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.title).toBe(validEventPayload.title);
      expect(res.body.data.event.bookedCount).toBe(0);
    });

    it('rejects event with end date before start date', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const invalidDates = {
        ...validEventPayload,
        startDateTime: futureEnd,
        endDateTime: futureStart, // inverted
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDates);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'endDateTime' }),
        ])
      );
    });

    it('rejects event with negative price or non-positive capacity', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ...validEventPayload,
          price: -10,
          capacity: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Event Updates & Deletion (PATCH & DELETE /api/events/:eventId)', () => {
    it('prevents an organizer from updating another organizer event with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(anotherOrganizerUser);

      const existingEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        ...validEventPayload,
        organizer: organizerId, // belongs to Bob
        bookedCount: 5,
      });

      vi.spyOn(Event, 'findById').mockResolvedValue(existingEvent);

      const res = await request(app)
        .patch(`/api/events/${existingEvent._id}`)
        .set('Authorization', `Bearer ${anotherOrganizerToken}`)
        .send({ title: 'Unauthorized Modification' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You can only update events you created');
    });

    it('prevents reducing capacity below current bookedCount', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const existingEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        ...validEventPayload,
        organizer: organizerId,
        capacity: 20,
        bookedCount: 15,
      });

      vi.spyOn(Event, 'findById').mockResolvedValue(existingEvent);

      const res = await request(app)
        .patch(`/api/events/${existingEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ capacity: 10 }); // 10 < 15

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Capacity cannot be reduced below the current booking count');
    });

    it('prevents event deletion if active bookings exist', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const existingEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        ...validEventPayload,
        organizer: organizerId,
        bookedCount: 3,
      });

      vi.spyOn(Event, 'findById').mockResolvedValue(existingEvent);

      const res = await request(app)
        .delete(`/api/events/${existingEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot delete an event with active bookings');
    });
  });

  describe('Event Discovery (GET /api/events)', () => {
    it('returns published upcoming events publicly without authentication', async () => {
      const mockEvents = [
        new Event({
          _id: new mongoose.Types.ObjectId(),
          title: 'Seattle Park Run',
          category: 'Running',
          status: 'published',
          location: { city: 'Seattle', address: 'Main St' },
          startDateTime: new Date(Date.now() + 3600000),
          capacity: 30,
          bookedCount: 2,
          organizer: organizerId,
        }),
      ];

      vi.spyOn(Event, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockEvents),
      });
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(1);

      const res = await request(app).get('/api/events?city=Seattle&category=Running');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('returns published event details publicly and hides drafts from anonymous users', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const publishedEvent = new Event({
        _id: eventId,
        title: 'Public Trail Meetup',
        category: 'Hiking',
        status: 'published',
        location: { city: 'Seattle', address: 'Trailhead' },
        startDateTime: new Date(Date.now() + 3600000),
        endDateTime: new Date(Date.now() + 7200000),
        capacity: 20,
        bookedCount: 1,
        organizer: organizerId,
      });

      vi.spyOn(Event, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(publishedEvent),
      });

      const publicRes = await request(app).get(`/api/events/${eventId}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.event.title).toBe('Public Trail Meetup');

      const draftEvent = new Event({
        _id: eventId,
        title: 'Secret Draft',
        category: 'Hiking',
        status: 'draft',
        location: { city: 'Seattle', address: 'Trailhead' },
        startDateTime: new Date(Date.now() + 3600000),
        endDateTime: new Date(Date.now() + 7200000),
        capacity: 20,
        bookedCount: 0,
        organizer: organizerId,
      });

      vi.spyOn(Event, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(draftEvent),
      });

      const anonDraftRes = await request(app).get(`/api/events/${eventId}`);
      expect(anonDraftRes.status).toBe(404);

      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);
      const ownerDraftRes = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(ownerDraftRes.status).toBe(200);
    });
  });

  describe('Attendee Management (GET /api/events/:eventId/attendees)', () => {
    it('denies attendee viewing to normal users with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/events/${eventId}/attendees`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('denies attendee viewing to an organizer who is not the event owner with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(anotherOrganizerUser);

      const existingEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        ...validEventPayload,
        organizer: organizerId, // belongs to Bob
      });

      vi.spyOn(Event, 'findById').mockResolvedValue(existingEvent);

      const res = await request(app)
        .get(`/api/events/${existingEvent._id}/attendees`)
        .set('Authorization', `Bearer ${anotherOrganizerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only the event organizer or an admin can view attendees');
    });

    it('allows event organizer to view confirmed attendees without exposing passwords', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);

      const eventId = new mongoose.Types.ObjectId();
      const existingEvent = new Event({
        _id: eventId,
        ...validEventPayload,
        organizer: organizerId,
      });

      vi.spyOn(Event, 'findById').mockResolvedValue(existingEvent);

      const mockBookings = [
        {
          _id: new mongoose.Types.ObjectId(),
          bookedAt: new Date(),
          user: {
            fullName: 'Attendee Sarah',
            email: 'sarah@example.com',
            city: 'Seattle',
          },
        },
      ];

      vi.spyOn(Booking, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBookings),
      });
      vi.spyOn(Booking, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/events/${eventId}/attendees`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendees).toHaveLength(1);
      expect(res.body.data.attendees[0].user.fullName).toBe('Attendee Sarah');
      expect(res.body.data.attendees[0].user.password).toBeUndefined();
    });
  });

  describe('Public Event Discovery & Search (GET /api/events)', () => {
    function mockEventQueryChain(resolvedEvents) {
      return {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(resolvedEvents),
      };
    }

    const sampleEvent = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Morning 5K Sunrise Run',
      description: 'Scenic waterfront 5K run with coffee meetup afterwards.',
      category: 'Running',
      activityType: 'Road Running',
      location: { city: 'Seattle', address: 'Green Lake' },
      startDateTime: new Date(Date.now() + 86400000),
      endDateTime: new Date(Date.now() + 90000000),
      capacity: 25,
      bookedCount: 5,
      price: 0,
      status: 'published',
      organizer: {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Organizer Bob',
        profilePicture: 'https://example.com/bob.jpg',
        city: 'Seattle',
      },
    };

    it('searches events by name and description with case-insensitive matching', async () => {
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockEventQueryChain([sampleEvent]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(1);

      const res = await request(app).get('/api/events?search=waterfront');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].title).toBe('Morning 5K Sunrise Run');

      // Verify search condition matches both title and description
      const queryArg = findSpy.mock.calls[0][0];
      expect(queryArg.$or).toBeDefined();
      expect(queryArg.$or).toContainEqual(expect.objectContaining({ title: expect.any(RegExp) }));
      expect(queryArg.$or).toContainEqual(expect.objectContaining({ description: expect.any(RegExp) }));
    });

    it('filters events by category and city location', async () => {
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockEventQueryChain([sampleEvent]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(1);

      const res = await request(app).get('/api/events?category=Running&city=Seattle');

      expect(res.status).toBe(200);
      const queryArg = findSpy.mock.calls[0][0];
      expect(queryArg.category).toBe('Running');
      expect(queryArg['location.city']).toBeInstanceOf(RegExp);
      expect(queryArg['location.city'].test('Seattle')).toBe(true);
      expect(queryArg['location.city'].test('seattle')).toBe(true);
    });

    it('filters events by single specific date and date range', async () => {
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockEventQueryChain([sampleEvent]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(1);

      const resDate = await request(app).get('/api/events?date=2026-11-20');
      expect(resDate.status).toBe(200);

      const queryArgDate = findSpy.mock.calls[0][0];
      expect(queryArgDate.startDateTime.$gte).toBeDefined();
      expect(queryArgDate.startDateTime.$lte).toBeDefined();

      // Range filter
      const resRange = await request(app).get('/api/events?startDate=2026-11-01&endDate=2026-11-30');
      expect(resRange.status).toBe(200);
    });

    it('filters events by free and paid price types', async () => {
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockEventQueryChain([sampleEvent]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(1);

      // Free events
      const resFree = await request(app).get('/api/events?priceType=free');
      expect(resFree.status).toBe(200);
      expect(findSpy.mock.calls[0][0].price).toBe(0);

      // Paid events
      const resPaid = await request(app).get('/api/events?priceType=paid');
      expect(resPaid.status).toBe(200);
      expect(findSpy.mock.calls[1][0].price).toEqual({ $gt: 0 });
    });

    it('applies combined filters, deterministic sorting, and server-side pagination', async () => {
      const mockChain = mockEventQueryChain([sampleEvent]);
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockChain);
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(30);

      const res = await request(app).get(
        '/api/events?search=run&category=Running&city=Seattle&priceType=free&sortBy=startDateTime&sortOrder=asc&page=2&limit=10'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(2);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.pagination.totalPages).toBe(3);

      expect(mockChain.skip).toHaveBeenCalledWith(10);
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      // Deterministic tie-breaker with _id
      expect(mockChain.sort).toHaveBeenCalledWith({ startDateTime: 1, _id: 1 });
    });

    it('rejects invalid pagination values with 400 Bad Request', async () => {
      const resInvalidPage = await request(app).get('/api/events?page=0');
      expect(resInvalidPage.status).toBe(400);

      const resInvalidLimit = await request(app).get('/api/events?limit=500');
      expect(resInvalidLimit.status).toBe(400);
    });

    it('strictly enforces exclusion of draft, pending, rejected, and cancelled events from discovery', async () => {
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockEventQueryChain([]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(0);

      await request(app).get('/api/events');

      const queryArg = findSpy.mock.calls[0][0];
      expect(queryArg.status).toBe('published');
      expect(queryArg.status).not.toBe('draft');
      expect(queryArg.status).not.toBe('pending');
      expect(queryArg.status).not.toBe('rejected');
      expect(queryArg.status).not.toBe('cancelled');
    });

    it('safely escapes special regex characters in search and location queries', async () => {
      const findSpy = vi.spyOn(Event, 'find').mockReturnValue(mockEventQueryChain([]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(0);

      const res = await request(app).get('/api/events?search=run(5K)+[fast]?&city=New(York)?');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toEqual([]);
    });

    it('protects private organizer information in public discovery payload', async () => {
      const mockChain = mockEventQueryChain([sampleEvent]);
      vi.spyOn(Event, 'find').mockReturnValue(mockChain);
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(1);

      const res = await request(app).get('/api/events');

      expect(res.status).toBe(200);
      expect(mockChain.populate).toHaveBeenCalledWith(
        'organizer',
        'fullName profilePicture city'
      );
      // Ensures private organizer email is not populated for public discovery
      expect(mockChain.populate).not.toHaveBeenCalledWith(
        'organizer',
        expect.stringContaining('email')
      );
    });
  });

  describe('Admin Role Promotion (PATCH /api/users/:userId/role)', () => {
    it('rejects normal user attempting to promote another user or themselves', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const res = await request(app)
        .patch(`/api/users/${normalUserId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'organizer' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows admin to promote a normal user to organizer and logs moderation action', async () => {
      const mutableUser = new User({
        _id: normalUserId,
        fullName: 'Normal User',
        email: 'user@example.com',
        role: 'user',
        isActive: true,
      });

      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === adminId) return adminUser;
        return mutableUser;
      });

      vi.spyOn(mutableUser, 'save').mockResolvedValue(mutableUser);
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/users/${normalUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'organizer', reason: 'Verified host' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('organizer');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'update_user_role',
          targetId: mutableUser._id,
        })
      );
    });

    it('prevents an admin from changing their own role or demoting another admin', async () => {
      const otherAdminId = new mongoose.Types.ObjectId().toString();
      const otherAdmin = new User({
        _id: otherAdminId,
        fullName: 'Other Admin',
        email: 'other-admin@ricoz.com',
        role: 'admin',
        isActive: true,
      });

      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === adminId) return adminUser;
        return otherAdmin;
      });

      const selfRes = await request(app)
        .patch(`/api/users/${adminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(selfRes.status).toBe(400);

      const peerRes = await request(app)
        .patch(`/api/users/${otherAdminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(peerRes.status).toBe(403);
    });
  });

  describe('Organizer QR Check-in (POST /api/events/:eventId/check-in)', () => {
    const eventId = new mongoose.Types.ObjectId().toString();
    const bookingId = new mongoose.Types.ObjectId().toString();

    const hostedEvent = new Event({
      _id: eventId,
      title: 'Morning QR Check-in Run',
      status: 'published',
      organizer: organizerId,
    });

    it('checks in an attendee using QR JSON payload', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);
      vi.spyOn(Event, 'findById').mockResolvedValue(hostedEvent);
      vi.spyOn(Booking, 'findOne').mockResolvedValue({
        _id: bookingId,
        event: eventId,
        status: 'confirmed',
        checkedIn: false,
        checkInCode: 'RCZ-ABCD1234',
      });
      vi.spyOn(Booking, 'findOneAndUpdate').mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            _id: bookingId,
            status: 'confirmed',
            checkedIn: true,
            checkedInAt: new Date(),
            user: { fullName: 'Normal User', email: 'user@example.com' },
          }),
        }),
      });

      const qrPayload = JSON.stringify({
        type: 'hobby_dating_checkin',
        bookingId,
        eventId,
        checkInCode: 'RCZ-ABCD1234',
      });

      const res = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ qrData: qrPayload });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.checkedIn).toBe(true);
    });

    it('rejects duplicate, cancelled, wrong-event, unauthorized, and unknown check-in attempts', async () => {
      // Duplicate check-in (409)
      vi.spyOn(User, 'findById').mockResolvedValue(organizerUser);
      vi.spyOn(Event, 'findById').mockResolvedValue(hostedEvent);
      vi.spyOn(Booking, 'findOne').mockResolvedValue({
        _id: bookingId,
        event: eventId,
        status: 'confirmed',
        checkedIn: true,
        checkInCode: 'RCZ-ABCD1234',
      });

      const dupRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ checkInCode: 'RCZ-ABCD1234' });
      expect(dupRes.status).toBe(409);

      // Cancelled booking (400)
      vi.spyOn(Booking, 'findOne').mockResolvedValue({
        _id: bookingId,
        event: eventId,
        status: 'cancelled',
        checkedIn: false,
        checkInCode: 'RCZ-ABCD1234',
      });
      const cancelledRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ checkInCode: 'RCZ-ABCD1234' });
      expect(cancelledRes.status).toBe(400);

      // Wrong event QR payload (400)
      const otherEventId = new mongoose.Types.ObjectId().toString();
      const wrongEventRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          qrData: JSON.stringify({
            bookingId,
            eventId: otherEventId,
            checkInCode: 'RCZ-ABCD1234',
          }),
        });
      expect(wrongEventRes.status).toBe(400);

      // Missing booking / invalid code (404)
      vi.spyOn(Booking, 'findOne').mockResolvedValue(null);
      const missingRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ checkInCode: 'RCZ-UNKNOWN' });
      expect(missingRes.status).toBe(404);

      // Unauthorized organizer (403)
      vi.spyOn(User, 'findById').mockResolvedValue(anotherOrganizerUser);
      const forbiddenRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${anotherOrganizerToken}`)
        .send({ checkInCode: 'RCZ-ABCD1234' });
      expect(forbiddenRes.status).toBe(403);
    });
  });
});
