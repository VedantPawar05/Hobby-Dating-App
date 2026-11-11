import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';

/**
 * Centralized error-handling middleware for Express.
 * Handles invalid JSON, validation errors, database errors, and unexpected exceptions.
 *
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // 1. Invalid JSON body parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload received';
  }

  // 2. Zod validation error
  else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues ? err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })) : null;
  }

  // 3. Mongoose Validation Error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed';
    errors = err.errors
      ? Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        }))
      : null;
  }

  // 4. Mongoose Bad ObjectId (CastError)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  }

  // 5. MongoDB Duplicate Key Error
  else if (err.code === 11000) {
    statusCode = 409;
    const duplicatedKeys = Object.keys(err.keyValue || {});
    message = `Duplicate field value: ${duplicatedKeys.join(', ')}`;
  }

  // 6. MongoDB connection/network errors
  else if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database service unavailable';
  }

  // Log error in development/test for debugging
  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] [${req.method} ${req.url}] ${statusCode} - ${message}`);
    if (env.NODE_ENV === 'development' && err.stack) {
      console.error(err.stack);
    }
  }

  // Build error response
  const responseOptions = {
    statusCode,
    message,
  };

  if (errors) {
    responseOptions.errors = errors;
  } else if (env.NODE_ENV === 'development' && statusCode === 500 && err.stack) {
    responseOptions.errors = { stack: err.stack };
  }

  return ApiResponse.error(res, responseOptions);
}


