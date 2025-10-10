import type { Express, Request } from 'express';
import { db } from '../db';
import { userAutomationSettings, automationJobs, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { requireAuth, getUserId } from '../auth';
import { trendDiscoveryQueue, contentScoringQueue, videoProcessingQueue } from '../queue/index';
import { TrendCache } from '../queue/trendCache';
import { redisConnection } from '../queue/index';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';

const trendCache = new TrendCache(redisConnection);

// Rate limiters for automation endpoints
const automationSettingsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 settings updates per minute
  message: 'Too many automation settings requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const automationTriggerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 manual triggers per minute per user
  message: 'Too many automation triggers, please wait before triggering again',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Rate limit per user, not per IP
    const userId = req.user?.id;
    return userId ? `trigger:${userId}` : req.ip;
  },
});

const automationQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 queries per minute
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Automation API endpoints for BullMQ-based user automation system
 */
export function registerAutomationRoutes(app: Express) {
  /**
   * GET /api/automation/settings
   * Get user's automation settings
   */
  app.get('/api/automation/settings', requireAuth, automationQueryLimiter, async (req, res) => {
    try {
      const userId = getUserId(req);

      let [settings] = await db
        .select()
        .from(userAutomationSettings)
        .where(eq(userAutomationSettings.userId, userId))
        .limit(1);

      // Create default settings if they don't exist
      if (!settings) {
        [settings] = await db
          .insert(userAutomationSettings)
          .values({
            userId,
            trendDiscoveryEnabled: false,
            contentScoringEnabled: false,
            videoProcessingEnabled: false,
          })
          .returning();
      }

      res.json(settings);
    } catch (error) {
      logger.error({ error }, 'Error fetching automation settings');
      res.status(500).json({ error: 'Failed to fetch automation settings' });
    }
  });

  /**
   * PUT /api/automation/settings
   * Update user's automation settings
   * CRITICAL: Validates subscription tier before allowing automation enablement
   */
  app.put('/api/automation/settings', requireAuth, automationSettingsLimiter, async (req, res) => {
    try {
      const userId = getUserId(req);
      const {
        trendDiscoveryEnabled,
        trendDiscoveryInterval,
        contentScoringEnabled,
        contentScoringInterval,
        videoProcessingEnabled,
        videoProcessingInterval,
      } = req.body;

      // Check subscription tier BEFORE allowing automation to be enabled
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userRole = user.role || 'user';
      const isAutomationAllowed = ['premium', 'pro', 'admin'].includes(userRole);

      // Prevent free users from enabling automation
      if (!isAutomationAllowed) {
        if (trendDiscoveryEnabled || contentScoringEnabled || videoProcessingEnabled) {
          return res.status(403).json({
            error: 'Automation is not available for your subscription tier. Please upgrade to Premium or Pro.',
            requiredTier: 'premium',
          });
        }
      }

      // Validate intervals
      const validIntervals = ['hourly', 'every_6_hours', 'every_12_hours', 'daily', 'weekly'];

      if (trendDiscoveryInterval && !validIntervals.includes(trendDiscoveryInterval)) {
        return res.status(400).json({ error: 'Invalid trend discovery interval' });
      }

      if (contentScoringInterval && !validIntervals.includes(contentScoringInterval)) {
        return res.status(400).json({ error: 'Invalid content scoring interval' });
      }

      if (videoProcessingInterval && !validIntervals.includes(videoProcessingInterval)) {
        return res.status(400).json({ error: 'Invalid video processing interval' });
      }

      // Check if settings exist
      const [existing] = await db
        .select()
        .from(userAutomationSettings)
        .where(eq(userAutomationSettings.userId, userId))
        .limit(1);

      let settings;

      if (existing) {
        // Update existing settings
        [settings] = await db
          .update(userAutomationSettings)
          .set({
            trendDiscoveryEnabled: trendDiscoveryEnabled ?? existing.trendDiscoveryEnabled,
            trendDiscoveryInterval: trendDiscoveryInterval ?? existing.trendDiscoveryInterval,
            contentScoringEnabled: contentScoringEnabled ?? existing.contentScoringEnabled,
            contentScoringInterval: contentScoringInterval ?? existing.contentScoringInterval,
            videoProcessingEnabled: videoProcessingEnabled ?? existing.videoProcessingEnabled,
            videoProcessingInterval: videoProcessingInterval ?? existing.videoProcessingInterval,
            updatedAt: new Date(),
          })
          .where(eq(userAutomationSettings.userId, userId))
          .returning();
      } else {
        // Create new settings
        [settings] = await db
          .insert(userAutomationSettings)
          .values({
            userId,
            trendDiscoveryEnabled: trendDiscoveryEnabled ?? false,
            trendDiscoveryInterval: trendDiscoveryInterval ?? 'daily',
            contentScoringEnabled: contentScoringEnabled ?? false,
            contentScoringInterval: contentScoringInterval ?? 'daily',
            videoProcessingEnabled: videoProcessingEnabled ?? false,
            videoProcessingInterval: videoProcessingInterval ?? 'daily',
          })
          .returning();
      }

      logger.info({ userId, settings }, 'Automation settings updated');
      res.json(settings);
    } catch (error) {
      logger.error({ error }, 'Error updating automation settings');
      res.status(500).json({ error: 'Failed to update automation settings' });
    }
  });

  /**
   * GET /api/automation/jobs
   * Get user's automation job history
   */
  app.get('/api/automation/jobs', requireAuth, automationQueryLimiter, async (req, res) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 50;

      const jobs = await db
        .select()
        .from(automationJobs)
        .where(eq(automationJobs.userId, userId))
        .orderBy(desc(automationJobs.createdAt))
        .limit(limit);

      res.json(jobs);
    } catch (error) {
      logger.error({ error }, 'Error fetching automation jobs');
      res.status(500).json({ error: 'Failed to fetch automation jobs' });
    }
  });

  /**
   * POST /api/automation/jobs/:jobType/trigger
   * Manually trigger an automation job
   */
  app.post('/api/automation/jobs/:jobType/trigger', requireAuth, automationTriggerLimiter, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { jobType } = req.params;

      if (!['trend_discovery', 'content_scoring', 'video_processing'].includes(jobType)) {
        return res.status(400).json({ error: 'Invalid job type' });
      }

      // Enqueue job based on type with circuit breaker for Redis failures
      const jobData = { userId };
      const jobOptions = {
        jobId: `${jobType}-${userId}-${randomUUID()}`, // UUID prevents collisions
        removeOnComplete: 1000, // Keep some history
        removeOnFail: 5000,
      };

      try {
        let job;
        switch (jobType) {
          case 'trend_discovery':
            job = await trendDiscoveryQueue.add('discover-trends', jobData, jobOptions);
            break;
          case 'content_scoring':
            job = await contentScoringQueue.add('score-content', jobData, jobOptions);
            break;
          case 'video_processing':
            job = await videoProcessingQueue.add('process-video', jobData, jobOptions);
            break;
          default:
            // This should never happen due to validation above, but TypeScript needs it
            throw new Error(`Invalid job type: ${jobType}`);
        }

        logger.info({ userId, jobType, jobId: job.id }, 'Manual job triggered');
        res.json({
          message: `${jobType} job triggered`,
          jobId: job.id,
          status: 'queued',
        });
      } catch (queueError: any) {
        // Circuit breaker: Redis/BullMQ failure
        logger.error({ userId, jobType, error: queueError.message }, 'Queue unavailable - job not enqueued');

        if (queueError.message?.includes('ECONNREFUSED') || queueError.message?.includes('Connection is closed')) {
          return res.status(503).json({
            error: 'Automation system temporarily unavailable. Please try again in a few minutes.',
          });
        }

        throw queueError; // Re-throw unexpected errors
      }
    } catch (error: any) {
      logger.error({ error }, 'Error triggering automation job');

      // Return user-friendly error messages
      if (error.message?.includes('not available for')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message?.includes('limit')) {
        return res.status(429).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to trigger automation job' });
    }
  });

  /**
   * GET /api/automation/usage
   * Get user's current month usage and limits
   */
  app.get('/api/automation/usage', requireAuth, automationQueryLimiter, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Get user's subscription tier
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get automation settings with usage
      const [settings] = await db
        .select()
        .from(userAutomationSettings)
        .where(eq(userAutomationSettings.userId, userId))
        .limit(1);

      // Subscription limits
      const limits = {
        free: { jobLimit: 0, costLimit: 0, automationAllowed: false },
        user: { jobLimit: 0, costLimit: 0, automationAllowed: false },
        premium: { jobLimit: 15, costLimit: 1.0, automationAllowed: true },
        pro: { jobLimit: 999999, costLimit: 50.0, automationAllowed: true },
        admin: { jobLimit: 999999, costLimit: 999999, automationAllowed: true },
      };

      const userRole = (user.role || 'user') as keyof typeof limits;
      const limit = limits[userRole];

      res.json({
        subscriptionTier: userRole,
        currentUsage: {
          monthlyJobs: settings?.monthlyJobCount || 0,
          monthlyCost: settings?.monthlyCostUsd || 0,
        },
        limits: {
          monthlyJobs: limit.jobLimit,
          monthlyCost: limit.costLimit,
          automationAllowed: limit.automationAllowed,
        },
        resetDate: settings?.monthResetAt || new Date(),
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching automation usage');
      res.status(500).json({ error: 'Failed to fetch automation usage' });
    }
  });

  /**
   * GET /api/automation/cache/stats
   * Get trend cache statistics (admin only)
   */
  app.get('/api/automation/cache/stats', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Check if user is admin
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const stats = await trendCache.getStats();
      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Error fetching cache stats');
      res.status(500).json({ error: 'Failed to fetch cache stats' });
    }
  });

  logger.info('✅ Automation API routes registered');
}
