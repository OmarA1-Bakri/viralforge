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
  type ProcessingJob,
  type InsertProcessingJob,
  type UserActivity,
  type InsertUserActivity
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trend methods
  createTrend(trend: InsertTrend): Promise<Trend>;
  getTrends(platform?: string, limit?: number): Promise<Trend[]>;
  getTrend(id: number): Promise<Trend | undefined>;
  
  // User-trend interactions
  createUserTrendAction(userTrend: InsertUserTrends): Promise<UserTrends>;
  getUserTrendActions(userId: string, action?: string): Promise<UserTrends[]>;
  
  // Content methods
  createUserContent(content: InsertUserContent): Promise<UserContent>;
  getUserContent(userId: string): Promise<UserContent[]>;
  getContentById(id: number): Promise<UserContent | undefined>;
  updateUserContent(id: number, updates: Partial<UserContent>): Promise<UserContent>;
  
  // Content analysis
  createContentAnalysis(analysis: InsertContentAnalysis): Promise<ContentAnalysis>;
  getContentAnalysis(contentId: number): Promise<ContentAnalysis | undefined>;
  
  // Video clips
  createVideoClip(clip: InsertVideoClip): Promise<VideoClip>;
  getVideoClips(contentId: number): Promise<VideoClip[]>;
  
  // Processing jobs
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJobs(userId: string): Promise<ProcessingJob[]>;
  updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob>;
  
  // User activity
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivity(userId: string, limit?: number): Promise<UserActivity[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trends: Map<number, Trend>;
  private userTrends: Map<string, UserTrends>; // key: `${userId}-${trendId}-${action}`
  private userContent: Map<number, UserContent>;
  private contentAnalysis: Map<number, ContentAnalysis>;
  private videoClips: Map<number, VideoClip>;
  private processingJobs: Map<number, ProcessingJob>;
  private userActivity: Map<number, UserActivity>;
  
  private nextTrendId = 1;
  private nextContentId = 1;
  private nextAnalysisId = 1;
  private nextClipId = 1;
  private nextJobId = 1;
  private nextActivityId = 1;

  constructor() {
    this.users = new Map();
    this.trends = new Map();
    this.userTrends = new Map();
    this.userContent = new Map();
    this.contentAnalysis = new Map();
    this.videoClips = new Map();
    this.processingJobs = new Map();
    this.userActivity = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Trend methods
  async createTrend(insertTrend: InsertTrend): Promise<Trend> {
    const id = this.nextTrendId++;
    const trend: Trend = {
      ...insertTrend,
      id,
      sound: insertTrend.sound ?? null,
      thumbnailUrl: insertTrend.thumbnailUrl ?? null,
      createdAt: new Date(),
    };
    this.trends.set(id, trend);
    return trend;
  }

  async getTrends(platform?: string, limit = 20): Promise<Trend[]> {
    let trends = Array.from(this.trends.values());
    
    if (platform) {
      trends = trends.filter(t => t.platform === platform);
    }
    
    return trends
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getTrend(id: number): Promise<Trend | undefined> {
    return this.trends.get(id);
  }

  // User-trend interactions
  async createUserTrendAction(insertUserTrend: InsertUserTrends): Promise<UserTrends> {
    const key = `${insertUserTrend.userId}-${insertUserTrend.trendId}-${insertUserTrend.action}`;
    const userTrend: UserTrends = {
      id: Math.floor(Math.random() * 10000), // Simple ID for in-memory storage
      ...insertUserTrend,
      createdAt: new Date(),
    };
    this.userTrends.set(key, userTrend);
    return userTrend;
  }

  async getUserTrendActions(userId: string, action?: string): Promise<UserTrends[]> {
    return Array.from(this.userTrends.values()).filter(ut => 
      ut.userId === userId && (!action || ut.action === action)
    );
  }

  // Content methods
  async createUserContent(insertContent: InsertUserContent): Promise<UserContent> {
    const id = this.nextContentId++;
    const content: UserContent = {
      ...insertContent,
      id,
      title: insertContent.title ?? null,
      description: insertContent.description ?? null,
      thumbnailUrl: insertContent.thumbnailUrl ?? null,
      videoUrl: insertContent.videoUrl ?? null,
      derivedFromTrendId: insertContent.derivedFromTrendId ?? null,
      status: insertContent.status ?? "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userContent.set(id, content);
    return content;
  }

  async getUserContent(userId: string): Promise<UserContent[]> {
    return Array.from(this.userContent.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getContentById(id: number): Promise<UserContent | undefined> {
    return this.userContent.get(id);
  }

  async updateUserContent(id: number, updates: Partial<UserContent>): Promise<UserContent> {
    const existing = this.userContent.get(id);
    if (!existing) {
      throw new Error("Content not found");
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.userContent.set(id, updated);
    return updated;
  }

  // Content analysis
  async createContentAnalysis(insertAnalysis: InsertContentAnalysis): Promise<ContentAnalysis> {
    const id = this.nextAnalysisId++;
    const analysis: ContentAnalysis = {
      ...insertAnalysis,
      id,
      roastMode: insertAnalysis.roastMode ?? false,
      createdAt: new Date(),
    };
    this.contentAnalysis.set(id, analysis);
    return analysis;
  }

  async getContentAnalysis(contentId: number): Promise<ContentAnalysis | undefined> {
    return Array.from(this.contentAnalysis.values()).find(a => a.contentId === contentId);
  }

  // Video clips
  async createVideoClip(insertClip: InsertVideoClip): Promise<VideoClip> {
    const id = this.nextClipId++;
    const clip: VideoClip = {
      ...insertClip,
      id,
      description: insertClip.description ?? null,
      clipUrl: insertClip.clipUrl ?? null,
      thumbnailUrl: insertClip.thumbnailUrl ?? null,
      viralScore: insertClip.viralScore ?? null,
      status: insertClip.status ?? "processing",
      createdAt: new Date(),
    };
    this.videoClips.set(id, clip);
    return clip;
  }

  async getVideoClips(contentId: number): Promise<VideoClip[]> {
    return Array.from(this.videoClips.values())
      .filter(c => c.contentId === contentId)
      .sort((a, b) => a.startTime - b.startTime);
  }

  // Processing jobs
  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = this.nextJobId++;
    const job: ProcessingJob = {
      ...insertJob,
      id,
      targetId: insertJob.targetId ?? null,
      error: insertJob.error ?? null,
      status: insertJob.status ?? "pending",
      progress: insertJob.progress ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.processingJobs.set(id, job);
    return job;
  }

  async getProcessingJobs(userId: string): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values())
      .filter(j => j.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const existing = this.processingJobs.get(id);
    if (!existing) {
      throw new Error("Processing job not found");
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.processingJobs.set(id, updated);
    return updated;
  }

  // User activity
  async createUserActivity(insertActivity: InsertUserActivity): Promise<UserActivity> {
    const id = this.nextActivityId++;
    const activity: UserActivity = {
      ...insertActivity,
      id,
      contentId: insertActivity.contentId ?? null,
      trendId: insertActivity.trendId ?? null,
      metadata: insertActivity.metadata ? {
        views: insertActivity.metadata.views?.toString(),
        engagement: insertActivity.metadata.engagement?.toString(),
        score: insertActivity.metadata.score?.toString(),
        clips: insertActivity.metadata.clips?.toString(),
      } : null,
      createdAt: new Date(),
    };
    this.userActivity.set(id, activity);
    return activity;
  }

  async getUserActivity(userId: string, limit = 50): Promise<UserActivity[]> {
    return Array.from(this.userActivity.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
