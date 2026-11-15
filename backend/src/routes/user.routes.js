import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  validateRequest,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import {
  updateProfileSchema,
  updateUserRoleSchema,
  blockUserSchema,
  deactivateAccountSchema,
  deleteAccountSchema,
} from '../validators/user.validator.js';
import { userSafetyRateLimiter } from '../middlewares/rate-limit.middleware.js';
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
router.get('/profile/completion', authenticate, UserController.getProfileCompletion);

// User blocking & safety routes
router.get('/blocked', authenticate, UserController.getBlockedUsers);
router.post(
  '/block',
  authenticate,
  userSafetyRateLimiter,
  validateRequest(blockUserSchema),
  UserController.blockUser
);
router.delete(
  '/block/:targetUserId',
  authenticate,
  userSafetyRateLimiter,
  validateObjectId('targetUserId'),
  UserController.unblockUser
);

// Account safety & lifecycle routes
router.post(
  '/deactivate',
  authenticate,
  userSafetyRateLimiter,
  validateRequest(deactivateAccountSchema),
  UserController.deactivateAccount
);
router.post(
  '/delete-account',
  authenticate,
  userSafetyRateLimiter,
  validateRequest(deleteAccountSchema),
  UserController.deleteAccount
);

// Public profile retrieval with privacy filtering and optional authentication
router.get(
  '/:userId/public',
  optionalAuthenticate,
  validateObjectId('userId'),
  UserController.getPublicProfile
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
