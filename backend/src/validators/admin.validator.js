import mongoose from 'mongoose';
import { z } from 'zod';
import { ALLOWED_ROLES } from '../constants/user.constants.js';
import { ALLOWED_EVENT_STATUSES, EVENT_CATEGORIES } from '../constants/event.constants.js';
import { ALLOWED_BOOKING_STATUSES } from '../constants/booking.constants.js';
import {
  ALLOWED_MODERATION_ACTIONS,
  ALLOWED_MODERATION_TARGET_TYPES,
  ALLOWED_REPORT_STATUSES,
  ALLOWED_REPORT_TARGET_TYPES,
  REPORT_STATUSES,
} from '../constants/admin.constants.js';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid identifier format',
  });

const dateQuerySchema = z
  .string()
  .trim()
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Invalid date filter format',
  });

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const adminUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(ALLOWED_ROLES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  city: z.string().trim().optional(),
  ...paginationFields,
});

export const adminSuspendUserSchema = z
  .object({
    reason: z
      .string({ error: 'Suspension reason is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(500, 'Reason cannot exceed 500 characters'),
  })
  .strict('Unrecognized fields provided');

export const adminOptionalReasonSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(500, 'Reason cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict('Unrecognized fields provided');

export const adminRequiredReasonSchema = z
  .object({
    reason: z
      .string({ error: 'Moderation reason is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(500, 'Reason cannot exceed 500 characters'),
  })
  .strict('Unrecognized fields provided');

export const adminEventsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(ALLOWED_EVENT_STATUSES).optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  city: z.string().trim().optional(),
  ...paginationFields,
});

export const adminReportsQuerySchema = z.object({
  status: z.enum(ALLOWED_REPORT_STATUSES).optional(),
  targetType: z.enum(ALLOWED_REPORT_TARGET_TYPES).optional(),
  ...paginationFields,
});

export const adminReviewReportSchema = z
  .object({
    status: z.enum([
      REPORT_STATUSES.UNDER_REVIEW,
      REPORT_STATUSES.RESOLVED,
      REPORT_STATUSES.DISMISSED,
    ]),
    resolutionNotes: z
      .string()
      .trim()
      .max(500, 'Resolution notes cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict('Unrecognized fields provided');

export const adminModerationLogsQuerySchema = z
  .object({
    targetType: z.enum(ALLOWED_MODERATION_TARGET_TYPES).optional(),
    actionType: z.enum(ALLOWED_MODERATION_ACTIONS).optional(),
    adminId: objectIdSchema.optional(),
    search: z.string().trim().optional(),
    startDate: dateQuerySchema.optional(),
    endDate: dateQuerySchema.optional(),
    ...paginationFields,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be earlier than or equal to endDate',
      path: ['endDate'],
    }
  );

export const adminBookingsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(ALLOWED_BOOKING_STATUSES).optional(),
  eventId: objectIdSchema.optional(),
  ...paginationFields,
});


