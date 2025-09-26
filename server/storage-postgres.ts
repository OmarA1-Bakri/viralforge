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
  users,
  trends,
  userTrends,
  userContent,
  contentAnalysis,
  videoClips,
  userAnalytics,
  processingJobs,
  userActivity
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
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
    let query = db.select().from(trends);
    
    if (platform) {
      query = query.where(eq(trends.platform, platform));
    }
    
    const result = await query.orderBy(desc(trends.createdAt)).limit(limit);
    return result;
  }

  async getTrend(id: number): Promise<Trend | undefined> {
    try {
      const result = await db.select().from(trends).where(eq(trends.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting trend:', error);
      return undefined;
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
    let query = db.select().from(userTrends).where(eq(userTrends.userId, userId));
    
    if (action) {
      query = query.where(and(eq(userTrends.userId, userId), eq(userTrends.action, action)));
    }
    
    const result = await query.orderBy(desc(userTrends.createdAt));
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
    try {
      const result = await db.select().from(userContent).where(eq(userContent.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting content by id:', error);
      return undefined;
    }
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
    try {
      const result = await db.select()
        .from(contentAnalysis)
        .where(eq(contentAnalysis.contentId, contentId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error getting content analysis:', error);
      return undefined;
    }
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
    try {
      const result = await db.select().from(videoClips).where(eq(videoClips.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting clip by id:', error);
      return undefined;
    }
  }

  async updateVideoClip(id: number, updates: Partial<InsertVideoClip>): Promise<VideoClip | undefined> {
    try {
      const result = await db.update(videoClips)
        .set(updates)
        .where(eq(videoClips.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating video clip:', error);
      return undefined;
    }
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

  async getContentAnalysisByUserId(userId: string): Promise<ContentAnalysis[]> {
    const result = await db.select()
      .from(contentAnalysis)
      .innerJoin(userContent, eq(contentAnalysis.contentId, userContent.id))
      .where(eq(userContent.userId, userId))
      .orderBy(desc(contentAnalysis.createdAt));
    
    return result.map(row => row.content_analysis);
  }

  async getVideoClipsByUserId(userId: string): Promise<VideoClip[]> {
    const result = await db.select()
      .from(videoClips)
      .innerJoin(userContent, eq(videoClips.contentId, userContent.id))
      .where(eq(userContent.userId, userId))
      .orderBy(desc(videoClips.createdAt));
    
    return result.map(row => row.video_clips);
  }

  async getUserTrendInteractions(userId: string): Promise<UserTrends[]> {
    const result = await db.select()
      .from(userTrends)
      .where(eq(userTrends.userId, userId))
      .orderBy(desc(userTrends.createdAt));
    
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
}