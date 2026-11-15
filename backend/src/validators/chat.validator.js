import { z } from 'zod';
import mongoose from 'mongoose';
import { CHAT_LIMITS } from '../constants/chat.constants.js';

export const createConversationSchema = z.object({
  matchId: z
    .string()
    .trim()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid match ID format',
    }),
});

export const sendMessageSchema = z.object({
  content: z
    .string({
      required_error: 'Message content is required',
    })
    .trim()
    .min(CHAT_LIMITS.MIN_MESSAGE_LENGTH, 'Message cannot be empty')
    .max(
      CHAT_LIMITS.MAX_MESSAGE_LENGTH,
      `Message cannot exceed ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters`
    ),
});

export const conversationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const messageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(CHAT_LIMITS.MAX_PAGE_SIZE).default(CHAT_LIMITS.DEFAULT_PAGE_SIZE),
  before: z.string().trim().optional(),
});
