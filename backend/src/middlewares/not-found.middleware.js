import { ApiResponse } from '../utils/api-response.js';

/**
 * Middleware to handle 404 Not Found for unmatched routes.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function notFoundMiddleware(req, res, next) {
  return ApiResponse.error(res, {
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

