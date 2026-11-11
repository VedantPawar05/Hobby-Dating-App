import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Booking } from '../src/models/booking.model.js';
import { MixerTag } from '../src/models/mixer-tag.model.js';
import { generateToken } from '../src/utils/token.js';
import { MIXER_WINDOW_MS } from '../src/services/mixer.service.js';

function mockQueryChain(resolvedValue) {
  return {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
  };
}

describe('24-Hour Post-Event Mixer API (/api/mixer)', () => {
  const eventId = new mongoose.Types.ObjectId().toString();
  const otherEventId = new mongoose.Types.ObjectId().toString();
  const attendeeAId = new mongoose.Types.ObjectId().toString();
  const attendeeBId = new mongoose.Types.ObjectId().toString();
  const unverifiedUserId = new mongoose.Types.ObjectId().toString();
  const cancelledUserId = new mongoose.Types.ObjectId().toString();
  const outsiderUserId = new mongoose.Types.ObjectId().toString();
  const organizerId = new mongoose.Types.ObjectId().toString();

  const makeUser = (id, fullName, email) =>
    new User({
      _id: id,
      fullName,
      email,
      dateOfBirth: new Date('1995-05-10'),
      city: 'Mumbai',
      bio: 'Runner and coffee fan',
      interests: ['running', 'hiking'],
      role: 'user',
      isActive: true,
    });

  const userA = makeUser(attendeeAId, 'Aarav Verified', 'aarav@example.com');
  const userB = makeUser(attendeeBId, 'Maya Verified', 'maya@example.com');
  const unverifiedUser = makeUser(unverifiedUserId, 'Rohan Unverified', 'rohan@example.com');
  const cancelledUser = makeUser(cancelledUserId, 'Priya Cancelled', 'priya@example.com');
  const outsiderUser = makeUser(outsiderUserId, 'Sam Outsider', 'sam@example.com');

  const tokenA = generateToken({ id: attendeeAId, email: userA.email, role: 'user' });
  const tokenUnverified = generateToken({
    id: unverifiedUserId,
    email: unverifiedUser.email,
    role: 'user',
  });
  const tokenCancelled = generateToken({
    id: cancelledUserId,
    email: cancelledUser.email,
    role: 'user',
  });
  const tokenOutsider = generateToken({
    id: outsiderUserId,
    email: outsiderUser.email,
    role: 'user',
  });

  // Base fixed time: 2026-06-01T12:00:00.000Z
  // Event ended 2 hours earlier (2026-06-01T10:00:00.000Z), so 22h remain in mixer window
  const baseNow = new Date('2026-06-01T12:00:00.000Z');
  const endedStart = new Date('2026-06-01T08:00:00.000Z');
  const endedEnd = new Date('2026-06-01T10:00:00.000Z');

  const endedEvent = new Event({
    _id: eventId,
    title: 'Marine Drive 5K Run',
    description: 'Morning community 5K run.',
    category: 'Running',
    location: { city: 'Mumbai', address: 'Marine Drive' },
    startDateTime: endedStart,
    endDateTime: endedEnd,
    capacity: 30,
    bookedCount: 3,
    price: 0,
    status: 'published',
    organizer: organizerId,
  });

  const verifiedBookingA = new Booking({
    _id: new mongoose.Types.ObjectId(),
    user: attendeeAId,
    event: eventId,
    status: 'confirmed',
    checkedIn: true,
    checkedInAt: endedStart,
  });

  const verifiedBookingB = new Booking({
    _id: new mongoose.Types.ObjectId(),
    user: userB,
    event: eventId,
    status: 'confirmed',
    checkedIn: true,
    checkedInAt: endedStart,
  });

  const unverifiedBooking = new Booking({
    _id: new mongoose.Types.ObjectId(),
    user: unverifiedUserId,
    event: eventId,
    status: 'confirmed',
    checkedIn: false,
  });

  const cancelledBooking = new Booking({
    _id: new mongoose.Types.ObjectId(),
    user: cancelledUserId,
    event: eventId,
    status: 'cancelled',
    checkedIn: false,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(baseNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Eligibility & Access Control', () => {
    it('allows confirmed & QR-verified attendees to access the active mixer and preserves tag privacy', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(verifiedBookingA);
      vi.spyOn(Booking, 'find').mockReturnValue(mockQueryChain([verifiedBookingB]));
      vi.spyOn(Booking, 'countDocuments').mockResolvedValue(1);
      // Mock that userA has NOT tagged userB, even if userB might have tagged userA in DB
      const tagFindSpy = vi.spyOn(MixerTag, 'find').mockReturnValue(mockQueryChain([]));

      const res = await request(app)
        .get(`/api/mixer/${eventId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mixer.isActive).toBe(true);
      expect(res.body.data.attendees).toHaveLength(1);
      expect(res.body.data.attendees[0]).toMatchObject({
        _id: attendeeBId,
        fullName: 'Maya Verified',
        taggedByMe: false,
      });
      // Tag privacy: query strictly filters by fromUser: userA._id and response exposes no incoming tag/match fields
      expect(tagFindSpy).toHaveBeenCalledWith({
        event: eventId,
        fromUser: userA._id,
      });
      expect(res.body.data.attendees[0].taggedMe).toBeUndefined();
      expect(res.body.data.attendees[0].isMutual).toBeUndefined();
      expect(res.body.data.attendees[0].email).toBeUndefined();
    });

    it('rejects unverified attendees (checkedIn: false) with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(unverifiedUser);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(unverifiedBooking);

      const res = await request(app)
        .get(`/api/mixer/${eventId}`)
        .set('Authorization', `Bearer ${tokenUnverified}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('QR attendance check-in verification is required');
    });

    it('rejects cancelled bookings with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(cancelledUser);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(cancelledBooking);

      const res = await request(app)
        .get(`/api/mixer/${eventId}`)
        .set('Authorization', `Bearer ${tokenCancelled}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cancelled bookings cannot access');
    });

    it('rejects cross-event / non-attendee users with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/mixer/${eventId}`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Private Tagging & Abuse Prevention', () => {
    it('allows a verified attendee to privately tag another verified attendee of the same event', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne')
        .mockResolvedValueOnce(verifiedBookingA) // caller booking
        .mockReturnValueOnce(mockQueryChain({ ...verifiedBookingB.toObject(), user: userB })); // target booking
      vi.spyOn(MixerTag, 'findOne').mockResolvedValue(null);

      const expectedExpiry = new Date(endedEnd.getTime() + MIXER_WINDOW_MS);
      const createSpy = vi.spyOn(MixerTag, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        event: eventId,
        fromUser: attendeeAId,
        toUser: attendeeBId,
        expiresAt: expectedExpiry,
        createdAt: baseNow,
      });

      const res = await request(app)
        .post(`/api/mixer/${eventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: attendeeBId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tag.toUser).toBe(attendeeBId);
      expect(new Date(res.body.data.tag.expiresAt).getTime()).toBe(expectedExpiry.getTime());
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: eventId,
          fromUser: userA._id,
          toUser: attendeeBId,
          expiresAt: expectedExpiry,
        })
      );
    });

    it('prevents members from tagging themselves with 400 Bad Request', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .post(`/api/mixer/${eventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: attendeeAId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot tag yourself');
    });

    it('prevents duplicate tags with 409 Conflict', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne')
        .mockResolvedValueOnce(verifiedBookingA)
        .mockReturnValueOnce(mockQueryChain({ ...verifiedBookingB.toObject(), user: userB }));
      vi.spyOn(MixerTag, 'findOne').mockResolvedValue({ _id: 'existing-tag' });

      const res = await request(app)
        .post(`/api/mixer/${eventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: attendeeBId });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already tagged');
    });

    it('rejects tagging an unverified attendee or attendee from another event with 400', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne')
        .mockResolvedValueOnce(verifiedBookingA)
        // Booking.findOne({ event: eventId, user: toUserId, status: 'confirmed', checkedIn: true }) returns null
        .mockReturnValueOnce(mockQueryChain(null));

      const res = await request(app)
        .post(`/api/mixer/${eventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: unverifiedUserId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not a verified attendee');
    });

    it('prevents cross-event access when tagging an event the user did not attend', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/mixer/${otherEventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: attendeeBId });

      expect(res.status).toBe(403);
    });
  });

  describe('24-Hour Expiry Enforcement', () => {
    it('rejects mixer access before the event ends with 400', async () => {
      vi.setSystemTime(new Date(endedEnd.getTime() - 60000)); // 1 minute before event ends
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(verifiedBookingA);

      const res = await request(app)
        .get(`/api/mixer/${eventId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('once the event ends');
    });

    it('allows tagging 1 second before exact 24-hour boundary and rejects at exact 24-hour boundary', async () => {
      // 1 second before expiry -> active
      vi.setSystemTime(new Date(endedEnd.getTime() + MIXER_WINDOW_MS - 1000));
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne')
        .mockResolvedValueOnce(verifiedBookingA)
        .mockReturnValueOnce(mockQueryChain({ ...verifiedBookingB.toObject(), user: userB }));
      vi.spyOn(MixerTag, 'findOne').mockResolvedValue(null);
      vi.spyOn(MixerTag, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        event: eventId,
        fromUser: attendeeAId,
        toUser: attendeeBId,
        expiresAt: new Date(endedEnd.getTime() + MIXER_WINDOW_MS),
        createdAt: new Date(),
      });

      const beforeExpiryRes = await request(app)
        .post(`/api/mixer/${eventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: attendeeBId });

      expect(beforeExpiryRes.status).toBe(201);

      // Exactly at 24 hours -> expired (410 Gone)
      vi.restoreAllMocks();
      vi.setSystemTime(new Date(endedEnd.getTime() + MIXER_WINDOW_MS));
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Event, 'findById').mockReturnValue(mockQueryChain(endedEvent));
      vi.spyOn(Booking, 'findOne').mockResolvedValue(verifiedBookingA);

      const atExpiryTagRes = await request(app)
        .post(`/api/mixer/${eventId}/tags`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toUserId: attendeeBId });

      expect(atExpiryTagRes.status).toBe(410);
      expect(atExpiryTagRes.body.message).toContain('24-hour post-event mixer window has expired');

      const atExpiryGetRes = await request(app)
        .get(`/api/mixer/${eventId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(atExpiryGetRes.status).toBe(410);
    });
  });
});


