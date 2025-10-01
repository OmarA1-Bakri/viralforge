import { storage } from '../storage';

export interface NotificationData {
  userId: string;
  type: 'trending_alert' | 'performance_alert' | 'auto_analysis' | 'video_processed' | 'trend_report';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export class NotificationService {
  
  // Send push notification to user
  async sendNotification(notification: NotificationData) {
    console.log(`🔔 Sending notification to user ${notification.userId}: ${notification.title}`);

    try {
      // Store notification in activity log
      await storage.createUserActivity({
        userId: notification.userId,
        activityType: notification.type,
        title: notification.title,
        status: 'sent',
        metadata: {
          ...notification.metadata,
          notificationSent: true,
          priority: notification.priority,
          timestamp: new Date().toISOString()
        }
      });

      // TODO: Integrate with push notification service (Firebase, etc.)
      // For now, we'll use the activity system as notifications
      console.log(`✅ Notification stored for user ${notification.userId}`);

    } catch (error) {
      console.error(`❌ Failed to send notification:`, error);
    }
  }

  // Send trending opportunity alerts
  async sendTrendingAlert(userId: string, trends: any[]) {
    const hotTrends = trends.filter(t => t.engagement > 15000);
    
    if (hotTrends.length > 0) {
      await this.sendNotification({
        userId,
        type: 'trending_alert',
        title: '🔥 Hot Trends Detected!',
        message: `${hotTrends.length} viral trends discovered with high engagement potential`,
        priority: 'high',
        metadata: {
          trendsCount: hotTrends.length,
          topTrend: hotTrends[0]?.title,
          maxEngagement: Math.max(...hotTrends.map(t => t.engagement))
        }
      });
    }
  }

  // Send performance alerts
  async sendPerformanceAlert(userId: string, alertType: string, metrics: any) {
    const messages = {
      high_performance: '🚀 Your content is performing exceptionally well!',
      low_performance: '📉 Content underperforming - consider trending topics',
      viral_potential: '🔥 Viral potential detected in your recent content!'
    };

    await this.sendNotification({
      userId,
      type: 'performance_alert',
      title: 'Performance Update',
      message: messages[alertType as keyof typeof messages] || 'Performance update available',
      priority: alertType === 'viral_potential' ? 'high' : 'medium',
      metadata: {
        alertType,
        ...metrics
      }
    });
  }

  // Send daily trend report notification
  async sendTrendReport(userId: string, reportData: any) {
    await this.sendNotification({
      userId,
      type: 'trend_report',
      title: '📊 Daily Trend Report',
      message: `Your daily trends: ${reportData.tiktokTrends + reportData.youtubeTrends} new opportunities discovered`,
      priority: 'medium',
      metadata: reportData
    });
  }

  // Send auto-analysis completion notification
  async sendAnalysisComplete(userId: string, contentTitle: string, score: number) {
    const emoji = score >= 8 ? '🎯' : score >= 6 ? '👍' : '💡';
    
    await this.sendNotification({
      userId,
      type: 'auto_analysis',
      title: `${emoji} Content Analysis Complete`,
      message: `"${contentTitle}" scored ${score.toFixed(1)}/10 - check your dashboard for details`,
      priority: score >= 8 ? 'high' : 'low',
      metadata: {
        contentTitle,
        overallScore: score,
        analysisType: 'automatic'
      }
    });
  }

  // Send video processing completion notification
  async sendVideoProcessed(userId: string, videoTitle: string, clipsGenerated: number) {
    await this.sendNotification({
      userId,
      type: 'video_processed',
      title: '🎬 Video Processing Complete',
      message: `"${videoTitle}" processed into ${clipsGenerated} viral clips ready for download`,
      priority: 'medium',
      metadata: {
        videoTitle,
        clipsGenerated,
        processingType: 'automatic'
      }
    });
  }

  // Get user notifications (from activity log)
  async getUserNotifications(userId: string, limit: number = 20) {
    try {
      const activities = await storage.getUserActivity(userId);
      
      // Filter activities that are notifications
      const notifications = activities
        .filter(a => (a.metadata as any)?.notificationSent === true)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, limit);

      return notifications.map(activity => ({
        id: activity.id,
        type: activity.activityType,
        title: this.getNotificationTitle(activity.activityType),
        message: activity.title,
        priority: (activity.metadata as any)?.priority || 'medium',
        timestamp: activity.createdAt,
        metadata: activity.metadata
      }));

    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return [];
    }
  }

  private getNotificationTitle(type: string): string {
    const titles = {
      trending_alert: '🔥 Trending Alert',
      performance_alert: '📊 Performance Update',
      auto_analysis: '🎯 Analysis Complete',
      video_processed: '🎬 Video Ready',
      trend_report: '📈 Trend Report'
    };
    return titles[type as keyof typeof titles] || 'Notification';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();