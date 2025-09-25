// TikTok Research API integration for ViralForgeAI
import { TrendResult } from "../ai/openrouter.js";

export interface TikTokHashtag {
  hashtag: string;
  views: number;
  posts: number;
  trending: boolean;
}

export interface TikTokSound {
  id: string;
  title: string;
  author: string;
  duration: number;
  usageCount: number;
}

export interface TikTokTrend {
  id: string;
  hashtag: string;
  description: string;
  videoCount: number;
  viewCount: number;
  trending: boolean;
  region: string;
}

export class TikTokService {
  private readonly apiKey = process.env.TIKTOK_API_KEY;
  private readonly baseUrl = 'https://open.tiktokapis.com/v2';

  async getTrendingHashtags(region: string = 'US', limit: number = 20): Promise<TrendResult[]> {
    console.log(`🎵 Fetching trending TikTok hashtags for region: ${region}...`);
    
    // Debug TikTok API key detection
    console.log("🔧 TikTok Debug: API Key exists:", !!this.apiKey);
    console.log("🔧 TikTok Debug: API Key length:", this.apiKey?.length);
    console.log("🔧 TikTok Debug: Raw env var:", !!process.env.TIKTOK_API_KEY);

    if (!this.apiKey) {
      console.log('⚠️ No TikTok API key found, will use cached AI system');
      return [];
    }

    try {
      // Note: This is a simplified version - actual TikTok API structure may differ
      const response = await fetch(`${this.baseUrl}/research/trending/hashtags`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`TikTok API error: ${data.error?.message || 'Unknown error'}`);
      }

      const trends: TrendResult[] = data.data?.map((hashtag: any) => ({
        title: this.generateTrendTitle(hashtag.hashtag_name),
        description: this.generateTrendDescription(hashtag.hashtag_name, hashtag.video_count),
        category: this.categorizeTrend(hashtag.hashtag_name),
        platform: 'tiktok',
        hotness: this.calculateHotness(hashtag.video_count, hashtag.view_count),
        engagement: hashtag.view_count || 0,
        hashtags: this.generateRelatedHashtags(hashtag.hashtag_name),
        sound: this.suggestSoundForHashtag(hashtag.hashtag_name),
        suggestion: this.generateCreatorSuggestion(hashtag),
        timeAgo: this.calculateTimeAgo(hashtag.updated_at)
      })) || [];

      console.log(`✅ Converted ${trends.length} TikTok trending hashtags to creator trends`);
      return trends;

    } catch (error) {
      console.error('TikTok API error:', error);
      console.log('⚠️ TikTok API failed, will use cached AI system');
      return [];
    }
  }

  async getTrendingSounds(region: string = 'US', limit: number = 15): Promise<TikTokSound[]> {
    if (!this.apiKey) {
      console.log('⚠️ No TikTok API key found for trending sounds');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/research/trending/sounds`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch trending sounds');
      }

      return data.data?.map((sound: any) => ({
        id: sound.sound_id,
        title: sound.title,
        author: sound.author,
        duration: sound.duration,
        usageCount: sound.usage_count
      })) || [];

    } catch (error) {
      console.error('TikTok sounds error:', error);
      return [];
    }
  }

  async getHashtagAnalytics(hashtag: string): Promise<TikTokHashtag | null> {
    if (!this.apiKey) {
      console.log('⚠️ No TikTok API key found for hashtag analytics');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/research/hashtag/analytics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hashtag_name: hashtag,
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch hashtag analytics');
      }

      return {
        hashtag: hashtag,
        views: data.data?.view_count || 0,
        posts: data.data?.video_count || 0,
        trending: data.data?.trending || false
      };

    } catch (error) {
      console.error('TikTok hashtag analytics error:', error);
      return null;
    }
  }

  private generateTrendTitle(hashtag: string): string {
    const prefixes = [
      'TikTok Trend:',
      'Viral Challenge:',
      'Trending Audio:',
      'Creator Opportunity:',
      'Viral Format:'
    ];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const cleanHashtag = hashtag.replace('#', '').replace(/([A-Z])/g, ' $1').trim();
    return `${prefix} ${cleanHashtag}`;
  }

  private generateTrendDescription(hashtag: string, videoCount: number): string {
    const descriptions = [
      `The #${hashtag} trend is exploding with ${videoCount?.toLocaleString() || 'thousands of'} creators joining in`,
      `Viral opportunity: #${hashtag} is trending with massive engagement potential`,
      `Join the #${hashtag} movement - creators are seeing incredible reach`,
      `Hot trend alert: #${hashtag} is perfect for your niche with proven viral potential`
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private categorizeTrend(hashtag: string): string {
    const categories: { [key: string]: string } = {
      'dance': 'Dance',
      'comedy': 'Comedy',
      'food': 'Food',
      'diy': 'DIY',
      'fashion': 'Fashion',
      'fitness': 'Fitness',
      'pet': 'Animals',
      'music': 'Music',
      'art': 'Art',
      'tech': 'Technology',
      'travel': 'Travel',
      'life': 'Lifestyle'
    };

    const hashtagLower = hashtag.toLowerCase();
    for (const keyword in categories) {
      if (hashtagLower.includes(keyword)) {
        return categories[keyword];
      }
    }
    
    return 'Entertainment';
  }

  private calculateHotness(videoCount: number, viewCount: number): 'hot' | 'rising' | 'relevant' {
    if (!videoCount || !viewCount) return 'relevant';
    
    const avgViewsPerVideo = viewCount / videoCount;
    
    if (videoCount > 10000 && avgViewsPerVideo > 100000) return 'hot';
    if (videoCount > 1000 && avgViewsPerVideo > 50000) return 'rising';
    return 'relevant';
  }

  private generateRelatedHashtags(mainHashtag: string): string[] {
    const base = mainHashtag.replace('#', '').toLowerCase();
    const common = ['fyp', 'viral', 'trending', 'foryou'];
    const related = [base, `${base}challenge`, `${base}trend`, ...common];
    
    return related.slice(0, 4);
  }

  private suggestSoundForHashtag(hashtag: string): string | undefined {
    const soundSuggestions: { [key: string]: string } = {
      'dance': 'Trending Dance Beat',
      'comedy': 'Funny Sound Effect',
      'transition': 'Smooth Transition Audio',
      'aesthetic': 'Aesthetic Vibes Sound',
      'workout': 'High Energy Workout Music'
    };

    const hashtagLower = hashtag.toLowerCase();
    for (const keyword in soundSuggestions) {
      if (hashtagLower.includes(keyword)) {
        return soundSuggestions[keyword];
      }
    }

    return 'Trending TikTok Audio';
  }

  private generateCreatorSuggestion(hashtag: any): string {
    const suggestions = [
      `Join this trending hashtag with your unique spin - timing is perfect for maximum reach`,
      `This trend has ${hashtag.video_count?.toLocaleString() || 'massive'} videos but room for your perspective`,
      `Viral opportunity: Put your own creative twist on this trending format`,
      `Perfect trend for your niche - adapt the concept to showcase your expertise`,
      `Trending window is open: Create your version of this format while it's hot`
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private calculateTimeAgo(updatedAt: string): string {
    if (!updatedAt) return 'Recently trending';
    
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffInHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    return `${days}d ago`;
  }

  private async generateAITrendingContent(): Promise<TrendResult[]> {
    // Fallback: Generate TikTok-style trending content
    return [
      {
        title: "TikTok Creator Strategy 2025",
        description: "Latest tactics for going viral on TikTok with authentic content",
        category: "Education", 
        platform: "tiktok",
        hotness: "hot",
        engagement: 156000,
        hashtags: ["tiktokcreator", "viral", "contentcreator", "fyp"],
        sound: "Trending Strategy Audio",
        suggestion: "Share your best TikTok growth tips with proven results and examples",
        timeAgo: "1h ago"
      }
    ];
  }
}

export const tiktokService = new TikTokService();