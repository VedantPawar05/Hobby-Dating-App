import { NotificationService } from '../services/notification.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const result = await NotificationService.getUserNotifications(
        req.user._id,
        req.query
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Notifications retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req, res, next) {
    try {
      const result = await NotificationService.getUnreadCount(req.user._id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Unread count retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const notification = await NotificationService.markAsRead(
        req.params.notificationId,
        req.user._id
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      const result = await NotificationService.markAllAsRead(req.user._id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req, res, next) {
    try {
      const result = await NotificationService.deleteNotification(
        req.params.notificationId,
        req.user._id
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Notification deleted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

