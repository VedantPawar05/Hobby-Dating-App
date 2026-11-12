import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import { MODERATION_ACTIONS } from '../constants/admin.constants.js';

export class AdminController {
  static async getDashboardStats(req, res, next) {
    try {
      const stats = await AdminService.getDashboardStats();
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Admin dashboard statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req, res, next) {
    try {
      const result = await AdminService.listUsers(req.query);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserDetails(req, res, next) {
    try {
      const result = await AdminService.getUserDetails(req.params.userId);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async suspendUser(req, res, next) {
    try {
      const user = await AdminService.updateUserActiveState(
        req.params.userId,
        req.user._id,
        { targetActiveState: false, reason: req.body.reason }
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User account suspended successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async reactivateUser(req, res, next) {
    try {
      const user = await AdminService.updateUserActiveState(
        req.params.userId,
        req.user._id,
        { targetActiveState: true, reason: req.body?.reason || '' }
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User account reactivated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listOrganizers(req, res, next) {
    try {
      const result = await AdminService.listOrganizers(req.query);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Organizers retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const user = await AdminService.updateUserRole(
        req.params.userId,
        req.user._id,
        req.body
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User role updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listEvents(req, res, next) {
    try {
      const result = await AdminService.listEvents(req.query);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Events retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEventDetails(req, res, next) {
    try {
      const result = await AdminService.getEventDetails(req.params.eventId);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveEvent(req, res, next) {
    try {
      const event = await AdminService.moderateEvent(
        req.params.eventId,
        req.user._id,
        {
          targetStatus: EVENT_STATUSES.PUBLISHED,
          actionType: MODERATION_ACTIONS.APPROVE_EVENT,
          reason: req.body?.reason || '',
        }
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event approved and published successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectEvent(req, res, next) {
    try {
      const event = await AdminService.moderateEvent(
        req.params.eventId,
        req.user._id,
        {
          targetStatus: EVENT_STATUSES.REJECTED,
          actionType: MODERATION_ACTIONS.REJECT_EVENT,
          reason: req.body.reason,
        }
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event rejected successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelEvent(req, res, next) {
    try {
      const event = await AdminService.moderateEvent(
        req.params.eventId,
        req.user._id,
        {
          targetStatus: EVENT_STATUSES.CANCELLED,
          actionType: MODERATION_ACTIONS.CANCEL_EVENT,
          reason: req.body.reason,
        }
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event cancelled by moderation successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listReports(req, res, next) {
    try {
      const result = await AdminService.listReports(req.query);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Reports retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async reviewReport(req, res, next) {
    try {
      const report = await AdminService.reviewReport(
        req.params.reportId,
        req.user._id,
        req.body
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Report updated successfully',
        data: { report },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listModerationLogs(req, res, next) {
    try {
      const result = await AdminService.listModerationLogs(req.query);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Moderation logs retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listBookings(req, res, next) {
    try {
      const result = await AdminService.listBookings(req.query);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Bookings retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookingDetails(req, res, next) {
    try {
      const result = await AdminService.getBookingDetails(req.params.bookingId);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Booking details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req, res, next) {
    try {
      const booking = await AdminService.cancelBooking(
        req.params.bookingId,
        req.user._id,
        req.body
      );
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Booking cancelled and capacity slot released',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}
