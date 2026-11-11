import mongoose from 'mongoose';
import { z } from 'zod';

export const mixerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export const createMixerTagSchema = z
  .object({
    toUserId: z
      .string({ error: 'Target attendee ID (toUserId) is required' })
      .trim()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid target attendee ID format',
      }),
  })
  .strict('Unrecognized fields provided');


