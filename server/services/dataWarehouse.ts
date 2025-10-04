/**
 * Data Warehouse Service
 *
 * Persists all scraped social media data to the database for:
 * - Historical analysis
 * - Trend detection over time
 * - Performance tracking
 * - Analytics and reporting
 */

import { db } from '../db';
import {
  scrapedPosts,
  postMetricsHistory,
  trendSources,
  appEvents,
  crewExecutions
} from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

interface ScrapedPost {
  platform: string;
  externalId: string;
  url?: string;
  title?: string;
  description?: string;
  author?: string;
  authorId?: string;
  publishedAt?: Date;
  contentType?: string;
  language?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  retweets?: number;
  saves?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  keywords?: string[];
  durationSeconds?: number;
  category?: string;
  niche?: string;
  detectedTopics?: string[];
  rawJson?: any;
  scrapeSource?: string;
  scrapeJobId?: number;
}

interface CrewExecution {
  userId?: string;
  crewType: 'discovery' | 'creation' | 'publication' | 'full_pipeline';
  status: 'running' | 'completed' | 'failed';
  platforms?: string[];
  niches?: string[];
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  llmCalls?: number;
  toolCalls?: number;
  tokensUsed?: number;
  costUsd?: number;
  trendsDiscovered?: number;
  postsScraped?: number;
  outputData?: any;
  errorMessage?: string;
}

export class DataWarehouse {

  /**
   * Store scraped social media post
   * Returns the post ID (existing or newly created)
   */
  async saveScrapedPost(post: ScrapedPost): Promise<number> {
    try {
      // Check if post already exists
      const existing = await db.query.scrapedPosts.findFirst({
        where: and(
          eq(scrapedPosts.platform, post.platform),
          eq(scrapedPosts.externalId, post.externalId)
        )
      });

      if (existing) {
        // Update metrics if views increased
        if (post.views && post.views > (existing.views || 0)) {
          await this.recordMetricsSnapshot(existing.id, {
            views: post.views,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.shares || 0,
          });

          // Update main record
          await db.update(scrapedPosts)
            .set({
              views: post.views,
              likes: post.likes,
              comments: post.comments,
              shares: post.shares,
              retweets: post.retweets,
              saves: post.saves,
            })
            .where(eq(scrapedPosts.id, existing.id));
        }

        logger.debug({ postId: existing.id, platform: post.platform }, 'Updated existing scraped post');
        return existing.id;
      }

      // Insert new post
      const [inserted] = await db.insert(scrapedPosts).values({
        platform: post.platform,
        externalId: post.externalId,
        url: post.url,
        title: post.title,
        description: post.description,
        author: post.author,
        authorId: post.authorId,
        publishedAt: post.publishedAt,
        contentType: post.contentType,
        language: post.language,
        views: post.views || 0,
        likes: post.likes || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        retweets: post.retweets || 0,
        saves: post.saves || 0,
        thumbnailUrl: post.thumbnailUrl,
        videoUrl: post.videoUrl,
        mediaUrls: post.mediaUrls,
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        keywords: post.keywords || [],
        durationSeconds: post.durationSeconds,
        category: post.category,
        niche: post.niche,
        detectedTopics: post.detectedTopics || [],
        rawJson: post.rawJson,
        scrapeSource: post.scrapeSource || 'api',
        scrapeJobId: post.scrapeJobId,
      }).returning({ id: scrapedPosts.id });

      logger.info({ postId: inserted.id, platform: post.platform }, 'Saved new scraped post');
      return inserted.id;

    } catch (error) {
      logger.error({ error, post }, 'Failed to save scraped post');
      throw error;
    }
  }

  /**
   * Bulk insert scraped posts (more efficient for large batches)
   */
  async bulkSaveScrapedPosts(posts: ScrapedPost[]): Promise<number[]> {
    if (posts.length === 0) return [];

    try {
      const ids: number[] = [];

      // Process in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < posts.length; i += chunkSize) {
        const chunk = posts.slice(i, i + chunkSize);

        const inserted = await db.insert(scrapedPosts)
          .values(chunk.map(post => ({
            platform: post.platform,
            externalId: post.externalId,
            url: post.url,
            title: post.title,
            description: post.description,
            author: post.author,
            authorId: post.authorId,
            publishedAt: post.publishedAt,
            contentType: post.contentType,
            language: post.language,
            views: post.views || 0,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.shares || 0,
            retweets: post.retweets || 0,
            saves: post.saves || 0,
            thumbnailUrl: post.thumbnailUrl,
            videoUrl: post.videoUrl,
            mediaUrls: post.mediaUrls,
            hashtags: post.hashtags || [],
            mentions: post.mentions || [],
            keywords: post.keywords || [],
            durationSeconds: post.durationSeconds,
            category: post.category,
            niche: post.niche,
            detectedTopics: post.detectedTopics || [],
            rawJson: post.rawJson,
            scrapeSource: post.scrapeSource || 'bulk',
            scrapeJobId: post.scrapeJobId,
          })))
          .onConflictDoUpdate({
            target: [scrapedPosts.platform, scrapedPosts.externalId],
            set: {
              views: sql`GREATEST(scraped_posts.views, EXCLUDED.views)`,
              likes: sql`GREATEST(scraped_posts.likes, EXCLUDED.likes)`,
              comments: sql`GREATEST(scraped_posts.comments, EXCLUDED.comments)`,
              shares: sql`GREATEST(scraped_posts.shares, EXCLUDED.shares)`,
            }
          })
          .returning({ id: scrapedPosts.id });

        ids.push(...inserted.map(r => r.id));
      }

      logger.info({ count: ids.length }, 'Bulk saved scraped posts');
      return ids;

    } catch (error) {
      logger.error({ error, count: posts.length }, 'Failed to bulk save scraped posts');
      throw error;
    }
  }

  /**
   * Record metrics snapshot for time-series analysis
   */
  async recordMetricsSnapshot(
    scrapedPostId: number,
    metrics: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
    }
  ): Promise<void> {
    try {
      const engagementRate = metrics.views > 0
        ? (metrics.likes + metrics.comments + metrics.shares) / metrics.views
        : 0;

      // Get previous snapshot to calculate velocity
      const previous = await db.query.postMetricsHistory.findFirst({
        where: eq(postMetricsHistory.scrapedPostId, scrapedPostId),
        orderBy: (metrics, { desc }) => [desc(metrics.recordedAt)],
      });

      let velocityScore = 0;
      if (previous && previous.views > 0) {
        const viewGrowth = (metrics.views - previous.views) / previous.views;
        const engagementGrowth = engagementRate - (previous.engagementRate || 0);
        velocityScore = (viewGrowth + engagementGrowth) / 2;
      }

      await db.insert(postMetricsHistory).values({
        scrapedPostId,
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        engagementRate,
        velocityScore,
      });

      logger.debug({ scrapedPostId, engagementRate, velocityScore }, 'Recorded metrics snapshot');

    } catch (error) {
      logger.error({ error, scrapedPostId }, 'Failed to record metrics snapshot');
      throw error;
    }
  }

  /**
   * Link trend to source scraped posts
   */
  async linkTrendToSources(
    trendId: number,
    scrapedPostIds: number[],
    relevanceScores?: number[]
  ): Promise<void> {
    try {
      const links = scrapedPostIds.map((postId, index) => ({
        trendId,
        scrapedPostId: postId,
        relevanceScore: relevanceScores?.[index] || 1.0,
      }));

      await db.insert(trendSources)
        .values(links)
        .onConflictDoNothing();

      logger.info({ trendId, sourceCount: scrapedPostIds.length }, 'Linked trend to source posts');

    } catch (error) {
      logger.error({ error, trendId }, 'Failed to link trend to sources');
      throw error;
    }
  }

  /**
   * Track app usage event
   */
  async trackEvent(event: {
    userId?: string;
    sessionId?: string;
    eventName: string;
    eventType: string;
    platform?: string;
    properties?: any;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
  }): Promise<void> {
    try {
      await db.insert(appEvents).values({
        userId: event.userId,
        sessionId: event.sessionId,
        eventName: event.eventName,
        eventType: event.eventType,
        platform: event.platform,
        properties: event.properties,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        country: event.country,
      });

      logger.debug({ eventName: event.eventName, userId: event.userId }, 'Tracked app event');

    } catch (error) {
      logger.error({ error, event }, 'Failed to track app event');
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Log CrewAI execution
   */
  async logCrewExecution(execution: CrewExecution): Promise<number> {
    try {
      const [inserted] = await db.insert(crewExecutions)
        .values({
          userId: execution.userId,
          crewType: execution.crewType,
          status: execution.status,
          platforms: execution.platforms || [],
          niches: execution.niches || [],
          startTime: execution.startTime,
          endTime: execution.endTime,
          durationMs: execution.durationMs,
          llmCalls: execution.llmCalls || 0,
          toolCalls: execution.toolCalls || 0,
          tokensUsed: execution.tokensUsed || 0,
          costUsd: execution.costUsd || 0,
          trendsDiscovered: execution.trendsDiscovered || 0,
          postsScraped: execution.postsScraped || 0,
          outputData: execution.outputData,
          errorMessage: execution.errorMessage,
        })
        .returning({ id: crewExecutions.id });

      logger.info({
        executionId: inserted.id,
        crewType: execution.crewType,
        status: execution.status
      }, 'Logged crew execution');

      return inserted.id;

    } catch (error) {
      logger.error({ error, execution }, 'Failed to log crew execution');
      throw error;
    }
  }

  /**
   * Update crew execution status
   */
  async updateCrewExecution(
    executionId: number,
    updates: Partial<CrewExecution>
  ): Promise<void> {
    try {
      await db.update(crewExecutions)
        .set(updates)
        .where(eq(crewExecutions.id, executionId));

      logger.debug({ executionId, updates }, 'Updated crew execution');

    } catch (error) {
      logger.error({ error, executionId }, 'Failed to update crew execution');
      throw error;
    }
  }

  /**
   * Get trending hashtags (last 7 days)
   */
  async getTrendingHashtags(platform?: string, limit = 50) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const query = db.select({
        hashtag: sql`unnest(hashtags)`,
        platform: scrapedPosts.platform,
        postCount: sql<number>`COUNT(*)`,
        totalViews: sql<number>`SUM(views)`,
        avgEngagementRate: sql<number>`AVG((likes + comments + shares)::float / NULLIF(views, 0))`,
      })
      .from(scrapedPosts)
      .where(
        and(
          gte(scrapedPosts.scrapedAt, sevenDaysAgo),
          platform ? eq(scrapedPosts.platform, platform) : undefined
        )
      )
      .groupBy(sql`unnest(hashtags)`, scrapedPosts.platform)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);

      return await query;

    } catch (error) {
      logger.error({ error }, 'Failed to get trending hashtags');
      throw error;
    }
  }

  /**
   * Refresh materialized view (call hourly via cron)
   */
  async refreshPopularContentView(): Promise<void> {
    try {
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content_24h`);
      logger.info('Refreshed popular content materialized view');
    } catch (error) {
      logger.error({ error }, 'Failed to refresh materialized view');
      throw error;
    }
  }
}

export const dataWarehouse = new DataWarehouse();
export default dataWarehouse;
