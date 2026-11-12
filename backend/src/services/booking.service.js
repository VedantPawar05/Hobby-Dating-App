import crypto from 'crypto';
import QRCode from 'qrcode';
import { Booking } from '../models/booking.model.js';
import { Event } from '../models/event.model.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import { BOOKING_STATUSES } from '../constants/booking.constants.js';

function createCheckInCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

export class BookingService {
  /**
   * Registers a user for an event with atomic concurrency protection.
   * Handles simultaneous requests safely and rolls back capacity on duplicate keys.
   */
  static async createBooking(userId, eventId) {
    const event = await Event.findById(eventId);

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    if (event.status === EVENT_STATUSES.CANCELLED) {
      const error = new Error('Cannot book a cancelled event');
      error.statusCode = 400;
      throw error;
    }

    if (event.status !== EVENT_STATUSES.PUBLISHED) {
      const error = new Error('Event is not open for public booking');
      error.statusCode = 400;
      throw error;
    }

    if (new Date(event.startDateTime) <= new Date()) {
      const error = new Error('Cannot book an event that has already started');
      error.statusCode = 400;
      throw error;
    }

    // Prevent organizers from booking their own events
    if (event.organizer.toString() === userId.toString()) {
      const error = new Error('Organizers cannot book their own events');
      error.statusCode = 400;
      throw error;
    }

    // Check if user already has a booking record for this event
    const existingBooking = await Booking.findOne({
      user: userId,
      event: eventId,
    });

    if (existingBooking && existingBooking.status === BOOKING_STATUSES.CONFIRMED) {
      const error = new Error('You have already booked this event');
      error.statusCode = 409;
      throw error;
    }

    // Atomic capacity reservation: increments bookedCount ONLY if bookedCount < capacity
    const reservedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: EVENT_STATUSES.PUBLISHED,
        startDateTime: { $gt: new Date() },
        $expr: { $lt: ['$bookedCount', '$capacity'] },
      },
      { $inc: { bookedCount: 1 } },
      { new: true }
    );

    if (!reservedEvent) {
      // Re-inspect event state to provide an accurate error response
      const latest = await Event.findById(eventId);
      if (latest && latest.bookedCount >= latest.capacity) {
        const error = new Error('Event is fully booked');
        error.statusCode = 400;
        throw error;
      }

      const error = new Error('Event is no longer available for booking');
      error.statusCode = 400;
      throw error;
    }

    // Reactivate cancelled booking cleanly or create a new confirmed booking record.
    try {
      if (existingBooking && existingBooking.status === BOOKING_STATUSES.CANCELLED) {
        existingBooking.status = BOOKING_STATUSES.CONFIRMED;
        existingBooking.bookedAt = new Date();
        existingBooking.cancelledAt = null;
        existingBooking.checkedIn = false;
        existingBooking.checkedInAt = null;
        existingBooking.checkInCode = createCheckInCode();
        await existingBooking.save();
        return existingBooking;
      }

      const booking = await Booking.create({
        user: userId,
        event: eventId,
        status: BOOKING_STATUSES.CONFIRMED,
        bookedAt: new Date(),
        checkInCode: createCheckInCode(),
      });

      return booking;
    } catch (createError) {
      // Safely roll back the reserved slot on failure
      await Event.findByIdAndUpdate(eventId, { $inc: { bookedCount: -1 } });

      if (createError.code === 11000) {
        const duplicateError = new Error('You have already booked this event');
        duplicateError.statusCode = 409;
        throw duplicateError;
      }

      throw createError;
    }
  }

  /**
   * Cancels a user's booking and decrements event bookedCount exactly once.
   */
  static async cancelBooking(userId, bookingId) {
    // Atomic state transition: updates status ONLY if current status is 'confirmed'
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        user: userId,
        status: BOOKING_STATUSES.CONFIRMED,
      },
      {
        $set: {
          status: BOOKING_STATUSES.CANCELLED,
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!booking) {
      // Inspect why the transition failed
      const existing = await Booking.findById(bookingId);

      if (!existing) {
        const error = new Error('Booking not found');
        error.statusCode = 404;
        throw error;
      }

      if (existing.user.toString() !== userId.toString()) {
        const error = new Error('Forbidden: You can only cancel your own bookings');
        error.statusCode = 403;
        throw error;
      }

      if (existing.status === BOOKING_STATUSES.CANCELLED) {
        const error = new Error('Booking has already been cancelled');
        error.statusCode = 400;
        throw error;
      }

      const error = new Error('Cannot cancel this booking');
      error.statusCode = 400;
      throw error;
    }

    // Decrement the event's booked count exactly once
    await Event.findByIdAndUpdate(booking.event.toString(), { $inc: { bookedCount: -1 } });

    return booking;
  }

  /**
   * Retrieves bookings made by the authenticated user with pagination and optional status filter.
   */
  static async getUserBookings(userId, { status, page = 1, limit = 10 } = {}) {
    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ bookedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'event',
          select:
            'title category activityType location startDateTime endDateTime capacity bookedCount price status coverImage organizer',
          populate: {
            path: 'organizer',
            select: 'fullName email profilePicture city',
          },
        }),
      Booking.countDocuments(query),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Generates QR check-in ticket data URL and payload for a confirmed booking owner.
   */
  static async getBookingTicket(userId, bookingId) {
    const booking = await Booking.findById(bookingId).populate({
      path: 'event',
      select:
        'title category activityType location startDateTime endDateTime status organizer',
      populate: {
        path: 'organizer',
        select: 'fullName email city',
      },
    });

    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    if (booking.user.toString() !== userId.toString()) {
      const error = new Error('Forbidden: You can only access tickets for your own bookings');
      error.statusCode = 403;
      throw error;
    }

    if (booking.status === BOOKING_STATUSES.CANCELLED) {
      const error = new Error('QR ticket is unavailable for a cancelled booking');
      error.statusCode = 400;
      throw error;
    }

    if (!booking.checkInCode) {
      booking.checkInCode = createCheckInCode();
      await booking.save();
    }

    const eventId = booking.event?._id
      ? booking.event._id.toString()
      : booking.event?.toString();

    const qrPayload = {
      type: 'hobby_dating_checkin',
      bookingId: booking._id.toString(),
      eventId,
      checkInCode: booking.checkInCode,
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      width: 280,
      margin: 2,
    });

    return {
      booking,
      checkInCode: booking.checkInCode,
      qrPayload,
      qrCodeDataUrl,
    };
  }
}
