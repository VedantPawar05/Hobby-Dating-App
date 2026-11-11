import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const DEV_JWT_SECRET = 'development_jwt_secret_key_minimum_32_characters_long_for_security';
const DEV_COOKIE_SECRET = 'development_cookie_secret_key_ricoz_app';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string({
      error: 'MONGODB_URI is required',
    }).min(1, 'MONGODB_URI cannot be empty'),
    CLIENT_URL: z.string().min(1, 'CLIENT_URL cannot be empty').default('http://localhost:3000'),
    JWT_SECRET: z.string({
      error: 'JWT_SECRET is required',
    }).min(16, 'JWT_SECRET must be at least 16 characters').default(DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('15m'),
    COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters').default(DEV_COOKIE_SECRET),
    ADMIN_EMAIL: z.string().trim().toLowerCase().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_FULL_NAME: z.string().trim().optional(),
    ADMIN_CITY: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (data.JWT_SECRET === DEV_JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be explicitly set in production (cannot use development default)',
        });
      }
      if (data.COOKIE_SECRET === DEV_COOKIE_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECRET'],
          message: 'COOKIE_SECRET must be explicitly set in production (cannot use development default)',
        });
      }
    }
  });

/**
 * Validates the provided environment object against the schema.
 * @param {Record<string, any>} rawEnv - Environment variables object
 * @returns {z.infer<typeof envSchema>} Validated environment object
 */
export function validateEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${formattedErrors}`);
  }

  return result.data;
}

// In test environment, provide fallback dummy MONGODB_URI if not set to allow isolated unit testing
if (process.env.NODE_ENV === 'test' && !process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/ricoz_test';
}

export const env = validateEnv(process.env);


