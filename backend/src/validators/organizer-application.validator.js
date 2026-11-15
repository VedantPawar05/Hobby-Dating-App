import { z } from 'zod';
import { ALLOWED_ORGANIZER_APPLICATION_STATUSES } from '../constants/organizer-application.constants.js';

export const createOrganizerApplicationSchema = z
  .object({
    organizationName: z
      .string({ error: 'Organization or club name is required' })
      .trim()
      .min(2, 'Organization name must be at least 2 characters')
      .max(120, 'Organization name cannot exceed 120 characters'),
    hostingCity: z
      .string({ error: 'Primary hosting city is required' })
      .trim()
      .min(2, 'Hosting city must be at least 2 characters')
      .max(100, 'Hosting city cannot exceed 100 characters'),
    hobbyCategories: z
      .array(z.string().trim().min(1).max(50))
      .max(10, 'Cannot select more than 10 hobby categories')
      .optional()
      .default([]),
    experience: z
      .string({ error: 'Hosting or community experience is required' })
      .trim()
      .min(20, 'Please describe your experience in at least 20 characters')
      .max(1500, 'Experience description cannot exceed 1500 characters'),
    reason: z
      .string({ error: 'Reason for applying is required' })
      .trim()
      .min(20, 'Please explain why you want to host in at least 20 characters')
      .max(1500, 'Reason cannot exceed 1500 characters'),
    contactEmail: z
      .string({ error: 'Contact email is required' })
      .trim()
      .email('Please provide a valid contact email address')
      .toLowerCase(),
    contactPhone: z
      .string({ error: 'Contact phone number is required' })
      .trim()
      .min(7, 'Contact phone must be at least 7 characters')
      .max(30, 'Contact phone cannot exceed 30 characters')
      .refine((val) => /^[+\d\s().-]{7,30}$/.test(val), {
        message: 'Contact phone contains invalid characters',
      }),
    websiteOrSocial: z
      .string()
      .trim()
      .url('Website or social link must be a valid URL')
      .refine((val) => /^https?:\/\//i.test(val), {
        message: 'Website or social link must use HTTP or HTTPS',
      })
      .or(z.literal(''))
      .optional()
      .default(''),
  })
  .strict('Unrecognized fields provided in organizer application');

export const myApplicationsQuerySchema = z.object({
  status: z.enum(ALLOWED_ORGANIZER_APPLICATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

