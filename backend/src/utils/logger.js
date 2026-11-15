import { env } from '../config/env.js';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /^content$/i, // Mask private chat message text in logs
  /checkincode/i,
  /key/i,
];

// Regex matching standalone or embedded JWT tokens (including Bearer prefix)
const JWT_PATTERN = /(?:Bearer\s+)?[A-Za-z0-9-_]{16,}\.[A-Za-z0-9-_]{16,}\.[A-Za-z0-9-_]{16,}/g;

/**
 * Recursively sanitizes objects, strings, arrays, and errors to mask sensitive fields
 * like passwords, tokens, secrets, cookies, and private message contents.
 *
 * @param {any} data
 * @param {number} [depth=0]
 * @returns {any}
 */
export function sanitizeLogData(data, depth = 0) {
  if (depth > 6) return '[Max Depth Exceeded]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact embedded JWTs and Bearer tokens within any string
    let sanitized = data.replace(JWT_PATTERN, '[REDACTED_JWT]');
    sanitized = sanitized.replace(/(password|token|secret|key|cookie)=([^\s&,;]+)/gi, '$1=[REDACTED]');
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === 'object') {
    // Sanitize Error instances without leaking stack traces or sensitive messages in production
    if (data instanceof Error) {
      return {
        message: typeof data.message === 'string' ? sanitizeLogData(data.message) : data.message,
        name: data.name,
        statusCode: data.statusCode || data.status,
        ...(env.NODE_ENV === 'development' ? { stack: data.stack } : {}),
      };
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive && value !== null && value !== undefined) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Formats and outputs structured log entry.
 * Both primary message and metadata context are guaranteed to be sanitized.
 */
function log(level, message, meta = {}) {
  // Silence operational logs during unit test execution unless debugging
  if (env.NODE_ENV === 'test') {
    return;
  }

  const timestamp = new Date().toISOString();
  const sanitizedMessage = typeof message === 'string' ? sanitizeLogData(message) : message;
  const sanitizedMeta = sanitizeLogData(meta);

  if (env.NODE_ENV === 'production') {
    // Structured JSON logging for cloud aggregators (Datadog, CloudWatch, GCP Logging)
    const logObject = {
      timestamp,
      level,
      message: sanitizedMessage,
      ...(Object.keys(sanitizedMeta).length > 0 ? { context: sanitizedMeta } : {}),
    };
    if (level === 'ERROR') {
      console.error(JSON.stringify(logObject));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logObject));
    } else {
      console.log(JSON.stringify(logObject));
    }
  } else {
    // Human-readable format for development
    const metaString =
      Object.keys(sanitizedMeta).length > 0 ? ` ${JSON.stringify(sanitizedMeta)}` : '';
    const formatted = `[${level}] ${timestamp} - ${sanitizedMessage}${metaString}`;

    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = {
  info(message, meta) {
    log('INFO', message, meta);
  },
  warn(message, meta) {
    log('WARN', message, meta);
  },
  error(message, meta) {
    log('ERROR', message, meta);
  },
  debug(message, meta) {
    if (env.NODE_ENV !== 'production') {
      log('DEBUG', message, meta);
    }
  },
};

export default logger;
