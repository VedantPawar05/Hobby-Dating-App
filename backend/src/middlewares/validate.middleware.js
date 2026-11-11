import mongoose from 'mongoose';
import { ApiResponse } from '../utils/api-response.js';

/**
 * Middleware factory to validate Express request bodies against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory to validate Express query parameters against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate that a URL route parameter is a valid MongoDB ObjectId.
 * @param {string} [paramName='id'] - The route parameter key
 */
export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Invalid ID format for parameter '${paramName}'`,
      });
    }
    next();
  };
}
