// @ts-nocheck
/**
 * Crew Social Tools Service
 *
 * Wrapper for the crew-social-tools FastAPI microservice
 * Provides unified access to social media scraping across platforms
 */

import { logger } from '../lib/logger';

const CREW_TOOLS_URL = process.env.CREW_TOOLS_URL || 'http://localhost:8001';

// Unified response types matching Python schemas
interface MetricModel {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  retweets?: number;
  playCount?: number;
}

interface MediaItem {
  type: string;
  url: string;
}

export interface UnifiedItem {
  source: string;
  id?: string;
  url?: string;
  title?: string;
  text?: string;
  author?: string;
  published_at?: string;
  lang?: string;
  media?: MediaItem[];
  metrics?: MetricModel;
}

interface ErrorModel {
  error: string;
  code: string;
  retryable: boolean;
  hint?: string;
}

interface UnifiedResponse {
  items: UnifiedItem[];
  error?: ErrorModel;
}

/**
 * Search Twitter for tweets matching query
 */
export async function searchTwitter(params: {
  query: string;
  since?: string;  // YYYY-MM-DD
  until?: string;  // YYYY-MM-DD
  limit?: number;
}): Promise<UnifiedItem[]> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/v1/twitter/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        since: params.since,
        until: params.until,
        limit: params.limit || 100
      })
    });

    const data: UnifiedResponse = await response.json();

    if (data.error) {
      logger.error(`Twitter search failed: ${data.error.error}`);
      throw new Error(data.error.error);
    }

    logger.info(`Twitter search returned ${data.items.length} tweets`);
    return data.items;
  } catch (error) {
    logger.error('Twitter search error:', error);
    throw error;
  }
}

/**
 * Search TikTok for videos
 */
export async function searchTikTok(params: {
  mode: 'trending' | 'hashtag' | 'user' | 'search';
  queryOrId?: string;
  region?: string;
  limit?: number;
}): Promise<UnifiedItem[]> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/v1/tiktok/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: params.mode,
        query_or_id: params.queryOrId,
        region: params.region || 'GB',
        limit: params.limit || 50
      })
    });

    const data: UnifiedResponse = await response.json();

    if (data.error) {
      logger.error(`TikTok search failed: ${data.error.error}`);
      throw new Error(data.error.error);
    }

    logger.info(`TikTok search returned ${data.items.length} videos`);
    return data.items;
  } catch (error) {
    logger.error('TikTok search error:', error);
    throw error;
  }
}

/**
 * Fetch Instagram content
 */
export async function fetchInstagram(params: {
  mode: 'profile' | 'hashtag' | 'post';
  target: string;
  maxItems?: number;
}): Promise<UnifiedItem[]> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/v1/instagram/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: params.mode,
        target: params.target,
        max_items: params.maxItems || 50
      })
    });

    const data: UnifiedResponse = await response.json();

    if (data.error) {
      logger.error(`Instagram fetch failed: ${data.error.error}`);
      throw new Error(data.error.error);
    }

    logger.info(`Instagram fetch returned ${data.items.length} items`);
    return data.items;
  } catch (error) {
    logger.error('Instagram fetch error:', error);
    throw error;
  }
}

/**
 * Lookup YouTube videos
 */
export async function lookupYouTube(params: {
  mode: 'video' | 'channel_recent' | 'search';
  idOrQuery: string;
  limit?: number;
}): Promise<UnifiedItem[]> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/v1/youtube/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: params.mode,
        id_or_query: params.idOrQuery,
        limit: params.limit || 25
      })
    });

    const data: UnifiedResponse = await response.json();

    if (data.error) {
      logger.error(`YouTube lookup failed: ${data.error.error}`);
      throw new Error(data.error.error);
    }

    logger.info(`YouTube lookup returned ${data.items.length} videos`);
    return data.items;
  } catch (error) {
    logger.error('YouTube lookup error:', error);
    throw error;
  }
}

/**
 * Scan Reddit subreddit
 */
export async function scanReddit(params: {
  subreddit: string;
  sort?: 'hot' | 'new' | 'top' | 'rising';
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}): Promise<UnifiedItem[]> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/v1/reddit/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subreddit: params.subreddit,
        sort: params.sort || 'hot',
        time_filter: params.timeFilter || 'day',
        limit: params.limit || 50
      })
    });

    const data: UnifiedResponse = await response.json();

    if (data.error) {
      logger.error(`Reddit scan failed: ${data.error.error}`);
      throw new Error(data.error.error);
    }

    logger.info(`Reddit scan returned ${data.items.length} posts`);
    return data.items;
  } catch (error) {
    logger.error('Reddit scan error:', error);
    throw error;
  }
}

/**
 * Search web using DuckDuckGo
 */
export async function searchDDG(params: {
  query: string;
  region?: string;
  maxResults?: number;
}): Promise<UnifiedItem[]> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/v1/search/ddg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        region: params.region || 'us-en',
        max_results: params.maxResults || 20
      })
    });

    const data: UnifiedResponse = await response.json();

    if (data.error) {
      logger.error(`DDG search failed: ${data.error.error}`);
      throw new Error(data.error.error);
    }

    logger.info(`DDG search returned ${data.items.length} results`);
    return data.items;
  } catch (error) {
    logger.error('DDG search error:', error);
    throw error;
  }
}

/**
 * Check if crew-social-tools service is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CREW_TOOLS_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    logger.warn('Crew social tools health check failed:', error);
    return false;
  }
}

/**
 * Aggregate trends from multiple platforms
 */
export async function aggregateTrends(params: {
  query: string;
  platforms?: ('twitter' | 'reddit' | 'youtube')[];
  limit?: number;
}): Promise<UnifiedItem[]> {
  const platforms = params.platforms || ['twitter', 'reddit', 'youtube'];
  const limit = params.limit || 50;

  const results = await Promise.allSettled([
    platforms.includes('twitter')
      ? searchTwitter({ query: params.query, limit })
      : Promise.resolve([]),
    platforms.includes('reddit')
      ? scanReddit({ subreddit: 'videos', sort: 'hot', limit })
      : Promise.resolve([]),
    platforms.includes('youtube')
      ? lookupYouTube({ mode: 'search', idOrQuery: params.query, limit })
      : Promise.resolve([])
  ]);

  const allItems: UnifiedItem[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      logger.warn(`Platform ${platforms[index]} failed:`, result.reason);
    }
  });

  // Sort by engagement metrics
  allItems.sort((a, b) => {
    const aScore = (a.metrics?.likes || 0) + (a.metrics?.views || 0);
    const bScore = (b.metrics?.likes || 0) + (b.metrics?.views || 0);
    return bScore - aScore;
  });

  return allItems.slice(0, limit);
}
