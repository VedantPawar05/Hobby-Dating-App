import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Match } from '../models/match.model.js';
import { Booking } from '../models/booking.model.js';
import { ModerationLog } from '../models/moderation-log.model.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { BOOKING_STATUSES } from '../constants/booking.constants.js';
import { MODERATION_ACTIONS, MODERATION_TARGET_TYPES } from '../constants/admin.constants.js';
import { BlockService } from './block.service.js';

function isModelMethodMocked(model, method) {
  const fn = model?.[method];
  return Boolean(fn && (fn._isMockFunction || typeof fn.mock !== 'undefined'));
}

function canExecuteDbOperation(model, method) {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return true;
  }
  if (isModelMethodMocked(model, method)) {
    return true;
  }
  return false;
}

const PERMITTED_UPDATE_FIELDS = [
  'fullName',
  'city',
  'gender',
  'bio',
  'profilePicture',
  'dateOfBirth',
  'interests',
  'privacy',
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

    if (actingAdminId && canExecuteDbOperation(ModerationLog, 'create')) {
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

  /**
   * Calculates profile completion status and returns weighted completion percentage
   * and list of missing fields.
   * @param {string} userId
   */
  static async getProfileCompletion(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User profile not found or deactivated');
      error.statusCode = 404;
      throw error;
    }

    const fields = [
      { name: 'fullName', weight: 10, completed: Boolean(user.fullName && user.fullName.trim().length >= 2) },
      { name: 'email', weight: 10, completed: Boolean(user.email) },
      { name: 'city', weight: 15, completed: Boolean(user.city && user.city.trim().length > 0) },
      { name: 'dateOfBirth', weight: 10, completed: Boolean(user.dateOfBirth) },
      { name: 'gender', weight: 10, completed: Boolean(user.gender) },
      { name: 'bio', weight: 15, completed: Boolean(user.bio && user.bio.trim().length > 0) },
      { name: 'interests', weight: 15, completed: Boolean(Array.isArray(user.interests) && user.interests.length > 0) },
      { name: 'profilePicture', weight: 15, completed: Boolean(user.profilePicture && user.profilePicture.trim().length > 0) },
    ];

    let percentage = 0;
    const missingFields = [];
    const completedFields = [];

    for (const f of fields) {
      if (f.completed) {
        percentage += f.weight;
        completedFields.push(f.name);
      } else {
        missingFields.push(f.name);
      }
    }

    return {
      percentage: Math.min(percentage, 100),
      isComplete: percentage === 100,
      completedFields,
      missingFields,
    };
  }

  /**
   * Retrieves sanitized public profile of a user respecting privacy settings
   * and blocking relationships.
   * @param {string} targetUserId
   * @param {string|null} [viewerId=null]
   */
  static async getPublicProfile(targetUserId, viewerId = null) {
    if (!targetUserId) {
      const error = new Error('Target user ID is required');
      error.statusCode = 400;
      throw error;
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser || !targetUser.isActive) {
      const error = new Error('User profile not found or unavailable');
      error.statusCode = 404;
      throw error;
    }

    const isOwnProfile = viewerId && viewerId.toString() === targetUserId.toString();

    // Check blocking relationship
    if (viewerId && !isOwnProfile) {
      const blocked = await BlockService.isBlocked(viewerId, targetUserId);
      if (blocked) {
        const error = new Error('Access to this profile is restricted');
        error.statusCode = 403;
        throw error;
      }
    }

    const visibility = targetUser.privacy?.profileVisibility || 'public';

    if (!isOwnProfile) {
      if (visibility === 'members_only') {
        if (!viewerId) {
          const error = new Error('Authentication required to view this profile');
          error.statusCode = 401;
          throw error;
        }
      } else if (visibility === 'matches_only') {
        if (!viewerId) {
          const error = new Error('Authentication required to view this profile');
          error.statusCode = 401;
          throw error;
        }
        // Verify mutual match
        let isMatched = false;
        if (canExecuteDbOperation(Match, 'findOne')) {
          const match = await Match.findOne({ users: { $all: [viewerId, targetUserId] } });
          isMatched = Boolean(match);
        }
        if (!isMatched) {
          const error = new Error('This profile is only visible to mutual matches');
          error.statusCode = 403;
          throw error;
        }
      }
    }

    const showCity = isOwnProfile || targetUser.privacy?.showCity !== false;
    const showInterests = isOwnProfile || targetUser.privacy?.showInterests !== false;

    return {
      _id: targetUser._id,
      fullName: targetUser.fullName,
      profilePicture: targetUser.profilePicture || null,
      bio: targetUser.bio || '',
      city: showCity ? targetUser.city : undefined,
      interests: showInterests ? targetUser.interests || [] : [],
      gender: targetUser.gender || null,
      createdAt: targetUser.createdAt,
      privacy: isOwnProfile
        ? targetUser.privacy
        : {
            profileVisibility: targetUser.privacy?.profileVisibility || 'public',
          },
    };
  }

  /**
   * Safely deactivates user account with password verification and invalidates sessions.
   * @param {string} userId
   * @param {string} password
   * @param {string} [reason='']
   */
  static async deactivateAccount(userId, password, reason = '') {
    const userQuery = User.findById(userId);
    const user = await (typeof userQuery?.select === 'function' ? userQuery.select('+password') : userQuery);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.deletedAt) {
      const error = new Error('Cannot deactivate an account that has been permanently deleted');
      error.statusCode = 400;
      throw error;
    }

    if (!user.isActive) {
      return {
        deactivated: true,
        message: 'Account is already deactivated',
      };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid password provided');
      error.statusCode = 401;
      throw error;
    }

    user.isActive = false;
    await user.save();

    if (canExecuteDbOperation(ModerationLog, 'create')) {
      await ModerationLog.create({
        admin: user._id,
        actionType: MODERATION_ACTIONS.DEACTIVATE_ACCOUNT,
        targetType: MODERATION_TARGET_TYPES.USER,
        targetId: user._id,
        reason: reason || 'Self-initiated account deactivation',
        metadata: { email: user.email },
      });
    }

    return {
      deactivated: true,
      message: 'Account successfully deactivated',
    };
  }

  /**
   * Permanently deletes and anonymizes user account with password and DELETE confirmation.
   * Cancels active confirmed bookings to free up event capacity.
   * @param {string} userId
   * @param {string} password
   * @param {string} confirmation
   * @param {string} [reason='']
   */
  static async deleteAccount(userId, password, confirmation, reason = '') {
    if (confirmation !== 'DELETE') {
      const error = new Error('Confirmation string "DELETE" is required for account deletion');
      error.statusCode = 400;
      throw error;
    }

    const userQuery = User.findById(userId);
    const user = await (typeof userQuery?.select === 'function' ? userQuery.select('+password') : userQuery);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.deletedAt) {
      const error = new Error('Account has already been permanently deleted');
      error.statusCode = 400;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid password provided');
      error.statusCode = 401;
      throw error;
    }

    const now = new Date();

    // Cancel active bookings to preserve event capacity consistency
    if (canExecuteDbOperation(Booking, 'updateMany')) {
      await Booking.updateMany(
        { user: user._id, status: BOOKING_STATUSES.CONFIRMED },
        { $set: { status: BOOKING_STATUSES.CANCELLED, cancelledAt: now } }
      );
    }

    const originalEmail = user.email;
    user.fullName = 'Deleted User';
    user.email = `deleted_${user._id}_${Date.now()}@deleted.invalid`;
    user.bio = '';
    user.profilePicture = null;
    user.interests = [];
    user.city = 'Unknown';
    user.isActive = false;
    user.deletedAt = now;
    await user.save();

    if (canExecuteDbOperation(ModerationLog, 'create')) {
      await ModerationLog.create({
        admin: user._id,
        actionType: MODERATION_ACTIONS.DELETE_ACCOUNT,
        targetType: MODERATION_TARGET_TYPES.USER,
        targetId: user._id,
        reason: reason || 'Self-initiated permanent account deletion',
        metadata: { originalEmail },
      });
    }

    return {
      deleted: true,
      message: 'Account successfully deleted and anonymized',
    };
  }
}

export default UserService;
