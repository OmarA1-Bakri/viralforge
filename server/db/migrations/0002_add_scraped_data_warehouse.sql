-- Migration: Add comprehensive data warehouse for scraped social media content
-- Created: 2025-10-03
-- Purpose: Store all raw scraped data, analytics, and time-series trends

-- ============================================================================
-- RAW SCRAPED CONTENT STORAGE
-- ============================================================================

-- Store raw posts from all platforms (Twitter, YouTube, Instagram, etc.)
CREATE TABLE "scraped_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "platform" text NOT NULL, -- youtube, twitter, instagram, tiktok, reddit
  "external_id" text NOT NULL, -- Platform's post ID
  "url" text,
  "title" text,
  "description" text,
  "author" text,
  "author_id" text,
  "published_at" timestamp,
  "content_type" text, -- video, tweet, post, reel, short
  "language" text,

  -- Engagement metrics (snapshot at scrape time)
  "views" integer DEFAULT 0,
  "likes" integer DEFAULT 0,
  "comments" integer DEFAULT 0,
  "shares" integer DEFAULT 0,
  "retweets" integer DEFAULT 0,
  "saves" integer DEFAULT 0,

  -- Media
  "thumbnail_url" text,
  "video_url" text,
  "media_urls" text[],

  -- Metadata
  "hashtags" text[],
  "mentions" text[],
  "keywords" text[],
  "duration_seconds" real,

  -- Categorization
  "category" text,
  "niche" text,
  "detected_topics" text[],

  -- Raw data
  "raw_json" jsonb, -- Store complete API response

  -- Tracking
  "scraped_at" timestamp DEFAULT now() NOT NULL,
  "scrape_source" text, -- manual, scheduled, crew_ai, api
  "scrape_job_id" integer, -- Link to processing_jobs if applicable

  CONSTRAINT "scraped_posts_platform_external_id_unique" UNIQUE("platform", "external_id")
);

CREATE INDEX "idx_scraped_posts_platform" ON "scraped_posts"("platform");
CREATE INDEX "idx_scraped_posts_published_at" ON "scraped_posts"("published_at");
CREATE INDEX "idx_scraped_posts_category" ON "scraped_posts"("category");
CREATE INDEX "idx_scraped_posts_scraped_at" ON "scraped_posts"("scraped_at");
CREATE INDEX "idx_scraped_posts_hashtags" ON "scraped_posts" USING GIN("hashtags");
CREATE INDEX "idx_scraped_posts_keywords" ON "scraped_posts" USING GIN("keywords");

-- ============================================================================
-- TIME-SERIES METRICS (Track how content performance changes over time)
-- ============================================================================

CREATE TABLE "post_metrics_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "scraped_post_id" integer NOT NULL,
  "views" integer DEFAULT 0,
  "likes" integer DEFAULT 0,
  "comments" integer DEFAULT 0,
  "shares" integer DEFAULT 0,
  "engagement_rate" real, -- (likes + comments + shares) / views
  "velocity_score" real, -- Growth rate since last measurement
  "recorded_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "idx_post_metrics_scraped_post" ON "post_metrics_history"("scraped_post_id");
CREATE INDEX "idx_post_metrics_recorded_at" ON "post_metrics_history"("recorded_at");

ALTER TABLE "post_metrics_history"
  ADD CONSTRAINT "post_metrics_history_scraped_post_id_fk"
  FOREIGN KEY ("scraped_post_id")
  REFERENCES "public"."scraped_posts"("id")
  ON DELETE cascade;

-- ============================================================================
-- TREND EVOLUTION (Link trends to source scraped data)
-- ============================================================================

CREATE TABLE "trend_sources" (
  "id" serial PRIMARY KEY NOT NULL,
  "trend_id" integer NOT NULL,
  "scraped_post_id" integer NOT NULL,
  "relevance_score" real, -- How relevant this post was to identifying the trend
  "created_at" timestamp DEFAULT now() NOT NULL,

  CONSTRAINT "trend_sources_trend_post_unique" UNIQUE("trend_id", "scraped_post_id")
);

CREATE INDEX "idx_trend_sources_trend" ON "trend_sources"("trend_id");
CREATE INDEX "idx_trend_sources_post" ON "trend_sources"("scraped_post_id");

ALTER TABLE "trend_sources"
  ADD CONSTRAINT "trend_sources_trend_id_fk"
  FOREIGN KEY ("trend_id")
  REFERENCES "public"."trends"("id")
  ON DELETE cascade;

ALTER TABLE "trend_sources"
  ADD CONSTRAINT "trend_sources_scraped_post_id_fk"
  FOREIGN KEY ("scraped_post_id")
  REFERENCES "public"."scraped_posts"("id")
  ON DELETE cascade;

-- ============================================================================
-- APP USAGE ANALYTICS (Persist telemetry data)
-- ============================================================================

CREATE TABLE "app_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar,
  "session_id" text,
  "event_name" text NOT NULL,
  "event_type" text NOT NULL, -- page_view, click, api_call, error, etc.
  "platform" text, -- web, ios, android
  "properties" jsonb, -- Event-specific data
  "user_agent" text,
  "ip_address" text,
  "country" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "idx_app_events_user" ON "app_events"("user_id");
CREATE INDEX "idx_app_events_event_name" ON "app_events"("event_name");
CREATE INDEX "idx_app_events_created_at" ON "app_events"("created_at");
CREATE INDEX "idx_app_events_session" ON "app_events"("session_id");

-- ============================================================================
-- CREW AI EXECUTION LOG
-- ============================================================================

CREATE TABLE "crew_executions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar,
  "crew_type" text NOT NULL, -- discovery, creation, publication, full_pipeline
  "status" text NOT NULL, -- running, completed, failed
  "platforms" text[],
  "niches" text[],

  -- Performance
  "start_time" timestamp NOT NULL,
  "end_time" timestamp,
  "duration_ms" integer,
  "llm_calls" integer DEFAULT 0,
  "tool_calls" integer DEFAULT 0,
  "tokens_used" integer DEFAULT 0,
  "cost_usd" real DEFAULT 0,

  -- Results
  "trends_discovered" integer DEFAULT 0,
  "posts_scraped" integer DEFAULT 0,
  "output_data" jsonb,
  "error_message" text,

  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "idx_crew_executions_user" ON "crew_executions"("user_id");
CREATE INDEX "idx_crew_executions_status" ON "crew_executions"("status");
CREATE INDEX "idx_crew_executions_created_at" ON "crew_executions"("created_at");

-- ============================================================================
-- ANALYTICS VIEWS (Pre-computed analytics for dashboards)
-- ============================================================================

-- Top performing content by platform
CREATE VIEW "v_top_posts_by_platform" AS
SELECT
  platform,
  external_id,
  title,
  author,
  views,
  likes,
  comments,
  shares,
  (likes + comments + shares)::float / NULLIF(views, 0) as engagement_rate,
  hashtags,
  published_at,
  scraped_at
FROM scraped_posts
WHERE views > 0
ORDER BY engagement_rate DESC;

-- Trending hashtags (last 7 days)
CREATE VIEW "v_trending_hashtags" AS
SELECT
  hashtag,
  platform,
  COUNT(*) as post_count,
  SUM(views) as total_views,
  AVG((likes + comments + shares)::float / NULLIF(views, 0)) as avg_engagement_rate
FROM scraped_posts, unnest(hashtags) as hashtag
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY hashtag, platform
ORDER BY post_count DESC;

-- Daily scraping activity
CREATE VIEW "v_daily_scraping_stats" AS
SELECT
  DATE(scraped_at) as date,
  platform,
  COUNT(*) as posts_scraped,
  SUM(views) as total_views,
  AVG(views) as avg_views,
  AVG((likes + comments + shares)::float / NULLIF(views, 0)) as avg_engagement_rate
FROM scraped_posts
GROUP BY DATE(scraped_at), platform
ORDER BY date DESC, platform;

-- User engagement funnel
CREATE VIEW "v_user_engagement_funnel" AS
SELECT
  user_id,
  COUNT(DISTINCT CASE WHEN event_name = 'trend_discovery' THEN session_id END) as discoveries,
  COUNT(DISTINCT CASE WHEN event_name = 'trend_action' THEN session_id END) as interactions,
  COUNT(DISTINCT CASE WHEN event_name = 'content_analysis' THEN session_id END) as analyses,
  COUNT(DISTINCT CASE WHEN event_name = 'clip_generation' THEN session_id END) as generations
FROM app_events
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- ============================================================================
-- MATERIALIZED VIEWS (For expensive queries)
-- ============================================================================

-- Popular content (refreshed hourly)
CREATE MATERIALIZED VIEW "mv_popular_content_24h" AS
SELECT
  sp.id,
  sp.platform,
  sp.title,
  sp.author,
  sp.external_id,
  sp.url,
  sp.thumbnail_url,
  sp.views,
  sp.likes,
  sp.comments,
  sp.shares,
  sp.hashtags,
  sp.category,
  (sp.likes + sp.comments + sp.shares)::float / NULLIF(sp.views, 0) as engagement_rate,
  sp.published_at,
  sp.scraped_at
FROM scraped_posts sp
WHERE sp.scraped_at > NOW() - INTERVAL '24 hours'
  AND sp.views > 1000
ORDER BY engagement_rate DESC
LIMIT 1000;

CREATE UNIQUE INDEX ON "mv_popular_content_24h" (id);
CREATE INDEX ON "mv_popular_content_24h" (platform);
CREATE INDEX ON "mv_popular_content_24h" (engagement_rate DESC);

-- Refresh schedule: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content_24h;

COMMENT ON TABLE scraped_posts IS 'Raw scraped data from all social media platforms';
COMMENT ON TABLE post_metrics_history IS 'Time-series tracking of post performance';
COMMENT ON TABLE trend_sources IS 'Links trends to the scraped posts that identified them';
COMMENT ON TABLE app_events IS 'Application usage telemetry and user events';
COMMENT ON TABLE crew_executions IS 'CrewAI agent execution logs and performance metrics';
