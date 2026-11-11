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

// 1. Security headers
app.use(helmet());

// 2. CORS configuration using environment variables
const corsOptions = {
  origin: env.CLIENT_URL === '*' ? '*' : env.CLIENT_URL,
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
