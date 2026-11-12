import mongoose from 'mongoose';
import { z } from 'zod';
import {
  ALLOWED_REPORT_STATUSES,
  ALLOWED_REPORT_TARGET_TYPES,
} from '../constants/admin.constants.js';

export const createReportSchema = z
  .object({
    targetType: z.enum(ALLOWED_REPORT_TARGET_TYPES, {
      error: () => `targetType must be one of: ${ALLOWED_REPORT_TARGET_TYPES.join(', ')}`,
    }),
    targetId: z
      .string({ error: 'Target ID is required' })
      .trim()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid target identifier format',
      }),
    reason: z
      .string({ error: 'Report reason is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(200, 'Reason cannot exceed 200 characters'),
    details: z
      .string()
      .trim()
      .max(1000, 'Details cannot exceed 1000 characters')
      .optional()
      .default(''),
  })
  .strict('Unrecognized fields provided in report submission');

export const myReportsQuerySchema = z.object({
  status: z.enum(ALLOWED_REPORT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
