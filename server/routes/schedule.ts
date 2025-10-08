import { Router } from 'express';
import { db } from '../db';
import { analysisSchedules, profileAnalysisReports, creatorProfiles } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../auth';
import { logger } from '../lib/logger';
import type { Response } from 'express';

const router = Router();

/**
 * GET /api/profile/schedule
 * Get current analysis schedule for authenticated user
 */
router.get('/api/profile/schedule', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const schedule = await db.query.analysisSchedules.findFirst({
      where: eq(analysisSchedules.userId, userId),
    });

    if (!schedule) {
      return res.json({ schedule: null });
    }

    // Count analyses in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const profile = await db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
    });

    let analysesToday = 0;
    if (profile) {
      const recentAnalyses = await db.query.profileAnalysisReports.findMany({
        where: and(
          eq(profileAnalysisReports.profileId, profile.id),
          sql`${profileAnalysisReports.createdAt} > ${oneDayAgo.toISOString()}`
        ),
      });
      analysesToday = recentAnalyses.length;
    }

    res.json({
      schedule: {
        frequency: schedule.frequency,
        scheduledDate: schedule.scheduledDayOfWeek || schedule.scheduledDayOfMonth,
        scheduledTime: schedule.scheduledTime,
        nextRun: schedule.nextRunAt,
        isActive: schedule.isActive,
      },
      analysesToday,
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch schedule');
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * POST /api/profile/schedule
 * Create or update analysis schedule
 */
router.post('/api/profile/schedule', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { frequency, scheduledDate, scheduledTime } = req.body;

    // Validate frequency
    if (!['manual', 'daily', 'weekly', 'monthly'].includes(frequency)) {
      logger.warn({ userId, invalidFrequency: frequency }, 'Invalid frequency attempt');
      return res.status(400).json({ error: 'Invalid frequency. Must be: manual, daily, weekly, or monthly' });
    }

    // Validate scheduledTime format (HH:MM)
    if (!scheduledTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
      logger.warn({ userId, invalidTime: scheduledTime }, 'Invalid time format attempt');
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM (e.g., 09:00, 14:30)' });
    }

    // Require scheduledDate for weekly/monthly
    if ((frequency === 'weekly' || frequency === 'monthly') && !scheduledDate) {
      return res.status(400).json({
        error: `scheduledDate is required for ${frequency} frequency`
      });
    }

    // Validate scheduledDate if provided
    if (scheduledDate) {
      const parsed = new Date(scheduledDate);
      if (isNaN(parsed.getTime())) {
        logger.warn({ userId, invalidDate: scheduledDate }, 'Invalid date format attempt');
        return res.status(400).json({ error: 'Invalid date format' });
      }

      if (frequency === 'monthly') {
        const dayOfMonth = parsed.getDate();
        if (dayOfMonth < 1 || dayOfMonth > 31) {
          return res.status(400).json({ error: 'Day of month must be between 1 and 31' });
        }
      }
    }

    // Calculate next run time
    let nextRunAt: Date | null = null;
    if (frequency !== 'manual') {
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      nextRunAt = new Date(now);
      nextRunAt.setHours(hours, minutes, 0, 0);

      if (frequency === 'weekly' && scheduledDate) {
        const targetDay = new Date(scheduledDate).getDay();
        const currentDay = now.getDay();
        const daysUntilNext = (targetDay - currentDay + 7) % 7 || 7;
        nextRunAt.setDate(now.getDate() + daysUntilNext);
      } else if (frequency === 'monthly' && scheduledDate) {
        // Handle monthly scheduling with proper edge case handling (day 29-31)
        const targetDate = new Date(scheduledDate).getDate();
        let candidate = new Date(now);
        candidate.setHours(hours, minutes, 0, 0);
        candidate.setDate(targetDate);

        // If we rolled over to next month (e.g., Feb 31 → Mar 3), go to last day of target month
        while (candidate.getDate() !== targetDate) {
          candidate.setDate(0); // Go to last day of previous month
        }

        // If in the past, advance to next month
        while (candidate < now) {
          candidate.setMonth(candidate.getMonth() + 1);
          candidate.setDate(targetDate);
          // Handle month overflow again
          while (candidate.getDate() !== targetDate) {
            candidate.setDate(0);
          }
        }

        nextRunAt = candidate;
      } else if (frequency === 'daily') {
        if (nextRunAt < now) {
          nextRunAt.setDate(nextRunAt.getDate() + 1);
        }
      }
    }

    // Check if schedule exists
    const existing = await db.query.analysisSchedules.findFirst({
      where: eq(analysisSchedules.userId, userId),
    });

    if (existing) {
      // Update existing schedule
      await db
        .update(analysisSchedules)
        .set({
          frequency,
          scheduledDayOfWeek: frequency === 'weekly' && scheduledDate 
            ? new Date(scheduledDate).getDay() 
            : null,
          scheduledDayOfMonth: frequency === 'monthly' && scheduledDate 
            ? new Date(scheduledDate).getDate() 
            : null,
          scheduledTime,
          nextRunAt,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(analysisSchedules.userId, userId));

      logger.info({ userId, frequency, nextRunAt }, 'Schedule updated');
    } else {
      // Create new schedule
      await db.insert(analysisSchedules).values({
        userId,
        frequency,
        scheduledDayOfWeek: frequency === 'weekly' && scheduledDate 
          ? new Date(scheduledDate).getDay() 
          : null,
        scheduledDayOfMonth: frequency === 'monthly' && scheduledDate 
          ? new Date(scheduledDate).getDate() 
          : null,
        scheduledTime,
        nextRunAt,
        isActive: true,
      });

      logger.info({ userId, frequency, nextRunAt }, 'Schedule created');
    }

    res.json({ success: true, nextRunAt });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to save schedule');
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

/**
 * DELETE /api/profile/schedule
 * Delete analysis schedule
 */
router.delete('/api/profile/schedule', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await db
      .delete(analysisSchedules)
      .where(eq(analysisSchedules.userId, userId));

    logger.info({ userId }, 'Schedule deleted');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to delete schedule');
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
