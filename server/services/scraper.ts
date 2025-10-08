import axios from 'axios';
import { logger } from '../lib/logger';
import { env } from '../config/env';

/**
 * Social Media Scraping Service
 *
 * Platform Strategy:
 * - YouTube: Official Data API v3 (free, legal, stable)
 * - Instagram: crew-social-tools Python scraper (free)
 * - TikTok: crew-social-tools Python scraper (free)
 *
 * Graceful degradation: Returns whatever we can scrape, doesn't fail if one platform fails
 */

export interface ScrapedPost {
  platform: 'youtube' | 'instagram' | 'tiktok';
  postUrl: string;
  postId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  postedAt?: Date;
}

export interface SocialHandles {
  youtubeChannelId?: string;
  instagramUsername?: string;
  tiktokUsername?: string;
}

export class SocialMediaScraperService {
  private readonly crewAgentUrl: string;
  private readonly youtubeApiKey: string;
  private readonly httpTimeout = 30000; // 30 second timeout for HTTP requests
  private readonly maxRetries = 3; // Maximum retry attempts for failed requests
  private readonly retryDelay = 1000; // Initial retry delay in ms (exponential backoff)

  constructor() {
    this.crewAgentUrl = env.CREW_AGENT_URL;
    this.youtubeApiKey = env.YOUTUBE_API_KEY;

    if (!this.youtubeApiKey) {
      logger.warn('YOUTUBE_API_KEY not configured - YouTube scraping will fail');
    }
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    context: string,
    attempt = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= this.maxRetries) {
        logger.error({ error, context, attempts: attempt }, 'Max retries reached');
        throw error;
      }

      const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn({ error, context, attempt, nextRetryIn: delay }, 'Retrying after error');

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, context, attempt + 1);
    }
  }

  /**
   * Scrape top posts from all available platforms
   * Implements graceful degradation - returns whatever we can successfully scrape
   */
  async scrapeAllPlatforms(socialHandles: SocialHandles, postsPerPlatform: number = 5): Promise<ScrapedPost[]> {
    const results: ScrapedPost[] = [];
    const errors: { platform: string; error: any }[] = [];

    // Try YouTube with retry
    if (socialHandles.youtubeChannelId) {
      try {
        const youtubePosts = await this.retryWithBackoff(
          () => this.scrapeYouTube(socialHandles.youtubeChannelId!, postsPerPlatform),
          `YouTube scraping for ${socialHandles.youtubeChannelId}`
        );
        results.push(...youtubePosts);
        logger.info({ count: youtubePosts.length }, 'YouTube scraping successful');
      } catch (error) {
        logger.warn({ error, channelId: socialHandles.youtubeChannelId }, 'YouTube scraping failed after retries');
        errors.push({ platform: 'youtube', error });
      }
    }

    // Try Instagram with retry
    if (socialHandles.instagramUsername) {
      try {
        const instagramPosts = await this.retryWithBackoff(
          () => this.scrapeInstagram(socialHandles.instagramUsername!, postsPerPlatform),
          `Instagram scraping for @${socialHandles.instagramUsername}`
        );
        results.push(...instagramPosts);
        logger.info({ count: instagramPosts.length }, 'Instagram scraping successful');
      } catch (error) {
        logger.warn({ error, username: socialHandles.instagramUsername }, 'Instagram scraping failed after retries');
        errors.push({ platform: 'instagram', error });
      }
    }

    // Try TikTok with retry
    if (socialHandles.tiktokUsername) {
      try {
        const tiktokPosts = await this.retryWithBackoff(
          () => this.scrapeTikTok(socialHandles.tiktokUsername!, postsPerPlatform),
          `TikTok scraping for @${socialHandles.tiktokUsername}`
        );
        results.push(...tiktokPosts);
        logger.info({ count: tiktokPosts.length }, 'TikTok scraping successful');
      } catch (error) {
        logger.warn({ error, username: socialHandles.tiktokUsername }, 'TikTok scraping failed after retries');
        errors.push({ platform: 'tiktok', error });
      }
    }

    // If we got nothing, throw an error with details
    if (results.length === 0) {
      throw new Error(
        `Failed to scrape any platforms. Errors: ${errors.map(e => `${e.platform}: ${e.error.message}`).join(', ')}`
      );
    }

    logger.info({
      totalPosts: results.length,
      platforms: [...new Set(results.map(p => p.platform))],
      failedPlatforms: errors.map(e => e.platform)
    }, 'Scraping completed with partial success');

    return results;
  }

  /**
   * Scrape YouTube using official Data API v3
   * Free tier: 10,000 quota units/day
   * Cost: Free (within quota)
   */
  private async scrapeYouTube(channelIdOrHandle: string, limit: number): Promise<ScrapedPost[]> {
    if (!this.youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    try {
      // Step 1: Get uploads playlist ID
      // Detect if input is a handle (@username) or channel ID (UC...)
      const isHandle = channelIdOrHandle.startsWith('@') || !channelIdOrHandle.startsWith('UC');

      const channelParams: any = {
        key: this.youtubeApiKey,
        part: 'contentDetails',
      };

      if (isHandle) {
        // Remove @ if present
        const handle = channelIdOrHandle.replace(/^@/, '');
        channelParams.forHandle = handle;
      } else {
        channelParams.id = channelIdOrHandle;
      }

      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: channelParams,
        timeout: this.httpTimeout,
      });

      const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error(`Could not find uploads playlist for ${isHandle ? 'handle' : 'channel ID'}: ${channelIdOrHandle}`);
      }

      // Step 2: Get recent videos from uploads playlist
      const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          key: this.youtubeApiKey,
          playlistId: uploadsPlaylistId,
          part: 'snippet',
          maxResults: limit,
          order: 'date',
        },
        timeout: this.httpTimeout,
      });

      const videoIds = playlistResponse.data.items?.map((item: any) => item.snippet.resourceId.videoId) || [];

      if (videoIds.length === 0) {
        return [];
      }

      // Step 3: Get detailed stats for videos
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: this.youtubeApiKey,
          id: videoIds.join(','),
          part: 'snippet,statistics',
        },
        timeout: this.httpTimeout,
      });

      // Transform to our format
      const posts: ScrapedPost[] = videosResponse.data.items?.map((video: any) => ({
        platform: 'youtube' as const,
        postId: video.id,
        postUrl: `https://www.youtube.com/watch?v=${video.id}`,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
        viewCount: parseInt(video.statistics.viewCount || '0'),
        likeCount: parseInt(video.statistics.likeCount || '0'),
        commentCount: parseInt(video.statistics.commentCount || '0'),
        shareCount: undefined, // YouTube API doesn't provide shares
        postedAt: new Date(video.snippet.publishedAt),
      })) || [];

      return posts;
    } catch (error: any) {
      logger.error({ error, channelIdOrHandle }, 'YouTube API request failed');

      // Provide user-friendly error messages
      const errorMsg = error.message;
      if (errorMsg.includes('quota')) {
        throw new Error(`YouTube API quota exceeded. Please try again later.`);
      }
      if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        throw new Error(`YouTube channel "${channelIdOrHandle}" not found. Please check the handle/ID and try again.`);
      }

      throw new Error(`YouTube scraping failed: ${errorMsg}`);
    }
  }

  /**
   * Scrape Instagram using crew-social-tools
   * Cost: Free (uses existing scraper)
   */
  private async scrapeInstagram(username: string, limit: number): Promise<ScrapedPost[]> {
    try {
      const response = await axios.post(`${this.crewAgentUrl}/v1/instagram/fetch`, {
        mode: 'profile',
        target: username,
        max_items: limit,
      }, {
        timeout: 60000, // 60s timeout
      });

      // Check for errors in UnifiedResponse format
      if (response.data.error) {
        throw new Error(response.data.error.error || 'Instagram scraping failed');
      }

      // Transform crew-social-tools UnifiedResponse to our format
      const posts: ScrapedPost[] = response.data.items?.map((item: any) => ({
        platform: 'instagram' as const,
        postId: item.id,
        postUrl: item.url,
        title: item.title,
        description: item.text,
        thumbnailUrl: undefined, // Not provided by instaloader
        viewCount: undefined, // Not provided by instaloader
        likeCount: item.metrics?.likes,
        commentCount: item.metrics?.comments,
        shareCount: undefined,
        postedAt: item.published_at ? new Date(item.published_at) : undefined,
      })) || [];

      return posts;
    } catch (error: any) {
      logger.error({ error, username }, 'Instagram scraping request failed');

      // Provide user-friendly error messages
      const errorMsg = error.response?.data?.error?.error || error.message;
      if (errorMsg.includes('Broken pipe') || errorMsg.includes('Login required')) {
        throw new Error(`Instagram blocked access. Instagram restricts automated scraping. Please try YouTube or TikTok instead.`);
      }
      if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        throw new Error(`Instagram profile "@${username}" not found. Please check the username and try again.`);
      }

      throw new Error(`Instagram scraping failed: ${errorMsg}`);
    }
  }

  /**
   * Scrape TikTok using crew-social-tools
   * Cost: Free (uses existing scraper)
   */
  private async scrapeTikTok(username: string, limit: number): Promise<ScrapedPost[]> {
    try {
      const response = await axios.post(`${this.crewAgentUrl}/v1/tiktok/search`, {
        mode: 'user',
        query_or_id: username,
        region: 'GB',
        limit: limit,
      }, {
        timeout: 60000, // 60s timeout
      });

      // Check for errors in UnifiedResponse format
      if (response.data.error) {
        throw new Error(response.data.error.error || 'TikTok scraping failed');
      }

      // Transform crew-social-tools UnifiedResponse to our format
      const posts: ScrapedPost[] = response.data.items?.map((item: any) => ({
        platform: 'tiktok' as const,
        postId: item.id,
        postUrl: item.url,
        title: item.title,
        description: item.text,
        thumbnailUrl: undefined, // Not provided in UnifiedItem
        viewCount: item.metrics?.playCount,
        likeCount: item.metrics?.likes,
        commentCount: item.metrics?.comments,
        shareCount: item.metrics?.shares,
        postedAt: item.published_at ? new Date(item.published_at) : undefined,
      })) || [];

      return posts;
    } catch (error: any) {
      logger.error({ error, username }, 'TikTok scraping request failed');
      throw new Error(`TikTok scraping failed: ${error.response?.data?.error?.error || error.message}`);
    }
  }

  /**
   * Health check - verify scrapers are operational
   * Returns status for each platform
   */
  async healthCheck(): Promise<{ [platform: string]: boolean }> {
    const results = {
      youtube: false,
      instagram: false,
      tiktok: false,
    };

    // Check YouTube API key
    results.youtube = !!this.youtubeApiKey;

    // Check crew-social-tools availability
    try {
      const response = await axios.get(`${this.crewAgentUrl}/health`, { timeout: 5000 });
      const isHealthy = response.status === 200;
      results.instagram = isHealthy;
      results.tiktok = isHealthy;
    } catch (error) {
      logger.warn({ error }, 'crew-social-tools health check failed');
    }

    return results;
  }
}

// Singleton instance
export const scraperService = new SocialMediaScraperService();
