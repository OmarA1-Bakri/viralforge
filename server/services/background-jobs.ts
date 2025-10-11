import { logger } from '../lib/logger';
import { scraperService, SocialHandles } from './scraper';
import { profileAnalyzer, SubscriptionTier, TIER_LIMITS } from './profile-analyzer';
import { db } from '../db';
import { creatorProfiles, analyzedPosts as analyzedPostsTable, profileAnalysisReports, userSubscriptions, userPreferences } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Background Job Service for Creator Profile Analysis
 *
 * Handles long-running analysis jobs (45-70 seconds)
 * Jobs run asynchronously, client polls for status
 */

export interface AnalysisJob {
  id: string;
  userId: string;
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  result?: {
    profileId: number;
    viralScore: number;
    reportId: number;
  };
  createdAt: Date;
  completedAt?: Date;
}

class BackgroundJobService {
  private jobs: Map<string, AnalysisJob> = new Map();

  /**
   * Create a new profile analysis job
   * Prevents duplicate concurrent analyses
   */
  async createAnalysisJob(userId: string, socialHandles: SocialHandles): Promise<string> {
    // Check for existing pending/analyzing jobs for this user
    const existingJob = Array.from(this.jobs.values()).find(
      job => job.userId === userId &&
      (job.status === 'pending' || job.status === 'scraping' || job.status === 'analyzing')
    );

    if (existingJob) {
      logger.info({ existingJobId: existingJob.id, userId }, 'Returning existing analysis job');
      return existingJob.id;
    }

    // Get user's tier immediately to prevent race conditions
    const tier = await this.getUserTier(userId);
    const tierConfig = TIER_LIMITS[tier];

    // Check database for recent analysis and enforce tier-based rate limits
    const profile = await db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
    });

    // Check for in-progress analysis (within last 5 minutes)
    if (profile?.analysisStatus === 'analyzing' || profile?.analysisStatus === 'pending') {
      const lastAnalyzed = profile.lastAnalyzedAt ? new Date(profile.lastAnalyzedAt) : null;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (lastAnalyzed && lastAnalyzed > fiveMinutesAgo) {
        throw new Error('An analysis is already in progress. Please wait for it to complete.');
      }
    }

    // Enforce tier-based rate limits
    if (profile?.lastAnalyzedAt) {
      const now = new Date();
      const lastAnalyzed = new Date(profile.lastAnalyzedAt);

      if (tier === 'starter') {
        // Starter tier: 1 analysis per month
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (lastAnalyzed > thirtyDaysAgo) {
          const nextAvailable = new Date(lastAnalyzed.getTime() + 30 * 24 * 60 * 60 * 1000);
          throw new Error(
            `Starter tier allows 1 analysis per month. Next analysis available on ${nextAvailable.toLocaleDateString()}. Upgrade to Pro for weekly analyses.`
          );
        }
      } else if (tier === 'pro') {
        // Pro tier: 1 analysis per week
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (lastAnalyzed > sevenDaysAgo) {
          const nextAvailable = new Date(lastAnalyzed.getTime() + 7 * 24 * 60 * 60 * 1000);
          throw new Error(
            `Pro tier allows 1 analysis per week. Next analysis available on ${nextAvailable.toLocaleDateString()}. Upgrade to Creator for unlimited daily analyses.`
          );
        }
      } else if (tier === 'creator') {
        // Creator tier: Up to 5 analyses per day (user-controlled)
        // Count analyses in the last 24 hours
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const recentAnalyses = await db.query.profileAnalysisReports.findMany({
          where: and(
            eq(profileAnalysisReports.profileId, profile.id),
            sql`${profileAnalysisReports.createdAt} > ${oneDayAgo.toISOString()}`
          ),
        });

        if (recentAnalyses.length >= 5) {
          throw new Error(
            `Creator tier allows up to 5 analyses per day to prevent abuse. You've used all 5 analyses in the last 24 hours. Please try again later.`
          );
        }
      }
    }

    const jobId = this.generateJobId();

    const job: AnalysisJob = {
      id: jobId,
      userId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start the job asynchronously, passing captured tier to prevent race conditions
    this.runAnalysisJob(jobId, userId, socialHandles, tier).catch(error => {
      logger.error({ error, jobId }, 'Analysis job failed');
    });

    logger.info({
      jobId,
      userId,
      tier,
      estimatedCost: tier === 'starter' ? 0.15 : tier === 'pro' ? 0.30 : 0.45,
      postsToAnalyze: tierConfig.postsAnalyzed
    }, 'Created analysis job');

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): AnalysisJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get user's subscription tier
   * Defaults to 'starter' if no active subscription found
   */
  private async getUserTier(userId: string): Promise<SubscriptionTier> {
    try {
      const VALID_TIERS: SubscriptionTier[] = ['starter', 'pro', 'creator', 'studio'];

      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, userId),
      });

      if (!subscription) {
        logger.debug({ userId }, 'No subscription found, using starter tier');
        return 'starter';
      }

      if (subscription.status !== 'active') {
        logger.info({ userId, status: subscription.status }, 'Inactive subscription, using starter tier');
        return 'starter';
      }

      // Validate and sanitize tier ID
      const normalizedTier = subscription.tierId.trim().toLowerCase();

      if (VALID_TIERS.includes(normalizedTier as SubscriptionTier)) {
        return normalizedTier as SubscriptionTier;
      }

      // Log suspicious tier IDs for security monitoring
      logger.warn({
        userId,
        suspiciousTierId: subscription.tierId,
        subscriptionId: subscription.id
      }, 'Invalid tier ID detected, defaulting to starter');

      return 'starter';
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user tier, defaulting to starter');
      return 'starter';
    }
  }

  /**
   * Run the analysis job (async)
   */
  private async runAnalysisJob(jobId: string, userId: string, socialHandles: SocialHandles, tier: SubscriptionTier): Promise<void> {
    const job = this.jobs.get(jobId)!;

    try {
      // Step 1: Create or get creator profile
      job.status = 'pending';
      job.progress = 5;

      let profile = await db.query.creatorProfiles.findFirst({
        where: eq(creatorProfiles.userId, userId),
      });

      if (!profile) {
        const [newProfile] = await db.insert(creatorProfiles).values({
          userId,
          tiktokUsername: socialHandles.tiktokUsername,
          instagramUsername: socialHandles.instagramUsername,
          youtubeChannelId: socialHandles.youtubeChannelId,
          analysisStatus: 'pending',
        }).returning();
        profile = newProfile;
      } else {
        // Update handles if changed
        await db.update(creatorProfiles)
          .set({
            tiktokUsername: socialHandles.tiktokUsername,
            instagramUsername: socialHandles.instagramUsername,
            youtubeChannelId: socialHandles.youtubeChannelId,
            analysisStatus: 'pending',
          })
          .where(eq(creatorProfiles.id, profile.id));
      }

      logger.info({ profileId: profile.id }, 'Creator profile ready');

      // Step 2: Scrape posts
      job.status = 'scraping';
      job.progress = 10;

      const scrapedPosts = await scraperService.scrapeAllPlatforms(socialHandles, 5);
      logger.info({ count: scrapedPosts.length }, 'Posts scraped successfully');

      job.progress = 40;

      // Step 3: Analyze posts with AI
      job.status = 'analyzing';
      job.progress = 50;

      // Fetch user preferences for niche context
      let userPrefs = null;
      try {
        userPrefs = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });
      } catch (error: any) {
        logger.error({
          error: { message: error?.message, type: error?.constructor?.name },
          userId
        }, 'Failed to fetch user preferences, continuing without niche context');
      }

      // Use tier captured at job start (prevents race conditions)
      logger.info({
        tier,
        userId,
        hasPreferences: !!userPrefs,
        niche: userPrefs?.niche || 'unspecified'
      }, 'Analyzing profile with tier-specific depth');

      const { analyzedPosts, report } = await profileAnalyzer.analyzeProfile(scrapedPosts, tier, userPrefs);
      logger.info({ viralScore: report.viralScore, tier }, 'Analysis complete');

      job.progress = 80;

      // Step 4: Save results to database in a transaction
      job.progress = 85;

      // Use transaction to ensure atomicity - all or nothing
      let savedReportId: number | undefined;

      await db.transaction(async (tx) => {
        // Save analyzed posts
        for (const post of analyzedPosts) {
          await tx.insert(analyzedPostsTable).values({
            profileId: profile.id,
            platform: post.platform,
            postUrl: post.postUrl,
            postId: post.postId,
            viewCount: post.viewCount,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            shareCount: post.shareCount,
            viralElements: post.viralElements,
            contentStructure: post.contentStructure,
            engagementRate: post.engagementRate,
            emotionalTriggers: post.emotionalTriggers,
            postScore: post.postScore,
            whatWorked: post.whatWorked,
            whatDidntWork: post.whatDidntWork,
            improvementTips: post.improvementTips,
          });
        }

        job.progress = 90;

        // Save report and get the ID
        const [savedReport] = await tx.insert(profileAnalysisReports).values({
          profileId: profile.id,
          viralScore: report.viralScore,
          postsAnalyzed: report.postsAnalyzed,
          platformScores: report.platformScores,
          overallStrengths: report.overallStrengths,
          overallWeaknesses: report.overallWeaknesses,
          quickWins: report.quickWins,
          strategicRecommendations: report.strategicRecommendations,
          mostViralPattern: report.mostViralPattern,
          growthPotential: report.growthPotential,
        }).returning();

        savedReportId = savedReport.id;

        job.progress = 95;

        // Store previous score before updating (for before/after comparison)
        const updateData: any = {
          analysisStatus: 'completed',
          lastAnalyzedAt: new Date(),
          viralScore: report.viralScore,
          contentStrengths: report.overallStrengths,
          contentWeaknesses: report.overallWeaknesses,
          recommendedImprovements: report.quickWins,
          tiktokScore: report.platformScores.tiktok,
          instagramScore: report.platformScores.instagram,
          youtubeScore: report.platformScores.youtube,
          updatedAt: new Date(),
        };

        // If profile has an existing score, save it as previous
        if (profile.viralScore !== null && profile.viralScore !== undefined) {
          updateData.previousViralScore = profile.viralScore;
          updateData.previousAnalyzedAt = profile.lastAnalyzedAt;
          
          logger.info({ 
            previousScore: profile.viralScore, 
            newScore: report.viralScore,
            change: report.viralScore - profile.viralScore
          }, 'Storing previous viral score for comparison');
        }

        // Update profile with results
        await tx.update(creatorProfiles)
          .set(updateData)
          .where(eq(creatorProfiles.id, profile.id));
      });

      // Mark job as completed
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        profileId: profile.id,
        viralScore: report.viralScore,
        reportId: savedReportId!,
      };

      logger.info({ jobId, viralScore: report.viralScore }, 'Analysis job completed successfully');

      // Clean up old jobs after 1 hour
      setTimeout(() => {
        this.jobs.delete(jobId);
        logger.debug({ jobId }, 'Cleaned up old job');
      }, 60 * 60 * 1000);

    } catch (error: any) {
      logger.error({ error, jobId }, 'Analysis job failed');

      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      // Update profile status
      try {
        const profile = await db.query.creatorProfiles.findFirst({
          where: eq(creatorProfiles.userId, userId),
        });
        if (profile) {
          await db.update(creatorProfiles)
            .set({ analysisStatus: 'failed' })
            .where(eq(creatorProfiles.id, profile.id));
        }
      } catch (updateError) {
        logger.error({ error: updateError }, 'Failed to update profile status');
      }
    }
  }

  /**
   * Generate cryptographically secure unique job ID
   */
  private generateJobId(): string {
    return `job_${randomUUID()}`;
  }

  /**
   * Clean up completed jobs older than 1 hour
   */
  cleanupOldJobs(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneHourAgo) {
        this.jobs.delete(jobId);
        logger.debug({ jobId }, 'Cleaned up old job');
      }
    }
  }
}

// Singleton instance
export const backgroundJobService = new BackgroundJobService();

// Run cleanup every 15 minutes
setInterval(() => {
  backgroundJobService.cleanupOldJobs();
}, 15 * 60 * 1000);
