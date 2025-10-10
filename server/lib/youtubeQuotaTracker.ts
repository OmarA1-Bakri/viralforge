import { db } from '../db';
import { youtubeQuotaUsage, youtubeApiMetrics, type InsertYoutubeQuotaUsage, type InsertYoutubeApiMetrics } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from './logger';

/**
 * YouTube API Quota Tracker
 *
 * Purpose: Track and enforce YouTube API quota limits (10,000 units/day free tier)
 *
 * Quota Costs:
 * - channels.list: 1 unit
 * - playlistItems.list: 1 unit
 * - videos.list: 1 unit
 * - search.list: 100 units (AVOID!)
 *
 * Features:
 * - Real-time quota tracking
 * - Alert thresholds (75%, 90%, 95%)
 * - Automatic quota blocking at 95%
 * - Daily reset at midnight UTC
 * - Per-user quota tracking (optional)
 * - Response time monitoring
 */

export interface QuotaStatus {
  date: string;
  unitsUsed: number;
  unitsRemaining: number;
  percentageUsed: number;
  dailyLimit: number;
  resetTime: Date;
  isExceeded: boolean;
  shouldBlock: boolean;
}

export interface ApiCallMetrics {
  operation: string;
  durationMs: number;
  success: boolean;
  statusCode?: number;
  errorType?: string;
  retryCount?: number;
}

export class YouTubeQuotaTracker {
  private static readonly DAILY_QUOTA_LIMIT = 10000; // Free tier limit
  private static readonly ALERT_THRESHOLDS = {
    WARNING: 0.75, // 75% - Log warning
    CRITICAL: 0.90, // 90% - Alert admins
    BLOCK: 0.95, // 95% - Stop making calls (leave buffer for critical operations)
  };

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private static getTodayDate(): string {
    // YouTube API quota resets at midnight Pacific Time (PST/PDT), not UTC
    const pacificTime = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles' 
    });
    return new Date(pacificTime).toISOString().split('T')[0];
  }

  /**
   * Get quota reset time (midnight UTC tonight)
   */
  private static getResetTime(): Date {
    // YouTube API quota resets at midnight Pacific Time (PST/PDT)
    const now = new Date();
    
    // Get current time in Pacific timezone
    const pacificNow = new Date(now.toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles' 
    }));
    
    // Set to tomorrow at midnight Pacific
    const pacificTomorrow = new Date(pacificNow);
    pacificTomorrow.setDate(pacificTomorrow.getDate() + 1);
    pacificTomorrow.setHours(0, 0, 0, 0);
    
    // Convert Pacific time back to local server time
    const pacificTomorrowStr = pacificTomorrow.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return new Date(pacificTomorrowStr + ' PST');
  }

  /**
   * Track quota usage for an API call
   */
  async trackUsage(params: {
    operation: string;
    unitsUsed: number;
    userId?: string;
    endpoint?: string;
    success?: boolean;
    errorCode?: string;
  }): Promise<void> {
    const {
      operation,
      unitsUsed,
      userId,
      endpoint,
      success = true,
      errorCode,
    } = params;

    const date = YouTubeQuotaTracker.getTodayDate();

    try {
      // Insert usage record
      await db.insert(youtubeQuotaUsage).values({
        date,
        operation,
        unitsUsed,
        userId,
        endpoint,
        success,
        errorCode,
      } as InsertYoutubeQuotaUsage);

      // Check if we've crossed any alert thresholds
      const status = await this.getQuotaStatus();
      await this.checkAlertThresholds(status);

      logger.debug({
        operation,
        unitsUsed,
        totalUsed: status.unitsUsed,
        percentageUsed: status.percentageUsed,
      }, 'YouTube API quota usage tracked');
    } catch (error) {
      logger.error({
        error,
        operation,
        unitsUsed,
      }, 'Failed to track YouTube API quota usage');
    }
  }

  /**
   * Track API call metrics (response time, success/failure)
   */
  async trackMetrics(params: ApiCallMetrics & { userId?: string }): Promise<void> {
    const {
      operation,
      durationMs,
      success,
      statusCode,
      errorType,
      retryCount,
      userId,
    } = params;

    try {
      await db.insert(youtubeApiMetrics).values({
        operation,
        durationMs,
        success,
        statusCode,
        errorType,
        retryCount,
        userId,
      } as InsertYoutubeApiMetrics);

      // Log slow queries
      if (durationMs > 5000) {
        logger.warn({
          operation,
          durationMs,
          success,
        }, 'Slow YouTube API call detected (>5s)');
      }
    } catch (error) {
      logger.error({
        error,
        operation,
      }, 'Failed to track YouTube API metrics');
    }
  }

  /**
   * Get current quota status
   */
  async getQuotaStatus(): Promise<QuotaStatus> {
    const date = YouTubeQuotaTracker.getTodayDate();

    try {
      // Sum up all quota usage for today
      const result = await db
        .select({
          totalUsed: sql<number>`COALESCE(SUM(${youtubeQuotaUsage.unitsUsed}), 0)::int`,
        })
        .from(youtubeQuotaUsage)
        .where(eq(youtubeQuotaUsage.date, date));

      const unitsUsed = result[0]?.totalUsed || 0;
      const unitsRemaining = Math.max(0, YouTubeQuotaTracker.DAILY_QUOTA_LIMIT - unitsUsed);
      const percentageUsed = unitsUsed / YouTubeQuotaTracker.DAILY_QUOTA_LIMIT;

      return {
        date,
        unitsUsed,
        unitsRemaining,
        percentageUsed,
        dailyLimit: YouTubeQuotaTracker.DAILY_QUOTA_LIMIT,
        resetTime: YouTubeQuotaTracker.getResetTime(),
        isExceeded: unitsUsed >= YouTubeQuotaTracker.DAILY_QUOTA_LIMIT,
        shouldBlock: percentageUsed >= YouTubeQuotaTracker.ALERT_THRESHOLDS.BLOCK,
      };
    } catch (error) {
      logger.error({ error, date }, 'Failed to get YouTube API quota status');

      // Return safe default (assume quota exhausted to be safe)
      return {
        date,
        unitsUsed: YouTubeQuotaTracker.DAILY_QUOTA_LIMIT,
        unitsRemaining: 0,
        percentageUsed: 1.0,
        dailyLimit: YouTubeQuotaTracker.DAILY_QUOTA_LIMIT,
        resetTime: YouTubeQuotaTracker.getResetTime(),
        isExceeded: true,
        shouldBlock: true,
      };
    }
  }

  /**
   * Check if API call should be blocked due to quota
   */
  async shouldBlockRequest(requiredUnits: number = 1): Promise<{
    shouldBlock: boolean;
    reason?: string;
    quotaStatus?: QuotaStatus;
  }> {
    const date = YouTubeQuotaTracker.getTodayDate();
    
    try {
      // Use PostgreSQL advisory lock to prevent race conditions
      // Lock ID: Hash of date string to get consistent int64
      const lockId = this.hashStringToInt(date);
      
      // Try to acquire advisory lock (non-blocking with timeout)
      const acquired = await db.execute(
        sql`SELECT pg_try_advisory_lock(${lockId}) as locked`
      );
      
      if (!acquired.rows?.[0]?.locked) {
        // Couldn't acquire lock - another request is checking quota
        // Be conservative and block to avoid race
        logger.warn({ date, requiredUnits }, 'Could not acquire quota lock - blocking request');
        return {
          shouldBlock: true,
          reason: 'Quota check in progress by another request - please retry',
        };
      }

      try {
        // Now we have the lock - check quota safely
        const status = await this.getQuotaStatus();

        if (status.shouldBlock) {
          return {
            shouldBlock: true,
            reason: `Daily quota limit reached (${status.unitsUsed}/${status.dailyLimit} units used). Resets at ${status.resetTime.toISOString()}.`,
            quotaStatus: status,
          };
        }

        // Check if this request would push us over the block threshold
        const projectedUsage = status.unitsUsed + requiredUnits;
        const projectedPercentage = projectedUsage / status.dailyLimit;

        if (projectedPercentage >= YouTubeQuotaTracker.ALERT_THRESHOLDS.BLOCK) {
          return {
            shouldBlock: true,
            reason: `Request would exceed quota limit (projected: ${projectedUsage}/${status.dailyLimit} units).`,
            quotaStatus: status,
          };
        }

        return {
          shouldBlock: false,
          quotaStatus: status,
        };
      } finally {
        // Always release the advisory lock
        await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
      }
    } catch (error) {
      logger.error({ error, date }, 'Error in shouldBlockRequest');
      // On error, be conservative and block
      return {
        shouldBlock: true,
        reason: 'Quota check failed - blocking as safety measure',
      };
    }
  }

  /**
   * Hash a string to a consistent int64 for PostgreSQL advisory locks
   */
  private hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Ensure positive number within int64 range
    return Math.abs(hash);
  }

  /**
   * Check alert thresholds and log warnings
   */
  private async checkAlertThresholds(status: QuotaStatus): Promise<void> {
    const { percentageUsed, unitsUsed, dailyLimit } = status;

    if (percentageUsed >= YouTubeQuotaTracker.ALERT_THRESHOLDS.BLOCK) {
      logger.error({
        unitsUsed,
        dailyLimit,
        percentageUsed: (percentageUsed * 100).toFixed(1) + '%',
        resetTime: status.resetTime,
      }, '🚨 CRITICAL: YouTube API quota at 95% - BLOCKING NEW REQUESTS');

      // TODO: Send critical alert (PagerDuty, Slack, Email)
    } else if (percentageUsed >= YouTubeQuotaTracker.ALERT_THRESHOLDS.CRITICAL) {
      logger.error({
        unitsUsed,
        dailyLimit,
        percentageUsed: (percentageUsed * 100).toFixed(1) + '%',
        resetTime: status.resetTime,
      }, '⚠️ CRITICAL: YouTube API quota at 90%');

      // TODO: Send alert to admins
    } else if (percentageUsed >= YouTubeQuotaTracker.ALERT_THRESHOLDS.WARNING) {
      logger.warn({
        unitsUsed,
        dailyLimit,
        percentageUsed: (percentageUsed * 100).toFixed(1) + '%',
        resetTime: status.resetTime,
      }, '⚠️ WARNING: YouTube API quota at 75%');
    }
  }

  /**
   * Get API performance metrics
   */
  async getPerformanceMetrics(options: {
    operation?: string;
    since?: Date;
    limit?: number;
  } = {}): Promise<{
    averageDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    successRate: number;
    totalCalls: number;
  }> {
    try {
      const { operation, since, limit } = options;

      let query = db.select().from(youtubeApiMetrics);

      // Apply filters
      const conditions = [];
      if (operation) {
        conditions.push(eq(youtubeApiMetrics.operation, operation));
      }
      if (since) {
        conditions.push(sql`${youtubeApiMetrics.createdAt} >= ${since}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Order by creation time
      query = query.orderBy(sql`${youtubeApiMetrics.createdAt} DESC`) as any;

      if (limit) {
        query = query.limit(limit) as any;
      }

      const metrics = await query;

      if (metrics.length === 0) {
        return {
          averageDuration: 0,
          p50Duration: 0,
          p95Duration: 0,
          p99Duration: 0,
          successRate: 0,
          totalCalls: 0,
        };
      }

      // Calculate metrics
      const durations = metrics.map(m => m.durationMs).sort((a, b) => a - b);
      const successCount = metrics.filter(m => m.success).length;

      return {
        averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        p50Duration: durations[Math.floor(durations.length * 0.5)],
        p95Duration: durations[Math.floor(durations.length * 0.95)],
        p99Duration: durations[Math.floor(durations.length * 0.99)],
        successRate: successCount / metrics.length,
        totalCalls: metrics.length,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get YouTube API performance metrics');
      return {
        averageDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        successRate: 0,
        totalCalls: 0,
      };
    }
  }

  /**
   * Estimate quota cost for an operation
   */
  static estimateQuotaCost(operation: string): number {
    // YouTube API quota costs
    const costs: Record<string, number> = {
      'channels.list': 1,
      'playlistItems.list': 1,
      'videos.list': 1,
      'commentThreads.list': 1,
      'search.list': 100, // EXPENSIVE!
      'activities.list': 1,
      'subscriptions.list': 1,
    };

    return costs[operation] || 1; // Default to 1 unit if unknown
  }
}

/**
 * Custom error for quota exceeded
 */
export class QuotaExceededException extends Error {
  quotaStatus?: QuotaStatus;

  constructor(message: string, quotaStatus?: QuotaStatus) {
    super(message);
    this.name = 'QuotaExceededException';
    this.quotaStatus = quotaStatus;
  }
}

// Export singleton instance
export const youtubeQuotaTracker = new YouTubeQuotaTracker();
