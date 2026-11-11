import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/api-response.js';

/**
 * Middleware to authenticate requests using JWT from Authorization header or cookie.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticate(req, res, next) {
  let token = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1].trim();
  }

  // 2. Fallback to HTTP-only cookie if header is not present
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return ApiResponse.error(res, {
      statusCode: 401,
      message: 'Authentication required. No token provided.',
    });
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'User account not found or deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'Authentication token has expired.',
      });
    }

    return ApiResponse.error(res, {
      statusCode: 401,
      message: 'Invalid authentication token.',
    });
  }
}

