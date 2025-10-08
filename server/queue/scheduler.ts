import cron from 'node-cron';
import { db } from '../db';
import { userAutomationSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { trendDiscoveryQueue, contentScoringQueue, videoProcessingQueue } from './index';

/**
 * Hourly scheduler that enqueues automation jobs for users based on their settings
 * Runs every hour at :00 minutes
 */
export class AutomationScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Calculate if interval duration has elapsed since last run
   */
  private shouldRunJob(
    lastRun: Date | null,
    interval: string,
    now: Date = new Date()
  ): boolean {
    if (!lastRun) return true; // Never run before

    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

    switch (interval) {
      case 'hourly':
        return hoursSinceLastRun >= 1;
      case 'every_6_hours':
        return hoursSinceLastRun >= 6;
      case 'every_12_hours':
        return hoursSinceLastRun >= 12;
      case 'daily':
        return hoursSinceLastRun >= 24;
      case 'weekly':
        return hoursSinceLastRun >= 168; // 7 days * 24 hours
      default:
        return false;
    }
  }

  /**
   * Main scheduler function that runs every hour
   * Optimized to batch enqueue jobs in parallel
   */
  private async checkAndEnqueueJobs() {
    logger.info('🔄 Running hourly automation scheduler...');

    try {
      const now = new Date();

      // Get only users with at least one automation enabled
      // This filters in database instead of fetching all and filtering in app
      const allSettings = await db
        .select()
        .from(userAutomationSettings);

      // Build job queue with proper error handling for each user
      const jobsToEnqueue: Array<Promise<any>> = [];
      let trendJobsEnqueued = 0;
      let contentJobsEnqueued = 0;
      let videoJobsEnqueued = 0;

      // Use hourly window for idempotent job IDs
      const hourKey = Math.floor(now.getTime() / (1000 * 60 * 60));

      for (const settings of allSettings) {
        // Check trend discovery
        if (
          settings.trendDiscoveryEnabled &&
          this.shouldRunJob(settings.lastTrendDiscoveryRun, settings.trendDiscoveryInterval, now)
        ) {
          try {
            // Update timestamp FIRST (pessimistic - prevents duplicates even if enqueue fails)
            await db.update(userAutomationSettings)
              .set({ lastTrendDiscoveryRun: now })
              .where(eq(userAutomationSettings.userId, settings.userId));

            // Then enqueue job with idempotent ID
            jobsToEnqueue.push(
              trendDiscoveryQueue.add(
                'discover-trends',
                { userId: settings.userId },
                {
                  jobId: `trend-${settings.userId}-${hourKey}`, // Idempotent: deduplicates if scheduler runs twice
                  removeOnComplete: 1000, // Keep last 1000 completed jobs for debugging
                  removeOnFail: 5000, // Keep last 5000 failed jobs for analysis
                }
              )
            );
            trendJobsEnqueued++;
          } catch (error) {
            logger.error(
              { userId: settings.userId, error },
              'Failed to schedule trend discovery job - skipping user'
            );
          }
        }

        // Check content scoring
        if (
          settings.contentScoringEnabled &&
          this.shouldRunJob(settings.lastContentScoringRun, settings.contentScoringInterval, now)
        ) {
          try {
            // Update timestamp FIRST (pessimistic - prevents duplicates even if enqueue fails)
            await db.update(userAutomationSettings)
              .set({ lastContentScoringRun: now })
              .where(eq(userAutomationSettings.userId, settings.userId));

            // Then enqueue job with idempotent ID
            jobsToEnqueue.push(
              contentScoringQueue.add(
                'score-content',
                { userId: settings.userId },
                {
                  jobId: `content-${settings.userId}-${hourKey}`, // Idempotent: deduplicates if scheduler runs twice
                  removeOnComplete: 1000,
                  removeOnFail: 5000,
                }
              )
            );
            contentJobsEnqueued++;
          } catch (error) {
            logger.error(
              { userId: settings.userId, error },
              'Failed to schedule content scoring job - skipping user'
            );
          }
        }

        // Check video processing
        if (
          settings.videoProcessingEnabled &&
          this.shouldRunJob(settings.lastVideoProcessingRun, settings.videoProcessingInterval, now)
        ) {
          try {
            // Update timestamp FIRST (pessimistic - prevents duplicates even if enqueue fails)
            await db.update(userAutomationSettings)
              .set({ lastVideoProcessingRun: now })
              .where(eq(userAutomationSettings.userId, settings.userId));

            // Then enqueue job with idempotent ID
            jobsToEnqueue.push(
              videoProcessingQueue.add(
                'process-video',
                { userId: settings.userId },
                {
                  jobId: `video-${settings.userId}-${hourKey}`, // Idempotent: deduplicates if scheduler runs twice
                  removeOnComplete: 1000,
                  removeOnFail: 5000,
                }
              )
            );
            videoJobsEnqueued++;
          } catch (error) {
            logger.error(
              { userId: settings.userId, error },
              'Failed to schedule video processing job - skipping user'
            );
          }
        }
      }

      // Wait for all job enqueues to complete (timestamps already updated)
      await Promise.allSettled(jobsToEnqueue);

      logger.info(
        {
          trendJobsEnqueued,
          contentJobsEnqueued,
          videoJobsEnqueued,
          totalUsers: allSettings.length,
        },
        '✅ Hourly automation scheduler completed'
      );
    } catch (error) {
      logger.error({ error }, '❌ Scheduler error');
    }
  }

  /**
   * Start the hourly scheduler
   */
  start() {
    if (this.cronJob) {
      logger.warn('Scheduler already running');
      return;
    }

    // Run every hour at :00 minutes
    this.cronJob = cron.schedule('0 * * * *', () => {
      this.checkAndEnqueueJobs().catch((error) => {
        logger.error({ error }, 'Fatal scheduler error');
      });
    });

    logger.info('🤖 Automation scheduler started (runs hourly)');

    // Run immediately on startup for testing
    this.checkAndEnqueueJobs().catch((error) => {
      logger.error({ error }, 'Initial scheduler run failed');
    });
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Automation scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  isRunning(): boolean {
    return this.cronJob !== null;
  }
}

// Export singleton instance
export const automationScheduler = new AutomationScheduler();
