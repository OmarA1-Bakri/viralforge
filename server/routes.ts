import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openRouterService } from "./ai/openrouter";
import { simplifiedAICache } from "./ai/simplifiedCache";
import { analyticsService } from "./analytics";
import { youtubeService } from "./platforms/youtube";
import { tiktokService } from "./platforms/tiktok";
import { analyzeSuccessPatterns, getUserPreferences, filterTrendsByPreferences } from "./preferences";
import { insertTrendSchema, insertUserTrendsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Idea Lab Routes - AI Trend Discovery

  // Discover trends using AI
  app.post("/api/trends/discover", async (req, res) => {
    try {
      const { platform, category, contentType, targetAudience } = req.body;
      
      if (!platform) {
        return res.status(400).json({ error: "Platform is required" });
      }

      console.log(`🔍 Discovering trends for ${platform}...`);
      
      // Use platform-specific APIs first, fall back to AI
      let trends: any[] = [];
      
      if (platform === 'youtube') {
        const youtubeTrends = await youtubeService.getTrendingVideos('US', '0', 10);
        trends = youtubeTrends;
      } else if (platform === 'tiktok') {
        const tiktokTrends = await tiktokService.getTrendingHashtags('US', 10);
        trends = tiktokTrends;
      }
      
      // If no platform trends, enhance with AI discovery
      if (trends.length === 0) {
        trends = await openRouterService.discoverTrends({
          platform,
          category,
          contentType,
          targetAudience
        }, "demo-user"); // Pass userId for cache optimization
      }

      // Store trends in database with validation-aware fallback
      const storedTrends = [];
      for (const trendData of trends) {
        try {
          // Validate trend data
          const validatedTrend = insertTrendSchema.parse(trendData);
          const trend = await storage.createTrend(validatedTrend);
          storedTrends.push(trend);
        } catch (error) {
          console.warn("Failed to validate/store trend:", error);
          // Continue with other trends even if one fails
        }
      }

      // If validation failed for all trends, fall back to AI discovery
      if (storedTrends.length === 0 && trends.length > 0) {
        console.log(`⚠️ All ${trends.length} platform trends failed validation, falling back to AI discovery...`);
        try {
          const aiTrends = await openRouterService.discoverTrends({
            platform,
            category,
            contentType,
            targetAudience
          }, "demo-user");
          
          // Store AI trends (these should be pre-validated by our AI service)
          for (const trendData of aiTrends) {
            try {
              const validatedTrend = insertTrendSchema.parse(trendData);
              const trend = await storage.createTrend(validatedTrend);
              storedTrends.push(trend);
            } catch (error) {
              console.warn("Failed to store AI fallback trend:", error);
            }
          }
          console.log(`✅ AI fallback provided ${storedTrends.length} valid trends`);
        } catch (aiError) {
          console.error("AI fallback also failed:", aiError);
        }
      }

      console.log(`✅ Discovered and stored ${storedTrends.length} trends`);
      res.json({ trends: storedTrends });
    } catch (error) {
      console.error("Error discovering trends:", error);
      res.status(500).json({ error: "Failed to discover trends" });
    }
  });

  // Get trends (cached or fresh)
  app.get("/api/trends", async (req, res) => {
    try {
      const { platform, limit } = req.query;
      
      const trends = await storage.getTrends(
        platform as string, 
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json({ trends });
    } catch (error) {
      console.error("Error getting trends:", error);
      res.status(500).json({ error: "Failed to get trends" });
    }
  });

  // Get specific trend
  app.get("/api/trends/:id", async (req, res) => {
    try {
      const trendId = parseInt(req.params.id);
      const trend = await storage.getTrend(trendId);
      
      if (!trend) {
        return res.status(404).json({ error: "Trend not found" });
      }
      
      res.json({ trend });
    } catch (error) {
      console.error("Error getting trend:", error);
      res.status(500).json({ error: "Failed to get trend" });
    }
  });

  // Save/like/use a trend (user actions)
  app.post("/api/trends/:id/action", async (req, res) => {
    try {
      const trendId = parseInt(req.params.id);
      const { action, userId } = req.body; // action: "saved", "liked", "used"
      
      if (!userId || !action) {
        return res.status(400).json({ error: "User ID and action are required" });
      }

      if (!["saved", "liked", "used"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      // Check if trend exists
      const trend = await storage.getTrend(trendId);
      if (!trend) {
        return res.status(404).json({ error: "Trend not found" });
      }

      // Record the action
      const userTrendData = insertUserTrendsSchema.parse({
        userId,
        trendId,
        action
      });

      const userTrend = await storage.createUserTrendAction(userTrendData);
      
      console.log(`✅ User ${userId} ${action} trend ${trendId}`);
      res.json({ success: true, userTrend });
    } catch (error) {
      console.error("Error recording trend action:", error);
      res.status(500).json({ error: "Failed to record trend action" });
    }
  });

  // Get user's saved/liked trends
  app.get("/api/users/:userId/trends", async (req, res) => {
    try {
      const { userId } = req.params;
      const { action } = req.query; // "saved", "liked", "used"
      
      const userTrends = await storage.getUserTrendActions(userId, action as string);
      
      // Get full trend details
      const trendsWithDetails = [];
      for (const userTrend of userTrends) {
        const trend = await storage.getTrend(userTrend.trendId);
        if (trend) {
          trendsWithDetails.push({
            ...trend,
            userAction: userTrend.action,
            actionDate: userTrend.createdAt
          });
        }
      }
      
      res.json({ trends: trendsWithDetails });
    } catch (error) {
      console.error("Error getting user trends:", error);
      res.status(500).json({ error: "Failed to get user trends" });
    }
  });

  // Launch Pad Routes - Content Optimization
  
  // Analyze content (title and/or thumbnail)
  app.post('/api/content/analyze', async (req, res) => {
    try {
      const { title, thumbnailDescription, platform, roastMode } = req.body;
      
      if (!title && !thumbnailDescription) {
        return res.status(400).json({ error: 'Either title or thumbnailDescription is required' });
      }
      
      if (!platform) {
        return res.status(400).json({ error: 'Platform is required' });
      }

      console.log(`🎯 Analyzing content for ${platform}...`);
      
      // Create user content record first
      const content = await storage.createUserContent({
        userId: 'demo-user', // TODO: Get from auth
        platform,
        title: title || null,
        thumbnailUrl: thumbnailDescription || null,
        status: 'analyzing'
      });

      // Analyze content using AI
      const analysis = await openRouterService.analyzeContent({
        title,
        thumbnailDescription,
        platform: platform as 'tiktok' | 'youtube' | 'instagram',
        roastMode: roastMode || false
      });

      // Store analysis results
      const storedAnalysis = await storage.createContentAnalysis({
        contentId: content.id,
        clickabilityScore: analysis.clickabilityScore,
        clarityScore: analysis.clarityScore,
        intrigueScore: analysis.intrigueScore,
        emotionScore: analysis.emotionScore,
        feedback: analysis.feedback,
        suggestions: analysis.suggestions,
        roastMode: roastMode || false
      });

      const overallScore = Math.round((analysis.clickabilityScore + analysis.clarityScore + analysis.intrigueScore + analysis.emotionScore) / 4);
      
      console.log(`✅ Content analysis completed with overall score: ${overallScore}/10`);

      res.json({
        contentId: content.id,
        analysis: storedAnalysis,
        overallScore
      });
    } catch (error) {
      console.error('Error analyzing content:', error);
      res.status(500).json({ error: 'Failed to analyze content' });
    }
  });

  // Get analysis results for specific content
  app.get('/api/content/:id/analysis', async (req, res) => {
    try {
      const contentId = parseInt(req.params.id);
      const analysis = await storage.getContentAnalysis(contentId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      const content = await storage.getContentById(contentId);
      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      const overallScore = Math.round((analysis.clickabilityScore + analysis.clarityScore + analysis.intrigueScore + analysis.emotionScore) / 4);

      res.json({
        content,
        analysis,
        overallScore
      });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({ error: 'Failed to fetch analysis' });
    }
  });

  // Get user's content analysis history
  app.get('/api/content/history', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from auth
      const content = await storage.getUserContent(userId);
      
      res.json({ content });
    } catch (error) {
      console.error('Error fetching content history:', error);
      res.status(500).json({ error: 'Failed to fetch content history' });
    }
  });

  // Multiplier Routes - Video Processing & Clip Generation
  
  // Process video and generate clips
  app.post('/api/videos/process', async (req, res) => {
    try {
      const { videoUrl, title, description, platform, videoDuration } = req.body;
      
      if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required' });
      }

      console.log(`🎬 Processing video for ${platform || 'general'} clips...`);
      
      // Create user content record for the video
      const videoContent = await storage.createUserContent({
        userId: 'demo-user', // TODO: Get from auth
        platform: platform || 'youtube',
        title: title || null,
        description: description || null,
        videoUrl,
        status: 'processing'
      });

      // Generate clip suggestions using AI
      const clipSuggestions = await openRouterService.generateVideoClips(
        description || title || 'Video content',
        videoDuration || 300, // Default 5 minutes
        platform || 'youtube'
      );

      // Store clip suggestions in database
      const storedClips = [];
      for (const clipData of clipSuggestions) {
        try {
          const clip = await storage.createVideoClip({
            contentId: videoContent.id,
            title: clipData.title,
            description: clipData.description,
            startTime: clipData.startTime,
            endTime: clipData.endTime,
            viralScore: clipData.viralScore,
            status: 'ready'
          });
          storedClips.push(clip);
        } catch (error) {
          console.warn("Failed to store clip:", error);
        }
      }

      // Update video status to completed
      const updatedContent = await storage.updateUserContent(videoContent.id, {
        status: 'completed'
      });

      console.log(`✅ Generated ${storedClips.length} clips from video`);

      res.json({
        videoId: videoContent.id,
        video: updatedContent,
        clips: storedClips,
        totalClips: storedClips.length
      });
    } catch (error) {
      console.error('Error processing video:', error);
      res.status(500).json({ error: 'Failed to process video' });
    }
  });

  // Get clips for a specific video
  app.get('/api/videos/:id/clips', async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const clips = await storage.getVideoClips(videoId);
      
      const video = await storage.getContentById(videoId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json({
        video,
        clips,
        totalClips: clips.length
      });
    } catch (error) {
      console.error('Error fetching clips:', error);
      res.status(500).json({ error: 'Failed to fetch clips' });
    }
  });

  // Get specific clip details
  app.get('/api/clips/:id', async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const clip = await storage.getClipById(clipId);
      
      if (!clip) {
        return res.status(404).json({ error: 'Clip not found' });
      }

      const video = await storage.getContentById(clip.contentId);

      res.json({
        clip,
        video
      });
    } catch (error) {
      console.error('Error fetching clip:', error);
      res.status(500).json({ error: 'Failed to fetch clip' });
    }
  });

  // Update clip details (title, viral score, etc.)
  app.put('/api/clips/:id', async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const { title, description, viralScore, status } = req.body;
      
      const updatedClip = await storage.updateVideoClip(clipId, {
        title,
        description,
        viralScore,
        status
      });
      
      if (!updatedClip) {
        return res.status(404).json({ error: 'Clip not found' });
      }

      console.log(`✅ Updated clip ${clipId} details`);

      res.json({
        clip: updatedClip,
        message: 'Clip updated successfully'
      });
    } catch (error) {
      console.error('Error updating clip:', error);
      res.status(500).json({ error: 'Failed to update clip' });
    }
  });

  // Get user's video processing history
  app.get('/api/videos/history', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from auth
      const videos = await storage.getUserContent(userId);
      
      // Filter to only video content and add clip counts
      const videosWithClips = [];
      for (const video of videos.filter(v => v.videoUrl)) {
        const clips = await storage.getVideoClips(video.id);
        videosWithClips.push({
          ...video,
          clipCount: clips.length,
          totalViralScore: clips.reduce((sum, clip) => sum + (clip.viralScore || 0), 0)
        });
      }

      res.json({ 
        videos: videosWithClips,
        totalVideos: videosWithClips.length
      });
    } catch (error) {
      console.error('Error fetching video history:', error);
      res.status(500).json({ error: 'Failed to fetch video history' });
    }
  });

  // Platform Integration Routes - Real API Data
  
  // Get YouTube channel analytics
  app.get('/api/platforms/youtube/analytics/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      
      console.log(`📺 Fetching YouTube analytics for channel: ${channelId}...`);
      
      const analytics = await youtubeService.getChannelAnalytics(channelId);
      
      if (!analytics) {
        return res.status(404).json({ error: 'Channel not found or analytics unavailable' });
      }
      
      console.log(`✅ YouTube analytics retrieved for ${channelId}`);
      
      res.json({
        success: true,
        platform: 'youtube',
        analytics
      });
    } catch (error) {
      console.error('YouTube analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch YouTube analytics' });
    }
  });

  // Get TikTok hashtag analytics
  app.get('/api/platforms/tiktok/hashtag/:hashtag', async (req, res) => {
    try {
      const { hashtag } = req.params;
      
      console.log(`🎵 Fetching TikTok hashtag analytics for: ${hashtag}...`);
      
      const analytics = await tiktokService.getHashtagAnalytics(hashtag);
      
      if (!analytics) {
        return res.status(404).json({ error: 'Hashtag analytics unavailable' });
      }
      
      console.log(`✅ TikTok hashtag analytics retrieved for ${hashtag}`);
      
      res.json({
        success: true,
        platform: 'tiktok',
        analytics
      });
    } catch (error) {
      console.error('TikTok hashtag analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch TikTok hashtag analytics' });
    }
  });

  // Get TikTok trending sounds
  app.get('/api/platforms/tiktok/sounds', async (req, res) => {
    try {
      const region = req.query.region as string || 'US';
      const limit = parseInt(req.query.limit as string) || 15;
      
      console.log(`🎶 Fetching trending TikTok sounds for ${region}...`);
      
      const sounds = await tiktokService.getTrendingSounds(region, limit);
      
      console.log(`✅ Retrieved ${sounds.length} trending sounds`);
      
      res.json({
        success: true,
        platform: 'tiktok',
        sounds,
        region
      });
    } catch (error) {
      console.error('TikTok sounds error:', error);
      res.status(500).json({ error: 'Failed to fetch trending sounds' });
    }
  });

  // Automated Preference System Routes
  
  // Learn user preferences from successful content
  app.post('/api/preferences/learn', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from auth
      const { contentId, performance } = req.body; // performance: views, engagement rate, etc.
      
      if (!contentId || !performance) {
        return res.status(400).json({ error: 'Content ID and performance data are required' });
      }
      
      console.log(`🧠 Learning preferences from successful content ${contentId}...`);
      
      // Get the content details to analyze patterns
      const content = await storage.getContentById(contentId);
      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // Extract patterns from successful content
      const learnedPreferences = await analyzeSuccessPatterns(content, performance);
      
      // For now, just return the learned patterns - in production this would update stored preferences
      const userPrefs = {
        userId,
        ...learnedPreferences,
        lastUpdated: new Date()
      };
      
      console.log(`✅ Updated user preferences based on successful content`);
      
      res.json({
        success: true,
        preferences: userPrefs,
        learnedFrom: contentId
      });
    } catch (error) {
      console.error('Preference learning error:', error);
      res.status(500).json({ error: 'Failed to learn from content performance' });
    }
  });

  // Get filtered trends based on user preferences
  app.get('/api/trends/personalized', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from auth
      const { platform, limit = 10 } = req.query;
      
      console.log(`🎯 Getting personalized trends for ${userId}...`);
      
      // Get user preferences
      const userPrefs = await getUserPreferences(userId);
      
      // Get all available trends
      const allTrends = await storage.getTrends(platform as string);
      
      // Filter and rank trends based on user preferences
      const personalizedTrends = await filterTrendsByPreferences(allTrends, userPrefs);
      
      console.log(`✅ Filtered ${personalizedTrends.length} personalized trends`);
      
      res.json({
        success: true,
        trends: personalizedTrends.slice(0, parseInt(limit as string)),
        preferenceMatch: true,
        userNiche: userPrefs?.niche || 'general'
      });
    } catch (error) {
      console.error('Personalized trends error:', error);
      res.status(500).json({ error: 'Failed to get personalized trends' });
    }
  });

  // Get user's content preferences and niche
  app.get('/api/preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const preferences = await getUserPreferences(userId);
      
      if (!preferences) {
        return res.json({
          success: true,
          preferences: null,
          message: 'No preferences learned yet - create some content to get personalized recommendations'
        });
      }
      
      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Failed to get user preferences' });
    }
  });

  // Save/update user preferences manually
  app.post('/api/preferences/save', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from auth
      const { 
        niche, 
        targetAudience, 
        contentStyle, 
        preferredPlatforms, 
        preferredCategories,
        bio,
        contentLength,
        postingSchedule,
        goals
      } = req.body;
      
      if (!niche) {
        return res.status(400).json({ error: 'Niche is required' });
      }
      
      console.log(`💾 Saving user preferences for ${userId}...`);
      
      const userPreferences = {
        userId,
        niche,
        targetAudience: targetAudience || 'gen-z',
        contentStyle: contentStyle || 'entertainment',
        bestPerformingPlatforms: preferredPlatforms || ['tiktok'],
        preferredCategories: preferredCategories || [niche],
        bio: bio || '',
        preferredContentLength: contentLength || 'short',
        optimizedPostTimes: postingSchedule || ['18:00', '21:00'],
        goals: goals || 'grow_followers',
        avgSuccessfulEngagement: 0.05, // Default
        successfulHashtags: [], // Will be learned
        lastUpdated: new Date()
      };
      
      // TODO: Store in database - for now we'll just return the preferences
      console.log(`✅ User preferences saved:`, userPreferences);
      
      res.json({
        success: true,
        preferences: userPreferences,
        message: 'Preferences saved successfully! You\'ll now get personalized trend recommendations.'
      });
    } catch (error) {
      console.error('Save preferences error:', error);
      res.status(500).json({ error: 'Failed to save user preferences' });
    }
  });

  // Get available options for preferences form
  app.get('/api/preferences/options', async (req, res) => {
    try {
      const options = {
        niches: [
          'fitness', 'food', 'tech', 'lifestyle', 'comedy', 'education',
          'gaming', 'fashion', 'travel', 'music', 'dance', 'art',
          'business', 'motivation', 'beauty', 'pets', 'sports', 'diy'
        ],
        audiences: [
          'gen-z', 'millennials', 'gen-x', 'boomers', 'teens', 'young-adults', 'professionals'
        ],
        contentStyles: [
          'educational', 'entertainment', 'comedy', 'lifestyle', 'review',
          'tutorial', 'storytelling', 'behind-scenes', 'motivational'
        ],
        platforms: [
          'tiktok', 'youtube', 'instagram', 'twitter', 'linkedin'
        ],
        contentLengths: [
          'short', 'medium', 'long'
        ],
        goals: [
          'grow_followers', 'increase_engagement', 'monetize', 'brand_awareness', 'thought_leadership'
        ]
      };
      
      res.json({
        success: true,
        options
      });
    } catch (error) {
      console.error('Get options error:', error);
      res.status(500).json({ error: 'Failed to get preference options' });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "CreatorKit AI Backend"
    });
  });

  // Dashboard Routes - Analytics and Performance Tracking
  
  // Get dashboard statistics
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from authenticated user
      const timeframe = (req.query.timeframe as 'week' | 'month' | 'year') || 'week';
      
      console.log(`📊 Fetching dashboard stats for ${userId} (${timeframe})...`);
      
      // Ensure mock analytics data exists for demo
      await analyticsService.seedAnalyticsIfNeeded(userId);
      
      const stats = await analyticsService.calculateDashboardStats(userId, timeframe);
      
      console.log('✅ Dashboard stats calculated successfully');
      
      res.json({
        success: true,
        stats,
        timeframe
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch dashboard statistics' 
      });
    }
  });

  // Get performance insights
  app.get('/api/dashboard/insights', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from authenticated user
      const timeframe = (req.query.timeframe as 'week' | 'month' | 'year') || 'week';
      
      console.log(`💡 Fetching performance insights for ${userId} (${timeframe})...`);
      
      // Ensure mock analytics data exists for demo
      await analyticsService.seedAnalyticsIfNeeded(userId);
      
      const insights = await analyticsService.calculatePerformanceInsights(userId, timeframe);
      
      console.log('✅ Performance insights calculated successfully');
      
      res.json({
        success: true,
        insights,
        timeframe
      });
    } catch (error) {
      console.error('Error fetching performance insights:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch performance insights' 
      });
    }
  });

  // Get recent user activity for dashboard
  app.get('/api/dashboard/activity', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from authenticated user
      const limit = parseInt(req.query.limit as string) || 20;
      const timeframe = req.query.timeframe as string || 'week';
      
      console.log(`📋 Fetching recent activity for ${userId} (${timeframe})...`);
      
      const activities = await storage.getUserActivity(userId, limit, timeframe);
      
      res.json({
        success: true,
        activities,
        total: activities.length
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch user activity' 
      });
    }
  });

  // Create analytics record (for tracking real metrics)
  app.post('/api/analytics/record', async (req, res) => {
    try {
      const userId = 'demo-user'; // TODO: Get from authenticated user
      const { contentId, platform, views, likes, shares, comments, clickRate } = req.body;
      
      if (!platform) {
        return res.status(400).json({ error: 'Platform is required' });
      }
      
      const analytics = await storage.createUserAnalytics({
        userId,
        contentId: contentId || null,
        platform,
        views: views || 0,
        likes: likes || 0,
        shares: shares || 0,
        comments: comments || 0,
        clickRate: clickRate || null
      });
      
      console.log(`✅ Analytics recorded for content ${contentId} on ${platform}`);
      
      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error recording analytics:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to record analytics' 
      });
    }
  });

  // AI Cache Statistics - Monitor token optimization (secured for production)
  app.get("/api/cache/stats", (req, res) => {
    try {
      const stats = simplifiedAICache.getStats();
      
      res.json({
        success: true,
        cache: {
          ...stats,
          description: "AI response cache performance metrics for token optimization",
          savings: {
            totalTokensSaved: stats.tokensSaved,
            estimatedCostSaved: stats.estimatedCostSaved,
            description: "Estimated API cost savings from persistent caching"
          },
          type: "persistent"
        }
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get cache statistics' 
      });
    }
  });

  // Clear cache endpoint (secured for development only)
  app.post("/api/cache/clear", async (req, res) => {
    try {
      // Security: Only allow in development environment
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ 
          success: false, 
          error: 'Cache clearing not allowed in production' 
        });
      }

      const { type, secret } = req.body;
      
      // Simple secret check for development security
      if (secret !== 'dev-clear-cache-2025') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid secret for cache clearing' 
        });
      }
      
      if (type) {
        const clearedCount = await simplifiedAICache.clearByType(type);
        res.json({ 
          success: true, 
          message: `Cleared ${clearedCount} cache entries for type: ${type}` 
        });
      } else {
        await simplifiedAICache.clear();
        res.json({ 
          success: true, 
          message: "All cache cleared" 
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to clear cache' 
      });
    }
  });

  // Health check endpoint for monitoring TikTok provider status
  app.get("/api/health/trends", async (req, res) => {
    try {
      const tiktokStatus = tiktokService.getProviderStatus();
      const youtubeStatus = youtubeService.getProviderStatus();
      
      res.json({
        success: true,
        providers: {
          tiktok: tiktokStatus,
          youtube: youtubeStatus
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
