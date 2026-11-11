import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string({
    required_error: 'MONGODB_URI is required',
  }).min(1, 'MONGODB_URI cannot be empty'),
  CLIENT_URL: z.string().min(1, 'CLIENT_URL cannot be empty').default('http://localhost:3000'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required',
  }).min(16, 'JWT_SECRET must be at least 16 characters').default('development_jwt_secret_key_minimum_32_characters_long_for_security'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  COOKIE_SECRET: z.string().default('development_cookie_secret_key_ricoz_app'),
});

/**
 * Validates the provided environment object against the schema.
 * @param {Record<string, any>} rawEnv - Environment variables object
 * @returns {z.infer<typeof envSchema>} Validated environment object
 */
export function validateEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.errors
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
