import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { BookingService } from '../src/services/booking.service.js';
import { Event } from '../src/models/event.model.js';
import { Booking } from '../src/models/booking.model.js';

describe('Booking Concurrency & Atomic Capacity Handling', () => {
  const eventId = new mongoose.Types.ObjectId().toString();
  const user1Id = new mongoose.Types.ObjectId().toString();
  const user2Id = new mongoose.Types.ObjectId().toString();
  const organizerId = new mongoose.Types.ObjectId().toString();

  const futureStart = new Date(Date.now() + 86400000);
  const futureEnd = new Date(Date.now() + 90000000);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles simultaneous booking requests for the final slot without overbooking', async () => {
    // Capacity = 10, already bookedCount = 9 (only 1 slot remains)
    let currentBookedCount = 9;
    const capacity = 10;

    const baseEventDoc = {
      _id: eventId,
      title: 'Competitive Tennis Match',
      status: 'published',
      startDateTime: futureStart,
      endDateTime: futureEnd,
      capacity,
      bookedCount: currentBookedCount,
      organizer: organizerId,
    };

    // Both requests see event is published and in future
    vi.spyOn(Event, 'findById').mockImplementation(async () => {
      return new Event({
        ...baseEventDoc,
        bookedCount: currentBookedCount,
      });
    });

    vi.spyOn(Booking, 'findOne').mockResolvedValue(null);

    // Simulate atomic MongoDB findOneAndUpdate with condition $expr: { $lt: ['$bookedCount', '$capacity'] }
    vi.spyOn(Event, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
      if (currentBookedCount < capacity) {
        currentBookedCount += 1;
        return new Event({
          ...baseEventDoc,
          bookedCount: currentBookedCount,
        });
      }
      // If already at or above capacity, MongoDB condition fails to match -> returns null
      return null;
    });

    vi.spyOn(Booking, 'create').mockImplementation(async ({ user }) => {
      return new Booking({
        _id: new mongoose.Types.ObjectId(),
        user,
        event: eventId,
        status: 'confirmed',
        bookedAt: new Date(),
      });
    });

    // Execute concurrent booking attempts simultaneously
    const [result1, result2] = await Promise.allSettled([
      BookingService.createBooking(user1Id, eventId),
      BookingService.createBooking(user2Id, eventId),
    ]);

    const successes = [result1, result2].filter((r) => r.status === 'fulfilled');
    const failures = [result1, result2].filter((r) => r.status === 'rejected');

    // Exactly 1 user must succeed
    expect(successes).toHaveLength(1);
    // Exactly 1 user must fail
    expect(failures).toHaveLength(1);

    // Rejected error must clearly state fully booked
    expect(failures[0].reason.message).toContain('fully booked');
    // Event capacity was never exceeded
    expect(currentBookedCount).toBe(10);
  });

  it('safely rolls back reserved bookedCount when booking record creation fails', async () => {
    const baseEventDoc = new Event({
      _id: eventId,
      title: 'Bouldering Session',
      status: 'published',
      startDateTime: futureStart,
      endDateTime: futureEnd,
      capacity: 10,
      bookedCount: 5,
      organizer: organizerId,
    });

    vi.spyOn(Event, 'findById').mockResolvedValue(baseEventDoc);
    vi.spyOn(Booking, 'findOne').mockResolvedValue(null);

    // Atomic reservation succeeds: increments bookedCount to 6
    vi.spyOn(Event, 'findOneAndUpdate').mockResolvedValue(
      new Event({
        ...baseEventDoc.toObject(),
        bookedCount: 6,
      })
    );

    // Spy on the rollback call
    const rollbackSpy = vi.spyOn(Event, 'findByIdAndUpdate').mockResolvedValue(baseEventDoc);

    // Booking.create triggers a duplicate key collision (code 11000)
    const duplicateErr = new Error('E11000 duplicate key error');
    duplicateErr.code = 11000;
    vi.spyOn(Booking, 'create').mockRejectedValue(duplicateErr);

    await expect(BookingService.createBooking(user1Id, eventId)).rejects.toThrow(
      'You have already booked this event'
    );

    // Verify atomic decrement rollback was executed to keep bookedCount accurate
    expect(rollbackSpy).toHaveBeenCalledWith(eventId, { $inc: { bookedCount: -1 } });
  });
});

