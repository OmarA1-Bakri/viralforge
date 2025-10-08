import {
  type User,
  type InsertUser,
  type Trend,
  type InsertTrend,
  type UserTrends,
  type InsertUserTrends,
  type UserContent,
  type InsertUserContent,
  type ContentAnalysis,
  type InsertContentAnalysis,
  type VideoClip,
  type InsertVideoClip,
  type UserAnalytics,
  type InsertUserAnalytics,
  type ProcessingJob,
  type InsertProcessingJob,
  type UserActivity,
  type InsertUserActivity,
  type UserPreferences,
  type InsertUserPreferences,
  type ViralAnalysis,
  type InsertViralAnalysis,
  type TrendApplication,
  type InsertTrendApplication,
  type AutomationJob,
  type InsertAutomationJob,
  users,
  trends,
  userTrends,
  userContent,
  contentAnalysis,
  videoClips,
  userAnalytics,
  processingJobs,
  userActivity,
  userPreferences,
  viralAnalyses,
  trendApplications,
  automationJobs
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sql } from "drizzle-orm";
import { IStorage } from "./storage";
import { logger } from "./lib/logger";

export class PostgresStorage implements IStorage {
  
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  // Trend methods
  async createTrend(insertTrend: InsertTrend): Promise<Trend> {
    const result = await db.insert(trends).values({
      ...insertTrend,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTrends(platform?: string, limit = 20): Promise<Trend[]> {
    if (platform) {
      const result = await db.select()
        .from(trends)
        .where(eq(trends.platform, platform))
        .orderBy(desc(trends.createdAt))
        .limit(limit);
      return result;
    }
    
    const result = await db.select()
      .from(trends)
      .orderBy(desc(trends.createdAt))
      .limit(limit);
    return result;
  }

  async getTrend(id: number): Promise<Trend | undefined> {
    const result = await db.select().from(trends).where(eq(trends.id, id)).limit(1);
    return result[0];
  }

  // Get trends filtered by user preferences
  async getTrendsByUserPreferences(userPrefs: UserPreferences, limit: number = 10): Promise<Trend[]> {
    try {
      // Build profile filters (AND logic - must match ALL profile attributes)
      const profileFilters = [];

      if (userPrefs.niche) {
        profileFilters.push(eq(trends.targetNiche, userPrefs.niche));
      }
      if (userPrefs.targetAudience) {
        profileFilters.push(eq(trends.targetAudience, userPrefs.targetAudience));
      }
      if (userPrefs.contentStyle) {
        profileFilters.push(eq(trends.contentStyle, userPrefs.contentStyle));
      }

      // Build category filters (OR logic - match ANY preferred category)
      const categoryFilter = userPrefs.preferredCategories && userPrefs.preferredCategories.length > 0
        ? or(...userPrefs.preferredCategories.map(cat => eq(trends.category, cat)))
        : undefined;

      // No preferences set at all
      if (profileFilters.length === 0 && !categoryFilter) {
        logger.debug('No user preferences set, returning general trends');
        return this.getTrends(undefined, limit);
      }

      // Combine: profile filters AND category filters
      const whereConditions = [];
      if (profileFilters.length > 0) {
        whereConditions.push(and(...profileFilters));
      }
      if (categoryFilter) {
        whereConditions.push(categoryFilter);
      }

      const startTime = Date.now();
      const result = await db.select()
        .from(trends)
        .where(and(...whereConditions))
        .orderBy(desc(trends.createdAt))
        .limit(limit);

      const duration = Date.now() - startTime;
      logger.debug({
        duration,
        filterCount: whereConditions.length,
        resultCount: result.length,
        userPrefs
      }, 'Personalized trend query completed');

      // Fallback if no matches
      if (result.length === 0) {
        logger.info('No trends match preferences, falling back to general trends');
        return this.getTrends(undefined, limit);
      }

      return result;

    } catch (error) {
      logger.error({ error, userPrefs }, 'Failed to fetch personalized trends');
      return this.getTrends(undefined, limit);
    }
  }

  // User-trend interactions
  async createUserTrendAction(insertUserTrend: InsertUserTrends): Promise<UserTrends> {
    const result = await db.insert(userTrends).values({
      ...insertUserTrend,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getUserTrendActions(userId: string, action?: string): Promise<UserTrends[]> {
    if (action) {
      const result = await db.select()
        .from(userTrends)
        .where(and(eq(userTrends.userId, userId), eq(userTrends.action, action)))
        .orderBy(desc(userTrends.createdAt));
      return result;
    }
    
    const result = await db.select()
      .from(userTrends)
      .where(eq(userTrends.userId, userId))
      .orderBy(desc(userTrends.createdAt));
    return result;
  }

  // Content methods
  async createUserContent(insertContent: InsertUserContent): Promise<UserContent> {
    const result = await db.insert(userContent).values({
      ...insertContent,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getUserContent(userId: string): Promise<UserContent[]> {
    const result = await db.select()
      .from(userContent)
      .where(eq(userContent.userId, userId))
      .orderBy(desc(userContent.createdAt));
    
    return result;
  }

  async getContentById(id: number): Promise<UserContent | undefined> {
    const result = await db.select().from(userContent).where(eq(userContent.id, id)).limit(1);
    return result[0];
  }

  async updateUserContent(id: number, updates: Partial<UserContent>): Promise<UserContent> {
    const result = await db.update(userContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userContent.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error("Content not found");
    }
    
    return result[0];
  }

  // Content analysis
  async createContentAnalysis(insertAnalysis: InsertContentAnalysis): Promise<ContentAnalysis> {
    const result = await db.insert(contentAnalysis).values({
      ...insertAnalysis,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getContentAnalysis(contentId: number): Promise<ContentAnalysis | undefined> {
    const result = await db.select()
      .from(contentAnalysis)
      .where(eq(contentAnalysis.contentId, contentId))
      .limit(1);
    
    return result[0];
  }

  // Video clips
  async createVideoClip(insertClip: InsertVideoClip): Promise<VideoClip> {
    const result = await db.insert(videoClips).values({
      ...insertClip,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getVideoClips(contentId: number): Promise<VideoClip[]> {
    const result = await db.select()
      .from(videoClips)
      .where(eq(videoClips.contentId, contentId))
      .orderBy(videoClips.startTime);
    
    return result;
  }

  async getClipById(id: number): Promise<VideoClip | undefined> {
    const result = await db.select().from(videoClips).where(eq(videoClips.id, id)).limit(1);
    return result[0];
  }

  async updateVideoClip(id: number, updates: Partial<InsertVideoClip>): Promise<VideoClip | undefined> {
    const result = await db.update(videoClips)
      .set(updates)
      .where(eq(videoClips.id, id))
      .returning();
    
    return result[0];
  }

  // Processing jobs
  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const result = await db.insert(processingJobs).values({
      ...insertJob,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getProcessingJobs(userId: string): Promise<ProcessingJob[]> {
    const result = await db.select()
      .from(processingJobs)
      .where(eq(processingJobs.userId, userId))
      .orderBy(desc(processingJobs.createdAt));
    
    return result;
  }

  async updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const result = await db.update(processingJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(processingJobs.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error("Processing job not found");
    }
    
    return result[0];
  }

  // User activity
  async createUserActivity(insertActivity: InsertUserActivity): Promise<UserActivity> {
    const result = await db.insert(userActivity).values({
      ...insertActivity,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getUserActivity(userId: string, limit = 50, timeframe = 'week'): Promise<UserActivity[]> {
    // Calculate cutoff date based on timeframe
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timeframe) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoffDate.setDate(now.getDate() - 7);
    }

    const result = await db.select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, userId),
        gte(userActivity.createdAt, cutoffDate)
      ))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit);
    
    return result;
  }

  // Analytics aggregation methods
  async getUserAnalytics(userId: string): Promise<UserAnalytics[]> {
    const result = await db.select()
      .from(userAnalytics)
      .where(eq(userAnalytics.userId, userId))
      .orderBy(desc(userAnalytics.recordedAt));
    
    return result;
  }

  async createUserAnalytics(insertAnalytics: InsertUserAnalytics): Promise<UserAnalytics> {
    const result = await db.insert(userAnalytics).values({
      ...insertAnalytics,
      recordedAt: insertAnalytics.recordedAt || new Date()
    }).returning();

    return result[0];
  }

  async deleteUserAnalytics(userId: string): Promise<void> {
    await db.delete(userAnalytics)
      .where(eq(userAnalytics.userId, userId));
  }

  async getContentAnalysisByUserId(userId: string): Promise<ContentAnalysis[]> {
    const result = await db.select({
      analysis: contentAnalysis
    })
      .from(contentAnalysis)
      .innerJoin(userContent, eq(contentAnalysis.contentId, userContent.id))
      .where(eq(userContent.userId, userId))
      .orderBy(desc(contentAnalysis.createdAt));
    
    return result.map(row => row.analysis);
  }

  async getVideoClipsByUserId(userId: string): Promise<VideoClip[]> {
    const result = await db.select({
      clip: videoClips
    })
      .from(videoClips)
      .innerJoin(userContent, eq(videoClips.contentId, userContent.id))
      .where(eq(userContent.userId, userId))
      .orderBy(desc(videoClips.createdAt));
    
    return result.map(row => row.clip);
  }

  async getUserTrendInteractions(userId: string): Promise<UserTrends[]> {
    const result = await db.select()
      .from(userTrends)
      .where(eq(userTrends.userId, userId))
      .orderBy(desc(userTrends.createdAt));
    
    return result;
  }

  // User preferences
  async saveUserPreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreferences> {
    // Check if preferences already exist
    const existing = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing preferences
      const result = await db.update(userPreferences)
        .set({ ...prefs, lastUpdated: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      
      return result[0];
    } else {
      // Insert new preferences
      const result = await db.insert(userPreferences)
        .values({
          ...prefs,
          userId,
          createdAt: new Date(),
          lastUpdated: new Date()
        })
        .returning();
      
      return result[0];
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const result = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return result[0] || null;
  }

  // Viral analysis methods
  async createViralAnalysis(insertAnalysis: InsertViralAnalysis): Promise<ViralAnalysis> {
    const result = await db.insert(viralAnalyses).values({
      ...insertAnalysis,
      createdAt: new Date()
    }).returning();

    return result[0];
  }

  async getViralAnalysis(trendId: number): Promise<ViralAnalysis | undefined> {
    const result = await db.select()
      .from(viralAnalyses)
      .where(eq(viralAnalyses.trendId, trendId))
      .limit(1);

    return result[0];
  }

  async getViralAnalysisByTrendId(trendId: number): Promise<ViralAnalysis | undefined> {
    return this.getViralAnalysis(trendId);
  }

  // Trend application methods
  async createTrendApplication(insertApplication: InsertTrendApplication): Promise<TrendApplication> {
    const result = await db.insert(trendApplications).values({
      ...insertApplication,
      createdAt: new Date()
    }).returning();

    return result[0];
  }

  async getTrendApplicationsByUser(userId: string): Promise<TrendApplication[]> {
    const result = await db.select()
      .from(trendApplications)
      .where(eq(trendApplications.userId, userId))
      .orderBy(desc(trendApplications.createdAt));

    return result;
  }

  async getTrendApplicationsByTrend(trendId: number): Promise<TrendApplication[]> {
    const result = await db.select()
      .from(trendApplications)
      .where(eq(trendApplications.trendId, trendId))
      .orderBy(desc(trendApplications.createdAt));

    return result;
  }

  // Additional methods for automation system
  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async getProcessingJobsByStatus(status: string): Promise<ProcessingJob[]> {
    const result = await db.select()
      .from(processingJobs)
      .where(eq(processingJobs.status, status))
      .orderBy(desc(processingJobs.createdAt));

    return result;
  }

  // Automation methods
  async createAutomationJob(insertJob: InsertAutomationJob): Promise<AutomationJob> {
    const result = await db.insert(automationJobs).values({
      ...insertJob,
      createdAt: new Date()
    }).returning();

    return result[0];
  }
}