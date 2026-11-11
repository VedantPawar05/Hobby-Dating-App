import { z } from 'zod';
import { ALLOWED_BOOKING_STATUSES } from '../constants/booking.constants.js';

export const bookingQuerySchema = z.object({
  status: z.enum(ALLOWED_BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

