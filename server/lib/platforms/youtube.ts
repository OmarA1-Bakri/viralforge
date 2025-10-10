import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../logger';
import { enhancedYoutubeService } from '../enhancedYoutubeService';

const youtube = google.youtube('v3');

const oauth2Client = new OAuth2Client(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/oauth/youtube/callback'
);

export class YouTubeService {
  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(userId: string): string {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      ],
      state: userId, // Pass userId for callback
    });
  }

  /**
   * Exchange auth code for tokens
   */
  async getTokens(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Get channel analytics for authenticated user
   */
  async getChannelAnalytics(accessToken: string, channelId: string) {
    oauth2Client.setCredentials({ access_token: accessToken });

    // Use enhanced service with circuit breaker + quota tracking + retry
    const result = await enhancedYoutubeService.execute({
      operation: 'channels.list',
      quotaCost: 1,
      fn: async () => {
        const response = await youtube.channels.list({
          auth: oauth2Client,
          part: ['statistics', 'snippet'],
          id: [channelId],
        });

        const channel = response.data.items?.[0];

        if (!channel) {
          throw new Error(`Channel not found: ${channelId}`);
        }

        return {
          channelId: channel.id,
          title: channel.snippet?.title,
          subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
          totalViews: parseInt(channel.statistics?.viewCount || '0'),
          videoCount: parseInt(channel.statistics?.videoCount || '0'),
        };
      },
    });

    if (!result.success) {
      logger.error({
        channelId,
        errorType: result.error?.type,
        errorMessage: result.error?.message,
      }, 'Failed to fetch YouTube analytics');
      return null;
    }

    return result.data;
  }

  /**
   * Get trending videos
   */
  async getTrendingVideos(regionCode: string = 'US', categoryId?: string, maxResults: number = 10) {
    // Use enhanced service with circuit breaker + quota tracking + retry
    const result = await enhancedYoutubeService.execute({
      operation: 'videos.list',
      quotaCost: 1,
      fn: async () => {
        const response = await youtube.videos.list({
          part: ['snippet', 'statistics'],
          chart: 'mostPopular',
          regionCode,
          videoCategoryId: categoryId,
          maxResults,
          key: process.env.YOUTUBE_API_KEY,
        });

        return response.data.items?.map(video => ({
          title: video.snippet?.title || '',
          description: video.snippet?.description || '',
          category: video.snippet?.categoryId || '',
          platform: 'youtube',
          hotness: 'hot' as const,
          engagement: parseInt(video.statistics?.viewCount || '0'),
          hashtags: video.snippet?.tags || [],
          suggestion: `Create content similar to: ${video.snippet?.title}`,
          timeAgo: this.getTimeAgo(video.snippet?.publishedAt || undefined),
        })) || [];
      },
    });

    if (!result.success) {
      logger.error({
        errorType: result.error?.type,
        errorMessage: result.error?.message,
      }, 'Failed to fetch YouTube trending videos');
      return [];
    }

    return result.data || [];
  }

  private getTimeAgo(dateString?: string): string {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

export const youtubeService = new YouTubeService();
