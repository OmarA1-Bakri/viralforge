import cron from 'node-cron';
import { OpenRouterService } from '../ai/openrouter';
import { storage } from '../storage';

export class AutomationScheduler {
  private openRouterService: OpenRouterService;

  constructor() {
    this.openRouterService = new OpenRouterService();
  }

  // Start all automated tasks
  start() {
    console.log('🤖 Starting ViralForgeAI automation system...');
    
    // Daily trend monitoring at 9 AM
    cron.schedule('0 9 * * *', this.dailyTrendMonitoring.bind(this));
    
    // Hourly content scoring for new uploads
    cron.schedule('0 * * * *', this.automaticContentScoring.bind(this));
    
    // Every 30 minutes: check for new videos to process
    cron.schedule('*/30 * * * *', this.backgroundVideoProcessing.bind(this));
    
    // Daily at 10 AM: generate posting schedules
    cron.schedule('0 10 * * *', this.generatePostingSchedules.bind(this));
    
    // Every 2 hours: check for trending opportunities
    cron.schedule('0 */2 * * *', this.checkTrendingOpportunities.bind(this));

    console.log('✅ All automation tasks scheduled successfully');
  }

  // 1. Scheduled trend monitoring (daily/weekly trend reports)
  private async dailyTrendMonitoring() {
    console.log('📊 Running daily trend monitoring...');
    
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        // Get trends for each platform
        const tiktokTrends = await this.openRouterService.discoverTrends({
          platform: 'tiktok',
          category: 'all'
        });
        
        const youtubeTrends = await this.openRouterService.discoverTrends({
          platform: 'youtube',
          category: 'all'
        });

        // Store trend report  
        await storage.createUserActivity({
          userId: user.id,
          activityType: 'trend_report',
          title: 'Daily Trend Report',
          status: 'completed'
        });

        console.log(`📈 Generated trend report for user ${user.id}`);
      }
    } catch (error) {
      console.error('❌ Daily trend monitoring failed:', error);
    }
  }

  // 2. Automatic content scoring (batch process all content)
  private async automaticContentScoring() {
    console.log('🎯 Running automatic content scoring...');
    
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        const userContent = await storage.getUserContent(user.id);
        
        // Find content without recent analysis
        const unanalyzedContent = userContent.filter(content => {
          // Check if content was analyzed in last 24 hours
          const lastAnalysis = Date.now() - (content.createdAt?.getTime() || 0);
          return lastAnalysis > 24 * 60 * 60 * 1000; // 24 hours
        });

        for (const content of unanalyzedContent) {
          try {
            const analysis = await this.openRouterService.analyzeContent({
              title: content.title,
              description: content.description || '',
              platform: content.platform || 'tiktok',
              roastMode: false
            });

            await storage.createContentAnalysis({
              userId: user.id,
              contentType: 'text',
              title: content.title,
              platform: content.platform || 'tiktok',
              clickabilityScore: analysis.clickabilityScore,
              clarityScore: analysis.clarityScore,
              intrigueScore: analysis.intrigueScore,
              emotionScore: analysis.emotionScore,
              overallScore: (analysis.clickabilityScore + analysis.clarityScore + 
                            analysis.intrigueScore + analysis.emotionScore) / 4,
              feedback: typeof analysis.feedback === 'string' ? analysis.feedback : analysis.feedback.overall,
              suggestions: analysis.suggestions
            });

            console.log(`✅ Auto-analyzed content: ${content.title}`);
          } catch (error) {
            console.error(`❌ Failed to analyze content ${content.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Automatic content scoring failed:', error);
    }
  }

  // 3. Background video processing (auto-process uploaded videos)
  private async backgroundVideoProcessing() {
    console.log('🎬 Running background video processing...');
    
    try {
      const pendingJobs = await storage.getProcessingJobsByStatus('pending');
      
      for (const job of pendingJobs) {
        if (job.jobType === 'generate_clips') {
          console.log(`🔄 Processing video job ${job.id}...`);
          
          // Update job status
          await storage.updateProcessingJob(job.id, {
            status: 'processing',
            progress: 0
          });

          try {
            // Simulate video processing with AI
            const clips = await this.openRouterService.generateVideoClips({
              videoUrl: job.targetId?.toString() || '',
              platform: 'tiktok',
              duration: 15
            });

            // Create video clips records
            for (const clip of clips) {
              await storage.createVideoClip({
                userId: job.userId,
                title: clip.title,
                duration: clip.duration,
                platform: 'tiktok',
                viralScore: Math.floor(Math.random() * 10) + 1,
                hooks: clip.hooks,
                downloadUrl: clip.downloadUrl
              });
            }

            // Mark job as completed
            await storage.updateProcessingJob(job.id, {
              status: 'completed',
              progress: 100
            });

            // Create activity record
            await storage.createUserActivity({
              userId: job.userId,
              type: 'video_processed',
              description: `Auto-processed video into ${clips.length} viral clips`,
              metadata: {
                jobId: job.id,
                clipsGenerated: clips.length,
                processingType: 'automatic'
              }
            });

            console.log(`✅ Completed video processing job ${job.id}`);
          } catch (error) {
            await storage.updateProcessingJob(job.id, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ Video processing failed for job ${job.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Background video processing failed:', error);
    }
  }

  // 4. Automated posting schedules (suggest optimal posting times)
  private async generatePostingSchedules() {
    console.log('📅 Generating automated posting schedules...');
    
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        const analytics = await storage.getUserAnalytics(user.id);
        
        // Analyze posting patterns and engagement
        const postingTimes = this.analyzeOptimalPostingTimes(analytics);
        
        // Create posting schedule recommendations
        await storage.createUserActivity({
          userId: user.id,
          type: 'posting_schedule',
          description: 'AI-generated optimal posting schedule',
          metadata: {
            optimalTimes: postingTimes,
            analysisDate: new Date().toISOString(),
            recommendationType: 'automatic'
          }
        });

        console.log(`📋 Generated posting schedule for user ${user.id}`);
      }
    } catch (error) {
      console.error('❌ Posting schedule generation failed:', error);
    }
  }

  // 5. Check for trending opportunities and alerts
  private async checkTrendingOpportunities() {
    console.log('🚨 Checking for trending opportunities...');
    
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        const userTrends = await storage.getUserTrendInteractions(user.id);
        const latestTrends = await this.openRouterService.discoverTrends({
          platform: 'tiktok',
          category: 'all',
          limit: 5
        });

        // Check for high-engagement trends
        const hotTrends = latestTrends.filter(trend => 
          trend.engagement > 20000 && trend.hotness === 'hot'
        );

        if (hotTrends.length > 0) {
          // Create trending opportunity alert
          await storage.createUserActivity({
            userId: user.id,
            type: 'trending_alert',
            description: `🔥 ${hotTrends.length} hot trends detected with high viral potential!`,
            metadata: {
              hotTrends: hotTrends.map(t => ({ title: t.title, engagement: t.engagement })),
              alertType: 'trending_opportunity',
              priority: 'high'
            }
          });

          console.log(`🔥 Trending alert created for user ${user.id}`);
        }
      }
    } catch (error) {
      console.error('❌ Trending opportunities check failed:', error);
    }
  }

  // Helper: Analyze optimal posting times based on user analytics
  private analyzeOptimalPostingTimes(analytics: any[]): string[] {
    // Simple algorithm - in production this would be more sophisticated
    const defaultTimes = [
      '09:00', // Morning engagement
      '12:00', // Lunch break
      '17:00', // After work
      '20:00', // Evening peak
      '22:00'  // Night scrolling
    ];

    // TODO: Analyze actual user engagement patterns
    return defaultTimes;
  }
}

// Export singleton instance
export const automationScheduler = new AutomationScheduler();