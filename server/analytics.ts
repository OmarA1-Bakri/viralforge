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
}

export const analyticsService = new AnalyticsService();