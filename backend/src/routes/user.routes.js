import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  validateRequest,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import {
  updateProfileSchema,
  updateUserRoleSchema,
} from '../validators/user.validator.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { ApiResponse } from '../utils/api-response.js';

const router = Router();

// Profile routes
router.get('/profile', authenticate, UserController.getProfile);
router.patch(
  '/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  UserController.updateProfile
);

// Admin-only user role promotion / management
router.patch(
  '/:userId/role',
  authenticate,
  requireRoles(USER_ROLES.ADMIN),
  validateObjectId('userId'),
  validateRequest(updateUserRoleSchema),
  UserController.updateRole
);

// Protected test endpoint to verify role-based authorization
router.get(
  '/admin-test',
  authenticate,
  requireRoles(USER_ROLES.ADMIN),
  (req, res) => {
    return ApiResponse.success(res, {
      message: 'Admin access authorized',
      data: { user: req.user.toSafeObject() },
    });
  }
);

export default router;
