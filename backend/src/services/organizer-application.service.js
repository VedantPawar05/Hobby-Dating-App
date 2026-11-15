import { OrganizerApplication } from '../models/organizer-application.model.js';
import { ORGANIZER_APPLICATION_STATUSES } from '../constants/organizer-application.constants.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { NotificationService } from './notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notification.constants.js';

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export class OrganizerApplicationService {
  /**
   * Submits a new organizer application on behalf of an authenticated normal user.
   * Rejects duplicate pending applications and users who already hold organizer/admin access.
   *
   * @param {import('mongoose').Document} actingUser
   * @param {Record<string, any>} payload
   */
  static async submitApplication(actingUser, payload) {
    if (actingUser.role === USER_ROLES.ORGANIZER) {
      throw createHttpError('You are already an approved organizer', 400);
    }

    if (actingUser.role === USER_ROLES.ADMIN) {
      throw createHttpError('Administrators already have organizer privileges', 400);
    }

    const existingPending = await OrganizerApplication.findOne({
      applicant: actingUser._id,
      status: ORGANIZER_APPLICATION_STATUSES.PENDING,
    });

    if (existingPending) {
      throw createHttpError(
        'You already have a pending organizer application under review',
        409
      );
    }

    const sanitizedCategories = Array.isArray(payload.hobbyCategories)
      ? [...new Set(payload.hobbyCategories.map((c) => c.trim()).filter(Boolean))]
      : [];

    try {
      const application = await OrganizerApplication.create({
        applicant: actingUser._id,
        organizationName: payload.organizationName.trim(),
        hostingCity: payload.hostingCity.trim(),
        hobbyCategories: sanitizedCategories,
        experience: payload.experience.trim(),
        reason: payload.reason.trim(),
        contactEmail: payload.contactEmail.trim().toLowerCase(),
        contactPhone: payload.contactPhone.trim(),
        websiteOrSocial: (payload.websiteOrSocial || '').trim(),
        status: ORGANIZER_APPLICATION_STATUSES.PENDING,
      });

      // Notify the applicant
      await NotificationService.safeCreate({
        recipient: actingUser._id,
        title: 'Organizer Application Submitted',
        message: `Your application to host with "${application.organizationName}" has been submitted and is currently pending administrator review.`,
        type: NOTIFICATION_TYPES.ORGANIZER_APPLICATION_SUBMITTED,
        entityType: 'organizer_application',
        entityId: application._id,
        link: '/become-organizer',
        dedupeKey: `app_sub:${application._id}`,
      });

      // Notify platform administrators
      await NotificationService.safeNotifyAdmins({
        title: 'New Organizer Application',
        message: `${actingUser.fullName || 'A member'} submitted an application for "${application.organizationName}" in ${application.hostingCity}.`,
        type: NOTIFICATION_TYPES.ADMIN_NEW_APPLICATION,
        entityType: 'organizer_application',
        entityId: application._id,
        link: '/admin/applications',
        dedupeKeyPrefix: `admin_app_sub:${application._id}`,
      });

      return application;
    } catch (error) {
      if (error?.code === 11000) {
        throw createHttpError(
          'You already have a pending organizer application under review',
          409
        );
      }
      throw error;
    }
  }

  /**
   * Retrieves the authenticated user's current application status and paginated history.
   *
   * @param {string} userId
   * @param {{ status?: string, page?: number, limit?: number }} queryParams
   */
  static async getMyApplications(userId, { status, page = 1, limit = 10 } = {}) {
    const query = { applicant: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [applications, total, latestApplication] = await Promise.all([
      OrganizerApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewedBy', 'fullName email role'),
      OrganizerApplication.countDocuments(query),
      OrganizerApplication.findOne({ applicant: userId })
        .sort({ createdAt: -1 })
        .populate('reviewedBy', 'fullName email role'),
    ]);

    return {
      currentStatus: latestApplication ? latestApplication.status : null,
      latestApplication: latestApplication || null,
      applications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

