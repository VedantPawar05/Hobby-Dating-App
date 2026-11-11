import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Sanitizes a MongoDB connection URI to mask credentials in log outputs.
 * @param {string} uri - The raw connection string
 * @returns {string} Sanitized connection string safe for logging
 */
export function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/(.*?):(.*?)@/, '//$1:******@');
}

/**
 * Returns a human-readable representation of Mongoose connection state.
 * @returns {'connected' | 'connecting' | 'disconnecting' | 'disconnected'}
 */
export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return states[mongoose.connection.readyState] || 'unknown';
}

/**
 * Establishes a connection to MongoDB using Mongoose.
 * @param {string} [uri] - Optional MongoDB URI (defaults to env.MONGODB_URI)
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDatabase(uri = env.MONGODB_URI) {
  const safeUri = sanitizeMongoUri(uri);

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB successfully connected to ${safeUri}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
    });

    return connection;
  } catch (error) {
    console.error(`[Database] Failed to connect to MongoDB (${safeUri}):`, error.message);
    throw error;
  }
}

/**
 * Closes the active MongoDB connection.
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed');
  }
}

