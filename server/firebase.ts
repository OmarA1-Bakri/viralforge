/**
 * Firebase Functions Entry Point
 *
 * This file exports the Express app for Firebase Functions
 * without starting a server (Firebase handles that)
 */

// Load environment configuration FIRST
import './config/env';

import express, { type Request, Response, NextFunction } from "express";
import compression from 'compression';
import { sql } from 'drizzle-orm';
import { registerRoutes } from "./routes";
import {
  helmetMiddleware,
  corsMiddleware,
  generalLimiter,
  requestIdMiddleware
} from './middleware/security';
import { validateAuthEnvironment } from "./auth";
import { initSentry, Sentry } from './lib/sentry';
import { logger, logRequest } from './lib/logger';
import healthRoutes from './routes/health';
import scheduleRoutes from './routes/schedule';
import { db } from './db';
import { registerWebhookRoutes, registerRevenueCatWebhook } from './routes/webhooks';

const app = express();

// Register health check routes FIRST (before other middleware)
app.use('/health', healthRoutes);

// Initialize Sentry (must be before other middleware)
initSentry(app);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(requestIdMiddleware);

// Compression
app.use(compression());

// Register webhook routes BEFORE body parsers (needs raw body)
registerWebhookRoutes(app);
registerRevenueCatWebhook(app);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// General rate limiting
app.use('/api/', generalLimiter);

// Request logging with structured logger
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      logRequest(req.method, req.path, res.statusCode, duration, req.id);
    }
  });

  next();
});

// Initialize the app (async wrapper)
(async () => {
  // Validate environment variables
  try {
    // Verify database connection on startup
    await db.execute(sql`SELECT 1`);
    logger.info('✅ Database connection verified');
  } catch (dbError) {
    logger.error({ dbError }, '❌ Database connection failed');
    throw dbError;
  }

  try {
    validateAuthEnvironment();
    logger.info('✅ Environment validation passed');
  } catch (error) {
    logger.error({ error }, '❌ Environment validation failed');
    throw error;
  }

  const server = await registerRoutes(app);

  // Register schedule routes
  app.use(scheduleRoutes);

  // Register Sentry error handler BEFORE custom error handler
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Custom error handler (runs after Sentry captures the error)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({
      err,
      status,
      url: _req.url,
      method: _req.method,
      requestId: _req.id
    }, 'Express error handler');

    res.status(status).json({ message });
  });

  // Firebase Functions doesn't serve static files - that's handled by Firebase Hosting
  // No need to call serveStatic() here

  logger.info('🔥 Express app initialized for Firebase Functions');
})();

// Export the Express app for Firebase Functions
export default app;
