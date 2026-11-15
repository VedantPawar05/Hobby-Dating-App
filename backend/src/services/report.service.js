import { Report } from '../models/report.model.js';
import { User } from '../models/user.model.js';
import { Event } from '../models/event.model.js';
import { REPORT_STATUSES, REPORT_TARGET_TYPES } from '../constants/admin.constants.js';
import { NotificationService } from './notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notification.constants.js';

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export class ReportService {
  /**
   * Submits a user-initiated report against a user or event after verifying target
   * existence, ownership constraints, and duplicate/active-report prevention.
   *
   * @param {string} reporterId
   * @param {{ targetType: string, targetId: string, reason: string, details?: string }} payload
   */
  static async createReport(reporterId, { targetType, targetId, reason, details = '' }) {
    if (targetType === REPORT_TARGET_TYPES.USER) {
      if (targetId.toString() === reporterId.toString()) {
        throw createHttpError('You cannot report your own account', 400);
      }

      const targetUser = await User.findById(targetId).select('_id role isActive');
      if (!targetUser) {
        throw createHttpError('Reported user not found', 404);
      }
    } else if (targetType === REPORT_TARGET_TYPES.EVENT) {
      const targetEvent = await Event.findById(targetId).select('_id organizer status');
      if (!targetEvent) {
        throw createHttpError('Reported event not found', 404);
      }

      if (targetEvent.organizer?.toString() === reporterId.toString()) {
        throw createHttpError('You cannot report your own event', 400);
      }
    } else if (targetType === REPORT_TARGET_TYPES.MESSAGE) {
      const { Message } = await import('../models/message.model.js');
      const targetMessage = await Message.findById(targetId);
      if (!targetMessage) {
        throw createHttpError('Reported message not found', 404);
      }
      if (targetMessage.sender.toString() === reporterId.toString()) {
        throw createHttpError('You cannot report your own message', 400);
      }
    }

    const existingActiveReport = await Report.findOne({
      reportedBy: reporterId,
      targetType,
      targetId,
      status: { $in: [REPORT_STATUSES.OPEN, REPORT_STATUSES.UNDER_REVIEW] },
    });

    if (existingActiveReport) {
      throw createHttpError(
        'You already have an active report under review for this item',
        409
      );
    }

    const report = await Report.create({
      targetType,
      targetId,
      reportedBy: reporterId,
      reason: reason.trim(),
      details: details.trim(),
      status: REPORT_STATUSES.OPEN,
    });

    // Notify administrators of incoming moderation report
    await NotificationService.safeNotifyAdmins({
      title: 'New Moderation Report Submitted',
      message: `A member submitted a report against ${targetType === REPORT_TARGET_TYPES.USER ? 'a user account' : 'an event'}. Reason: ${report.reason}`,
      type: NOTIFICATION_TYPES.ADMIN_NEW_REPORT,
      entityType: 'report',
      entityId: report._id,
      link: '/admin/reports',
      dedupeKeyPrefix: `admin_rep_sub:${report._id}`,
    });

    return report;
  }

  /**
   * Retrieves reports submitted by the authenticated user.
   */
  static async getMyReports(reporterId, { status, page = 1, limit = 10 } = {}) {
    const query = { reportedBy: reporterId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(query),
    ]);

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
