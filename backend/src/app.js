import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

const app = express();

// Trust reverse proxy headers (required for Render / cloud HTTPS load balancers)
app.set('trust proxy', 1);

// 1. Security headers
app.use(helmet());

// 2. CORS configuration supporting single or comma-separated origins (e.g., Vercel + localhost)
const allowedOrigins = env.CLIENT_URL
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header (e.g., server-to-server, curl, health checks)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    const corsError = new Error(`Origin ${origin} is not allowed by CORS`);
    corsError.statusCode = 403;
    return callback(corsError);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// 3. Development request logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. Request parsers (JSON, urlencoded, cookies)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// 5. Mount API routes
app.use('/api', apiRouter);

// 6. Handle 404 for unknown routes
app.use(notFoundMiddleware);

// 7. Centralized error handling middleware
app.use(errorMiddleware);

export default app;
