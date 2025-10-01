import { storage } from '../storage';
import { OpenRouterService } from '../ai/openrouter';

export class WorkflowTriggers {
  private openRouterService: OpenRouterService;

  constructor() {
    this.openRouterService = new OpenRouterService();
  }

  // 6. Workflow triggers - auto-analyze when content is uploaded
  async onContentUploaded(userId: string, contentData: {
    title: string;
    description?: string;
    platform: string;
    contentType: 'text' | 'video' | 'image';
    filePath?: string;
  }) {
    console.log(`🔄 Auto-analyzing uploaded content for user ${userId}: ${contentData.title}`);

    try {
      // Automatically analyze content when uploaded
      if (contentData.contentType === 'text' || contentData.contentType === 'image') {
        const analysis = await this.openRouterService.analyzeContent({
          title: contentData.title,
          description: contentData.description || '',
          platform: contentData.platform,
          roastMode: false
        });

        // Create user content first to get contentId
        const content = await storage.createUserContent({
          userId,
          title: contentData.title,
          description: contentData.description,
          platform: contentData.platform,
          status: 'analyzing'
        });

        // Store analysis results
        await storage.createContentAnalysis({
          contentId: content.id,
          clickabilityScore: analysis.clickabilityScore,
          clarityScore: analysis.clarityScore,
          intrigueScore: analysis.intrigueScore,
          emotionScore: analysis.emotionScore,
          feedback: analysis.feedback,
          suggestions: analysis.suggestions
        });

        // Create activity log
        await storage.createUserActivity({
          userId,
          activityType: 'auto_analysis',
          title: `Auto-analyzed: ${contentData.title}`,
          status: 'completed',
          contentId: content.id,
          metadata: {
            contentType: contentData.contentType,
            platform: contentData.platform,
            overallScore: (analysis.clickabilityScore + analysis.clarityScore + 
                          analysis.intrigueScore + analysis.emotionScore) / 4,
            trigger: 'upload'
          }
        });

        console.log(`✅ Auto-analysis completed for: ${contentData.title}`);
        return analysis;
      }

      // For video content, queue for background processing
      if (contentData.contentType === 'video') {
        await this.onVideoUploaded(userId, contentData.title, contentData.filePath || '');
      }

    } catch (error) {
      console.error(`❌ Auto-analysis failed for ${contentData.title}:`, error);
      
      // Log the failure
      await storage.createUserActivity({
        userId,
        activityType: 'auto_analysis_failed',
        title: `Auto-analysis failed for: ${contentData.title}`,
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: contentData.contentType,
          trigger: 'upload'
        }
      });
    }
  }

  // Auto-process videos when uploaded
  async onVideoUploaded(userId: string, videoTitle: string, videoPath: string) {
    console.log(`🎬 Auto-processing uploaded video for user ${userId}: ${videoTitle}`);

    try {
      // Create processing job
      const job = await storage.createProcessingJob({
        userId,
        targetType: 'video_clip',
        targetId: null, // Will be set once video is processed
        jobType: 'generate_clips',
        status: 'pending'
      });

      // Create activity log
      await storage.createUserActivity({
        userId,
        activityType: 'video_queued',
        title: `Video queued for auto-processing: ${videoTitle}`,
        status: 'queued',
        metadata: {
          jobId: job.id,
          videoTitle,
          trigger: 'upload'
        }
      });

      console.log(`📋 Video processing job created: ${job.id}`);
      return job;

    } catch (error) {
      console.error(`❌ Failed to queue video processing:`, error);
    }
  }

  // Trigger when user saves/bookmarks a trend
  async onTrendSaved(userId: string, trendId: string, trendTitle: string) {
    console.log(`💡 User ${userId} saved trend: ${trendTitle}`);

    try {
      // Auto-generate content ideas based on saved trend
      const contentIdeas = await this.openRouterService.discoverTrends({
        platform: 'tiktok',
        category: 'all'
      });

      // Create activity with personalized suggestions
      await storage.createUserActivity({
        userId,
        activityType: 'trend_saved',
        title: `Saved trending idea: ${trendTitle}`,
        status: 'saved',
        metadata: {
          trendId,
          trendTitle,
          autoSuggestions: contentIdeas.length,
          trigger: 'trend_save'
        }
      });

      console.log(`✅ Trend save processed with auto-suggestions`);

    } catch (error) {
      console.error(`❌ Failed to process trend save:`, error);
    }
  }

  // Trigger performance alerts based on analytics
  async checkPerformanceAlerts(userId: string) {
    console.log(`📊 Checking performance alerts for user ${userId}`);

    try {
      const analytics = await storage.getUserAnalytics(userId);
      const recentAnalytics = analytics.filter(a => {
        const hoursSinceCreated = (Date.now() - (a.recordedAt?.getTime() || 0)) / (1000 * 60 * 60);
        return hoursSinceCreated <= 24; // Last 24 hours
      });

      if (recentAnalytics.length === 0) return;

      // Calculate performance metrics
      const totalViews = recentAnalytics.reduce((sum, a) => sum + a.views, 0);
      const avgClickRate = recentAnalytics.reduce((sum, a) => sum + (a.clickRate || 0), 0) / recentAnalytics.length;

      // Performance alerts
      const alerts = [];

      // High performance alert
      if (totalViews > 10000 && avgClickRate > 8) {
        alerts.push({
          type: 'high_performance',
          message: `🚀 Exceptional performance! ${totalViews.toLocaleString()} views with ${avgClickRate.toFixed(1)}% click rate`,
          priority: 'high'
        });
      }

      // Low performance alert
      if (totalViews < 100 && recentAnalytics.length > 0) {
        alerts.push({
          type: 'low_performance', 
          message: `📉 Content underperforming. Consider trying trending topics or optimizing posting times`,
          priority: 'medium'
        });
      }

      // Viral potential alert
      if (avgClickRate > 12) {
        alerts.push({
          type: 'viral_potential',
          message: `🔥 Viral potential detected! Your content is getting ${avgClickRate.toFixed(1)}% click rate`,
          priority: 'high'
        });
      }

      // Create alert activities
      for (const alert of alerts) {
        await storage.createUserActivity({
          userId,
          activityType: 'performance_alert',
          title: alert.message,
          status: 'active',
          metadata: {
            alertType: alert.type,
            priority: alert.priority,
            totalViews,
            avgClickRate,
            trigger: 'performance_check'
          }
        });
      }

      if (alerts.length > 0) {
        console.log(`🚨 Created ${alerts.length} performance alerts for user ${userId}`);
      }

    } catch (error) {
      console.error(`❌ Performance alert check failed:`, error);
    }
  }
}

// Export singleton instance
export const workflowTriggers = new WorkflowTriggers();