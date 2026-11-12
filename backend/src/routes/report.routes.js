import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateRequest, validateQuery } from '../middlewares/validate.middleware.js';
import { reportRateLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  createReportSchema,
  myReportsQuerySchema,
} from '../validators/report.validator.js';

const router = Router();

router.post(
  '/',
  authenticate,
  reportRateLimiter,
  validateRequest(createReportSchema),
  ReportController.createReport
);

router.get(
  '/my-reports',
  authenticate,
  validateQuery(myReportsQuerySchema),
  ReportController.getMyReports
);

export default router;
