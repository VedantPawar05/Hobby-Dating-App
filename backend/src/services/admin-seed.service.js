import { z } from 'zod';
import { User } from '../models/user.model.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { strongPasswordSchema } from '../validators/auth.validator.js';

const adminSeedSchema = z.object({
  email: z
    .string({ error: 'ADMIN_EMAIL is required to seed an admin account' })
    .trim()
    .toLowerCase()
    .email('ADMIN_EMAIL must be a valid email address'),
  password: strongPasswordSchema,
  fullName: z
    .string()
    .trim()
    .min(2, 'ADMIN_FULL_NAME must be at least 2 characters')
    .max(100, 'ADMIN_FULL_NAME cannot exceed 100 characters')
    .default('Ricoz Platform Admin'),
  city: z
    .string()
    .trim()
    .min(2, 'ADMIN_CITY must be at least 2 characters')
    .max(100, 'ADMIN_CITY cannot exceed 100 characters')
    .default('Mumbai'),
});

/**
 * Checks whether admin seed credentials have been provided in environment variables.
 * @param {Record<string, any>} [rawEnv]
 */
export function hasAdminEnvCredentials(rawEnv = process.env) {
  return Boolean(
    rawEnv?.ADMIN_EMAIL &&
      String(rawEnv.ADMIN_EMAIL).trim() &&
      rawEnv?.ADMIN_PASSWORD &&
      String(rawEnv.ADMIN_PASSWORD).length > 0
  );
}

/**
 * Extracts admin seed configuration from environment variables without hardcoding passwords.
 * @param {Record<string, any>} [rawEnv]
 */
export function getAdminSeedConfig(rawEnv = process.env) {
  return {
    email: rawEnv?.ADMIN_EMAIL,
    password: rawEnv?.ADMIN_PASSWORD,
    fullName: rawEnv?.ADMIN_FULL_NAME || 'Ricoz Platform Admin',
    city: rawEnv?.ADMIN_CITY || 'Mumbai',
  };
}

/**
 * Idempotently creates the initial admin user using environment credentials.
 * Reuses User schema validation and pre-save bcrypt password hashing.
 * Never deletes or overwrites existing users.
 */
export async function seedAdminAccount(rawConfig = getAdminSeedConfig()) {
  if (!rawConfig?.email || !rawConfig?.password) {
    throw new Error(
      'Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables. Set both in backend/.env before seeding an admin account.'
    );
  }

  const parsed = adminSeedSchema.safeParse(rawConfig);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'admin'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid admin seed configuration: ${details}`);
  }

  const { email, password, fullName, city } = parsed.data;
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role === USER_ROLES.ADMIN) {
      return {
        user: existing.toSafeObject(),
        created: false,
        status: 'exists',
      };
    }

    throw new Error(
      `Cannot create admin account: an existing user (${email}) already holds role '${existing.role}'. Use a dedicated ADMIN_EMAIL so existing user data is not overwritten.`
    );
  }

  const adminUser = await User.create({
    fullName,
    email,
    password, // Hashed automatically by UserSchema pre('save') bcrypt hook
    dateOfBirth: new Date('1992-01-15'),
    gender: 'prefer_not_to_say',
    city,
    bio: 'Platform moderation and community safety team.',
    interests: ['running', 'hiking'],
    role: USER_ROLES.ADMIN,
    isActive: true,
  });

  return {
    user: adminUser.toSafeObject(),
    created: true,
    status: 'created',
  };
}

