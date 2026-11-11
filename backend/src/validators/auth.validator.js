import { z } from 'zod';
import { GENDERS } from '../constants/user.constants.js';

export const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    dateOfBirth: z
      .union([z.string(), z.date()], {
        required_error: 'Date of birth is required',
      })
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
      ),
    gender: z
      .enum(GENDERS, {
        errorMap: () => ({ message: `Gender must be one of: ${GENDERS.join(', ')}` }),
      })
      .or(z.literal(''))
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val)),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters'),
    profilePicture: z
      .string()
      .trim()
      .url('Profile picture must be a valid URL')
      .or(z.literal(''))
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val)),
  })
  .strict('Unpermitted fields provided for registration');

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});
