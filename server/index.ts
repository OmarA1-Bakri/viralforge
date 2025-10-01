import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import compression from 'compression';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  helmetMiddleware, 
  corsMiddleware, 
  generalLimiter, 
  requestIdMiddleware 
} from './middleware/security';
import { validateAuthEnvironment } from "./auth";

const app = express();

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(requestIdMiddleware);

// Compression
app.use(compression());

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// General rate limiting
app.use('/api/', generalLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate environment variables
  try {
    validateAuthEnvironment();
    log('✅ Environment validation passed');
  } catch (error) {
    log(`❌ Environment validation failed: ${error}`);
    process.exit(1);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start AI-Enhanced ViralForgeAI automation system
    try {
      import('./automation/ai_scheduler').then(({ ai_enhanced_scheduler }) => {
        ai_enhanced_scheduler.start();
        log('🤖 AI-Enhanced ViralForge automation system started');
      }).catch((error) => {
        log('❌ Failed to start AI-enhanced automation system:', String(error));
        // Fallback to original scheduler
        import('./automation/scheduler').then(({ automationScheduler }) => {
          automationScheduler.start();
          log('🔄 Fallback automation system started');
        }).catch((fallbackError) => {
          log('❌ Fallback automation system also failed:', String(fallbackError));
        });
      });
    } catch (error) {
      log('❌ Critical error in automation system initialization:', String(error));
    }
  });
})();
