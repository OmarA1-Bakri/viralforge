// Load environment configuration FIRST (before any other imports that need env vars)
import './config/env';

import express, { type Request, Response, NextFunction } from "express";
import compression from 'compression';
import { sql } from 'drizzle-orm';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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
import { analysisScheduler } from './automation/analysis-scheduler';

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

(async () => {
  // Validate environment variables
  try {
    // Verify database connection on startup
    await db.execute(sql`SELECT 1`);
    log('✅ Database connection verified');
  } catch (dbError) {
    log(`❌ Database connection failed: ${dbError}`);
    process.exit(1);
  }

  try {
    validateAuthEnvironment();
    log('✅ Environment validation passed');
  } catch (error) {
    log(`❌ Environment validation failed: ${error}`);
    process.exit(1);
  }
  
  const server = await registerRoutes(app);

  // Register schedule routes
  app.use(scheduleRoutes);

  // Register Sentry error handler BEFORE custom error handler (only if Sentry is configured)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Custom error handler (runs after Sentry captures the error)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error with structured logger
    logger.error({
      err,
      status,
      url: _req.url,
      method: _req.method,
      requestId: _req.id
    }, 'Express error handler');

    res.status(status).json({ message });
  });

  // Global error handlers - MUST be before server.listen()
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error({ reason, promise }, 'Unhandled Promise Rejection - this should never happen!');
    Sentry.captureException(reason);
    // Don't exit immediately - let the process continue but monitor closely
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error({ error }, 'Uncaught Exception - fatal error, shutting down');
    Sentry.captureException(error);
    // Give time to flush logs and Sentry events, then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes

  // Serve frontend for Android app connecting to backend
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Start analysis scheduler (cron job for scheduled profile analyses)
  analysisScheduler.start();

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start BullMQ-based user automation system
    try {
      import('./queue/workers').then(() => {
        log('✅ BullMQ workers initialized');

        // Start hourly scheduler
        import('./queue/scheduler').then(({ automationScheduler }) => {
          automationScheduler.start();
          log('🤖 User automation scheduler started');
        }).catch((error) => {
          log('❌ Failed to start automation scheduler:', String(error));
        });
      }).catch((error) => {
        log('❌ Failed to initialize BullMQ workers:', String(error));
      });
    } catch (error) {
      log('❌ Critical error in automation system initialization:', String(error));
    }
  });
})();
