// YouTube Data API v3 integration for ViralForgeAI
import { TrendResult } from "../ai/openrouter.js";
import { enhancedYoutubeService } from "../lib/enhancedYoutubeService";

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  tags?: string[];
}

export interface YouTubeAnalytics {
  channelId: string;
  totalViews: number;
  subscriberCount: number;
  videoCount: number;
  averageViewsPerVideo: number;
  topPerformingVideos: YouTubeVideo[];
}

export class YouTubeService {
  private readonly apiKey = process.env.YOUTUBE_API_KEY;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  async getTrendingVideos(
    regionCode: string = 'US',
    category: string = '0',
    maxResults: number = 25
  ): Promise<TrendResult[]> {
    console.log(`🎥 Fetching trending YouTube videos for region: ${regionCode}...`);

    if (!this.apiKey) {
      console.log('⚠️ No YouTube API key found, will use cached AI system');
      return [];
    }

    // Use enhanced service with circuit breaker + quota tracking + retry
    const result = await enhancedYoutubeService.execute({
      operation: 'videos.list',
      quotaCost: 1,
      fn: async () => {
        const url = `${this.baseUrl}/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&videoCategoryId=${category}&maxResults=${maxResults}&key=${this.apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          const error: any = new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
          error.status = response.status;
          error.response = { status: response.status, data };
          throw error;
        }

        const trends: TrendResult[] = data.items.map((video: any) => ({
          title: this.generateCreatorTitle(video.snippet.title),
          description: this.generateCreatorDescription(video.snippet.description),
          category: this.mapCategoryToCreatorNiche(video.snippet.categoryId),
          platform: 'youtube',
          hotness: this.calculateHotness(video.statistics),
          engagement: parseInt(video.statistics.viewCount) || 0,
          hashtags: this.extractHashtags(video.snippet.title, video.snippet.description, video.snippet.tags),
          suggestion: this.generateCreatorSuggestion(video),
          timeAgo: this.calculateTimeAgo(video.snippet.publishedAt),
          sound: this.suggestAudioForTrend(video.snippet.title)
        }));

        return trends;
      },
    });

    if (!result.success) {
      console.error('YouTube API error:', result.error);
      console.log('⚠️ YouTube API failed, will use cached AI system');
      return [];
    }

    console.log(`✅ Converted ${result.data?.length || 0} YouTube trending videos to creator trends`);
    return result.data || [];
  }

  async getChannelAnalytics(channelId: string): Promise<YouTubeAnalytics | null> {
    if (!this.apiKey) {
      console.log('⚠️ No YouTube API key found for analytics');
      return null;
    }

    try {
      // Get channel details using enhanced service
      const channelResult = await enhancedYoutubeService.execute({
        operation: 'channels.list',
        quotaCost: 1,
        fn: async () => {
          const channelUrl = `${this.baseUrl}/channels?part=snippet,statistics&id=${channelId}&key=${this.apiKey}`;
          const channelResponse = await fetch(channelUrl);
          const channelData = await channelResponse.json();

          if (!channelResponse.ok || !channelData.items?.length) {
            const error: any = new Error('Channel not found');
            error.status = channelResponse.status;
            error.response = { status: channelResponse.status, data: channelData };
            throw error;
          }

          return channelData.items[0];
        },
      });

      if (!channelResult.success) {
        console.error('YouTube channel fetch error:', channelResult.error);
        return null;
      }

      const channel = channelResult.data!;
      const stats = channel.statistics;

      // Get recent videos for performance analysis using enhanced service (EXPENSIVE: 100 quota units)
      const videosResult = await enhancedYoutubeService.execute({
        operation: 'search.list',
        quotaCost: 100, // WARNING: search.list is very expensive!
        fn: async () => {
          const videosUrl = `${this.baseUrl}/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&key=${this.apiKey}`;
          const videosResponse = await fetch(videosUrl);
          const videosData = await videosResponse.json();

          if (!videosResponse.ok) {
            const error: any = new Error(`YouTube search error: ${videosData.error?.message || 'Unknown error'}`);
            error.status = videosResponse.status;
            error.response = { status: videosResponse.status, data: videosData };
            throw error;
          }

          return videosData.items || [];
        },
      });

      if (!videosResult.success) {
        console.error('YouTube videos fetch error:', videosResult.error);
        // Return channel analytics without video data if search fails
        return {
          channelId,
          totalViews: parseInt(stats.viewCount) || 0,
          subscriberCount: parseInt(stats.subscriberCount) || 0,
          videoCount: parseInt(stats.videoCount) || 0,
          averageViewsPerVideo: Math.floor((parseInt(stats.viewCount) || 0) / (parseInt(stats.videoCount) || 1)),
          topPerformingVideos: []
        };
      }

      const allVideos: YouTubeVideo[] = videosResult.data!.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails,
        statistics: { viewCount: '0', likeCount: '0', commentCount: '0' }, // Would need separate API call
        tags: []
      }));

      // Select 1 video per week for better temporal distribution
      const videosByWeek = new Map<string, YouTubeVideo>();

      for (const video of allVideos) {
        const publishDate = new Date(video.publishedAt);
        // Get week identifier (year-weekNumber)
        const weekStart = new Date(publishDate);
        weekStart.setDate(publishDate.getDate() - publishDate.getDay()); // Start of week (Sunday)
        const weekKey = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;

        // Only keep first video of each week (most recent in that week)
        if (!videosByWeek.has(weekKey)) {
          videosByWeek.set(weekKey, video);
        }
      }

      // Convert map to array and take up to 5 videos (1 per week)
      const topVideos = Array.from(videosByWeek.values()).slice(0, 5);

      return {
        channelId,
        totalViews: parseInt(stats.viewCount) || 0,
        subscriberCount: parseInt(stats.subscriberCount) || 0,
        videoCount: parseInt(stats.videoCount) || 0,
        averageViewsPerVideo: Math.floor((parseInt(stats.viewCount) || 0) / (parseInt(stats.videoCount) || 1)),
        topPerformingVideos: topVideos
      };

    } catch (error) {
      console.error('YouTube analytics error:', error);
      return null;
    }
  }

  private generateCreatorTitle(originalTitle: string): string {
    // Transform trending video titles into actionable creator trends
    const patterns = [
      { from: /How to|How I/, to: 'Creator Tutorial: How to' },
      { from: /\d+ Things/, to: 'List Content Idea:' },
      { from: /React to|Reaction/, to: 'Reaction Video Trend:' },
      { from: /Review|Reviewing/, to: 'Review Content Format:' }
    ];

    let creatorTitle = originalTitle;
    for (const pattern of patterns) {
      if (pattern.from.test(originalTitle)) {
        creatorTitle = originalTitle.replace(pattern.from, pattern.to);
        break;
      }
    }

    return creatorTitle.slice(0, 100); // Keep titles manageable
  }

  private generateCreatorDescription(originalDesc: string): string {
    const words = originalDesc.split(' ').slice(0, 25).join(' ');
    return `Trending format spotted on YouTube: ${words}...`;
  }

  private mapCategoryToCreatorNiche(categoryId: string): string {
    const categoryMap: { [key: string]: string } = {
      '1': 'Film & Animation',
      '2': 'Autos & Vehicles', 
      '10': 'Music',
      '15': 'Pets & Animals',
      '17': 'Sports',
      '19': 'Travel & Events',
      '20': 'Gaming',
      '22': 'People & Blogs',
      '23': 'Comedy',
      '24': 'Entertainment',
      '25': 'News & Politics',
      '26': 'Howto & Style',
      '27': 'Education',
      '28': 'Science & Technology'
    };
    return categoryMap[categoryId] || 'Entertainment';
  }

  private calculateHotness(statistics: any): 'hot' | 'rising' | 'relevant' {
    const views = parseInt(statistics.viewCount) || 0;
    const likes = parseInt(statistics.likeCount) || 0;
    const engagement = views > 0 ? likes / views : 0;

    if (views > 1000000 && engagement > 0.05) return 'hot';
    if (views > 100000 && engagement > 0.03) return 'rising';
    return 'relevant';
  }

  private extractHashtags(title: string, description: string, tags?: string[]): string[] {
    const hashtagRegex = /#[\w]+/g;
    const titleHashtags = title.match(hashtagRegex) || [];
    const descHashtags = description.match(hashtagRegex) || [];
    
    const allHashtags = [...titleHashtags, ...descHashtags, ...(tags || [])]
      .map(tag => tag.replace('#', '').toLowerCase())
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .slice(0, 5);

    return allHashtags.length > 0 ? allHashtags : ['viral', 'trending', 'youtube'];
  }

  private generateCreatorSuggestion(video: any): string {
    const suggestions = [
      `Adapt this trending topic for your niche: "${video.snippet.title.slice(0, 50)}..." - add your unique perspective`,
      `This format is getting ${parseInt(video.statistics.viewCount).toLocaleString()} views. Create your version with better hooks`,
      `Trending opportunity: React to or build upon this concept with your expertise`,
      `High-engagement format spotted. Break this down into a series for maximum views`
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private calculateTimeAgo(publishedAt: string): string {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInHours = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  private suggestAudioForTrend(title: string): string | undefined {
    if (title.toLowerCase().includes('music') || title.toLowerCase().includes('song')) {
      return 'Trending Music Mix';
    }
    if (title.toLowerCase().includes('dance')) {
      return 'Viral Dance Beat';
    }
    return undefined;
  }

  private async generateAITrendingContent(): Promise<TrendResult[]> {
    // Fallback: Use existing AI trends as YouTube-inspired content
    return [
      {
        title: "YouTube Creator Economy 2025",
        description: "Analysis of what's working for creators right now on YouTube",
        category: "Education",
        platform: "youtube",
        hotness: "hot",
        engagement: 89000,
        hashtags: ["youtubecreator", "creator economy", "youtube2025"],
        suggestion: "Share insights about the current creator landscape and monetization strategies",
        timeAgo: "2h ago"
      }
    ];
  }

  // Health check for monitoring
  getProviderStatus(): { provider: string; available: boolean; cached: number } {
    return {
      provider: 'YouTube Data API v3',
      available: !!this.apiKey,
      cached: 0 // YouTube service doesn't implement caching yet
    };
  }
}

export const youtubeService = new YouTubeService();