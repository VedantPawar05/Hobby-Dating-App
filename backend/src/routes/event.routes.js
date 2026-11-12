import { Router } from 'express';
import { EventController } from '../controllers/event.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkInRateLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  validateRequest,
  validateQuery,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
  organizerEventsQuerySchema,
  attendeesQuerySchema,
  checkInSchema,
} from '../validators/event.validator.js';
import { USER_ROLES } from '../constants/user.constants.js';

const router = Router();

// Organizer: Create event
router.post(
  '/',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  validateRequest(createEventSchema),
  EventController.createEvent
);

// Organizer: Get my created events & stats
router.get(
  '/organizer/my-events',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  validateQuery(organizerEventsQuerySchema),
  EventController.getOrganizerEvents
);

// Public: Event Discovery (published upcoming events only)
router.get(
  '/',
  validateQuery(eventQuerySchema),
  EventController.discoverEvents
);

// Public / Owner-aware: Get event details
router.get(
  '/:eventId',
  optionalAuthenticate,
  validateObjectId('eventId'),
  EventController.getEventById
);

// Organizer: Update event
router.patch(
  '/:eventId',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  validateObjectId('eventId'),
  validateRequest(updateEventSchema),
  EventController.updateEvent
);

// Organizer: Delete event
router.delete(
  '/:eventId',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  validateObjectId('eventId'),
  EventController.deleteEvent
);

// Organizer / Admin: Verify QR / check-in code for an event attendee
router.post(
  '/:eventId/check-in',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  checkInRateLimiter,
  validateObjectId('eventId'),
  validateRequest(checkInSchema),
  EventController.checkInAttendee
);

// Organizer / Admin: Get attendee list
router.get(
  '/:eventId/attendees',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  validateObjectId('eventId'),
  validateQuery(attendeesQuerySchema),
  EventController.getAttendees
);

export default router;
