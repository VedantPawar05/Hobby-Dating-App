import { ApiResponse } from '../utils/api-response.js';
import { USER_ROLES } from '../constants/user.constants.js';

/**
 * Middleware factory for role-based access control.
 * Rejects requests if authenticated user does not have one of the required roles.
 * @param  {...string} allowedRoles
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(res, {
        statusCode: 403,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role.`,
      });
    }

    next();
  };
}

/**
 * Authorization middleware restricting access exclusively to admin accounts.
 */
export const requireAdmin = requireRoles(USER_ROLES.ADMIN);

