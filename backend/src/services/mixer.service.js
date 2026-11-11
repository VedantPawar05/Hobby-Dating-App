import { Event } from '../models/event.model.js';
import { Booking } from '../models/booking.model.js';
import { MixerTag } from '../models/mixer-tag.model.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import { BOOKING_STATUSES } from '../constants/booking.constants.js';

export const MIXER_WINDOW_HOURS = 24;
export const MIXER_WINDOW_MS = MIXER_WINDOW_HOURS * 60 * 60 * 1000;

function createHttpError(message, statusCode, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
}

/**
 * Computes the 24-hour post-event mixer window from an event's endDateTime.
 * @param {object} event
 * @param {Date} [now]
 */
export function getMixerWindow(event, now = new Date()) {
  const startsAt = new Date(event.endDateTime);
  const expiresAt = new Date(startsAt.getTime() + MIXER_WINDOW_MS);
  const nowMs = now.getTime();
  const startsMs = startsAt.getTime();
  const expiresMs = expiresAt.getTime();

  let state = 'active';
  if (nowMs < startsMs) {
    state = 'not_started';
  } else if (nowMs >= expiresMs) {
    state = 'expired';
  }

  return {
    state,
    isActive: state === 'active',
    startsAt,
    expiresAt,
    serverNow: now,
    remainingMs: state === 'active' ? expiresMs - nowMs : 0,
  };
}

/**
 * Validates that the event exists, is eligible for a mixer, and the user is a
 * confirmed, QR-verified (checkedIn === true) attendee of this specific event.
 */
async function validateAttendeeAccess(eventId, userId) {
  const event = await Event.findById(eventId).populate(
    'organizer',
    'fullName city profilePicture'
  );

  if (!event) {
    throw createHttpError('Event not found', 404);
  }

  if (![EVENT_STATUSES.PUBLISHED, EVENT_STATUSES.COMPLETED].includes(event.status)) {
    throw createHttpError(
      'Post-event mixer is unavailable for events that are not published or completed',
      400
    );
  }

  const booking = await Booking.findOne({
    event: eventId,
    user: userId,
  });

  if (!booking) {
    throw createHttpError(
      'Forbidden: Only confirmed, checked-in attendees of this event can access the mixer',
      403
    );
  }

  if (booking.status === BOOKING_STATUSES.CANCELLED) {
    throw createHttpError(
      'Forbidden: Cancelled bookings cannot access the post-event mixer',
      403
    );
  }

  if (booking.status !== BOOKING_STATUSES.CONFIRMED) {
    throw createHttpError('Forbidden: A confirmed booking is required to access the mixer', 403);
  }

  if (!booking.checkedIn) {
    throw createHttpError(
      'Forbidden: QR attendance check-in verification is required before accessing the mixer',
      403
    );
  }

  return { event, booking };
}

/**
 * Enforces that the 24-hour mixer window is currently open.
 */
function assertMixerWindowActive(windowInfo) {
  if (windowInfo.state === 'not_started') {
    throw createHttpError(
      'Post-event mixer opens once the event ends',
      400,
      'MIXER_NOT_STARTED'
    );
  }

  if (windowInfo.state === 'expired') {
    throw createHttpError(
      'The 24-hour post-event mixer window has expired',
      410,
      'MIXER_EXPIRED'
    );
  }
}

export class MixerService {
  /**
   * Checks attendee eligibility and returns mixer window timing metadata.
   * Never leaks attendee profiles.
   */
  static async getMixerAvailability(eventId, userId) {
    const { event } = await validateAttendeeAccess(eventId, userId);
    const windowInfo = getMixerWindow(event);

    return {
      event: {
        _id: event._id,
        title: event.title,
        category: event.category,
        location: event.location,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
      },
      mixer: windowInfo,
    };
  }

  /**
   * Retrieves verified attendees from the same event during an active mixer window,
   * annotated only with whether the current user has privately tagged them.
   */
  static async getEligibleAttendees(eventId, userId, { page = 1, limit = 24 } = {}) {
    const { event } = await validateAttendeeAccess(eventId, userId);
    const windowInfo = getMixerWindow(event);
    assertMixerWindowActive(windowInfo);

    const attendeeQuery = {
      event: eventId,
      status: BOOKING_STATUSES.CONFIRMED,
      checkedIn: true,
      user: { $ne: userId },
    };

    const skip = (page - 1) * limit;

    const [verifiedBookings, total, myTags] = await Promise.all([
      Booking.find(attendeeQuery)
        .sort({ checkedInAt: 1, bookedAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName city gender bio interests profilePicture isActive'),
      Booking.countDocuments(attendeeQuery),
      MixerTag.find({
        event: eventId,
        fromUser: userId,
      }).select('toUser createdAt'),
    ]);

    const taggedSet = new Map(
      myTags.map((tag) => [tag.toUser.toString(), tag.createdAt])
    );

    const attendees = verifiedBookings
      .filter((booking) => booking.user && booking.user.isActive !== false)
      .map((booking) => {
        const profile = booking.user;
        const taggedAt = taggedSet.get(profile._id.toString()) || null;

        return {
          _id: profile._id,
          fullName: profile.fullName,
          city: profile.city,
          gender: profile.gender,
          bio: profile.bio,
          interests: profile.interests || [],
          profilePicture: profile.profilePicture || null,
          taggedByMe: Boolean(taggedAt),
          taggedAt,
        };
      });

    return {
      event: {
        _id: event._id,
        title: event.title,
        category: event.category,
        location: event.location,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
      },
      mixer: windowInfo,
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
   * Creates a private, one-way mixer tag toward another verified attendee of the same event.
   * Never reveals incoming tags or notifies the recipient.
   */
  static async createPrivateTag(eventId, fromUserId, toUserId) {
    if (fromUserId.toString() === toUserId.toString()) {
      throw createHttpError('You cannot tag yourself in the post-event mixer', 400);
    }

    const { event } = await validateAttendeeAccess(eventId, fromUserId);
    const windowInfo = getMixerWindow(event);
    assertMixerWindowActive(windowInfo);

    // Ensure target user is also a confirmed, QR-checked-in attendee of THIS event
    const targetBooking = await Booking.findOne({
      event: eventId,
      user: toUserId,
      status: BOOKING_STATUSES.CONFIRMED,
      checkedIn: true,
    }).populate('user', 'isActive');

    if (!targetBooking || !targetBooking.user || targetBooking.user.isActive === false) {
      throw createHttpError(
        'Target user is not a verified attendee of this event',
        400
      );
    }

    const existingTag = await MixerTag.findOne({
      event: eventId,
      fromUser: fromUserId,
      toUser: toUserId,
    });

    if (existingTag) {
      throw createHttpError('You have already tagged this attendee for this event', 409);
    }

    try {
      const tag = await MixerTag.create({
        event: eventId,
        fromUser: fromUserId,
        toUser: toUserId,
        expiresAt: windowInfo.expiresAt,
      });

      return {
        tag: {
          _id: tag._id,
          event: tag.event,
          toUser: tag.toUser,
          createdAt: tag.createdAt,
          expiresAt: tag.expiresAt,
        },
        mixer: windowInfo,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw createHttpError('You have already tagged this attendee for this event', 409);
      }
      throw error;
    }
  }
}

