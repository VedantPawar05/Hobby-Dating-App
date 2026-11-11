import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

let server;

/**
 * Initializes database connection and starts Express HTTP server.
 * Ensures the application does NOT accept requests if database connection fails.
 */
async function startServer() {
  try {
    console.log('[Server] Connecting to database...');
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      console.log(`[Server] Application running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[Server] Health check available at http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Failed to initialize application:', error.message);
    process.exit(1);
  }
}

/**
 * Handles graceful shutdown upon receiving termination signals.
 * @param {string} signal - The termination signal received
 */
async function handleShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      try {
        await disconnectDatabase();
        console.log('[Server] Graceful shutdown completed');
        process.exit(0);
      } catch (err) {
        console.error('[Server] Error during database disconnect:', err.message);
        process.exit(1);
      }
    });

    // Fallback forced shutdown after 10 seconds if connections hang
    setTimeout(() => {
      console.error('[Server] Forcefully shutting down due to timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    try {
      await disconnectDatabase();
    } finally {
      process.exit(0);
    }
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();

