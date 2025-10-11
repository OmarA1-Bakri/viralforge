// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openRouterService } from "./ai/openrouter";
import { simplifiedAICache } from "./ai/simplifiedCache";
import { successPatternService } from "./ai/successPatterns";
import { analyticsService } from "./analytics";
import { youtubeService } from "./lib/platforms/youtube";
import { tiktokService } from "./platforms/tiktok";
import { analyzeSuccessPatterns, getUserPreferences, filterTrendsByPreferences } from "./preferences";
import { insertTrendSchema, insertUserTrendsSchema } from "@shared/schema";
import authRoutes from "./routes/auth";
import agentRoutes from "./routes/agents";
import oauthRoutes from "./routes/oauth";
import notificationRoutes from "./routes/notifications";
import versionRoutes from "./routes/version";
import gdprRoutes from "./routes/gdpr";
import { registerSubscriptionRoutes, registerRevenueCatSyncRoute } from "./routes/subscriptions";
import { authenticateToken, optionalAuth, getUserId, AuthRequest } from "./auth";
import { aiAnalysisLimiter, uploadLimiter, profileAnalysisLimiter } from './middleware/security';
import { validateRequest, schemas } from './middleware/validation';
import { checkSubscriptionLimit, trackFeatureUsage } from './middleware/subscriptionLimits';
import { logger, logError, logAICall } from './lib/logger';
import { storageService } from './lib/storage';
import { uploadImage, uploadVideo } from './middleware/upload';
import { videoProcessingQueue, safeQueueAdd, safeQueueGetJob, type VideoProcessingJobData } from './queue/index';
import { db } from './db';
import { creatorProfiles, analyzedPosts as analyzedPostsTable, profileAnalysisReports } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function registerRoutes(app: Express): Promise<Server> {
  // Version endpoint (public)
  app.use("/api", versionRoutes);

  // Auth routes
  app.use("/api/auth", authRoutes);

  // Agent monitoring routes
  app.use("/api/agents", agentRoutes);

  // OAuth routes
  app.use("/api/oauth", oauthRoutes);

  // Notification routes
  app.use("/api/notifications", notificationRoutes);

  // GDPR compliance routes
  app.use("/api/gdpr", gdprRoutes);

  // Subscription routes
  registerSubscriptionRoutes(app);
  registerRevenueCatSyncRoute(app);
  
  // Idea Lab Routes - AI Trend Discovery

  // Discover trends using AI
  app.post("/api/trends/discover",
    authenticateToken,
    checkSubscriptionLimit('videoAnalysis'),
    aiAnalysisLimiter,
    validateRequest({ body: schemas.discoverTrends }),
    async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const { platform, category, contentType, targetAudience } = req.body;

      console.log('🔍 [USER TRIGGERED] POST /api/trends/discover received:', {
        userId,
        platform,
        category,
        contentType,
        targetAudience,
        requestBody: req.body
      });

      if (!platform) {
        return res.status(400).json({ error: "Platform is required" });
      }

      // Load user preferences for personalization
      const userPrefs = userId ? await storage.getUserPreferences(userId) : null;
      console.log('🔍 [USER TRIGGERED] Loaded userPrefs:', {
        hasPrefs: !!userPrefs,
        preferredCategories: userPrefs?.preferredCategories,
        niche: userPrefs?.niche,
        targetAudience: userPrefs?.targetAudience
      });

      // Use platform-specific APIs first, fall back to AI
      let trends: any[] = [];

      if (platform === 'youtube') {
        const youtubeTrends = await youtubeService.getTrendingVideos('US', category, 10);
        trends = youtubeTrends;
      } else if (platform === 'tiktok') {
        const tiktokTrends = await tiktokService.getTrendingHashtags('US', 10);
        trends = tiktokTrends;
      }

      // If no platform trends, enhance with AI discovery
      if (trends.length === 0) {
        // Use user preferences for AI discovery, fallback to request params
        trends = await openRouterService.discoverTrends({
          platform,
          category: userPrefs?.preferredCategories?.[0] || category,
          contentType: userPrefs?.contentStyle || contentType,
          targetAudience: userPrefs?.targetAudience || targetAudience
        }, userId);
      }

      // Store trends in database with validation-aware fallback and user context
      const storedTrends = [];
      for (const trendData of trends) {
        try {
          // Validate trend data with user personalization
          const validatedTrend = insertTrendSchema.parse({
            ...trendData,
            targetNiche: userPrefs?.preferredCategories?.[0],
            targetAudience: userPrefs?.targetAudience,
            contentStyle: userPrefs?.contentStyle
          });
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
          // Use user preferences for AI fallback, just like main discovery
          const aiTrends = await openRouterService.discoverTrends({
            platform,
            category: userPrefs?.preferredCategories?.[0] || category,
            contentType: userPrefs?.contentStyle || contentType,
            targetAudience: userPrefs?.targetAudience || targetAudience
          }, userId);
          
          // Store AI trends with user context
          for (const trendData of aiTrends) {
            try {
              const validatedTrend = insertTrendSchema.parse({
                ...trendData,
                targetNiche: userPrefs?.niche,
                targetAudience: userPrefs?.targetAudience,
                contentStyle: userPrefs?.contentStyle
              });
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

  // Get AI-curated trends personalized to user's niche/preferences
  app.get("/api/trends", async (req, res) => {
    const startTime = Date.now();
    try {
      const { platform, limit, categories } = req.query;
      const userId = (req as any).userId;

      logger.info({
        platform,
        limit,
        categories,
        userId: userId || 'unauthenticated',
        requestId: (req as any).id
      }, '🎯 GET /api/trends - Starting AI trend discovery');

      // Get user preferences for AI curation (only for authenticated users)
      let userPrefs = null;
      if (userId) {
        try {
          userPrefs = await getUserPreferences(userId);
          logger.debug({ userPrefs }, 'User preferences loaded');
        } catch (error) {
          logger.debug('No user preferences found, using category filters');
        }
      }

      let trends = [];
      const categoryList = categories ? (categories as string).split(',') : userPrefs?.preferredCategories || [];
      logger.debug({ categoryList, categoriesFromQuery: categories, categoriesFromPrefs: userPrefs?.preferredCategories }, 'Category list determined');

      // PRODUCTION FIX: Response immediately, generate AI ideas in background
      // This prevents Vite HMR crashes during development

      // Step 1: Return any existing trends immediately (< 100ms)
      // Use personalized filtering if user has preferences
      let dbTrends;
      if (userPrefs && (userPrefs.preferredCategories?.length > 0 || userPrefs.targetAudience || userPrefs.contentStyle)) {
        logger.debug({ userPrefs }, 'Using personalized trend filtering');
        dbTrends = await storage.getTrendsByUserPreferences(
          userPrefs,
          limit ? parseInt(limit as string) : 20
        );
      } else {
        dbTrends = await storage.getTrends(
          (platform as string) || 'tiktok',
          limit ? parseInt(limit as string) : 20
        );
      }

      if (dbTrends.length > 0) {
        logger.info({ trendsCount: dbTrends.length }, '✅ Returning cached trends immediately');
        res.json({ trends: dbTrends, cached: true, refreshing: true });

        // Step 2: Refresh with fresh AI ideas in background (non-blocking)
        if (categoryList.length > 0) {
          setImmediate(async () => {
            try {
              logger.info({ categoryList }, '🔄 Background: Generating fresh AI trend ideas');
              const aiStartTime = Date.now();

              const freshTrends = await Promise.race([
                openRouterService.discoverTrends({
                  platform: (platform as string) || 'tiktok',
                  category: categoryList.join(', '),
                  contentType: 'viral',
                  targetAudience: userPrefs?.targetAudience || 'creators'
                }, userId),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Background AI timeout after 15s')), 15000)
                )
              ]);

              const aiDuration = Date.now() - aiStartTime;
              logger.info({
                trendsCount: freshTrends.length,
                duration: aiDuration,
                categories: categoryList
              }, '✅ Background: AI generated fresh ideas, storing for next request');

              // Store for next request with user context
              for (const trendData of freshTrends) {
                try {
                  const validatedTrend = insertTrendSchema.parse({
                    ...trendData,
                    targetNiche: userPrefs?.preferredCategories?.[0],
                    targetAudience: userPrefs?.targetAudience,
                    contentStyle: userPrefs?.contentStyle
                  });
                  await storage.createTrend(validatedTrend);
                } catch (e) {
                  logger.warn({ error: e }, 'Background: Failed to store trend');
                }
              }
            } catch (bgError: any) {
              logger.warn({ error: bgError.message }, '⚠️ Background AI generation failed (non-critical)');
            }
          });
        }

        return; // Already sent response
      }

      // Step 3: No cached trends - MUST generate now but with strict timeout
      if (categoryList.length > 0) {
        logger.info({ categoryList }, '🤖 No cache, calling AI with 5s timeout (first-time load)');

        try {
          const aiStartTime = Date.now();
          trends = await Promise.race([
            openRouterService.discoverTrends({
              platform: (platform as string) || 'tiktok',
              category: categoryList.join(', '),
              contentType: 'viral',
              targetAudience: userPrefs?.targetAudience || 'creators'
            }, userId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('AI timeout after 5s')), 5000)
            )
          ]);

          const aiDuration = Date.now() - aiStartTime;
          logger.info({
            trendsCount: trends.length,
            duration: aiDuration
          }, '✅ AI generated ideas in time');
        } catch (aiError: any) {
          logger.error({
            error: aiError.message,
            duration: Date.now() - startTime
          }, '❌ AI timed out, using platform fallback');

          // Platform fallback
          if (platform === 'tiktok' || !platform) {
            trends = await tiktokService.getTrendingHashtags('US', limit ? parseInt(limit as string) : 20);
          }
        }
      } else {
        // No categories - platform trends
        logger.info('📋 No categories, using platform trends');
        if (platform === 'tiktok' || !platform) {
          trends = await tiktokService.getTrendingHashtags('US', limit ? parseInt(limit as string) : 20);
        }
      }

      const totalDuration = Date.now() - startTime;
      logger.info({
        trendsCount: trends.length,
        totalDuration,
        requestId: (req as any).id
      }, '✅ GET /api/trends completed');

      res.json({ trends, cached: false });
    } catch (error) {
      console.error("Error getting trends:", error);

      // Emergency fallback - return mock data instead of crashing
      res.status(200).json({
        trends: [
          {
            id: "fallback-1",
            title: "Pet React Challenge",
            description: "Film your pet's reaction to trending sounds",
            category: "Comedy",
            platform: "tiktok",
            hotness: "hot",
            engagement: 23400,
            hashtags: ["petreaction", "viral"],
            suggestion: "Use close-up shots with trending audio",
            timeAgo: "2h ago"
          }
        ],
        fallback: true,
        message: "Using fallback data - refresh to try again"
      });
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
  app.post('/api/content/analyze',
    authenticateToken,
    checkSubscriptionLimit('contentGeneration'),
    aiAnalysisLimiter,
    validateRequest({ body: schemas.analyzeContent }),
    async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const { title, thumbnailDescription, thumbnailUrl, thumbnailBase64, platform, roastMode } = req.body;

      if (!title && !thumbnailDescription && !thumbnailUrl && !thumbnailBase64) {
        return res.status(400).json({ error: 'Either title, thumbnailDescription, thumbnailUrl, or thumbnailBase64 is required' });
      }

      if (!platform) {
        return res.status(400).json({ error: 'Platform is required' });
      }

      console.log(`🎯 Analyzing content for ${platform}...`, {
        hasTitle: !!title,
        hasVision: !!(thumbnailUrl || thumbnailBase64),
        hasLegacyDescription: !!thumbnailDescription
      });

      // Create user content record first
      const content = await storage.createUserContent({
        userId,
        platform,
        title: title || null,
        thumbnailUrl: thumbnailUrl || thumbnailDescription || null,
        status: 'analyzing'
      });

      // Get personalized insights based on user's success patterns
      const personalizedInsights = await successPatternService.getPersonalizedAnalysis(
        userId,
        { title, description: thumbnailDescription }
      );

      // Analyze content using AI with vision support
      const analysis = await openRouterService.analyzeContent({
        title,
        thumbnailDescription, // Keep for backward compatibility
        thumbnailUrl, // New: actual image URL for vision
        thumbnailBase64, // New: base64 image for vision
        platform: platform as 'tiktok' | 'youtube' | 'instagram',
        roastMode: roastMode || false
      }, userId);

      // Add personalized insights to suggestions
      if (personalizedInsights) {
        analysis.suggestions.unshift(personalizedInsights);
      }

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
  app.get('/api/content/history', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const content = await storage.getUserContent(userId);
      
      res.json({ content });
    } catch (error) {
      console.error('Error fetching content history:', error);
      res.status(500).json({ error: 'Failed to fetch content history' });
    }
  });

  // Multiplier Routes - Video Processing & Clip Generation
  
  // Process video and generate clips
  app.post('/api/videos/process',
    authenticateToken,
    checkSubscriptionLimit('videoClips'),
    aiAnalysisLimiter,
    validateRequest({ body: schemas.processVideo }),
    async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const { videoUrl, title, description, platform, videoDuration } = req.body;
      
      if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required' });
      }

      console.log(`🎬 Processing video for ${platform || 'general'} clips...`);
      
      // Create user content record for the video
      const videoContent = await storage.createUserContent({
        userId,
        platform: platform || 'youtube',
        title: title || null,
        description: description || null,
        videoUrl,
        status: 'processing'
      });

      // ✅ Use type-safe queue helper that handles undefined queues gracefully
      const jobData: VideoProcessingJobData = {
        userId,
        contentId: videoContent.id,
        videoKey: videoUrl.replace(/^.*\//, ''), // Extract key from URL
        platform: platform || 'youtube',
        videoDuration,
      };

      const job = await safeQueueAdd(
        videoProcessingQueue,
        'video-processing',
        'process-video',
        jobData
      );

      if (!job) {
        logger.warn('Video processing queue not available - Redis not configured');
        return res.status(503).json({
          error: 'Video processing is temporarily unavailable',
          message: 'Background job system requires Redis configuration'
        });
      }

      logger.info({ jobId: job.id, contentId: videoContent.id }, 'Video processing job queued');

      res.json({
        success: true,
        videoId: videoContent.id,
        jobId: job.id,
        status: 'processing',
        message: 'Video processing started. Check status with job ID.',
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
  app.get('/api/videos/history', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
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

  // Get job status
  app.get('/api/jobs/:jobId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;

      // ✅ Use type-safe queue helper that handles undefined queues gracefully
      const job = await safeQueueGetJob(
        videoProcessingQueue,
        'video-processing',
        jobId
      );

      if (!job) {
        // Could be either queue unavailable or job not found
        return res.status(503).json({
          error: 'Job status unavailable',
          message: 'Either job not found or Redis not configured'
        });
      }

      const state = await job.getState();
      const progress = job.progress;

      res.json({
        success: true,
        job: {
          id: job.id,
          state,
          progress,
          data: job.data,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
        },
      });
    } catch (error) {
      logError(error as Error, { context: 'job_status' });
      res.status(500).json({ error: 'Failed to get job status' });
    }
  });

  // Get multiplier processing jobs (for UI compatibility)
  app.get('/api/multiplier/jobs', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      
      // Get video processing jobs from user content
      const videos = await storage.getUserContent(userId);
      const videoJobs = videos.filter(v => v.videoUrl);
      
      // Transform to jobs format expected by UI
      const jobs = [];
      for (const video of videoJobs) {
        const clips = await storage.getVideoClips(video.id);
        jobs.push({
          id: video.id,
          url: video.videoUrl,
          status: video.status, // 'processing', 'completed', 'failed'
          progress: video.status === 'completed' ? 100 : video.status === 'processing' ? 75 : 0,
          clips: clips.map(clip => ({
            id: clip.id,
            title: clip.title,
            startTime: clip.startTime,
            endTime: clip.endTime,
            viralScore: clip.viralScore,
            status: clip.status
          })),
          createdAt: video.createdAt,
          updatedAt: video.updatedAt
        });
      }
      
      console.log(`📋 Fetched ${jobs.length} multiplier jobs for ${userId}`);
      
      res.json({
        success: true,
        jobs,
        totalJobs: jobs.length
      });
    } catch (error) {
      console.error('Error fetching multiplier jobs:', error);
      res.status(500).json({ error: 'Failed to fetch multiplier jobs' });
    }
  });

  // File Upload Routes - Content Upload Functionality
  
  // Upload thumbnail for Launch Pad analysis
  app.post('/api/upload/thumbnail', 
    authenticateToken,
    uploadLimiter,
    uploadImage,
    async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      logger.info({ 
        fileName: req.file.originalname, 
        size: req.file.size,
        contentType: req.file.mimetype 
      }, 'Uploading thumbnail');
      
      // Upload to R2 with thumbnail variants
      const result = await storageService.uploadImageWithThumbnails(
        req.file.buffer,
        req.file.mimetype
      );
      
      logger.info({ key: result.original.key }, 'Thumbnail uploaded successfully');
      
      res.json({
        success: true,
        fileName: req.file.originalname,
        thumbnailUrl: result.original.cdnUrl || result.original.url,
        thumbnails: {
          small: result.thumbnails.small.cdnUrl || result.thumbnails.small.url,
          medium: result.thumbnails.medium.cdnUrl || result.thumbnails.medium.url,
          large: result.thumbnails.large.cdnUrl || result.thumbnails.large.url,
        },
        size: result.original.size,
        contentType: result.original.contentType
      });
    } catch (error) {
      logError(error as Error, { context: 'thumbnail_upload' });
      res.status(500).json({ error: 'Failed to upload thumbnail' });
    }
  });

  // Upload video file for Multiplier processing
  app.post('/api/upload/video', 
    authenticateToken,
    uploadLimiter,
    uploadVideo,
    async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      logger.info({
        fileName: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype
      }, 'Uploading video');
      
      // Upload video to R2
      const result = await storageService.uploadFile(
        req.file.buffer,
        req.file.mimetype,
        'videos'
      );
      
      logger.info({ key: result.key }, 'Video uploaded successfully');
      
      res.json({
        success: true,
        fileName: req.file.originalname,
        videoUrl: result.cdnUrl || result.url,
        key: result.key,
        size: result.size,
        contentType: result.contentType
      });
    } catch (error) {
      logError(error as Error, { context: 'video_upload' });
      res.status(500).json({ error: 'Failed to upload video' });
    }
  });

  // Get signed URL for file access
  app.get('/api/files/signed/:key', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const key = decodeURIComponent(req.params.key);
      
      logger.info({ key }, 'Generating signed URL');
      
      const signedUrl = await storageService.getSignedUrl(key, 3600);
      
      res.json({
        success: true,
        url: signedUrl,
        expiresIn: 3600,
      });
    } catch (error) {
      logError(error as Error, { context: 'signed_url_generation' });
      res.status(500).json({ error: 'Failed to generate signed URL' });
    }
  });

  // Platform Integration Routes - Real API Data
  
  // Get YouTube channel analytics
  app.get('/api/platforms/youtube/analytics/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      
      console.log(`📺 Fetching YouTube analytics for channel: ${channelId}...`);
      
      // Placeholder for OAuth token - in production this would come from stored user tokens
      const analytics = await youtubeService.getChannelAnalytics('', channelId);
      
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
  app.post('/api/preferences/learn', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
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
  app.get('/api/trends/personalized', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
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

  // Get available options for preferences form (MUST come before /:userId route!)
  app.get('/api/preferences/options', async (req, res) => {
    try {
      const options = {
        audiences: [
          'gen-z', 'millennials', 'gen-x', 'boomers', 'teens', 'young-adults', 'professionals'
        ],
        contentStyles: [
          'educational', 'entertainment', 'comedy', 'lifestyle', 'review',
          'tutorial', 'storytelling', 'behind-scenes', 'motivational'
        ],
        platforms: [
          'tiktok', 'youtube', 'instagram', 'twitter'
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
  app.post('/api/preferences/save', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
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

      const userPreferencesData = {
        userId,
        niche,
        targetAudience: targetAudience || 'gen-z',
        contentStyle: contentStyle || 'entertainment',
        bestPerformingPlatforms: preferredPlatforms || ['youtube'],
        preferredCategories: [niche], // AI uses niche directly - no predefined categories needed
        bio: bio || '',
        preferredContentLength: contentLength || 'short',
        optimizedPostTimes: postingSchedule || ['18:00', '21:00'],
        goals: goals || 'grow_followers',
        avgSuccessfulEngagement: 0.05,
        successfulHashtags: []
      };

      // Save to database
      const savedPreferences = await storage.saveUserPreferences(userId, userPreferencesData);
      console.log(`✅ User preferences saved to database:`, savedPreferences);

      res.json({
        success: true,
        preferences: savedPreferences,
        message: 'Preferences saved successfully! You\'ll now get personalized trend recommendations.'
      });
    } catch (error) {
      console.error('Save preferences error:', error);
      res.status(500).json({ error: 'Failed to save user preferences' });
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
  app.get('/api/dashboard/stats', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const timeframe = (req.query.timeframe as 'week' | 'month' | 'year') || 'week';
      
      console.log(`📊 Fetching dashboard stats for ${userId} (${timeframe})...`);

      // Mock data seeding disabled - users start with zero stats
      // await analyticsService.seedAnalyticsIfNeeded(userId);

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
  app.get('/api/dashboard/insights', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const timeframe = (req.query.timeframe as 'week' | 'month' | 'year') || 'week';
      
      console.log(`💡 Fetching performance insights for ${userId} (${timeframe})...`);

      // Mock data seeding disabled - users start with zero stats
      // await analyticsService.seedAnalyticsIfNeeded(userId);

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

  // Delete user analytics (for clearing mock data)
  app.delete('/api/dashboard/analytics', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);

      console.log(`🗑️  Deleting all analytics for ${userId}...`);
      await storage.deleteUserAnalytics(userId);

      res.json({
        success: true,
        message: 'Analytics data cleared successfully'
      });
    } catch (error) {
      console.error('Error deleting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete analytics data'
      });
    }
  });

  // Get recent user activity for dashboard
  app.get('/api/dashboard/activity', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
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
  app.post('/api/analytics/record', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
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

  // Cache stats endpoint (read-only, no clearing in production)
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

  // ============================================================================
  // VIRAL PATTERN ANALYSIS ROUTES
  // ============================================================================

  /**
   * POST /api/trends/:id/analyze
   * Analyze why a specific trend is going viral
   * Returns cached analysis if available (7-day cache)
   */
  app.post("/api/trends/:id/analyze", async (req, res) => {
    try {
      const trendId = parseInt(req.params.id);

      if (isNaN(trendId)) {
        return res.status(400).json({ error: "Invalid trend ID" });
      }

      const { viralPatternService } = await import('./ai/viralPatternService');
      const analysis = await viralPatternService.analyzeTrend(trendId);

      res.json(analysis);
    } catch (error: any) {
      logger.error({ error, trendId: req.params.id }, 'Failed to analyze viral trend');
      res.status(500).json({ error: error.message || "Failed to analyze trend" });
    }
  });

  /**
   * POST /api/trends/:id/apply
   * Generate personalized advice for applying a viral trend
   * Body: { userContentConcept?: string }
   */
  app.post("/api/trends/:id/apply", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const trendId = parseInt(req.params.id);
      const { userContentConcept } = req.body;

      if (isNaN(trendId)) {
        return res.status(400).json({
          error: "Invalid trend ID",
          code: "INVALID_TREND_ID"
        });
      }

      // Validate that user provided some input
      if (!userContentConcept || userContentConcept.trim().length === 0) {
        return res.status(400).json({
          error: "Please describe your content idea to get personalized advice",
          code: "MISSING_CONTENT_CONCEPT",
          suggestion: "Share your content idea, target audience, or what makes your take unique"
        });
      }

      const { viralPatternService } = await import('./ai/viralPatternService');
      const application = await viralPatternService.generatePersonalizedAdvice(
        userId,
        trendId,
        userContentConcept
      );

      res.json(application);
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || 'Unknown error',
        code: error?.code,
        status: error?.status
      };

      logger.error({
        error: errorDetails,
        userId: req.user?.id,
        trendId: req.params.id
      }, 'Failed to generate personalized advice');

      // Provide helpful error message to user
      const userMessage = error?.message?.includes('timeout') ?
        "AI analysis is taking longer than expected. Please try again." :
        error?.message?.includes('rate limit') ?
        "Too many requests. Please wait a moment and try again." :
        "Unable to generate advice right now. Please try again in a few moments.";

      res.status(500).json({
        error: userMessage,
        code: error?.code || "ANALYSIS_FAILED"
      });
    }
  });

  /**
   * GET /api/trends/:id/analysis
   * Get cached viral analysis if it exists
   */
  app.get("/api/trends/:id/analysis", async (req, res) => {
    try {
      const trendId = parseInt(req.params.id);

      if (isNaN(trendId)) {
        return res.status(400).json({ error: "Invalid trend ID" });
      }

      const analysis = await storage.getViralAnalysisByTrendId(trendId);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check if expired
      if (analysis.expiresAt && new Date() > analysis.expiresAt) {
        return res.status(404).json({ error: "Analysis expired" });
      }

      res.json(analysis);
    } catch (error: any) {
      logger.error({ error, trendId: req.params.id }, 'Failed to get viral analysis');
      res.status(500).json({ error: error.message || "Failed to get analysis" });
    }
  });

  /**
   * GET /api/users/trend-applications
   * Get user's history of applied trends
   */
  app.get("/api/users/trend-applications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const applications = await storage.getTrendApplicationsByUser(userId);

      res.json(applications);
    } catch (error: any) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get trend applications');
      res.status(500).json({ error: error.message || "Failed to get applications" });
    }
  });

  // Health check endpoint for monitoring provider status
  app.get("/api/health/trends", async (req, res) => {
    try {
      const tiktokStatus = tiktokService.getProviderStatus();

      res.json({
        success: true,
        providers: {
          tiktok: tiktokStatus,
          youtube: { available: !!process.env.YOUTUBE_API_KEY }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // ============================================================================
  // CREATOR PROFILE ANALYSIS ROUTES
  // ============================================================================

  /**
   * POST /api/profile/analyze
   * Start a new profile analysis job (Creator Class only)
   * Body: { tiktokUsername?, instagramUsername?, youtubeChannelId? }
   * Returns: { jobId }
   */
  app.post("/api/profile/analyze",
    authenticateToken,
    profileAnalysisLimiter,
    validateRequest({ body: schemas.analyzeProfile }),
    async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);
      const { tiktokUsername, instagramUsername, youtubeChannelId } = req.body;

      logger.info({ userId, platforms: { tiktokUsername, instagramUsername, youtubeChannelId } }, 
        'Starting profile analysis');

      const { backgroundJobService } = await import('./services/background-jobs');
      
      const jobId = await backgroundJobService.createAnalysisJob(userId, {
        tiktokUsername,
        instagramUsername,
        youtubeChannelId
      });

      res.json({
        success: true,
        jobId,
        message: 'Analysis started. This will take 45-70 seconds.',
        estimatedDuration: '45-70 seconds'
      });
    } catch (error: any) {
      logger.error({ error, userId: req.user?.id }, 'Failed to start profile analysis');
      res.status(500).json({ error: error.message || "Failed to start analysis" });
    }
  });

  /**
   * GET /api/profile/analysis/:jobId
   * Get analysis job status
   * Returns: { status, progress, result?, error? }
   */
  app.get("/api/profile/analysis/:jobId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;
      const userId = getUserId(req);

      const { backgroundJobService } = await import('./services/background-jobs');
      const job = backgroundJobService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // CRITICAL: Verify job belongs to user IMMEDIATELY after fetch
      if (job.userId !== userId) {
        logger.warn({ jobId, userId, jobUserId: job.userId }, 'Unauthorized job access attempt');
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // TOCTOU protection: Re-validate job still exists and belongs to user
      const revalidatedJob = backgroundJobService.getJobStatus(jobId);
      if (!revalidatedJob || revalidatedJob.userId !== userId) {
        logger.warn({ jobId, userId }, 'Job disappeared between checks (TOCTOU)');
        return res.status(404).json({ error: 'Job no longer available' });
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          error: job.error,
          result: job.result,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        }
      });
    } catch (error: any) {
      logger.error({ error, jobId: req.params.jobId }, 'Failed to get job status');
      res.status(500).json({ error: error.message || "Failed to get job status" });
    }
  });

  /**
   * GET /api/profile/report
   * Get user's creator profile and latest report
   * Returns: { profile, report, analyzedPosts }
   */
  app.get("/api/profile/report", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = getUserId(req);

      const profile = await db.query.creatorProfiles.findFirst({
        where: eq(creatorProfiles.userId, userId),
      });

      if (!profile) {
        return res.status(404).json({ 
          error: 'No profile found. Start an analysis first.' 
        });
      }

      // Get latest report
      const report = await db.query.profileAnalysisReports.findFirst({
        where: eq(profileAnalysisReports.profileId, profile.id),
        orderBy: (reports, { desc }) => [desc(reports.createdAt)],
      });

      // Get analyzed posts
      const posts = await db.query.analyzedPosts.findMany({
        where: eq(analyzedPostsTable.profileId, profile.id),
        orderBy: (posts, { desc }) => [desc(posts.postScore)],
        limit: 15,
      });

      logger.info({
        userId,
        hasProfile: !!profile,
        hasReport: !!report,
        reportFields: report ? Object.keys(report) : [],
        postsCount: posts.length,
      }, '📊 Profile report response');

      res.json({
        success: true,
        profile,
        report,
        analyzedPosts: posts,
      });
    } catch (error: any) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get profile report');
      res.status(500).json({ error: error.message || "Failed to get report" });
    }
  });

  /**
   * GET /api/profile/scrapers/health
   * Check scraper health status
   * Returns: { youtube, instagram, tiktok }
   */
  app.get("/api/profile/scrapers/health", async (req, res) => {
    try {
      const { scraperService } = await import('./services/scraper');
      const health = await scraperService.healthCheck();

      res.json({
        success: true,
        scrapers: health,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error({ error }, 'Scraper health check failed');
      res.status(500).json({ error: error.message || "Health check failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
