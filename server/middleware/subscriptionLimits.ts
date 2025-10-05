import { Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { AuthRequest } from '../auth';

/**
 * Middleware to check if user has reached their subscription limit for a feature
 * @param feature - The feature name to check (e.g., 'videoAnalysis', 'contentGeneration')
 */
export function checkSubscriptionLimit(feature: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      // Get current period
      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      currentPeriod.setHours(0, 0, 0, 0);

      // Get user's current usage
      const usage = await db.execute(sql`
        SELECT SUM(count) as total
        FROM user_usage
        WHERE user_id = ${userId}
          AND feature = ${feature}
          AND period_start = ${currentPeriod.toISOString()}
      `);

      // Get user's subscription limits
      const subscription = await db.execute(sql`
        SELECT st.limits
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        WHERE us.user_id = ${userId}
          AND us.status IN ('active', 'cancelled')
          AND (us.expires_at IS NULL OR us.expires_at > now())
        ORDER BY us.created_at DESC
        LIMIT 1
      `);

      // Default to free tier limits if no subscription found
      const limits = subscription.rows[0]?.limits || {
        videoAnalysis: 3,
        contentGeneration: 5,
        trendBookmarks: 10,
        videoClips: 0
      };

      const totalValue = usage.rows[0]?.total as number | string | null | undefined;
      const currentUsage = typeof totalValue === 'number'
        ? totalValue
        : parseInt((totalValue ?? '0').toString(), 10);
      const limit = limits[feature as keyof typeof limits];

      // -1 means unlimited
      if (limit !== -1 && currentUsage >= limit) {
        return res.status(403).json({
          success: false,
          error: `You've reached your ${feature} limit for this month`,
          currentUsage,
          limit,
          upgradeRequired: true,
          feature
        });
      }

      // User is within limits, continue to next middleware
      next();
    } catch (error) {
      console.error('Error checking subscription limit:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check subscription limit'
      });
    }
  };
}

/**
 * Middleware to track feature usage after successful completion
 * @param feature - The feature name to track
 */
export function trackFeatureUsage(feature: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return next();
    }

    try {
      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      currentPeriod.setHours(0, 0, 0, 0);

      await db.execute(sql`
        INSERT INTO user_usage (user_id, feature, count, period_start)
        VALUES (${userId}, ${feature}, 1, ${currentPeriod.toISOString()})
        ON CONFLICT (user_id, feature, period_start)
        DO UPDATE SET count = user_usage.count + EXCLUDED.count
      `);

      console.log(`✅ Tracked usage for ${userId}: ${feature}`);
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't block the response if tracking fails
    }

    next();
  };
}
