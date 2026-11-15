import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';

/**
 * General health check controller to report API status and database state.
 */
export function getHealth(req, res) {
  let databaseStatus = 'disconnected';
  try {
    databaseStatus = getDatabaseStatus();
  } catch {
    databaseStatus = 'disconnected';
  }

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: databaseStatus,
      uptime: Math.floor(process.uptime()),
    },
  });
}

/**
 * Kubernetes / Container readiness probe to verify system can handle live traffic.
 * Fails with 503 if the MongoDB connection is dropped or disconnected.
 */
export function getReadiness(req, res) {
  let databaseStatus = 'disconnected';
  try {
    databaseStatus = getDatabaseStatus();
  } catch {
    databaseStatus = 'disconnected';
  }
  const isReady = databaseStatus === 'connected';

  if (!isReady) {
    return ApiResponse.error(res, {
      statusCode: 503,
      message: 'Service unavailable: Database connection not ready',
      data: {
        status: 'not_ready',
        database: databaseStatus,
      },
    });
  }

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Service is ready to handle traffic',
    data: {
      status: 'ready',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Kubernetes / Container liveness probe.
 */
export function getLiveness(req, res) {
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Service is alive',
    data: {
      status: 'live',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}
