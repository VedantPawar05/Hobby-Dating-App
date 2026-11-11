import { User } from '../models/user.model.js';

const PERMITTED_UPDATE_FIELDS = [
  'fullName',
  'city',
  'gender',
  'bio',
  'profilePicture',
  'dateOfBirth',
  'interests',
];

export class UserService {
  /**
   * Retrieves profile for the specified user ID.
   * @param {string} userId
   */
  static async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User profile not found or deactivated');
      error.statusCode = 404;
      throw error;
    }

    return user.toSafeObject();
  }

  /**
   * Updates only strictly permitted profile fields.
   * Prevents modification of email, role, password, isActive, or internal identifiers.
   * @param {string} userId
   * @param {Record<string, any>} updateData
   */
  static async updateProfile(userId, updateData) {
    const sanitizedUpdates = {};

    for (const field of PERMITTED_UPDATE_FIELDS) {
      if (updateData[field] !== undefined) {
        sanitizedUpdates[field] = updateData[field];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      const error = new Error('No valid profile update fields provided');
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: sanitizedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return updatedUser.toSafeObject();
  }

  /**
   * Controlled admin promotion/demotion of user role.
   * @param {string} targetUserId
   * @param {string} newRole
   */
  static async updateUserRole(targetUserId, newRole) {
    const user = await User.findById(targetUserId);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    user.role = newRole;
    await user.save();

    return user.toSafeObject();
  }
}
