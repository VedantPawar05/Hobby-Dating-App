import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateQuery,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import { notificationQuerySchema } from '../validators/notification.validator.js';

const router = Router();

// Every notification route requires an authenticated recipient
router.use(authenticate);

// Fetch notifications for the authenticated user
router.get(
  '/',
  validateQuery(notificationQuerySchema),
  NotificationController.getNotifications
);

// Fetch unread notification count
router.get('/unread-count', NotificationController.getUnreadCount);

// Mark all notifications as read for current user (must precede /:notificationId)
router.patch('/read-all', NotificationController.markAllAsRead);

// Mark a single notification as read
router.patch(
  '/:notificationId/read',
  validateObjectId('notificationId'),
  NotificationController.markAsRead
);

// Delete an individual notification
router.delete(
  '/:notificationId',
  validateObjectId('notificationId'),
  NotificationController.deleteNotification
);

export default router;

