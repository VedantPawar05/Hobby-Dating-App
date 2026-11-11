import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';

/**
 * Health check controller to report API status and database connection state.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
export function getHealth(req, res) {
  const databaseStatus = getDatabaseStatus();

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: databaseStatus,
    },
  });
}

