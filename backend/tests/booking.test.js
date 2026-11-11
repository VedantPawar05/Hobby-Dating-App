import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Booking } from '../src/models/booking.model.js';
import { generateToken } from '../src/utils/token.js';

describe('Booking API & Capacity Lifecycle (/api/bookings)', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const anotherUserId = new mongoose.Types.ObjectId().toString();
  const organizerId = new mongoose.Types.ObjectId().toString();
  const eventId = new mongoose.Types.ObjectId().toString();

  const user = new User({
    _id: userId,
    fullName: 'Booking User',
    email: 'booker@example.com',
    role: 'user',
    isActive: true,
  });

  const anotherUser = new User({
    _id: anotherUserId,
    fullName: 'Another User',
    email: 'another@example.com',
    role: 'user',
    isActive: true,
  });

  const organizer = new User({
    _id: organizerId,
    fullName: 'Organizer Jim',
    email: 'jim@runclub.com',
    role: 'organizer',
    isActive: true,
  });

  const userToken = generateToken({ id: userId, role: 'user' });
  const anotherUserToken = generateToken({ id: anotherUserId, role: 'user' });
  const organizerToken = generateToken({ id: organizerId, role: 'organizer' });

  const futureStart = new Date(Date.now() + 86400000);
  const futureEnd = new Date(Date.now() + 90000000);

  const baseEvent = new Event({
    _id: eventId,
    title: 'Trail Run & Hike',
    description: 'Scenic trail run across Mount Si trails.',
    category: 'Hiking',
    status: 'published',
    location: { city: 'North Bend', address: 'Trailhead #4' },
    startDateTime: futureStart,
    endDateTime: futureEnd,
    capacity: 10,
    bookedCount: 0,
    price: 0,
    organizer: organizerId,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Registration (POST /api/bookings/:eventId)', () => {
    it('successfully books an available published event and increments capacity', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);
      vi.spyOn(Event, 'findById').mockResolvedValue(baseEvent);
      vi.spyOn(Booking, 'findOne').mockResolvedValue(null);

      // Atomic reservation returns updated event with bookedCount: 1
      const reservedEvent = new Event({
        ...baseEvent.toObject(),
        bookedCount: 1,
      });
      vi.spyOn(Event, 'findOneAndUpdate').mockResolvedValue(reservedEvent);

      const createdBooking = new Booking({
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        event: eventId,
        status: 'confirmed',
        bookedAt: new Date(),
      });
      vi.spyOn(Booking, 'create').mockResolvedValue(createdBooking);

      const res = await request(app)
        .post(`/api/bookings/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('confirmed');
      expect(Event.findOneAndUpdate).toHaveBeenCalled();
    });

    it('rejects duplicate booking for the same user with 409 Conflict', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);
      vi.spyOn(Event, 'findById').mockResolvedValue(baseEvent);

      // Mock existing confirmed booking
      vi.spyOn(Booking, 'findOne').mockResolvedValue(
        new Booking({
          _id: new mongoose.Types.ObjectId(),
          user: userId,
          event: eventId,
          status: 'confirmed',
        })
      );

      const res = await request(app)
        .post(`/api/bookings/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already booked this event');
    });

    it('rejects booking when an event is full (capacity reached)', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const fullEvent = new Event({
        ...baseEvent.toObject(),
        capacity: 5,
        bookedCount: 5, // full
      });
      vi.spyOn(Event, 'findById').mockResolvedValue(fullEvent);
      vi.spyOn(Booking, 'findOne').mockResolvedValue(null);

      // Atomic update fails to match condition $expr: { $lt: ['$bookedCount', '$capacity'] }
      vi.spyOn(Event, 'findOneAndUpdate').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/bookings/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('fully booked');
    });

    it('rejects booking for a cancelled event', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const cancelledEvent = new Event({
        ...baseEvent.toObject(),
        status: 'cancelled',
      });
      vi.spyOn(Event, 'findById').mockResolvedValue(cancelledEvent);

      const res = await request(app)
        .post(`/api/bookings/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot book a cancelled event');
    });

    it('rejects booking for an event that has already started', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const pastEvent = new Event({
        ...baseEvent.toObject(),
        startDateTime: new Date(Date.now() - 3600000), // 1 hour ago
      });
      vi.spyOn(Event, 'findById').mockResolvedValue(pastEvent);

      const res = await request(app)
        .post(`/api/bookings/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already started');
    });

    it('rejects an organizer booking their own event', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(organizer);
      vi.spyOn(Event, 'findById').mockResolvedValue(baseEvent);

      const res = await request(app)
        .post(`/api/bookings/${eventId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Organizers cannot book their own events');
    });
  });

  describe('Booking Cancellation (DELETE /api/bookings/:bookingId)', () => {
    const bookingId = new mongoose.Types.ObjectId().toString();

    it('successfully cancels a confirmed booking and decrements event bookedCount', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const updatedBooking = new Booking({
        _id: bookingId,
        user: userId,
        event: eventId,
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      // Atomic transition from confirmed to cancelled succeeds
      vi.spyOn(Booking, 'findOneAndUpdate').mockResolvedValue(updatedBooking);
      const decrSpy = vi.spyOn(Event, 'findByIdAndUpdate').mockResolvedValue(baseEvent);

      const res = await request(app)
        .delete(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('cancelled');
      expect(decrSpy).toHaveBeenCalledWith(eventId, { $inc: { bookedCount: -1 } });
    });

    it('prevents repeated cancellation from decrementing capacity multiple times', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      // Atomic transition fails because status is already 'cancelled'
      vi.spyOn(Booking, 'findOneAndUpdate').mockResolvedValue(null);

      const alreadyCancelled = new Booking({
        _id: bookingId,
        user: userId,
        event: eventId,
        status: 'cancelled',
      });
      vi.spyOn(Booking, 'findById').mockResolvedValue(alreadyCancelled);

      const decrSpy = vi.spyOn(Event, 'findByIdAndUpdate');

      const res = await request(app)
        .delete(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been cancelled');
      expect(decrSpy).not.toHaveBeenCalled();
    });

    it('prevents users from cancelling bookings belonging to someone else with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(anotherUser);

      // Atomic transition fails because user mismatch
      vi.spyOn(Booking, 'findOneAndUpdate').mockResolvedValue(null);

      const originalBooking = new Booking({
        _id: bookingId,
        user: userId, // belongs to user, not anotherUser
        event: eventId,
        status: 'confirmed',
      });
      vi.spyOn(Booking, 'findById').mockResolvedValue(originalBooking);

      const res = await request(app)
        .delete(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You can only cancel your own bookings');
    });
  });

  describe('User Booking History (GET /api/bookings/my-bookings)', () => {
    it('returns the current user booking history with pagination', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const mockBookings = [
        new Booking({
          _id: new mongoose.Types.ObjectId(),
          user: userId,
          event: baseEvent,
          status: 'confirmed',
          bookedAt: new Date(),
        }),
      ];

      vi.spyOn(Booking, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBookings),
      });
      vi.spyOn(Booking, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/bookings/my-bookings?status=confirmed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });
  });
});

