import { z } from 'zod';
import {
  EVENT_CATEGORIES,
  ALLOWED_EVENT_STATUSES,
  EVENT_STATUSES,
} from '../constants/event.constants.js';

export const createEventSchema = z
  .object({
    title: z
      .string({ required_error: 'Event title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title cannot exceed 120 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description cannot exceed 2000 characters'),
    category: z.enum(EVENT_CATEGORIES, {
      errorMap: () => ({
        message: `Category must be one of: ${EVENT_CATEGORIES.join(', ')}`,
      }),
    }),
    activityType: z.string().trim().max(100).optional().default(''),
    coverImage: z
      .string()
      .url('Cover image must be a valid URL')
      .optional()
      .nullable(),
    location: z.object({
      city: z
        .string({ required_error: 'City is required' })
        .trim()
        .min(2, 'City must be at least 2 characters')
        .max(100, 'City cannot exceed 100 characters'),
      address: z
        .string({ required_error: 'Address is required' })
        .trim()
        .min(3, 'Address must be at least 3 characters')
        .max(200, 'Address cannot exceed 200 characters'),
      latitude: z.number().min(-90).max(90).optional().nullable(),
      longitude: z.number().min(-180).max(180).optional().nullable(),
    }),
    startDateTime: z
      .string({ required_error: 'Start date and time is required' })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid start date and time format',
      })
      .transform((val) => new Date(val)),
    endDateTime: z
      .string({ required_error: 'End date and time is required' })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date and time format',
      })
      .transform((val) => new Date(val)),
    capacity: z
      .number({ required_error: 'Capacity is required' })
      .int('Capacity must be an integer')
      .min(1, 'Capacity must be at least 1 slot'),
    price: z
      .number()
      .min(0, 'Price cannot be negative')
      .optional()
      .default(0),
    status: z
      .enum([EVENT_STATUSES.DRAFT, EVENT_STATUSES.PUBLISHED])
      .optional()
      .default(EVENT_STATUSES.DRAFT),
  })
  .refine((data) => data.endDateTime > data.startDateTime, {
    message: 'End date and time must be after start date and time',
    path: ['endDateTime'],
  });

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    category: z.enum(EVENT_CATEGORIES).optional(),
    activityType: z.string().trim().max(100).optional(),
    coverImage: z.string().url().optional().nullable(),
    location: z
      .object({
        city: z.string().trim().min(2).max(100).optional(),
        address: z.string().trim().min(3).max(200).optional(),
        latitude: z.number().min(-90).max(90).optional().nullable(),
        longitude: z.number().min(-180).max(180).optional().nullable(),
      })
      .optional(),
    startDateTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid start date and time format',
      })
      .transform((val) => new Date(val))
      .optional(),
    endDateTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date and time format',
      })
      .transform((val) => new Date(val))
      .optional(),
    capacity: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    status: z.enum(ALLOWED_EVENT_STATUSES).optional(),
  })
  .strict('Unpermitted fields provided for event update')
  .refine(
    (data) => {
      if (data.startDateTime && data.endDateTime) {
        return data.endDateTime > data.startDateTime;
      }
      return true;
    },
    {
      message: 'End date and time must be after start date and time',
      path: ['endDateTime'],
    }
  );

export const eventQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  city: z.string().trim().optional(),
  activityType: z.string().trim().optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid startDate')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid endDate')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['startDateTime', 'createdAt', 'price']).default('startDateTime'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

