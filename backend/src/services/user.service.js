import { User } from '../models/user.model.js';
import { ModerationLog } from '../models/moderation-log.model.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { MODERATION_ACTIONS, MODERATION_TARGET_TYPES } from '../constants/admin.constants.js';

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
   * Controlled admin promotion/demotion of user role with self-protection and audit logging.
   * @param {string} targetUserId
   * @param {string} newRole
   * @param {string|null} [actingAdminId=null]
   * @param {string} [reason='']
   */
  static async updateUserRole(targetUserId, newRole, actingAdminId = null, reason = '') {
    if (actingAdminId && targetUserId.toString() === actingAdminId.toString()) {
      const error = new Error('Admins cannot modify their own administrative role');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === USER_ROLES.ADMIN && newRole !== USER_ROLES.ADMIN) {
      const error = new Error('Forbidden: Cannot demote an administrator account');
      error.statusCode = 403;
      throw error;
    }

    if (user.role === newRole) {
      const error = new Error(`User already has the '${newRole}' role`);
      error.statusCode = 400;
      throw error;
    }

    const previousRole = user.role;
    user.role = newRole;
    await user.save();

    if (actingAdminId) {
      await ModerationLog.create({
        admin: actingAdminId,
        actionType: MODERATION_ACTIONS.UPDATE_USER_ROLE,
        targetType: MODERATION_TARGET_TYPES.USER,
        targetId: user._id,
        reason: reason || `Role updated from ${previousRole} to ${newRole}`,
        metadata: {
          email: user.email,
          previousRole,
          newRole,
        },
      });
    }

    return user.toSafeObject();
  }
}
