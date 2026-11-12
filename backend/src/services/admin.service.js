import { User } from '../models/user.model.js';
import { Event } from '../models/event.model.js';
import { Booking } from '../models/booking.model.js';
import { Report } from '../models/report.model.js';
import { ModerationLog } from '../models/moderation-log.model.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import { BOOKING_STATUSES } from '../constants/booking.constants.js';
import {
  MODERATION_ACTIONS,
  MODERATION_TARGET_TYPES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from '../constants/admin.constants.js';
import { escapeRegex } from '../utils/regex.js';
import { syncCompletedEventsIfConnected } from './event-lifecycle.service.js';
import { UserService } from './user.service.js';

/**
 * Creates a standardized error with HTTP status code.
 * @param {string} message
 * @param {number} statusCode
 */
function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Shared paginated query helper returning items and normalized pagination metadata.
 */
async function paginateQuery(Model, query, { page = 1, limit = 10, sort = { createdAt: -1 }, select = '', populate = null } = {}) {
  const skip = (page - 1) * limit;

  let findQuery = Model.find(query).sort(sort).skip(skip).limit(limit);
  if (select) {
    findQuery = findQuery.select(select);
  }
  if (populate) {
    const populateList = Array.isArray(populate) ? populate : [populate];
    for (const pop of populateList) {
      findQuery = findQuery.populate(pop);
    }
  }

  const [items, total] = await Promise.all([findQuery, Model.countDocuments(query)]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Builds MongoDB filter query for users/organizers.
 */
function buildUserFilterQuery({ search, role, isActive, city } = {}) {
  const query = {};

  if (role) {
    query.role = role;
  }

  if (typeof isActive === 'boolean') {
    query.isActive = isActive;
  }

  if (city) {
    query.city = { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') };
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ fullName: pattern }, { email: pattern }];
  }

  return query;
}

/**
 * Persists an admin moderation log entry.
 */
async function recordModerationLog({ adminId, actionType, targetType, targetId, reason = '', metadata = {} }) {
  return ModerationLog.create({
    admin: adminId,
    actionType,
    targetType,
    targetId,
    reason,
    metadata,
  });
}

export class AdminService {
  /**
   * Computes live platform overview statistics from MongoDB collections.
   */
  static async getDashboardStats() {
    await syncCompletedEventsIfConnected();
    const now = new Date();

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalMembers,
      totalOrganizers,
      totalAdmins,
      totalEvents,
      upcomingEvents,
      pendingApprovals,
      publishedEvents,
      draftEvents,
      rejectedEvents,
      cancelledEvents,
      totalBookings,
      confirmedBookings,
      totalReports,
      openReports,
      recentModerationLogs,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: USER_ROLES.USER }),
      User.countDocuments({ role: USER_ROLES.ORGANIZER }),
      User.countDocuments({ role: USER_ROLES.ADMIN }),
      Event.countDocuments({}),
      Event.countDocuments({
        status: EVENT_STATUSES.PUBLISHED,
        startDateTime: { $gte: now },
      }),
      Event.countDocuments({ status: EVENT_STATUSES.PENDING }),
      Event.countDocuments({ status: EVENT_STATUSES.PUBLISHED }),
      Event.countDocuments({ status: EVENT_STATUSES.DRAFT }),
      Event.countDocuments({ status: EVENT_STATUSES.REJECTED }),
      Event.countDocuments({ status: EVENT_STATUSES.CANCELLED }),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: BOOKING_STATUSES.CONFIRMED }),
      Report.countDocuments({}),
      Report.countDocuments({ status: { $in: [REPORT_STATUSES.OPEN, REPORT_STATUSES.UNDER_REVIEW] } }),
      ModerationLog.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('admin', 'fullName email role'),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        members: totalMembers,
        organizers: totalOrganizers,
        admins: totalAdmins,
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        pendingApprovals,
        published: publishedEvents,
        draft: draftEvents,
        rejected: rejectedEvents,
        cancelled: cancelledEvents,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
      },
      reports: {
        total: totalReports,
        open: openReports,
        userReportingAvailable: true,
      },
      recentModerationLogs,
    };
  }

  /**
   * Lists registered users with search, role, city, and active status filtering.
   */
  static async listUsers(filters = {}) {
    const query = buildUserFilterQuery(filters);
    const { items, pagination } = await paginateQuery(User, query, {
      page: filters.page,
      limit: filters.limit,
      select: '-password',
    });

    return {
      users: items,
      pagination,
    };
  }

  /**
   * Retrieves detailed account information, activity summary, and moderation history for a user.
   */
  static async getUserDetails(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw createHttpError('User not found', 404);
    }

    const [hostedEventsCount, bookingsCount, moderationHistory] = await Promise.all([
      Event.countDocuments({ organizer: user._id }),
      Booking.countDocuments({ user: user._id }),
      ModerationLog.find({
        targetType: MODERATION_TARGET_TYPES.USER,
        targetId: user._id,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('admin', 'fullName email'),
    ]);

    return {
      user: user.toSafeObject(),
      activitySummary: {
        hostedEventsCount,
        bookingsCount,
      },
      moderationHistory,
    };
  }

  /**
   * Shared handler for suspending or reactivating an account.
   */
  static async updateUserActiveState(userId, adminId, { targetActiveState, reason = '' }) {
    const user = await User.findById(userId);
    if (!user) {
      throw createHttpError('User not found', 404);
    }

    if (!targetActiveState) {
      if (user._id.toString() === adminId.toString()) {
        throw createHttpError('Admins cannot suspend their own account', 400);
      }
      if (user.role === USER_ROLES.ADMIN) {
        throw createHttpError('Forbidden: Cannot suspend an admin account', 403);
      }
      if (!user.isActive) {
        throw createHttpError('User account is already suspended', 400);
      }
    } else if (user.isActive) {
      throw createHttpError('User account is already active', 400);
    }

    user.isActive = targetActiveState;
    await user.save();

    await recordModerationLog({
      adminId,
      actionType: targetActiveState
        ? MODERATION_ACTIONS.REACTIVATE_USER
        : MODERATION_ACTIONS.SUSPEND_USER,
      targetType: MODERATION_TARGET_TYPES.USER,
      targetId: user._id,
      reason,
      metadata: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });

    return user.toSafeObject();
  }

  /**
   * Delegates controlled role updates with self-demotion guard and audit logging.
   */
  static async updateUserRole(userId, adminId, { role, reason = '' }) {
    return UserService.updateUserRole(userId, role, adminId, reason);
  }

  /**
   * Lists organizer accounts enriched with their hosted event counts.
   */
  static async listOrganizers(filters = {}) {
    const query = buildUserFilterQuery({
      ...filters,
      role: USER_ROLES.ORGANIZER,
    });

    const { items, pagination } = await paginateQuery(User, query, {
      page: filters.page,
      limit: filters.limit,
      select: '-password',
    });

    const organizerIds = items.map((org) => org._id);
    let statsMap = new Map();

    if (organizerIds.length > 0) {
      const eventStats = await Event.aggregate([
        { $match: { organizer: { $in: organizerIds } } },
        {
          $group: {
            _id: '$organizer',
            totalEvents: { $sum: 1 },
            publishedEvents: {
              $sum: { $cond: [{ $eq: ['$status', EVENT_STATUSES.PUBLISHED] }, 1, 0] },
            },
            pendingEvents: {
              $sum: { $cond: [{ $eq: ['$status', EVENT_STATUSES.PENDING] }, 1, 0] },
            },
          },
        },
      ]);

      statsMap = new Map(eventStats.map((stat) => [stat._id.toString(), stat]));
    }

    const organizers = items.map((org) => {
      const safe = org.toSafeObject();
      const stats = statsMap.get(org._id.toString()) || {};
      return {
        ...safe,
        eventStats: {
          totalEvents: stats.totalEvents || 0,
          publishedEvents: stats.publishedEvents || 0,
          pendingEvents: stats.pendingEvents || 0,
        },
      };
    });

    return {
      organizers,
      pagination,
      applicationWorkflowAvailable: false,
    };
  }

  /**
   * Lists all events across statuses for admin review and moderation.
   */
  static async listEvents({ search, status, category, city, page = 1, limit = 10 } = {}) {
    await syncCompletedEventsIfConnected();
    const query = {};

    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }
    if (city) {
      query['location.city'] = { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') };
    }
    if (search) {
      query.title = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const { items, pagination } = await paginateQuery(Event, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: 'organizer', select: 'fullName email city role isActive' },
    });

    return {
      events: items,
      pagination,
    };
  }

  /**
   * Retrieves detailed event record with organizer info and moderation log history.
   */
  static async getEventDetails(eventId) {
    const event = await Event.findById(eventId).populate(
      'organizer',
      'fullName email city role isActive'
    );

    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    const moderationHistory = await ModerationLog.find({
      targetType: MODERATION_TARGET_TYPES.EVENT,
      targetId: event._id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('admin', 'fullName email');

    return {
      event,
      moderationHistory,
    };
  }

  /**
   * Shared moderation transition handler for approving, rejecting, or cancelling an event.
   */
  static async moderateEvent(eventId, adminId, { targetStatus, actionType, reason = '' }) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw createHttpError('Event not found', 404);
    }

    if (
      targetStatus === EVENT_STATUSES.PUBLISHED &&
      ![EVENT_STATUSES.PENDING, EVENT_STATUSES.DRAFT].includes(event.status)
    ) {
      throw createHttpError(
        `Only pending or draft events can be approved (current status: ${event.status})`,
        400
      );
    }

    if (
      targetStatus === EVENT_STATUSES.REJECTED &&
      ![EVENT_STATUSES.PENDING, EVENT_STATUSES.DRAFT].includes(event.status)
    ) {
      throw createHttpError(
        `Only pending or draft events can be rejected (current status: ${event.status})`,
        400
      );
    }

    if (
      targetStatus === EVENT_STATUSES.CANCELLED &&
      [EVENT_STATUSES.CANCELLED, EVENT_STATUSES.COMPLETED].includes(event.status)
    ) {
      throw createHttpError(`Event is already ${event.status}`, 400);
    }

    const previousStatus = event.status;
    event.status = targetStatus;
    await event.save();

    await recordModerationLog({
      adminId,
      actionType,
      targetType: MODERATION_TARGET_TYPES.EVENT,
      targetId: event._id,
      reason,
      metadata: {
        title: event.title,
        previousStatus,
        newStatus: targetStatus,
      },
    });

    await event.populate('organizer', 'fullName email city role isActive');
    return event;
  }

  /**
   * Lists submitted reports (admin-side moderation foundation).
   */
  static async listReports({ status, targetType, page = 1, limit = 10 } = {}) {
    const query = {};
    if (status) {
      query.status = status;
    }
    if (targetType) {
      query.targetType = targetType;
    }

    const { items, pagination } = await paginateQuery(Report, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'reportedBy', select: 'fullName email role' },
        { path: 'reviewedBy', select: 'fullName email role' },
      ],
    });

    const userTargetIds = items
      .filter((r) => r.targetType === REPORT_TARGET_TYPES.USER)
      .map((r) => r.targetId);
    const eventTargetIds = items
      .filter((r) => r.targetType === REPORT_TARGET_TYPES.EVENT)
      .map((r) => r.targetId);

    const [targetUsers, targetEvents] = await Promise.all([
      userTargetIds.length > 0
        ? User.find({ _id: { $in: userTargetIds } }).select('fullName email role isActive')
        : [],
      eventTargetIds.length > 0
        ? Event.find({ _id: { $in: eventTargetIds } }).select('title status category location.city')
        : [],
    ]);

    const userMap = new Map(targetUsers.map((u) => [u._id.toString(), u]));
    const eventMap = new Map(targetEvents.map((e) => [e._id.toString(), e]));

    const enrichedReports = items.map((item) => {
      const plain = typeof item.toObject === 'function' ? item.toObject() : { ...item };
      const targetKey = plain.targetId?.toString();
      plain.targetSummary =
        plain.targetType === REPORT_TARGET_TYPES.USER
          ? userMap.get(targetKey) || null
          : eventMap.get(targetKey) || null;
      return plain;
    });

    return {
      reports: enrichedReports,
      pagination,
      reportingDependency: {
        userReportingAvailable: true,
        note: 'User-facing reporting pipeline is active via /api/reports.',
      },
    };
  }

  /**
   * Updates report status and records a moderation log entry.
   */
  static async reviewReport(reportId, adminId, { status, resolutionNotes = '' }) {
    const report = await Report.findById(reportId);
    if (!report) {
      throw createHttpError('Report not found', 404);
    }

    report.status = status;
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();
    if (resolutionNotes) {
      report.resolutionNotes = resolutionNotes;
    }
    await report.save();

    const actionMap = {
      [REPORT_STATUSES.UNDER_REVIEW]: MODERATION_ACTIONS.REVIEW_REPORT,
      [REPORT_STATUSES.RESOLVED]: MODERATION_ACTIONS.RESOLVE_REPORT,
      [REPORT_STATUSES.DISMISSED]: MODERATION_ACTIONS.DISMISS_REPORT,
    };

    await recordModerationLog({
      adminId,
      actionType: actionMap[status] || MODERATION_ACTIONS.REVIEW_REPORT,
      targetType: MODERATION_TARGET_TYPES.REPORT,
      targetId: report._id,
      reason: resolutionNotes,
      metadata: {
        reportTargetType: report.targetType,
        reportTargetId: report.targetId,
        newStatus: status,
      },
    });

    await report.populate([
      { path: 'reportedBy', select: 'fullName email role' },
      { path: 'reviewedBy', select: 'fullName email role' },
    ]);

    return report;
  }

  /**
   * Lists platform bookings with search (user name/email or event title/city),
   * status filtering, and pagination. Read-only view for admin oversight.
   */
  static async listBookings({ search, status, eventId, page = 1, limit = 10 } = {}) {
    const query = {};

    if (status) {
      query.status = status;
    }

    if (eventId) {
      query.event = eventId;
    }

    if (search) {
      const pattern = new RegExp(escapeRegex(search.trim()), 'i');
      const [matchingUsers, matchingEvents] = await Promise.all([
        User.find({ $or: [{ fullName: pattern }, { email: pattern }] }).select('_id'),
        Event.find({ $or: [{ title: pattern }, { 'location.city': pattern }] }).select('_id'),
      ]);

      query.$or = [
        { user: { $in: matchingUsers.map((u) => u._id) } },
        { event: { $in: matchingEvents.map((e) => e._id) } },
      ];
    }

    const { items, pagination } = await paginateQuery(Booking, query, {
      page,
      limit,
      sort: { bookedAt: -1, createdAt: -1 },
      select: '-checkInCode',
      populate: [
        { path: 'user', select: 'fullName email city role isActive' },
        {
          path: 'event',
          select:
            'title category activityType location startDateTime endDateTime capacity bookedCount price status organizer',
        },
      ],
    });

    return {
      bookings: items,
      pagination,
    };
  }

  /**
   * Retrieves detailed booking record for admin inspection (read-only).
   */
  static async getBookingDetails(bookingId) {
    const booking = await Booking.findById(bookingId)
      .select('-checkInCode')
      .populate('user', 'fullName email city gender bio role isActive createdAt')
      .populate({
        path: 'event',
        select:
          'title category activityType location startDateTime endDateTime capacity bookedCount price status organizer',
        populate: { path: 'organizer', select: 'fullName email city' },
      });

    if (!booking) {
      throw createHttpError('Booking not found', 404);
    }

    return { booking };
  }

  /**
   * Safely cancels a confirmed booking on behalf of moderation, atomically updating
   * booking state, keeping event bookedCount consistent, and recording an audit log.
   * Does not perform financial refunds.
   */
  static async cancelBooking(bookingId, adminId, { reason }) {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: BOOKING_STATUSES.CONFIRMED,
      },
      {
        $set: {
          status: BOOKING_STATUSES.CANCELLED,
          cancelledAt: new Date(),
        },
      },
      { new: true }
    )
      .select('-checkInCode')
      .populate('user', 'fullName email city role isActive')
      .populate({
        path: 'event',
        select: 'title category location startDateTime endDateTime capacity bookedCount price status',
      });

    if (!booking) {
      const existing = await Booking.findById(bookingId);
      if (!existing) {
        throw createHttpError('Booking not found', 404);
      }
      if (existing.status === BOOKING_STATUSES.CANCELLED) {
        throw createHttpError('Booking has already been cancelled', 400);
      }
      throw createHttpError('Cannot cancel this booking', 400);
    }

    const eventId = booking.event?._id ? booking.event._id.toString() : booking.event.toString();

    await Event.findOneAndUpdate(
      { _id: eventId, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );

    if (booking.event && typeof booking.event.bookedCount === 'number' && booking.event.bookedCount > 0) {
      booking.event.bookedCount -= 1;
    }

    await recordModerationLog({
      adminId,
      actionType: MODERATION_ACTIONS.CANCEL_BOOKING,
      targetType: MODERATION_TARGET_TYPES.BOOKING,
      targetId: booking._id,
      reason,
      metadata: {
        eventId,
        title: booking.event?.title || '',
        email: booking.user?.email || '',
        refundProcessed: false,
      },
    });

    return booking;
  }

  /**
   * Lists recorded moderation audit entries with filtering by action, target, admin, date, and search.
   */
  static async listModerationLogs({
    targetType,
    actionType,
    adminId,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 15,
  } = {}) {
    const query = {};
    if (targetType) {
      query.targetType = targetType;
    }
    if (actionType) {
      query.actionType = actionType;
    }
    if (adminId) {
      query.admin = adminId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
          ? new Date(`${endDate}T23:59:59.999Z`)
          : new Date(endDate);
      }
    }

    if (search) {
      const pattern = new RegExp(escapeRegex(search.trim()), 'i');
      const matchingAdmins = await User.find({
        role: USER_ROLES.ADMIN,
        $or: [{ fullName: pattern }, { email: pattern }],
      }).select('_id');

      const orConditions = [
        { reason: pattern },
        { 'metadata.title': pattern },
        { 'metadata.email': pattern },
      ];
      if (matchingAdmins.length > 0) {
        orConditions.push({ admin: { $in: matchingAdmins.map((a) => a._id) } });
      }
      query.$or = orConditions;
    }

    const { items, pagination } = await paginateQuery(ModerationLog, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: 'admin', select: 'fullName email role' },
    });

    return {
      logs: items,
      pagination,
    };
  }
}
