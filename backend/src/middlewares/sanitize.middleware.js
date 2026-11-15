function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_SANITIZATION_DEPTH = 8;

/**
 * Deeply inspects and sanitizes an object or array against NoSQL injection
 * and prototype pollution.
 *
 * - Strips MongoDB operator keys starting with '$' or containing '.'.
 * - Explicitly rejects prototype pollution keys ('__proto__', 'constructor', 'prototype') with 400 Bad Request.
 * - Explicitly rejects payloads exceeding MAX_SANITIZATION_DEPTH with 400 Bad Request.
 * - Preserves Date, RegExp, Buffer, and primitive data values intact.
 *
 * @param {any} target
 * @param {number} [depth=0]
 * @returns {any}
 */
export function sanitizeNoSqlInput(target, depth = 0) {
  if (depth > MAX_SANITIZATION_DEPTH) {
    throw createHttpError(
      `Payload nesting depth exceeds maximum allowed limit (${MAX_SANITIZATION_DEPTH})`,
      400
    );
  }

  if (target === null || target === undefined) {
    return target;
  }

  // Preserve non-object primitives
  if (typeof target !== 'object') {
    return target;
  }

  // Preserve special object instances
  if (
    target instanceof Date ||
    target instanceof RegExp ||
    (typeof Buffer !== 'undefined' && Buffer.isBuffer(target))
  ) {
    return target;
  }

  // Handle arrays safely
  if (Array.isArray(target)) {
    return target.map((item) => sanitizeNoSqlInput(item, depth + 1));
  }

  // Check prototype pollution own properties
  if (Object.prototype.hasOwnProperty.call(target, '__proto__')) {
    throw createHttpError("Prototype pollution key '__proto__' detected in payload", 400);
  }

  const clean = {};
  for (const [key, value] of Object.entries(target)) {
    // Explicitly reject prototype pollution keys
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      throw createHttpError(`Prototype pollution key '${key}' detected in payload`, 400);
    }

    // Strip keys that start with '$' (Mongo operators) or contain '.' (path traversal)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    clean[key] = sanitizeNoSqlInput(value, depth + 1);
  }

  return clean;
}

/**
 * Express middleware to sanitize req.body and req.query against NoSQL injection.
 * Does not mutate Express internal req.params route bindings.
 */
export function noSqlSanitizer(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeNoSqlInput(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeNoSqlInput(req.query);
    }
    next();
  } catch (error) {
    next(error);
  }
}

export default noSqlSanitizer;
