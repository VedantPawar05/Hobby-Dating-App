import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getAuthCookieOptions, getClearCookieOptions } from '../utils/token.js';

export class AuthController {
  /**
   * Handles user registration.
   */
  static async register(req, res, next) {
    try {
      const { user, token } = await AuthService.register(req.body);

      res.cookie('access_token', token, getAuthCookieOptions());

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'User registered successfully',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles user login.
   */
  static async login(req, res, next) {
    try {
      const { user, token } = await AuthService.login(req.body);

      res.cookie('access_token', token, getAuthCookieOptions());

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Login successful',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles user logout by clearing the authentication cookie.
   */
  static async logout(req, res, next) {
    try {
      res.clearCookie('access_token', getClearCookieOptions());

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves authenticated user details.
   */
  static async getMe(req, res, next) {
    try {
      const user = await AuthService.getCurrentUser(req.user._id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Current user retrieved successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
