import { Worker, Job } from 'bullmq';
import { redisConnection } from './index';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { OpenRouterService } from '../ai/openrouter';
import { canRunAutomation } from './middleware';
import { db } from '../db';
import { automationJobs, userAutomationSettings } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { TrendCache } from './trendCache';

const openRouterService = new OpenRouterService();
const trendCache = new TrendCache(redisConnection);

// Job data interfaces
interface TrendDiscoveryJob {
  userId: string;
}

interface ContentScoringJob {
  userId: string;
}

interface VideoProcessingJob {
  userId: string;
}

// Helper to track job execution
async function trackJobExecution(
  userId: string,
  jobType: string,
  fn: () => Promise<{ recordsCreated: number; cost: number }>
) {
  const jobRecord = await storage.createAutomationJob({
    userId,
    jobType,
    status: 'running' as const,
    startedAt: new Date(),
  });

  try {
    const { recordsCreated, cost } = await fn();

    // Update job as completed
    await db.update(automationJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        recordsCreated,
        costUsd: cost,
      })
      .where(eq(automationJobs.id, jobRecord.id));

    // Update user's monthly cost only (job count already incremented atomically by middleware)
    await db.update(userAutomationSettings)
      .set({
        monthlyCostUsd: sql`${userAutomationSettings.monthlyCostUsd} + ${cost}`,
      })
      .where(eq(userAutomationSettings.userId, userId));

    logger.info({ userId, jobType, recordsCreated, cost }, 'Job completed successfully');
    return { recordsCreated, cost };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark job as failed
    await db.update(automationJobs)
      .set({
        status: 'failed',
        completedAt: new Date(),
        error: errorMessage,
      })
      .where(eq(automationJobs.id, jobRecord.id));

    logger.error({ userId, jobType, error: errorMessage }, 'Job failed');
    throw error;
  }
}

// Trend Discovery Worker
export const trendDiscoveryWorker = new Worker<TrendDiscoveryJob>(
  'trend-discovery',
  async (job: Job<TrendDiscoveryJob>) => {
    const { userId } = job.data;
    logger.info({ userId, jobId: job.id }, 'Starting trend discovery');

    // Check subscription limits
    await canRunAutomation(userId, 'trend_discovery');

    return trackJobExecution(userId, 'trend_discovery', async () => {
      const platform = 'tiktok';
      const category = 'all';

      // Check cache first
      let trends = await trendCache.getTrends(platform, category);
      let cost = 0;

      if (!trends) {
        // Cache miss - fetch from API
        trends = await openRouterService.discoverTrends({
          platform,
          category,
        });

        // Store in cache for other users
        await trendCache.setTrends(platform, category, trends);
        cost = 0.05; // API call cost
        logger.info({ platform, category, count: trends.length }, 'Fetched fresh trends from API');
      } else {
        logger.info({ platform, category, count: trends.length }, 'Using cached trends (cost: $0)');
      }

      // Store trends for this user
      let recordsCreated = 0;
      for (const trend of trends.slice(0, 10)) { // Limit to 10 trends per run
        await storage.createTrend(trend);
        recordsCreated++;
      }

      // Note: lastRun timestamp updated by scheduler when job enqueued (prevents duplicate jobs)
      return { recordsCreated, cost };
    });
  },
  {
    connection: redisConnection,
    concurrency: 5, // Max 5 concurrent trend discovery jobs
  }
);

// Content Scoring Worker
export const contentScoringWorker = new Worker<ContentScoringJob>(
  'content-scoring',
  async (job: Job<ContentScoringJob>) => {
    const { userId } = job.data;
    logger.info({ userId, jobId: job.id }, 'Starting content scoring');

    // Check subscription limits
    await canRunAutomation(userId, 'content_scoring');

    return trackJobExecution(userId, 'content_scoring', async () => {
      // Get user's content
      const userContent = await storage.getUserContent(userId);

      // For simplicity, analyze content that hasn't been analyzed yet
      // In production, this should query contentAnalysis table to find:
      // 1. Content with no analysis at all
      // 2. Content with analysis older than 24 hours
      // For now, analyze newest content first (most likely to be unanalyzed)
      const unanalyzedContent = userContent
        .sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime; // Newest first
        })
        .slice(0, 5); // Limit to 5 pieces of content per run

      let recordsCreated = 0;
      let totalCost = 0;

      for (const content of unanalyzedContent) {
        try {
          const analysis = await openRouterService.analyzeContent({
            title: content.title || '',
            description: content.description || '',
            platform: content.platform || 'tiktok',
            roastMode: false,
          });

          await storage.createContentAnalysis({
            contentId: content.id,
            clickabilityScore: analysis.clickabilityScore,
            clarityScore: analysis.clarityScore,
            intrigueScore: analysis.intrigueScore,
            emotionScore: analysis.emotionScore,
            feedback: typeof analysis.feedback === 'string'
              ? { thumbnail: '', title: '', overall: analysis.feedback }
              : analysis.feedback,
            suggestions: analysis.suggestions,
            roastMode: false,
          });

          recordsCreated++;
          totalCost += 0.015; // Estimated cost per analysis
        } catch (error) {
          logger.error({ contentId: content.id, error }, 'Failed to analyze content');
        }
      }

      // Note: lastRun timestamp updated by scheduler when job enqueued (prevents duplicate jobs)
      return { recordsCreated, cost: totalCost };
    });
  },
  {
    connection: redisConnection,
    concurrency: 10, // Max 10 concurrent scoring jobs
  }
);

// Video Processing Worker
export const videoProcessingWorker = new Worker<VideoProcessingJob>(
  'video-processing',
  async (job: Job<VideoProcessingJob>) => {
    const { userId } = job.data;
    logger.info({ userId, jobId: job.id }, 'Starting video processing');

    // Check subscription limits
    await canRunAutomation(userId, 'video_processing');

    return trackJobExecution(userId, 'video_processing', async () => {
      // This is a placeholder - actual video processing would go here
      // Note: lastRun timestamp updated by scheduler when job enqueued (prevents duplicate jobs)

      return { recordsCreated: 0, cost: 0 };
    });
  },
  {
    connection: redisConnection,
    concurrency: 3, // Max 3 concurrent video processing jobs (resource intensive)
  }
);

// Error handlers
[trendDiscoveryWorker, contentScoringWorker, videoProcessingWorker].forEach(worker => {
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, `Worker ${worker.name} failed`);
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, `Worker ${worker.name} error`);
  });
});

// Graceful shutdown helper
export async function closeAllWorkers(timeoutMs: number = 30000): Promise<void> {
  logger.info('Closing all workers gracefully...');

  const closePromises = Promise.all([
    trendDiscoveryWorker.close(),
    contentScoringWorker.close(),
    videoProcessingWorker.close(),
  ]);

  // Race between graceful close and timeout
  await Promise.race([
    closePromises,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  logger.info('✅ All workers closed');
}

logger.info('✅ BullMQ workers initialized');
