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

// ✅ CRITICAL FIX: Block all requests until app is fully initialized
// This middleware MUST be registered BEFORE async initialization starts
let appReady = false;
let readyPromise: Promise<void>;

app.use(async (req, res, next) => {
  if (!appReady) {
    await readyPromise;
  }
  next();
});

// ✅ CRITICAL FIX: Validate environment and verify database BEFORE registering routes
// This prevents accepting requests with a broken database connection
readyPromise = (async () => {
  try {
    // Step 1: Validate auth environment
    validateAuthEnvironment();
    logger.info('✅ Environment validation passed');

    // Step 2: Verify database connection BEFORE registering routes
    await db.execute(sql`SELECT 1`);
    logger.info('✅ Database connection verified');

    // Step 3: Register all routes (now safe - DB is verified)
    registerRoutes(app);

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

    appReady = true;
    logger.info('🔥 Express app initialized for Firebase Functions');
  } catch (error) {
    logger.error({ error }, '❌ Initialization failed');
    throw error;
  }
})();

// Export the Express app for Firebase Functions
export default app;
