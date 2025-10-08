import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, real, boolean, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(), // "user", "premium", "pro", "admin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trends discovered by AI
export const trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  platform: text("platform").notNull(), // "tiktok", "youtube", "instagram"
  hotness: text("hotness").notNull(), // "hot", "rising", "relevant"
  engagement: integer("engagement").notNull(),
  hashtags: text("hashtags").array().notNull(),
  sound: text("sound"),
  suggestion: text("suggestion").notNull(), // AI suggestion for using this trend
  timeAgo: text("time_ago").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  // Optional personalization fields for filtering
  targetNiche: text("target_niche"), // Which niche this trend is optimized for
  targetAudience: text("target_audience"), // gen-z, millennials, etc.
  contentStyle: text("content_style"), // entertainment, educational, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User-trend interactions (saves, likes, etc.)
export const userTrends = pgTable("user_trends", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  trendId: integer("trend_id").references(() => trends.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // "saved", "liked", "used"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userTrendActionUnique: unique().on(table.userId, table.trendId, table.action),
}));

// Viral pattern analyses - cached AI breakdowns of trending videos
export const viralAnalyses = pgTable("viral_analyses", {
  id: serial("id").primaryKey(),
  trendId: integer("trend_id").references(() => trends.id, { onDelete: "cascade" }).notNull(),
  thumbnailAnalysis: text("thumbnail_analysis"), // What Grok Vision sees in thumbnail
  whyItWorks: text("why_it_works").notNull(), // AI explanation of viral elements
  keyTakeaways: text("key_takeaways").array().notNull(), // 3-5 bullet points
  patternType: text("pattern_type"), // "pov_format", "tutorial", "trending_audio", etc.
  audioStrategy: text("audio_strategy"), // How audio contributes to virality
  hashtagStrategy: text("hashtag_strategy"), // Hashtag usage analysis
  engagementRate: real("engagement_rate"), // likes/views ratio
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Cache expiration (7 days)
});

// Personalized advice when users click "Use This"
export const trendApplications = pgTable("trend_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  trendId: integer("trend_id").references(() => trends.id, { onDelete: "cascade" }).notNull(),
  analysisId: integer("analysis_id").references(() => viralAnalyses.id),
  userContentConcept: text("user_content_concept"), // User's text description of their content
  personalizedAdvice: text("personalized_advice").notNull(), // AI-generated advice
  wasHelpful: boolean("was_helpful"), // User feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User's content they want to analyze/optimize
export const userContent = pgTable("user_content", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  derivedFromTrendId: integer("derived_from_trend_id").references(() => trends.id),
  title: text("title"),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  platform: text("platform").notNull(), // target platform
  status: text("status").notNull().default("draft"), // "draft", "analyzing", "ready", "published"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Analysis results from Launch Pad
export const contentAnalysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").references(() => userContent.id, { onDelete: "cascade" }).notNull(),
  clickabilityScore: real("clickability_score").notNull(),
  clarityScore: real("clarity_score").notNull(),
  intrigueScore: real("intrigue_score").notNull(),
  emotionScore: real("emotion_score").notNull(),
  feedback: json("feedback").$type<{
    thumbnail: string;
    title: string;
    overall: string;
  }>().notNull(),
  suggestions: text("suggestions").array().notNull(),
  roastMode: boolean("roast_mode").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Video clips generated by Multiplier
export const videoClips = pgTable("video_clips", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").references(() => userContent.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: real("start_time").notNull(), // seconds
  endTime: real("end_time").notNull(), // seconds
  clipUrl: text("clip_url"),
  thumbnailUrl: text("thumbnail_url"),
  viralScore: real("viral_score"),
  status: text("status").notNull().default("processing"), // "processing", "ready", "published"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User analytics and performance data
export const userAnalytics = pgTable("user_analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  contentId: integer("content_id").references(() => userContent.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  clickRate: real("click_rate"), // percentage
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Background job processing for async tasks
export const processingJobs = pgTable("processing_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  targetType: text("target_type").notNull(), // "content_analysis", "video_clip", "trend_discovery"
  targetId: integer("target_id"), // ID of the target record
  jobType: text("job_type").notNull(), // "analyze_content", "generate_clips", "find_trends"
  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"
  progress: integer("progress").default(0).notNull(), // 0-100
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity log for dashboard
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type").notNull(), // "video", "trend", "optimization", "clip"
  title: text("title").notNull(),
  status: text("status").notNull(),
  contentId: integer("content_id").references(() => userContent.id, { onDelete: "cascade" }),
  trendId: integer("trend_id").references(() => trends.id),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User automation settings (BullMQ-based)
export const userAutomationSettings = pgTable("user_automation_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  // Trend Discovery
  trendDiscoveryEnabled: boolean("trend_discovery_enabled").default(false).notNull(),
  trendDiscoveryInterval: text("trend_discovery_interval").default("daily").notNull(), // "4hours", "daily", "weekly"
  lastTrendDiscoveryRun: timestamp("last_trend_discovery_run"),
  // Content Scoring
  contentScoringEnabled: boolean("content_scoring_enabled").default(false).notNull(),
  contentScoringInterval: text("content_scoring_interval").default("daily").notNull(), // "hourly", "4hours", "daily"
  lastContentScoringRun: timestamp("last_content_scoring_run"),
  // Video Processing
  videoProcessingEnabled: boolean("video_processing_enabled").default(false).notNull(),
  videoProcessingInterval: text("video_processing_interval").default("daily").notNull(), // "daily", "weekly"
  lastVideoProcessingRun: timestamp("last_video_processing_run"),
  // Usage tracking
  monthlyCostUsd: real("monthly_cost_usd").default(0).notNull(),
  monthlyJobCount: integer("monthly_job_count").default(0).notNull(),
  monthResetAt: timestamp("month_reset_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Automation job execution history
export const automationJobs = pgTable("automation_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  jobType: text("job_type").notNull(), // "trend_discovery", "content_scoring", "video_processing"
  status: text("status").notNull().default("pending"), // "pending", "running", "completed", "failed"
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  costUsd: real("cost_usd").default(0).notNull(),
  recordsCreated: integer("records_created").default(0).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for forms
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTrendSchema = createInsertSchema(trends).omit({
  id: true,
  createdAt: true,
});

export const insertUserContentSchema = createInsertSchema(userContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentAnalysisSchema = createInsertSchema(contentAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertVideoClipSchema = createInsertSchema(videoClips).omit({
  id: true,
  createdAt: true,
});

export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).omit({
  id: true,
});

export const insertUserTrendsSchema = createInsertSchema(userTrends).omit({
  id: true,
  createdAt: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export const insertUserAutomationSettingsSchema = createInsertSchema(userAutomationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationJobSchema = createInsertSchema(automationJobs).omit({
  id: true,
  createdAt: true,
});

export const insertViralAnalysisSchema = createInsertSchema(viralAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertTrendApplicationSchema = createInsertSchema(trendApplications).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// CREATOR PROFILE ANALYSIS TABLES (Added 2025-10-05)
// ============================================================================

// Creator profiles with social media handles and viral score
export const creatorProfiles = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),

  // Social media handles
  tiktokUsername: text("tiktok_username"),
  instagramUsername: text("instagram_username"),
  youtubeChannelId: text("youtube_channel_id"),

  // Analysis status
  analysisStatus: text("analysis_status").default("pending").notNull(), // pending, analyzing, completed, failed
  lastAnalyzedAt: timestamp("last_analyzed_at"),

  // Viral Score (0-100)
  viralScore: integer("viral_score"),
  
  // Previous score for comparison (simple before/after tracking)
  previousViralScore: integer("previous_viral_score"),
  previousAnalyzedAt: timestamp("previous_analyzed_at"),

  // Aggregated insights
  contentStrengths: text("content_strengths").array(),
  contentWeaknesses: text("content_weaknesses").array(),
  recommendedImprovements: text("recommended_improvements").array(),

  // Platform-specific scores
  tiktokScore: integer("tiktok_score"),
  instagramScore: integer("instagram_score"),
  youtubeScore: integer("youtube_score"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual posts analyzed from creator's profile
export const analyzedPosts = pgTable("analyzed_posts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => creatorProfiles.id, { onDelete: "cascade" }).notNull(),

  // Post metadata
  platform: text("platform").notNull(), // 'tiktok', 'instagram', 'youtube'
  postUrl: text("post_url").notNull(),
  postId: text("post_id").notNull(),

  // Scraped data
  title: text("title"),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  viewCount: integer("view_count"),
  likeCount: integer("like_count"),
  commentCount: integer("comment_count"),
  shareCount: integer("share_count"),
  postedAt: timestamp("posted_at"),

  // AI analysis
  viralElements: text("viral_elements").array(), // ["trending_audio", "strong_hook", "clear_cta"]
  contentStructure: json("content_structure").$type<{
    hook?: string;
    body?: string;
    cta?: string;
  }>(), // {hook: "0-3s", body: "3-25s", cta: "25-30s"}
  engagementRate: real("engagement_rate"),
  emotionalTriggers: text("emotional_triggers").array(), // ["curiosity", "humor", "fomo"]
  postScore: integer("post_score"), // 0-100 score for this specific post

  // AI feedback
  whatWorked: text("what_worked"),
  whatDidntWork: text("what_didnt_work"),
  improvementTips: text("improvement_tips").array(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comprehensive analysis reports
export const profileAnalysisReports = pgTable("profile_analysis_reports", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => creatorProfiles.id, { onDelete: "cascade" }).notNull(),

  // Overall analysis
  viralScore: integer("viral_score").notNull(),
  postsAnalyzed: integer("posts_analyzed").notNull(),

  // Platform breakdown
  platformScores: json("platform_scores").$type<{
    tiktok?: number;
    instagram?: number;
    youtube?: number;
  }>(), // {tiktok: 75, instagram: 68, youtube: 82}

  // Detailed feedback
  overallStrengths: text("overall_strengths").array(),
  overallWeaknesses: text("overall_weaknesses").array(),
  contentStyleSummary: text("content_style_summary"),
  targetAudienceInsight: text("target_audience_insight"),

  // Actionable recommendations
  quickWins: text("quick_wins").array(), // 3-5 easy improvements
  strategicRecommendations: text("strategic_recommendations").array(), // Long-term growth tactics

  // Pattern recognition
  mostViralPattern: text("most_viral_pattern"), // "POV format with trending audio"
  leastEffectivePattern: text("least_effective_pattern"),

  // Benchmarking
  comparedToNiche: text("compared_to_niche"), // "Above average in fitness niche"
  growthPotential: text("growth_potential"), // "high", "medium", "low"

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GDPR compliance - Data Subject Access Requests
export const dataSubjectRequests = pgTable("data_subject_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  requestType: varchar("request_type").notNull(), // 'access', 'rectification', 'erasure', 'portability', 'objection', 'complaint'
  details: text("details"),
  status: varchar("status").default("pending").notNull(), // 'pending', 'in_progress', 'completed', 'rejected'
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"), // Admin user ID
  notes: text("notes"), // Internal notes for admins
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for Creator Profile Analysis
export const insertCreatorProfileSchema = createInsertSchema(creatorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyzedPostSchema = createInsertSchema(analyzedPosts).omit({
  id: true,
  createdAt: true,
});

export const insertProfileAnalysisReportSchema = createInsertSchema(profileAnalysisReports).omit({
  id: true,
  createdAt: true,
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type Trend = typeof trends.$inferSelect;
export type UserTrends = typeof userTrends.$inferSelect;
export type UserContent = typeof userContent.$inferSelect;
export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type VideoClip = typeof videoClips.$inferSelect;
export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type UserActivity = typeof userActivity.$inferSelect;
export type ViralAnalysis = typeof viralAnalyses.$inferSelect;
export type TrendApplication = typeof trendApplications.$inferSelect;
export type UserAutomationSettings = typeof userAutomationSettings.$inferSelect;
export type AutomationJob = typeof automationJobs.$inferSelect;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type AnalyzedPost = typeof analyzedPosts.$inferSelect;
export type ProfileAnalysisReport = typeof profileAnalysisReports.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type InsertViralAnalysis = z.infer<typeof insertViralAnalysisSchema>;
export type InsertTrendApplication = z.infer<typeof insertTrendApplicationSchema>;
export type InsertUserAutomationSettings = z.infer<typeof insertUserAutomationSettingsSchema>;
export type InsertAutomationJob = z.infer<typeof insertAutomationJobSchema>;
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type InsertAnalyzedPost = z.infer<typeof insertAnalyzedPostSchema>;
export type InsertProfileAnalysisReport = z.infer<typeof insertProfileAnalysisReportSchema>;

// ============================================================================
// OAUTH TOKENS TABLE (Added 2025-10-06)
// ============================================================================

// Store OAuth access tokens for social media platforms
export const socialMediaTokens = pgTable("social_media_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  firebaseUid: text("firebase_uid"), // Link to Firebase user
  platform: text("platform").notNull(), // 'youtube' (instagram/tiktok parked for now)
  accessToken: text("access_token").notNull(), // Will be encrypted
  refreshToken: text("refresh_token"), // Will be encrypted
  tokenType: text("token_type").default("Bearer").notNull(),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"), // OAuth scopes granted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userPlatformUnique: unique().on(table.userId, table.platform),
}));

export const insertSocialMediaTokenSchema = createInsertSchema(socialMediaTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SocialMediaToken = typeof socialMediaTokens.$inferSelect;
export type InsertSocialMediaToken = z.infer<typeof insertSocialMediaTokenSchema>;

// ============================================================================
// DATA WAREHOUSE TABLES (Added 2025-10-03)
// ============================================================================

// Raw scraped social media posts
export const scrapedPosts = pgTable("scraped_posts", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  url: text("url"),
  title: text("title"),
  description: text("description"),
  author: text("author"),
  authorId: text("author_id"),
  publishedAt: timestamp("published_at"),
  contentType: text("content_type"),
  language: text("language"),

  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  retweets: integer("retweets").default(0),
  saves: integer("saves").default(0),

  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  mediaUrls: text("media_urls").array(),

  hashtags: text("hashtags").array().default([]),
  mentions: text("mentions").array().default([]),
  keywords: text("keywords").array().default([]),
  durationSeconds: real("duration_seconds"),

  category: text("category"),
  niche: text("niche"),
  detectedTopics: text("detected_topics").array().default([]),

  rawJson: json("raw_json"),

  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  scrapeSource: text("scrape_source"),
  scrapeJobId: integer("scrape_job_id"),
}, (table) => ({
  platformExternalIdUnique: unique().on(table.platform, table.externalId),
}));

// Time-series metrics tracking
export const postMetricsHistory = pgTable("post_metrics_history", {
  id: serial("id").primaryKey(),
  scrapedPostId: integer("scraped_post_id").references(() => scrapedPosts.id, { onDelete: "cascade" }).notNull(),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  engagementRate: real("engagement_rate"),
  velocityScore: real("velocity_score"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Link trends to source scraped posts
export const trendSources = pgTable("trend_sources", {
  id: serial("id").primaryKey(),
  trendId: integer("trend_id").references(() => trends.id, { onDelete: "cascade" }).notNull(),
  scrapedPostId: integer("scraped_post_id").references(() => scrapedPosts.id, { onDelete: "cascade" }).notNull(),
  relevanceScore: real("relevance_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  trendPostUnique: unique().on(table.trendId, table.scrapedPostId),
}));

// App usage events and telemetry
export const appEvents = pgTable("app_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id"),
  eventName: text("event_name").notNull(),
  eventType: text("event_type").notNull(),
  platform: text("platform"),
  properties: json("properties"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  country: text("country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CrewAI execution logs
export const crewExecutions = pgTable("crew_executions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  crewType: text("crew_type").notNull(),
  status: text("status").notNull(),
  platforms: text("platforms").array(),
  niches: text("niches").array(),

  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMs: integer("duration_ms"),
  llmCalls: integer("llm_calls").default(0),
  toolCalls: integer("tool_calls").default(0),
  tokensUsed: integer("tokens_used").default(0),
  costUsd: real("cost_usd").default(0),

  trendsDiscovered: integer("trends_discovered").default(0),
  postsScraped: integer("posts_scraped").default(0),
  outputData: json("output_data"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for data warehouse tables
export const insertScrapedPostSchema = createInsertSchema(scrapedPosts);
export const insertPostMetricsHistorySchema = createInsertSchema(postMetricsHistory);
export const insertTrendSourcesSchema = createInsertSchema(trendSources);
export const insertAppEventsSchema = createInsertSchema(appEvents);
export const insertCrewExecutionsSchema = createInsertSchema(crewExecutions);

// Types
export type ScrapedPost = typeof scrapedPosts.$inferSelect;
export type PostMetricsHistory = typeof postMetricsHistory.$inferSelect;
export type TrendSource = typeof trendSources.$inferSelect;
export type AppEvent = typeof appEvents.$inferSelect;
export type CrewExecution = typeof crewExecutions.$inferSelect;

export type InsertScrapedPost = z.infer<typeof insertScrapedPostSchema>;
export type InsertPostMetricsHistory = z.infer<typeof insertPostMetricsHistorySchema>;
export type InsertTrendSource = z.infer<typeof insertTrendSourcesSchema>;
export type InsertAppEvent = z.infer<typeof insertAppEventsSchema>;
export type InsertCrewExecution = z.infer<typeof insertCrewExecutionsSchema>;

// Export original types
export type InsertUserTrends = z.infer<typeof insertUserTrendsSchema>;
export type InsertUserContent = z.infer<typeof insertUserContentSchema>;
export type InsertContentAnalysis = z.infer<typeof insertContentAnalysisSchema>;
export type InsertVideoClip = z.infer<typeof insertVideoClipSchema>;
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

// Subscription tiers
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  priceYearly: integer("price_yearly").notNull(),
  features: json("features").notNull().$type<string[]>(),
  limits: json("limits").notNull().$type<{
    videoAnalysis: number;
    contentGeneration: number;
    trendBookmarks: number;
    videoClips: number;
    scheduledAnalysis?: boolean | string;  // false, 'weekly', 'daily'
    roastMode?: boolean;
    advancedAnalytics?: boolean;
    audienceInsights?: boolean;
    teamSeats?: number;
    apiAccess?: boolean;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tierId: varchar("tier_id").references(() => subscriptionTiers.id).notNull(),
  status: text("status").default("active").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  paymentMethod: text("payment_method"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User usage tracking
export const userUsage = pgTable("user_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  feature: text("feature").notNull(),
  count: integer("count").default(1).notNull(),
  periodStart: timestamp("period_start").default(sql`date_trunc('month', now())`).notNull(),
  periodEnd: timestamp("period_end").default(sql`date_trunc('month', now()) + interval '1 month'`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userFeaturePeriodUnique: unique().on(table.userId, table.feature, table.periodStart),
}));

// Zod schemas for subscriptions
export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers);
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export const insertUserUsageSchema = createInsertSchema(userUsage);

// User preferences for personalization
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  niche: text("niche").notNull(),
  targetAudience: text("target_audience").default("gen-z").notNull(),
  contentStyle: text("content_style").default("entertainment").notNull(),
  bestPerformingPlatforms: text("best_performing_platforms").array().default(["tiktok"]).notNull(),
  preferredCategories: text("preferred_categories").array().default([]).notNull(),
  bio: text("bio").default("").notNull(),
  preferredContentLength: text("preferred_content_length").default("short").notNull(),
  optimizedPostTimes: text("optimized_post_times").array().default(["18:00", "21:00"]).notNull(),
  goals: text("goals").default("grow_followers").notNull(),
  avgSuccessfulEngagement: real("avg_successful_engagement").default(0.05).notNull(),
  successfulHashtags: text("successful_hashtags").array().default([]).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schema for user preferences
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
});

// Analysis schedules for automated profile analysis
export const analysisSchedules = pgTable("analysis_schedules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  frequency: text("frequency").notNull(), // 'manual', 'daily', 'weekly', 'monthly'
  scheduledDayOfWeek: integer("scheduled_day_of_week"), // 0-6 (Sunday=0) for weekly
  scheduledDayOfMonth: integer("scheduled_day_of_month"), // 1-31 for monthly
  scheduledTime: text("scheduled_time").notNull().default("09:00:00"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnalysisScheduleSchema = createInsertSchema(analysisSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for subscriptions
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type UserUsage = typeof userUsage.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type AnalysisSchedule = typeof analysisSchedules.$inferSelect;

export type InsertSubscriptionTier = z.infer<typeof insertSubscriptionTierSchema>;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type InsertUserUsage = z.infer<typeof insertUserUsageSchema>;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type InsertAnalysisSchedule = z.infer<typeof insertAnalysisScheduleSchema>;
