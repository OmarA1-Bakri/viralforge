import cron, { ScheduledTask } from 'node-cron';
import { db } from '../db';
import { analysisSchedules, creatorProfiles } from '@shared/schema';
import { sql, lte, eq, and } from 'drizzle-orm';
import { backgroundJobService } from '../services/background-jobs';
import { logger } from '../lib/logger';

/**
 * Scheduled Profile Analysis Cron Job
 *
 * Runs every 5 minutes to check for due profile analyses
 * Processes analysis_schedules table where next_run_at has passed
 */
export class AnalysisScheduler {
  private cronJob: ScheduledTask | null = null;
  private isProcessing = false;

  /**
   * Process all due scheduled analyses
   */
  async processScheduledAnalyses() {
    if (this.isProcessing) {
      logger.debug('Analysis scheduler already processing, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      // Find all active schedules where next_run_at has passed
      const dueSchedules = await db.query.analysisSchedules.findMany({
        where: and(
          eq(analysisSchedules.isActive, true),
          lte(analysisSchedules.nextRunAt, now)
        ),
      });

      if (dueSchedules.length === 0) {
        logger.debug('No due scheduled analyses');
        return;
      }

      logger.info({ count: dueSchedules.length }, 'Processing due scheduled analyses');

      for (const schedule of dueSchedules) {
        try {
          await this.processSchedule(schedule, now);
        } catch (error: any) {
          logger.error({
            error: { message: error?.message, stack: error?.stack },
            scheduleId: schedule.id,
            userId: schedule.userId
          }, 'Failed to process scheduled analysis');
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single schedule
   */
  private async processSchedule(schedule: any, now: Date) {
    // Get user's profile to extract social handles
    const profile = await db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, schedule.userId),
    });

    if (!profile) {
      logger.warn({
        userId: schedule.userId,
        scheduleId: schedule.id
      }, 'No profile found for scheduled analysis - skipping');

      // Deactivate schedule if no profile exists
      await db.update(analysisSchedules)
        .set({ isActive: false })
        .where(eq(analysisSchedules.id, schedule.id));

      return;
    }

    const socialHandles = {
      tiktokUsername: profile.tiktokUsername || undefined,
      instagramUsername: profile.instagramUsername || undefined,
      youtubeChannelId: profile.youtubeChannelId || undefined,
    };

    // Calculate NEXT next_run_at BEFORE attempting analysis
    // This ensures the schedule always advances, even if the analysis fails
    const nextRun = this.calculateNextRun(
      schedule.frequency,
      schedule.scheduledTime,
      schedule.scheduledDayOfWeek,
      schedule.scheduledDayOfMonth
    );

    // Trigger analysis job
    logger.info({
      scheduleId: schedule.id,
      userId: schedule.userId,
      frequency: schedule.frequency,
      handles: socialHandles
    }, 'Triggering scheduled profile analysis');

    let analysisSuccess = false;
    try {
      await backgroundJobService.createAnalysisJob(schedule.userId, socialHandles);
      analysisSuccess = true;
      logger.info({
        scheduleId: schedule.id,
        userId: schedule.userId,
        nextRun: nextRun.toISOString()
      }, 'Scheduled analysis triggered successfully');
    } catch (error: any) {
      // Log error but don't re-throw - we still want to update the schedule
      logger.warn({
        error: { message: error?.message },
        scheduleId: schedule.id,
        userId: schedule.userId
      }, 'Scheduled analysis failed (will retry at next scheduled time)');
      // Re-throw to let parent error handler log it
      throw error;
    } finally {
      // ALWAYS update schedule to prevent infinite retry loops
      // This runs whether the analysis succeeded or failed
      await db.update(analysisSchedules)
        .set({
          lastRunAt: now,
          nextRunAt: nextRun,
          updatedAt: now,
        })
        .where(eq(analysisSchedules.id, schedule.id));

      logger.info({
        scheduleId: schedule.id,
        userId: schedule.userId,
        nextRun: nextRun.toISOString(),
        analysisSuccess
      }, 'Schedule updated for next run');
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(
    frequency: string,
    scheduledTime: string,
    dayOfWeek: number | null,
    dayOfMonth: number | null
  ): Date {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    if (frequency === 'daily') {
      // Next occurrence is tomorrow at scheduled time
      next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly' && dayOfWeek !== null) {
      // Next occurrence is next week on same day
      const currentDay = next.getDay();
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
      // If 0 (same day), schedule for next week
      next.setDate(next.getDate() + (daysUntilNext || 7));
    } else if (frequency === 'monthly' && dayOfMonth !== null) {
      // Next occurrence is next month on same date
      let candidate = new Date(next);
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(dayOfMonth);

      // Handle month overflow (e.g., Feb 31 -> Mar 3)
      // Go to last day of target month if overflow occurs
      while (candidate.getDate() !== dayOfMonth) {
        candidate.setDate(0); // Go to last day of previous month
      }

      next.setTime(candidate.getTime());
    }

    return next;
  }

  /**
   * Cleanup stale schedules (inactive for 6+ months)
   */
  async cleanupStaleSchedules() {
    try {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const result = await db.delete(analysisSchedules)
        .where(
          sql`(${analysisSchedules.lastRunAt} < ${sixMonthsAgo.toISOString()}
               OR (${analysisSchedules.lastRunAt} IS NULL AND ${analysisSchedules.createdAt} < ${sixMonthsAgo.toISOString()}))`
        );

      logger.info({ deleted: result.rowCount || 0 }, 'Stale schedules cleanup complete');
    } catch (error: any) {
      logger.error({ error }, 'Failed to cleanup stale schedules');
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.cronJob) {
      logger.warn('Analysis scheduler already running');
      return;
    }

    // Run every 5 minutes to check for due schedules
    this.cronJob = cron.schedule('*/5 * * * *', () => {
      this.processScheduledAnalyses().catch(error => {
        logger.error({ error }, 'Analysis scheduler error');
      });
    });

    // Run cleanup weekly (Sundays at 2 AM)
    cron.schedule('0 2 * * 0', () => {
      this.cleanupStaleSchedules().catch(error => {
        logger.error({ error }, 'Cleanup scheduler error');
      });
    });

    logger.info('✅ Analysis scheduler started (runs every 5 minutes)');
    logger.info('✅ Cleanup scheduler started (runs weekly on Sundays at 2 AM)');

    // Run immediately on startup to catch any missed schedules
    setTimeout(() => {
      this.processScheduledAnalyses().catch(error => {
        logger.error({ error }, 'Initial scheduler run error');
      });
    }, 5000); // Wait 5 seconds for server to fully start
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Analysis scheduler stopped');
    }
  }
}

export const analysisScheduler = new AnalysisScheduler();
