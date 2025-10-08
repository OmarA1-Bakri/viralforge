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
  trendApplications
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

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
  getTrendsByUserPreferences(userPrefs: UserPreferences, limit?: number): Promise<Trend[]>;
  
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
  getUserActivity(userId: string, limit?: number, timeframe?: string): Promise<UserActivity[]>;
  
  // User preferences
  saveUserPreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreferences>;
  getUserPreferences(userId: string): Promise<UserPreferences | null>;

  // Viral analysis methods
  createViralAnalysis(analysis: InsertViralAnalysis): Promise<ViralAnalysis>;
  getViralAnalysis(trendId: number): Promise<ViralAnalysis | undefined>;
  getViralAnalysisByTrendId(trendId: number): Promise<ViralAnalysis | undefined>;

  // Trend application methods
  createTrendApplication(application: InsertTrendApplication): Promise<TrendApplication>;
  getTrendApplicationsByUser(userId: string): Promise<TrendApplication[]>;
  getTrendApplicationsByTrend(trendId: number): Promise<TrendApplication[]>;

  // Analytics methods
  getUserAnalytics(userId: string): Promise<UserAnalytics[]>;
  createUserAnalytics(insertAnalytics: InsertUserAnalytics): Promise<UserAnalytics>;
  deleteUserAnalytics(userId: string): Promise<void>;
  getContentAnalysisByUserId(userId: string): Promise<ContentAnalysis[]>;
  getVideoClipsByUserId(userId: string): Promise<VideoClip[]>;
  getUserTrendInteractions(userId: string): Promise<UserTrends[]>;
  getClipById(id: number): Promise<VideoClip | undefined>;
  updateVideoClip(id: number, updates: Partial<InsertVideoClip>): Promise<VideoClip | undefined>;

  // Automation methods
  createAutomationJob(job: InsertAutomationJob): Promise<AutomationJob>;
}

import { PostgresStorage } from './storage-postgres';

export const storage = new PostgresStorage();

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trends: Map<number, Trend>;
  private userTrends: Map<string, UserTrends>; // key: `${userId}-${trendId}-${action}`
  private userTrendInteractions: Map<number, UserTrends>;
  private userContent: Map<number, UserContent>;
  private contentAnalysis: Map<number, ContentAnalysis>;
  private videoClips: Map<number, VideoClip>;
  private userAnalytics: Map<number, UserAnalytics>;
  private processingJobs: Map<number, ProcessingJob>;
  private userActivity: Map<number, UserActivity>;
  
  private nextTrendId = 1;
  private nextContentId = 1;
  private nextAnalysisId = 1;
  private nextClipId = 1;
  private nextUserAnalyticsId = 1;
  private nextJobId = 1;
  private nextActivityId = 1;

  constructor() {
    this.users = new Map();
    this.trends = new Map();
    this.userTrends = new Map();
    this.userTrendInteractions = new Map();
    this.userContent = new Map();
    this.contentAnalysis = new Map();
    this.videoClips = new Map();
    this.userAnalytics = new Map();
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
    const user: User = { ...insertUser, id, createdAt: new Date() };
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

  async getTrendsByUserPreferences(userPrefs: UserPreferences, limit = 10): Promise<Trend[]> {
    let trends = Array.from(this.trends.values());
    
    // Use OR logic - match trends that align with ANY user preference
    const matchedTrends = trends.filter(trend => {
      let matches = false;
      
      // Match by niche
      if (userPrefs.niche && trend.targetNiche === userPrefs.niche) {
        matches = true;
      }
      
      // Match by target audience
      if (userPrefs.targetAudience && trend.targetAudience === userPrefs.targetAudience) {
        matches = true;
      }
      
      // Match by content style
      if (userPrefs.contentStyle && trend.contentStyle === userPrefs.contentStyle) {
        matches = true;
      }
      
      // Match by preferred categories
      if (userPrefs.preferredCategories && userPrefs.preferredCategories.length > 0) {
        if (userPrefs.preferredCategories.includes(trend.category)) {
          matches = true;
        }
      }
      
      return matches;
    });
    
    // If no preferences set or no matches, return all trends
    const finalTrends = matchedTrends.length > 0 ? matchedTrends : trends;
    
    return finalTrends
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
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

  async getClipById(id: number): Promise<VideoClip | undefined> {
    return this.videoClips.get(id);
  }

  async updateVideoClip(id: number, updates: Partial<InsertVideoClip>): Promise<VideoClip | undefined> {
    const existingClip = this.videoClips.get(id);
    if (!existingClip) {
      return undefined;
    }

    const updatedClip: VideoClip = {
      ...existingClip,
      ...updates,
      clipUrl: updates.clipUrl !== undefined ? updates.clipUrl : existingClip.clipUrl,
      thumbnailUrl: updates.thumbnailUrl !== undefined ? updates.thumbnailUrl : existingClip.thumbnailUrl,
      viralScore: updates.viralScore !== undefined ? updates.viralScore : existingClip.viralScore,
      description: updates.description !== undefined ? updates.description : existingClip.description,
    };

    this.videoClips.set(id, updatedClip);
    return updatedClip;
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
      metadata: insertActivity.metadata || null,
      createdAt: new Date(),
    };
    this.userActivity.set(id, activity);
    return activity;
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
        cutoffDate.setDate(now.getDate() - 7); // Default to week
    }

    return Array.from(this.userActivity.values())
      .filter(a => a.userId === userId && a.createdAt >= cutoffDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Analytics aggregation methods
  async getUserAnalytics(userId: string): Promise<UserAnalytics[]> {
    return Array.from(this.userAnalytics.values())
      .filter(a => a.userId === userId);
  }

  async createUserAnalytics(insertAnalytics: InsertUserAnalytics): Promise<UserAnalytics> {
    const id = this.nextUserAnalyticsId++;
    const analytics: UserAnalytics = {
      id,
      userId: insertAnalytics.userId,
      contentId: insertAnalytics.contentId ?? null,
      platform: insertAnalytics.platform,
      views: insertAnalytics.views ?? 0,
      likes: insertAnalytics.likes ?? 0,
      shares: insertAnalytics.shares ?? 0,
      comments: insertAnalytics.comments ?? 0,
      clickRate: insertAnalytics.clickRate ?? null,
      recordedAt: insertAnalytics.recordedAt || new Date(),
    };
    this.userAnalytics.set(id, analytics);
    return analytics;
  }

  async deleteUserAnalytics(userId: string): Promise<void> {
    const analyticsToDelete = Array.from(this.userAnalytics.entries())
      .filter(([_, analytics]) => analytics.userId === userId)
      .map(([id]) => id);

    analyticsToDelete.forEach(id => this.userAnalytics.delete(id));
  }

  async getContentAnalysisByUserId(userId: string): Promise<ContentAnalysis[]> {
    const userContent = await this.getUserContent(userId);
    const contentIds = userContent.map(c => c.id);
    
    return Array.from(this.contentAnalysis.values())
      .filter(a => contentIds.includes(a.contentId));
  }

  async getVideoClipsByUserId(userId: string): Promise<VideoClip[]> {
    const userContent = await this.getUserContent(userId);
    const contentIds = userContent.map(c => c.id);
    
    return Array.from(this.videoClips.values())
      .filter(c => contentIds.includes(c.contentId));
  }

  async getUserTrendInteractions(userId: string): Promise<UserTrends[]> {
    return Array.from(this.userTrends.values())
      .filter(ut => ut.userId === userId);
  }

  // Viral analysis methods
  private viralAnalyses: Map<number, ViralAnalysis> = new Map();
  private nextViralAnalysisId = 1;

  async createViralAnalysis(insertAnalysis: InsertViralAnalysis): Promise<ViralAnalysis> {
    const id = this.nextViralAnalysisId++;
    const analysis: ViralAnalysis = {
      ...insertAnalysis,
      id,
      thumbnailAnalysis: insertAnalysis.thumbnailAnalysis ?? null,
      patternType: insertAnalysis.patternType ?? null,
      audioStrategy: insertAnalysis.audioStrategy ?? null,
      hashtagStrategy: insertAnalysis.hashtagStrategy ?? null,
      engagementRate: insertAnalysis.engagementRate ?? null,
      createdAt: new Date(),
      expiresAt: insertAnalysis.expiresAt ?? null,
    };
    this.viralAnalyses.set(id, analysis);
    return analysis;
  }

  async getViralAnalysis(trendId: number): Promise<ViralAnalysis | undefined> {
    return Array.from(this.viralAnalyses.values()).find(a => a.trendId === trendId);
  }

  async getViralAnalysisByTrendId(trendId: number): Promise<ViralAnalysis | undefined> {
    return this.getViralAnalysis(trendId);
  }

  // Trend application methods
  private trendApplications: Map<number, TrendApplication> = new Map();
  private nextTrendApplicationId = 1;

  async createTrendApplication(insertApplication: InsertTrendApplication): Promise<TrendApplication> {
    const id = this.nextTrendApplicationId++;
    const application: TrendApplication = {
      ...insertApplication,
      id,
      analysisId: insertApplication.analysisId ?? null,
      userContentConcept: insertApplication.userContentConcept ?? null,
      wasHelpful: insertApplication.wasHelpful ?? null,
      createdAt: new Date(),
    };
    this.trendApplications.set(id, application);
    return application;
  }

  async getTrendApplicationsByUser(userId: string): Promise<TrendApplication[]> {
    return Array.from(this.trendApplications.values())
      .filter(app => app.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTrendApplicationsByTrend(trendId: number): Promise<TrendApplication[]> {
    return Array.from(this.trendApplications.values())
      .filter(app => app.trendId === trendId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Missing automation methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getProcessingJobsByStatus(status: string): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values())
      .filter(job => job.status === status);
  }
}
