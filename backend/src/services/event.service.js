import { Event } from '../models/event.model.js';
import { Booking } from '../models/booking.model.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import { BOOKING_STATUSES } from '../constants/booking.constants.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { escapeRegex } from '../utils/regex.js';
import { syncCompletedEventsIfConnected } from './event-lifecycle.service.js';

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Extracts normalized check-in code and optional payload metadata from either a
 * JSON-encoded QR payload or a manually entered code string.
 */
function parseCheckInInput({ qrData, checkInCode }) {
  const raw = (qrData || checkInCode || '').trim();
  if (!raw) {
    throw createHttpError('Check-in code or QR payload is required', 400);
  }

  if (qrData && raw.startsWith('{')) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw createHttpError('Invalid QR ticket format', 400);
    }

    const rawCode = parsed && typeof parsed === 'object' ? parsed.checkInCode || parsed.code : null;
    if (!parsed || typeof parsed !== 'object' || !rawCode) {
      throw createHttpError('Invalid QR ticket payload', 400);
    }

    if (parsed.type && !['hobby_dating_checkin', 'ricoz-checkin'].includes(parsed.type)) {
      throw createHttpError('Unrecognized QR ticket type', 400);
    }

    return {
      normalizedCode: String(rawCode).trim().toUpperCase(),
      qrEventId: parsed.eventId ? String(parsed.eventId).trim() : null,
      qrBookingId: parsed.bookingId ? String(parsed.bookingId).trim() : null,
    };
  }

  return {
    normalizedCode: raw.toUpperCase(),
    qrEventId: null,
    qrBookingId: null,
  };
}

export class EventService {
  /**
   * Creates a new event with the authenticated user as the organizer.
   */
  static async createEvent(organizerId, eventData) {
    const event = await Event.create({
      ...eventData,
      organizer: organizerId,
      bookedCount: 0,
    });

    return event;
  }

  /**
   * Retrieves events created by the authenticated organizer along with status summary stats.
   */
  static async getOrganizerEvents(
    organizerId,
    { page = 1, limit = 10, status, search } = {}
  ) {
    await syncCompletedEventsIfConnected();

    const query = { organizer: organizerId };
    if (status) {
      query.status = status;
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { title: pattern },
        { activityType: pattern },
        { 'location.city': pattern },
      ];
    }

    const skip = (page - 1) * limit;

    const [events, total, aggregateStats] = await Promise.all([
      Event.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('organizer', 'fullName email profilePicture city'),
      Event.countDocuments(query),
      Event.aggregate([
        { $match: { organizer: organizerId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            bookedSum: { $sum: '$bookedCount' },
          },
        },
      ]),
    ]);

    const stats = {
      total: 0,
      draft: 0,
      pending: 0,
      published: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
      totalBooked: 0,
    };

    for (const row of aggregateStats || []) {
      if (row._id && Object.prototype.hasOwnProperty.call(stats, row._id)) {
        stats[row._id] = row.count;
      }
      stats.total += row.count || 0;
      stats.totalBooked += row.bookedSum || 0;
    }

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats,
    };
  }

  /**
   * Retrieves single event details by ID.
   * Unpublished/private states are restricted to the event owner or platform admins.
   */
  static async getEventById(eventId, viewer = null) {
    await syncCompletedEventsIfConnected();

    const event = await Event.findById(eventId).populate(
      'organizer',
      'fullName email profilePicture city'
    );

    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    const isPubliclyVisible = [
      EVENT_STATUSES.PUBLISHED,
      EVENT_STATUSES.COMPLETED,
    ].includes(event.status);

    if (!isPubliclyVisible) {
      const organizerId = event.organizer?._id
        ? event.organizer._id.toString()
        : event.organizer?.toString();
      const isOwner = Boolean(viewer?._id && organizerId === viewer._id.toString());
      const isAdmin = viewer?.role === USER_ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        throw createHttpError('Event not found', 404);
      }
    }

    return event;
  }

  /**
   * Updates an existing event with ownership, lifecycle, and capacity safeguards.
   */
  static async updateEvent(eventId, user, updateData) {
    const event = await Event.findById(eventId);

    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    const isOwner = event.organizer.toString() === user._id.toString();
    const isAdmin = user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      throw createHttpError('Forbidden: You can only update events you created', 403);
    }

    if (
      event.status === EVENT_STATUSES.CANCELLED ||
      event.status === EVENT_STATUSES.COMPLETED
    ) {
      throw createHttpError(`Cannot update a ${event.status} event`, 400);
    }

    if (
      new Date(event.startDateTime) <= new Date() &&
      updateData.status !== EVENT_STATUSES.CANCELLED
    ) {
      throw createHttpError('Cannot modify event details after the event has started', 400);
    }

    if (updateData.capacity !== undefined && updateData.capacity < event.bookedCount) {
      throw createHttpError(
        `Capacity cannot be reduced below the current booking count (${event.bookedCount})`,
        400
      );
    }

    if (
      !isAdmin &&
      updateData.status &&
      [EVENT_STATUSES.REJECTED, EVENT_STATUSES.COMPLETED].includes(updateData.status)
    ) {
      throw createHttpError(
        `Forbidden: Organizers cannot manually set status to '${updateData.status}'`,
        403
      );
    }

    const effectiveStart = updateData.startDateTime || event.startDateTime;
    const effectiveEnd = updateData.endDateTime || event.endDateTime;
    if (effectiveStart && effectiveEnd && new Date(effectiveEnd) <= new Date(effectiveStart)) {
      throw createHttpError('End date and time must be after start date and time', 400);
    }

    // Sanitize protected fields and merge nested location without clobbering sibling keys
    const sanitized = { ...updateData };
    delete sanitized.bookedCount;
    delete sanitized.organizer;
    delete sanitized._id;

    if (sanitized.location) {
      const existingLocation =
        typeof event.location?.toObject === 'function'
          ? event.location.toObject()
          : event.location || {};
      event.location = {
        ...existingLocation,
        ...sanitized.location,
      };
      delete sanitized.location;
    }

    Object.assign(event, sanitized);
    await event.save();

    return event;
  }

  /**
   * Deletes an event only if no active bookings exist.
   */
  static async deleteEvent(eventId, user) {
    const event = await Event.findById(eventId);

    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    const isOwner = event.organizer.toString() === user._id.toString();
    const isAdmin = user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      throw createHttpError('Forbidden: You can only delete events you created', 403);
    }

    if (event.bookedCount > 0) {
      throw createHttpError(
        'Cannot delete an event with active bookings. Please cancel the event instead to preserve booking history.',
        400
      );
    }

    await Event.findByIdAndDelete(eventId);

    return {
      deleted: true,
      eventId,
    };
  }

  /**
   * Discovers upcoming published events matching search and filter criteria.
   */
  static async discoverEvents({
    search,
    category,
    city,
    activityType,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'startDateTime',
    sortOrder = 'asc',
  } = {}) {
    await syncCompletedEventsIfConnected();

    const now = new Date();

    // Public discovery always enforces published, upcoming events only
    const query = {
      status: EVENT_STATUSES.PUBLISHED,
      startDateTime: { $gte: now },
    };

    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = {
        $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i'),
      };
    }

    if (activityType) {
      query.activityType = {
        $regex: new RegExp(escapeRegex(activityType.trim()), 'i'),
      };
    }

    if (search) {
      const pattern = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { title: pattern },
        { activityType: pattern },
        { 'location.city': pattern },
      ];
    }

    if (startDate || endDate) {
      query.startDateTime = { ...query.startDateTime };
      if (startDate) {
        const start = new Date(startDate);
        if (start > now) {
          query.startDateTime.$gte = start;
        }
      }
      if (endDate) {
        query.startDateTime.$lte = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
          ? new Date(`${endDate}T23:59:59.999Z`)
          : new Date(endDate);
      }
    }

    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortDirection };
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('organizer', 'fullName email profilePicture city'),
      Event.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves attendee list for an event. Authorized for event owner and admin only.
   */
  static async getEventAttendees(eventId, user, { page = 1, limit = 20 } = {}) {
    const event = await Event.findById(eventId);

    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    const isOwner = event.organizer.toString() === user._id.toString();
    const isAdmin = user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      throw createHttpError(
        'Forbidden: Only the event organizer or an admin can view attendees',
        403
      );
    }

    const query = {
      event: eventId,
      status: BOOKING_STATUSES.CONFIRMED,
    };

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ bookedAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName email profilePicture city gender dateOfBirth'),
      Booking.countDocuments(query),
    ]);

    const attendees = bookings.map((b) => ({
      bookingId: b._id,
      bookedAt: b.bookedAt,
      checkedIn: Boolean(b.checkedIn),
      checkedInAt: b.checkedInAt || null,
      user: b.user,
    }));

    return {
      attendees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Verifies a QR ticket payload or manual check-in code and marks the booking
   * as checked in atomically. Only the owning organizer or an admin may check in attendees.
   */
  static async checkInAttendee(eventId, actingUser, input) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    const isOwner = event.organizer.toString() === actingUser._id.toString();
    const isAdmin = actingUser.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      throw createHttpError(
        'Forbidden: Only the event organizer or an admin can check in attendees',
        403
      );
    }

    if (![EVENT_STATUSES.PUBLISHED, EVENT_STATUSES.COMPLETED].includes(event.status)) {
      throw createHttpError(
        `Check-in is unavailable for events with status '${event.status}'`,
        400
      );
    }

    const { normalizedCode, qrEventId, qrBookingId } = parseCheckInInput(input);

    if (qrEventId && qrEventId !== eventId.toString()) {
      throw createHttpError('This QR ticket belongs to a different event', 400);
    }

    const lookupQuery = {
      event: eventId,
      checkInCode: normalizedCode,
    };
    if (qrBookingId) {
      lookupQuery._id = qrBookingId;
    }

    const existingBooking = await Booking.findOne(lookupQuery);
    if (!existingBooking) {
      throw createHttpError(
        'Invalid check-in code or ticket does not belong to this event',
        404
      );
    }

    if (existingBooking.status === BOOKING_STATUSES.CANCELLED) {
      throw createHttpError('Cancelled bookings cannot be checked in', 400);
    }

    if (existingBooking.checkedIn) {
      throw createHttpError('This attendee has already been checked in', 409);
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: existingBooking._id,
        event: eventId,
        status: BOOKING_STATUSES.CONFIRMED,
        checkedIn: false,
      },
      {
        $set: {
          checkedIn: true,
          checkedInAt: new Date(),
        },
      },
      { new: true }
    )
      .select('-checkInCode')
      .populate('user', 'fullName email profilePicture city');

    if (!updatedBooking) {
      throw createHttpError('This attendee has already been checked in', 409);
    }

    return updatedBooking;
  }
}
