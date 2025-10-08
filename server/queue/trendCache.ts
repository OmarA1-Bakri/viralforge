import { Redis } from 'ioredis';
import { logger } from '../lib/logger';

/**
 * Shared trend cache to reduce duplicate API calls
 * Implements a simple Redis-based cache with TTL
 */
export class TrendCache {
  private redis: Redis;
  private readonly TTL = 3600; // 1 hour cache

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate cache key for platform/category combination
   */
  private getCacheKey(platform: string, category: string): string {
    return `trends:${platform}:${category}`;
  }

  /**
   * Get cached trends or null if not found/expired
   * Gracefully handles Redis failures by returning null (cache miss)
   */
  async getTrends(platform: string, category: string): Promise<any[] | null> {
    try {
      const key = this.getCacheKey(platform, category);
      const cached = await this.redis.get(key);

      if (!cached) {
        logger.debug({ platform, category }, 'Cache miss for trends');
        return null;
      }

      const trends = JSON.parse(cached);
      logger.debug({ platform, category, count: trends.length }, 'Cache hit for trends');
      return trends;
    } catch (error: any) {
      // Graceful degradation: treat Redis errors as cache miss
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Connection is closed')) {
        logger.warn({ platform, category }, 'Redis unavailable, treating as cache miss');
      } else {
        logger.error({ error, platform, category }, 'Error reading from trend cache');
      }
      return null; // Fail open - fetch from API
    }
  }

  /**
   * Store trends in cache with TTL
   * Gracefully handles Redis failures (non-critical operation)
   */
  async setTrends(platform: string, category: string, trends: any[]): Promise<void> {
    try {
      const key = this.getCacheKey(platform, category);

      // Limit cache size to prevent Redis OOM
      const serialized = JSON.stringify(trends);
      if (serialized.length > 1024 * 1024) { // 1MB limit
        logger.warn({ platform, category, size: serialized.length }, 'Trends data too large, truncating');
        trends = trends.slice(0, 100); // Limit to 100 trends
      }

      await this.redis.setex(key, this.TTL, JSON.stringify(trends));
      logger.debug({ platform, category, count: trends.length }, 'Cached trends');
    } catch (error: any) {
      // Non-critical: cache write failure doesn't break functionality
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Connection is closed')) {
        logger.warn({ platform, category }, 'Redis unavailable, skipping cache write');
      } else {
        logger.error({ error, platform, category }, 'Error writing to trend cache');
      }
    }
  }

  /**
   * Invalidate cache for specific platform/category
   */
  async invalidate(platform: string, category: string): Promise<void> {
    try {
      const key = this.getCacheKey(platform, category);
      await this.redis.del(key);
      logger.debug({ platform, category }, 'Invalidated trend cache');
    } catch (error) {
      logger.error({ error, platform, category }, 'Error invalidating trend cache');
    }
  }

  /**
   * Clear all trend caches
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await this.redis.keys('trends:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info({ count: keys.length }, 'Cleared all trend caches');
      }
    } catch (error) {
      logger.error({ error }, 'Error clearing trend cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    platforms: string[];
  }> {
    try {
      const keys = await this.redis.keys('trends:*');
      const platforms = new Set<string>();

      for (const key of keys) {
        const parts = key.split(':');
        if (parts[1]) {
          platforms.add(parts[1]);
        }
      }

      return {
        totalKeys: keys.length,
        platforms: Array.from(platforms),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting cache stats');
      return { totalKeys: 0, platforms: [] };
    }
  }
}
