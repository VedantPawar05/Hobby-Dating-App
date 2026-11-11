import { User } from '../models/user.model.js';
import { generateToken } from '../utils/token.js';

export class AuthService {
  /**
   * Registers a new user.
   * Ensures email uniqueness, default role assignment, and password hashing.
   */
  static async register({
    fullName,
    email,
    password,
    dateOfBirth,
    gender,
    city,
    profilePicture,
  }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error('An account with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password,
      dateOfBirth,
      gender: gender || null,
      city,
      profilePicture: profilePicture || null,
      // role defaults to 'user' from Mongoose schema; user cannot assign self admin/organizer
    });

    const token = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: newUser.toSafeObject(),
      token,
    };
  }

  /**
   * Authenticates a user with email and password.
   * Returns consistent generic error for invalid credentials to prevent enumeration.
   */
  static async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Explicitly select password which is marked select: false in schema
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated. Please contact support.');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: user.toSafeObject(),
      token,
    };
  }

  /**
   * Retrieves safe user info by user ID.
   */
  static async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User not found or account deactivated');
      error.statusCode = 404;
      throw error;
    }

    return user.toSafeObject();
  }
}

