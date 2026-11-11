import { UserService } from '../services/user.service.js';
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
   * Admin-only role promotion/demotion.
   */
  static async updateRole(req, res, next) {
    try {
      const updatedUser = await UserService.updateUserRole(req.params.userId, req.body.role);

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
