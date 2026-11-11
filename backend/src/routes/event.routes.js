import { Router } from 'express';
import { EventController } from '../controllers/event.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  validateRequest,
  validateQuery,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
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

// Organizer: Get my created events
router.get(
  '/organizer/my-events',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  EventController.getOrganizerEvents
);

// Public / Authenticated: Event Discovery
router.get(
  '/',
  authenticate,
  validateQuery(eventQuerySchema),
  EventController.discoverEvents
);

// Public / Authenticated: Get event details
router.get(
  '/:eventId',
  authenticate,
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

// Organizer / Admin: Get attendee list
router.get(
  '/:eventId/attendees',
  authenticate,
  requireRoles(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN),
  validateObjectId('eventId'),
  EventController.getAttendees
);

export default router;

