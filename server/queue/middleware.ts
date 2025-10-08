import { db } from '../db';
import { users, userAutomationSettings } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

// Subscription tier limits
const SUBSCRIPTION_LIMITS = {
  free: {
    automationAllowed: false,
    monthlyJobLimit: 0,
    monthlyCostLimit: 0,
  },
  user: {
    automationAllowed: false,
    monthlyJobLimit: 0,
    monthlyCostLimit: 0,
  },
  premium: {
    automationAllowed: true,
    monthlyJobLimit: 15, // ~1 job every 2 days
    monthlyCostLimit: 1.0, // $1 USD
  },
  pro: {
    automationAllowed: true,
    monthlyJobLimit: 999999, // Effectively unlimited
    monthlyCostLimit: 50.0, // $50 USD
  },
  admin: {
    automationAllowed: true,
    monthlyJobLimit: 999999,
    monthlyCostLimit: 999999,
  },
};

type JobType = 'trend_discovery' | 'content_scoring' | 'video_processing';

/**
 * Check if user can run automation based on subscription tier and usage limits
 * Throws error if user cannot run automation
 */
export async function canRunAutomation(userId: string, jobType: JobType): Promise<void> {
  // Get user subscription tier
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    logger.error({ userId }, 'User not found for automation check');
    throw new Error('User not found');
  }

  const userRole = user.role || 'user';
  const limits = SUBSCRIPTION_LIMITS[userRole as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.user;

  // Check if automation is allowed for this tier
  if (!limits.automationAllowed) {
    logger.warn({ userId, userRole, jobType }, 'Automation not allowed for subscription tier');
    throw new Error(`Automation not available for ${userRole} tier. Please upgrade to Premium or Pro.`);
  }

  // Get user's automation settings and usage
  const [settings] = await db
    .select()
    .from(userAutomationSettings)
    .where(eq(userAutomationSettings.userId, userId))
    .limit(1);

  if (!settings) {
    // No settings found - user never configured automation
    // This should never happen if API endpoints are used correctly
    logger.error({ userId, jobType }, 'Automation settings not found - blocking execution');
    throw new Error('Automation settings not configured. Please configure automation in settings.');
  }

  // Check if this specific automation is enabled
  const automationEnabled = {
    trend_discovery: settings.trendDiscoveryEnabled,
    content_scoring: settings.contentScoringEnabled,
    video_processing: settings.videoProcessingEnabled,
  }[jobType];

  if (!automationEnabled) {
    logger.warn({ userId, jobType }, 'Automation disabled by user');
    throw new Error(`${jobType} automation is disabled. Enable it in settings.`);
  }

  // Check if monthly reset is needed (new month started)
  const now = new Date();
  const monthResetAt = settings.monthResetAt || now;
  const daysSinceReset = (now.getTime() - monthResetAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 30) {
    // Reset monthly counters
    await db
      .update(userAutomationSettings)
      .set({
        monthlyCostUsd: 0,
        monthlyJobCount: 0,
        monthResetAt: now,
      })
      .where(eq(userAutomationSettings.userId, userId));

    logger.info({ userId }, 'Monthly automation usage reset');
    // After reset, user can proceed
    return;
  }

  // Check monthly job count limit
  if (settings.monthlyJobCount >= limits.monthlyJobLimit) {
    logger.warn(
      { userId, monthlyJobCount: settings.monthlyJobCount, limit: limits.monthlyJobLimit },
      'Monthly job limit exceeded'
    );
    throw new Error(
      `Monthly job limit reached (${settings.monthlyJobCount}/${limits.monthlyJobLimit}). Resets at ${new Date(
        monthResetAt.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString()}.`
    );
  }

  // Check monthly cost limit
  if (settings.monthlyCostUsd >= limits.monthlyCostLimit) {
    logger.warn(
      { userId, monthlyCostUsd: settings.monthlyCostUsd, limit: limits.monthlyCostLimit },
      'Monthly cost limit exceeded'
    );
    throw new Error(
      `Monthly cost limit reached ($${settings.monthlyCostUsd.toFixed(2)}/$${limits.monthlyCostLimit}). Resets at ${new Date(
        monthResetAt.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString()}.`
    );
  }

  // Atomically reserve job slot to prevent race conditions
  // Increment job count with database-level check to ensure limit not exceeded
  const estimatedCost = 0.05; // Estimated cost per job
  const result = await db
    .update(userAutomationSettings)
    .set({
      monthlyJobCount: sql`${userAutomationSettings.monthlyJobCount} + 1`,
    })
    .where(
      and(
        eq(userAutomationSettings.userId, userId),
        sql`${userAutomationSettings.monthlyJobCount} < ${limits.monthlyJobLimit}`,
        sql`${userAutomationSettings.monthlyCostUsd} + ${estimatedCost} <= ${limits.monthlyCostLimit}`
      )
    )
    .returning();

  if (!result.length) {
    logger.warn({ userId, jobType }, 'Job limit would be exceeded (atomic check failed)');
    throw new Error('Job or cost limit would be exceeded by this automation run');
  }

  // All checks passed
  logger.debug(
    {
      userId,
      userRole,
      jobType,
      monthlyJobCount: settings.monthlyJobCount + 1,
      monthlyCostUsd: settings.monthlyCostUsd,
    },
    'Automation check passed with atomic reservation'
  );
}
