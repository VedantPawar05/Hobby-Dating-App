import { Router } from 'express';
import { OrganizerApplicationController } from '../controllers/organizer-application.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { applicationRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { validateRequest, validateQuery } from '../middlewares/validate.middleware.js';
import {
  createOrganizerApplicationSchema,
  myApplicationsQuerySchema,
} from '../validators/organizer-application.validator.js';

const router = Router();

router.post(
  '/',
  authenticate,
  applicationRateLimiter,
  validateRequest(createOrganizerApplicationSchema),
  OrganizerApplicationController.submitApplication
);

router.get(
  '/me',
  authenticate,
  validateQuery(myApplicationsQuerySchema),
  OrganizerApplicationController.getMyApplications
);

export default router;

