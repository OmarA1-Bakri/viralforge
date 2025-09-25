import { storage } from "./storage";

export interface DashboardStats {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  videosCreated: number;
  trendsUsed: number;
  avgClickRate: number;
  weeklyGrowth: number;
  automationSavings: string;
  avgViralScore: number;
  totalClips: number;
}

export interface PerformanceInsights {
  bestContentType: string;
  optimalPostingTime: string;
  topTrendingHashtag: string;
  bestPlatform: string;
  avgEngagementRate: number;
}

export interface AnalyticsTimeframe {
  period: 'week' | 'month' | 'year';
  days: number;
}

export class AnalyticsService {
  private getTimeframeDays(timeframe: 'week' | 'month' | 'year'): number {
    switch (timeframe) {
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 7;
    }
  }

  private getDateRange(timeframe: 'week' | 'month' | 'year'): Date {
    const days = this.getTimeframeDays(timeframe);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
  }

  async calculateDashboardStats(
    userId: string, 
    timeframe: 'week' | 'month' | 'year' = 'week'
  ): Promise<DashboardStats> {
    const cutoffDate = this.getDateRange(timeframe);

    try {
      // Get all user data
      const [
        userAnalytics,
        userContent,
        contentAnalyses,
        videoClips,
        userTrendInteractions,
        userActivity
      ] = await Promise.all([
        storage.getUserAnalytics(userId),
        storage.getUserContent(userId),
        storage.getContentAnalysisByUserId(userId),
        storage.getVideoClipsByUserId(userId),
        storage.getUserTrendInteractions(userId),
        storage.getUserActivity(userId)
      ]);

      // Filter data by timeframe
      const recentAnalytics = userAnalytics.filter(a => 
        a.recordedAt && a.recordedAt >= cutoffDate
      );
      const recentContent = userContent.filter(c => 
        c.createdAt && c.createdAt >= cutoffDate
      );
      const recentActivity = userActivity.filter(a => 
        a.createdAt && a.createdAt >= cutoffDate
      );

      // Calculate totals
      const totalViews = recentAnalytics.reduce((sum, a) => sum + a.views, 0);
      const totalLikes = recentAnalytics.reduce((sum, a) => sum + a.likes, 0);
      const totalShares = recentAnalytics.reduce((sum, a) => sum + a.shares, 0);
      
      const videosCreated = recentContent.length;
      
      const trendsUsed = userTrendInteractions
        .filter(ut => ut.action === 'used' && ut.createdAt >= cutoffDate)
        .length;

      // Calculate average click rate
      const clickRates = recentAnalytics
        .filter(a => a.clickRate !== null && a.clickRate !== undefined)
        .map(a => a.clickRate!);
      const avgClickRate = clickRates.length > 0 
        ? clickRates.reduce((sum, rate) => sum + rate, 0) / clickRates.length
        : 0;

      // Calculate viral scores (apply timeframe filter)
      const recentClips = videoClips.filter(c => 
        c.createdAt && c.createdAt >= cutoffDate
      );
      const viralScores = recentClips
        .filter(c => c.viralScore !== null && c.viralScore !== undefined)
        .map(c => c.viralScore!);
      const avgViralScore = viralScores.length > 0
        ? viralScores.reduce((sum, score) => sum + score, 0) / viralScores.length
        : 0;

      const totalClips = recentClips.length;

      // Calculate weekly growth (mock calculation based on activity)
      const weeklyGrowth = recentActivity.length > 0 
        ? Math.min(50, Math.max(0, recentActivity.length * 2.5)) // Mock growth calculation
        : 0;

      // Calculate automation savings based on activities
      const activitiesCount = recentActivity.length;
      const savedMinutes = activitiesCount * 15; // Assume 15 minutes saved per AI action
      const hours = Math.floor(savedMinutes / 60);
      const minutes = savedMinutes % 60;
      const automationSavings = `${hours}h ${minutes}m`;

      console.log(`📊 Analytics calculated for ${userId} (${timeframe}):`, {
        totalViews,
        videosCreated,
        avgClickRate: avgClickRate.toFixed(1),
        totalClips
      });

      return {
        totalViews,
        totalLikes,
        totalShares,
        videosCreated,
        trendsUsed,
        avgClickRate: Math.round(avgClickRate * 10) / 10,
        weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
        automationSavings,
        avgViralScore: Math.round(avgViralScore * 10) / 10,
        totalClips
      };

    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      
      // Return fallback stats
      return {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        videosCreated: 0,
        trendsUsed: 0,
        avgClickRate: 0,
        weeklyGrowth: 0,
        automationSavings: "0h 0m",
        avgViralScore: 0,
        totalClips: 0
      };
    }
  }

  async generateMockAnalyticsData(userId: string): Promise<void> {
    console.log('🔧 Generating mock analytics data for comprehensive dashboard demo...');

    try {
      // Generate mock user analytics for different periods
      const platforms = ['youtube', 'tiktok', 'instagram'];
      const analyticsData = [];

      for (let i = 0; i < 10; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const recordDate = new Date();
        recordDate.setDate(recordDate.getDate() - daysAgo);

        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        
        analyticsData.push({
          userId,
          contentId: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : null,
          platform,
          views: Math.floor(Math.random() * 10000) + 100,
          likes: Math.floor(Math.random() * 500) + 10,
          shares: Math.floor(Math.random() * 100) + 1,
          comments: Math.floor(Math.random() * 50) + 1,
          clickRate: Math.random() * 15 + 2, // 2-17% click rate
        });
      }

      // Store mock analytics with proper timestamps
      for (const data of analyticsData) {
        const daysAgo = Math.floor(Math.random() * 30);
        const recordDate = new Date();
        recordDate.setDate(recordDate.getDate() - daysAgo);
        
        await storage.createUserAnalytics({
          ...data,
          recordedAt: recordDate
        });
      }

      console.log(`✅ Generated ${analyticsData.length} mock analytics records`);

    } catch (error) {
      console.error('Error generating mock analytics data:', error);
    }
  }

  async seedAnalyticsIfNeeded(userId: string): Promise<void> {
    const existingAnalytics = await storage.getUserAnalytics(userId);
    
    if (existingAnalytics.length === 0) {
      console.log('📈 No analytics data found, seeding mock data for demo...');
      await this.generateMockAnalyticsData(userId);
    }
  }

  async calculatePerformanceInsights(
    userId: string, 
    timeframe: 'week' | 'month' | 'year' = 'week'
  ): Promise<PerformanceInsights> {
    const cutoffDate = this.getDateRange(timeframe);

    try {
      // Get user data
      const [
        userAnalytics,
        userContent,
        userTrendInteractions,
        contentAnalyses
      ] = await Promise.all([
        storage.getUserAnalytics(userId),
        storage.getUserContent(userId),
        storage.getUserTrendInteractions(userId),
        storage.getContentAnalysisByUserId(userId)
      ]);

      // Filter by timeframe
      const recentAnalytics = userAnalytics.filter(a => 
        a.recordedAt && a.recordedAt >= cutoffDate
      );
      const recentContent = userContent.filter(c => 
        c.createdAt && c.createdAt >= cutoffDate
      );
      const recentTrends = userTrendInteractions.filter(ut => 
        ut.createdAt >= cutoffDate
      );

      // Calculate best performing content type
      const contentByCategory = new Map<string, { totalViews: number, count: number }>();
      
      for (const content of recentContent) {
        // Get analytics for this content
        const contentAnalytics = recentAnalytics.filter(a => a.contentId === content.id);
        const totalViews = contentAnalytics.reduce((sum, a) => sum + a.views, 0);
        
        // Infer category from title/platform
        const category = this.inferContentCategory(content.title, content.platform);
        
        if (!contentByCategory.has(category)) {
          contentByCategory.set(category, { totalViews: 0, count: 0 });
        }
        
        const existing = contentByCategory.get(category)!;
        existing.totalViews += totalViews;
        existing.count += 1;
      }

      // Find best performing category by average views
      let bestContentType = 'Mixed Content';
      let bestAvgViews = 0;
      
      for (const [category, data] of contentByCategory) {
        const avgViews = data.count > 0 ? data.totalViews / data.count : 0;
        if (avgViews > bestAvgViews) {
          bestAvgViews = avgViews;
          bestContentType = category;
        }
      }

      // Calculate optimal posting time
      const postingHours = new Map<number, number>();
      
      for (const content of recentContent) {
        if (content.createdAt) {
          const hour = content.createdAt.getHours();
          const contentAnalytics = recentAnalytics.filter(a => a.contentId === content.id);
          const engagement = contentAnalytics.reduce((sum, a) => sum + a.likes + a.shares, 0);
          
          postingHours.set(hour, (postingHours.get(hour) || 0) + engagement);
        }
      }

      // Find best performing hour
      let optimalHour = 18; // Default
      let bestEngagement = 0;
      
      for (const [hour, engagement] of postingHours) {
        if (engagement > bestEngagement) {
          bestEngagement = engagement;
          optimalHour = hour;
        }
      }

      const optimalPostingTime = optimalHour < 12 
        ? `${optimalHour}:00 AM` 
        : optimalHour === 12 
          ? '12:00 PM' 
          : `${optimalHour - 12}:00 PM`;

      // Find top trending hashtag from saved trends
      const savedTrends = recentTrends.filter(ut => ut.action === 'saved' || ut.action === 'used');
      const hashtagCounts = new Map<string, number>();
      
      for (const userTrend of savedTrends) {
        const trend = await storage.getTrend(userTrend.trendId);
        if (trend && trend.hashtags) {
          // Extract hashtags from the trend
          const hashtags = Array.isArray(trend.hashtags) ? trend.hashtags : [];
          for (const hashtag of hashtags) {
            hashtagCounts.set(hashtag, (hashtagCounts.get(hashtag) || 0) + 1);
          }
        }
      }

      let topTrendingHashtag = '#trending';
      let maxCount = 0;
      
      for (const [hashtag, count] of hashtagCounts) {
        if (count > maxCount) {
          maxCount = count;
          topTrendingHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
        }
      }

      // Calculate best platform
      const platformPerformance = new Map<string, number>();
      
      for (const analytics of recentAnalytics) {
        const views = analytics.views || 0;
        platformPerformance.set(analytics.platform, (platformPerformance.get(analytics.platform) || 0) + views);
      }

      let bestPlatform = 'TikTok';
      let maxPlatformViews = 0;
      
      for (const [platform, views] of platformPerformance) {
        if (views > maxPlatformViews) {
          maxPlatformViews = views;
          bestPlatform = platform;
        }
      }

      // Calculate average engagement rate
      const totalViews = recentAnalytics.reduce((sum, a) => sum + a.views, 0);
      const totalEngagement = recentAnalytics.reduce((sum, a) => sum + a.likes + a.shares + (a.comments || 0), 0);
      const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

      console.log(`💡 Performance insights calculated for ${userId} (${timeframe}):`, {
        bestContentType,
        optimalPostingTime,
        topTrendingHashtag,
        bestPlatform
      });

      return {
        bestContentType,
        optimalPostingTime,
        topTrendingHashtag,
        bestPlatform: this.formatPlatformName(bestPlatform),
        avgEngagementRate: Math.round(avgEngagementRate * 10) / 10
      };

    } catch (error) {
      console.error('Error calculating performance insights:', error);
      
      // Return fallback insights
      return {
        bestContentType: 'Mixed Content',
        optimalPostingTime: '6-8 PM',
        topTrendingHashtag: '#viral',
        bestPlatform: 'TikTok',
        avgEngagementRate: 0
      };
    }
  }

  private inferContentCategory(title: string | null, platform: string): string {
    if (!title) return 'General';
    
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('pet') || lowerTitle.includes('dog') || lowerTitle.includes('cat')) return 'Pets & Animals';
    if (lowerTitle.includes('food') || lowerTitle.includes('cook') || lowerTitle.includes('recipe')) return 'Food & Cooking';
    if (lowerTitle.includes('dance') || lowerTitle.includes('music')) return 'Music & Dance';
    if (lowerTitle.includes('diy') || lowerTitle.includes('hack') || lowerTitle.includes('tip')) return 'DIY & Hacks';
    if (lowerTitle.includes('comedy') || lowerTitle.includes('funny') || lowerTitle.includes('joke')) return 'Comedy';
    if (lowerTitle.includes('learn') || lowerTitle.includes('how to') || lowerTitle.includes('tutorial')) return 'Education';
    if (lowerTitle.includes('lifestyle') || lowerTitle.includes('day in')) return 'Lifestyle';
    if (lowerTitle.includes('fashion') || lowerTitle.includes('style') || lowerTitle.includes('outfit')) return 'Fashion & Style';
    if (lowerTitle.includes('fitness') || lowerTitle.includes('workout') || lowerTitle.includes('health')) return 'Fitness & Health';
    if (lowerTitle.includes('tech') || lowerTitle.includes('ai') || lowerTitle.includes('app')) return 'Technology';
    
    return 'General';
  }

  private formatPlatformName(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'tiktok': return 'TikTok';
      case 'youtube': return 'YouTube';
      case 'instagram': return 'Instagram';
      default: return platform;
    }
  }
}

export const analyticsService = new AnalyticsService();