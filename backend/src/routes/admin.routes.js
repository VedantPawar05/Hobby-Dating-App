import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import {
  validateRequest,
  validateQuery,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import {
  adminUsersQuerySchema,
  adminSuspendUserSchema,
  adminOptionalReasonSchema,
  adminRequiredReasonSchema,
  adminEventsQuerySchema,
  adminBookingsQuerySchema,
  adminReportsQuerySchema,
  adminReviewReportSchema,
  adminModerationLogsQuerySchema,
  adminUpdateRoleSchema,
} from '../validators/admin.validator.js';

const router = Router();

// Enforce JWT authentication and admin role on every admin route
router.use(authenticate, requireAdmin);

// Dashboard Overview
router.get('/stats', AdminController.getDashboardStats);

// User Management
router.get('/users', validateQuery(adminUsersQuerySchema), AdminController.listUsers);
router.get('/users/:userId', validateObjectId('userId'), AdminController.getUserDetails);
router.patch(
  '/users/:userId/suspend',
  validateObjectId('userId'),
  validateRequest(adminSuspendUserSchema),
  AdminController.suspendUser
);
router.patch(
  '/users/:userId/reactivate',
  validateObjectId('userId'),
  validateRequest(adminOptionalReasonSchema),
  AdminController.reactivateUser
);
router.patch(
  '/users/:userId/role',
  validateObjectId('userId'),
  validateRequest(adminUpdateRoleSchema),
  AdminController.updateUserRole
);

// Organizer Management
router.get('/organizers', validateQuery(adminUsersQuerySchema), AdminController.listOrganizers);

// Event Management & Approvals
router.get('/events', validateQuery(adminEventsQuerySchema), AdminController.listEvents);
router.get('/events/:eventId', validateObjectId('eventId'), AdminController.getEventDetails);
router.patch(
  '/events/:eventId/approve',
  validateObjectId('eventId'),
  validateRequest(adminOptionalReasonSchema),
  AdminController.approveEvent
);
router.patch(
  '/events/:eventId/reject',
  validateObjectId('eventId'),
  validateRequest(adminRequiredReasonSchema),
  AdminController.rejectEvent
);
router.patch(
  '/events/:eventId/cancel',
  validateObjectId('eventId'),
  validateRequest(adminRequiredReasonSchema),
  AdminController.cancelEvent
);

// Reports & Moderation Audit Logs
router.get('/reports', validateQuery(adminReportsQuerySchema), AdminController.listReports);
router.patch(
  '/reports/:reportId/review',
  validateObjectId('reportId'),
  validateRequest(adminReviewReportSchema),
  AdminController.reviewReport
);
router.get(
  '/moderation-logs',
  validateQuery(adminModerationLogsQuerySchema),
  AdminController.listModerationLogs
);

// Booking Management
router.get('/bookings', validateQuery(adminBookingsQuerySchema), AdminController.listBookings);
router.get(
  '/bookings/:bookingId',
  validateObjectId('bookingId'),
  AdminController.getBookingDetails
);
router.patch(
  '/bookings/:bookingId/cancel',
  validateObjectId('bookingId'),
  validateRequest(adminRequiredReasonSchema),
  AdminController.cancelBooking
);

export default router;
