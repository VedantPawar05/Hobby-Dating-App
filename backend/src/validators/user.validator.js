import { z } from 'zod';
import { GENDERS, ALLOWED_ROLES } from '../constants/user.constants.js';

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters')
      .optional(),
    gender: z
      .enum(GENDERS, {
        errorMap: () => ({ message: `Gender must be one of: ${GENDERS.join(', ')}` }),
      })
      .or(z.literal(''))
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val)),
    bio: z
      .string()
      .max(500, 'Bio cannot exceed 500 characters')
      .optional(),
    profilePicture: z
      .string()
      .trim()
      .url('Profile picture must be a valid URL')
      .or(z.literal(''))
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val)),
    dateOfBirth: z
      .union([z.string(), z.date()])
      .refine((val) => !isNaN(new Date(val).getTime()), {
        message: 'Invalid date format for date of birth',
      })
      .transform((val) => new Date(val))
      .refine(
        (date) => {
          const cutoff = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 18);
          return date <= cutoff;
        },
        { message: 'Users must be at least 18 years of age' }
      )
      .optional(),
    interests: z
      .array(z.string().trim().min(1).max(50))
      .max(20, 'Cannot select more than 20 interests')
      .optional(),
  })
  .strict('Unrecognized fields are not permitted in profile updates');

export const updateUserRoleSchema = z.object({
  role: z.enum(ALLOWED_ROLES, {
    errorMap: () => ({
      message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
    }),
  }),
});
