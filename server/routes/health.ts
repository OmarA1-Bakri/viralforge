import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Liveness probe - is the app running?
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Readiness probe - is the app ready to serve traffic?
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; message?: string; latency?: number }> = {};

  // Database check
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: 'ok',
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Redis check (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Redis check would go here
      checks.redis = { status: 'ok' };
    } catch (error) {
      checks.redis = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // AI service check
  checks.ai = {
    status: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured',
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'configured');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
