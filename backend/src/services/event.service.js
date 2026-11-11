import { Event } from '../models/event.model.js';
import { Booking } from '../models/booking.model.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import { BOOKING_STATUSES } from '../constants/booking.constants.js';

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
   * Retrieves events created by the authenticated organizer.
   */
  static async getOrganizerEvents(organizerId, { page = 1, limit = 10, status } = {}) {
    const query = { organizer: organizerId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ createdAt: -1 })
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
   * Retrieves single event details by ID.
   */
  static async getEventById(eventId) {
    const event = await Event.findById(eventId).populate(
      'organizer',
      'fullName email profilePicture city'
    );

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    return event;
  }

  /**
   * Updates an existing event with ownership and capacity safeguards.
   */
  static async updateEvent(eventId, user, updateData) {
    const event = await Event.findById(eventId);

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    // Ownership check
    const isOwner = event.organizer.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const error = new Error('Forbidden: You can only update events you created');
      error.statusCode = 403;
      throw error;
    }

    // Status & schedule checks
    if (event.status === EVENT_STATUSES.CANCELLED) {
      const error = new Error('Cannot update a cancelled event');
      error.statusCode = 400;
      throw error;
    }

    if (new Date(event.startDateTime) <= new Date() && updateData.status !== EVENT_STATUSES.CANCELLED) {
      const error = new Error('Cannot modify event details after the event has started');
      error.statusCode = 400;
      throw error;
    }

    // Capacity verification against current bookings
    if (updateData.capacity !== undefined && updateData.capacity < event.bookedCount) {
      const error = new Error(
        `Capacity cannot be reduced below the current booking count (${event.bookedCount})`
      );
      error.statusCode = 400;
      throw error;
    }

    // Sanitize updates: strictly forbid overwriting bookedCount, organizer, or _id
    delete updateData.bookedCount;
    delete updateData.organizer;
    delete updateData._id;

    Object.assign(event, updateData);
    await event.save();

    return event;
  }

  /**
   * Deletes an event only if no active bookings exist.
   */
  static async deleteEvent(eventId, user) {
    const event = await Event.findById(eventId);

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    // Ownership check
    const isOwner = event.organizer.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const error = new Error('Forbidden: You can only delete events you created');
      error.statusCode = 403;
      throw error;
    }

    if (event.bookedCount > 0) {
      const error = new Error(
        'Cannot delete an event with active bookings. Please cancel the event instead to preserve booking history.'
      );
      error.statusCode = 400;
      throw error;
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
    const now = new Date();

    // Base query: published and upcoming only
    const query = {
      status: EVENT_STATUSES.PUBLISHED,
      startDateTime: { $gte: now },
    };

    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = { $regex: new RegExp(`^${city.trim()}$`, 'i') };
    }

    if (activityType) {
      query.activityType = { $regex: new RegExp(activityType.trim(), 'i') };
    }

    if (search) {
      query.title = { $regex: new RegExp(search.trim(), 'i') };
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
        query.startDateTime.$lte = new Date(endDate);
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
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = event.organizer.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const error = new Error('Forbidden: Only the event organizer or an admin can view attendees');
      error.statusCode = 403;
      throw error;
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
}

