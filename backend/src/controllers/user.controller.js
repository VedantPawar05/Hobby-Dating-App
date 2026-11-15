import { UserService } from '../services/user.service.js';
import { BlockService } from '../services/block.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class UserController {
  /**
   * Retrieves profile of currently authenticated user.
   */
  static async getProfile(req, res, next) {
    try {
      const profile = await UserService.getProfile(req.user._id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates authenticated user's permitted profile fields.
   */
  static async updateProfile(req, res, next) {
    try {
      const updatedProfile = await UserService.updateProfile(req.user._id, req.body);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Profile updated successfully',
        data: { profile: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculates profile completion status and missing fields for authenticated user.
   */
  static async getProfileCompletion(req, res, next) {
    try {
      const completion = await UserService.getProfileCompletion(req.user._id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Profile completion calculated successfully',
        data: completion,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves public profile for a user with privacy rules and blocking enforced.
   */
  static async getPublicProfile(req, res, next) {
    try {
      const viewerId = req.user?._id || null;
      const profile = await UserService.getPublicProfile(req.params.userId, viewerId);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Public profile retrieved successfully',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Blocks another user.
   */
  static async blockUser(req, res, next) {
    try {
      const block = await BlockService.blockUser(
        req.user._id,
        req.body.targetUserId,
        req.body.reason || ''
      );

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'User blocked successfully',
        data: { block },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unblocks a previously blocked user.
   */
  static async unblockUser(req, res, next) {
    try {
      const result = await BlockService.unblockUser(req.user._id, req.params.targetUserId);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User unblocked successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists users blocked by the authenticated user.
   */
  static async getBlockedUsers(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

      const result = await BlockService.getBlockedUsers(req.user._id, { page, limit });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Blocked users retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivates authenticated user's account with password verification.
   */
  static async deactivateAccount(req, res, next) {
    try {
      const result = await UserService.deactivateAccount(
        req.user._id,
        req.body.password,
        req.body.reason || ''
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Account successfully deactivated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Permanently deletes and anonymizes authenticated user's account.
   */
  static async deleteAccount(req, res, next) {
    try {
      const result = await UserService.deleteAccount(
        req.user._id,
        req.body.password,
        req.body.confirmation,
        req.body.reason || ''
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Account successfully deleted and anonymized',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin-only role promotion/demotion.
   */
  static async updateRole(req, res, next) {
    try {
      const updatedUser = await UserService.updateUserRole(
        req.params.userId,
        req.body.role,
        req.user._id,
        req.body.reason || ''
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User role updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      next(error);
    }
  }
}
