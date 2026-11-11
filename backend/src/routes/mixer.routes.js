import { Router } from 'express';
import { MixerController } from '../controllers/mixer.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateObjectId,
  validateQuery,
  validateRequest,
} from '../middlewares/validate.middleware.js';
import {
  mixerQuerySchema,
  createMixerTagSchema,
} from '../validators/mixer.validator.js';

const router = Router();

// Every mixer route requires authentication
router.use(authenticate);

// Check mixer eligibility & 24-hour window timing for a specific event
router.get(
  '/:eventId/availability',
  validateObjectId('eventId'),
  MixerController.getAvailability
);

// Retrieve eligible verified attendees for the active mixer window
router.get(
  '/:eventId',
  validateObjectId('eventId'),
  validateQuery(mixerQuerySchema),
  MixerController.getAttendees
);

// Privately tag an eligible verified attendee during the active 24-hour window
router.post(
  '/:eventId/tags',
  validateObjectId('eventId'),
  validateRequest(createMixerTagSchema),
  MixerController.createTag
);

export default router;

