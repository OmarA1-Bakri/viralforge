# 📊 Data Warehouse Architecture

**Created**: 2025-10-03
**Purpose**: Comprehensive data pipeline for scraped content, analytics, and trend analysis

---

## 🎯 Overview

ViralForge now has a complete **data warehouse** that captures and analyzes all social media data flowing through the system. This enables:

- **Historical trend analysis** - Track how viral content evolves over time
- **Performance tracking** - Monitor app usage and user behavior
- **Cost optimization** - Reduce redundant API calls through intelligent caching
- **Data lineage** - Trace which scraped posts led to which trends
- **Analytics dashboards** - Pre-computed views for real-time insights

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SOCIAL MEDIA PLATFORMS                    │
│         (Twitter, YouTube, Instagram, TikTok, Reddit)        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    CREW AI TOOLS                             │
│          (Scraping, Aggregation, Analysis)                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA WAREHOUSE SERVICE                      │
│         server/services/dataWarehouse.ts                     │
│                                                              │
│  • saveScrapedPost()                                         │
│  • bulkSaveScrapedPosts()                                    │
│  • recordMetricsSnapshot()                                   │
│  • linkTrendToSources()                                      │
│  • trackEvent()                                              │
│  • logCrewExecution()                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRES DATABASE                         │
│                                                              │
│  TABLES:                                                     │
│  ├─ scraped_posts (raw social media data)                   │
│  ├─ post_metrics_history (time-series metrics)              │
│  ├─ trend_sources (trends → scraped posts mapping)          │
│  ├─ app_events (user behavior telemetry)                    │
│  └─ crew_executions (AI agent performance logs)             │
│                                                              │
│  VIEWS:                                                      │
│  ├─ v_top_posts_by_platform                                 │
│  ├─ v_trending_hashtags                                     │
│  ├─ v_daily_scraping_stats                                  │
│  ├─ v_user_engagement_funnel                                │
│  └─ mv_popular_content_24h (materialized)                   │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    ANALYTICS & DASHBOARDS                    │
│         (PostHog, Internal Dashboards, Reports)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Schema

### 1. **scraped_posts** (Raw Content Storage)

Stores every social media post scraped by the system.

```sql
CREATE TABLE scraped_posts (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,              -- youtube, twitter, instagram, etc.
  external_id TEXT NOT NULL,           -- Platform's post ID
  url TEXT,
  title TEXT,
  description TEXT,
  author TEXT,
  author_id TEXT,
  published_at TIMESTAMP,
  content_type TEXT,                   -- video, tweet, reel, short
  language TEXT,

  -- Engagement Metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,

  -- Media
  thumbnail_url TEXT,
  video_url TEXT,
  media_urls TEXT[],

  -- Content Analysis
  hashtags TEXT[],
  mentions TEXT[],
  keywords TEXT[],
  duration_seconds REAL,
  category TEXT,
  niche TEXT,
  detected_topics TEXT[],

  -- Raw Data
  raw_json JSONB,                      -- Complete API response

  -- Tracking
  scraped_at TIMESTAMP DEFAULT NOW(),
  scrape_source TEXT,                  -- manual, scheduled, crew_ai
  scrape_job_id INTEGER,

  UNIQUE(platform, external_id)
);
```

**Indexes:**
- `platform` - Fast platform-specific queries
- `published_at` - Time-based analysis
- `category` - Category filtering
- `scraped_at` - Scraping timeline
- `hashtags` (GIN) - Hashtag search
- `keywords` (GIN) - Keyword search

**Purpose**:
- Deduplicated storage (unique on platform + external_id)
- Complete audit trail of all scraped data
- Source of truth for trend identification

---

### 2. **post_metrics_history** (Time-Series Tracking)

Tracks how individual posts perform over time.

```sql
CREATE TABLE post_metrics_history (
  id SERIAL PRIMARY KEY,
  scraped_post_id INTEGER REFERENCES scraped_posts(id),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate REAL,                -- Calculated: (L+C+S)/V
  velocity_score REAL,                 -- Growth rate since last snapshot
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:
- Detect viral acceleration (velocity_score)
- Track content lifecycle
- Identify optimal posting times
- Measure viral potential

**Use Case**:
"Show me posts that gained 10x engagement in the last 24 hours"

---

### 3. **trend_sources** (Data Lineage)

Links discovered trends back to the scraped posts that identified them.

```sql
CREATE TABLE trend_sources (
  id SERIAL PRIMARY KEY,
  trend_id INTEGER REFERENCES trends(id),
  scraped_post_id INTEGER REFERENCES scraped_posts(id),
  relevance_score REAL,                -- How relevant this post was (0-1)
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(trend_id, scraped_post_id)
);
```

**Purpose**:
- **Explainability**: "Why did we identify this trend?"
- **Quality scoring**: High relevance sources = better trends
- **Feedback loop**: Learn which posts lead to viral trends

**Use Case**:
"Show me all YouTube videos that contributed to the 'AI tools' trend"

---

### 4. **app_events** (Usage Telemetry)

Captures all user interactions and app usage.

```sql
CREATE TABLE app_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  session_id TEXT,
  event_name TEXT NOT NULL,            -- trend_discovery, content_analysis, etc.
  event_type TEXT NOT NULL,            -- page_view, click, api_call, error
  platform TEXT,                       -- web, ios, android
  properties JSONB,                    -- Event-specific data
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:
- User behavior analytics
- Feature usage tracking
- Error monitoring
- Geographic insights
- Session analysis

**Integration with PostHog**: This complements (not replaces) PostHog. PostHog handles real-time analytics, this provides long-term storage and SQL-based analysis.

---

### 5. **crew_executions** (AI Performance Logs)

Tracks every CrewAI agent execution.

```sql
CREATE TABLE crew_executions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  crew_type TEXT NOT NULL,             -- discovery, creation, publication
  status TEXT NOT NULL,                -- running, completed, failed
  platforms TEXT[],
  niches TEXT[],

  -- Performance Metrics
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_ms INTEGER,
  llm_calls INTEGER DEFAULT 0,
  tool_calls INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,

  -- Results
  trends_discovered INTEGER DEFAULT 0,
  posts_scraped INTEGER DEFAULT 0,
  output_data JSONB,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:
- **Cost tracking**: Monitor LLM usage and costs
- **Performance optimization**: Identify slow executions
- **Success metrics**: Trends discovered vs. posts scraped ratio
- **Error analysis**: Debug failed agent runs

**Analytics Queries**:
- Average cost per trend discovered
- Tool usage patterns
- Peak execution times
- Success rate by crew type

---

## 📊 Analytics Views

### Pre-computed Views (Refreshed in real-time)

#### **v_top_posts_by_platform**
Top-performing content by engagement rate.

```sql
SELECT platform, title, author, engagement_rate
FROM v_top_posts_by_platform
WHERE platform = 'youtube'
LIMIT 100;
```

#### **v_trending_hashtags**
Most popular hashtags in the last 7 days.

```sql
SELECT hashtag, platform, post_count, avg_engagement_rate
FROM v_trending_hashtags
WHERE platform = 'twitter'
ORDER BY post_count DESC;
```

#### **v_daily_scraping_stats**
Daily scraping activity and performance.

```sql
SELECT date, platform, posts_scraped, avg_engagement_rate
FROM v_daily_scraping_stats
WHERE date > NOW() - INTERVAL '30 days';
```

#### **v_user_engagement_funnel**
User journey from discovery to content creation.

```sql
SELECT user_id, discoveries, interactions, analyses, generations
FROM v_user_engagement_funnel
WHERE discoveries > 0;
```

### Materialized View (Refreshed Hourly)

#### **mv_popular_content_24h**
High-performance view of trending content in the last 24 hours.

```sql
-- Refresh (call via cron every hour)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content_24h;

-- Query (blazing fast)
SELECT * FROM mv_popular_content_24h
WHERE platform = 'youtube' AND engagement_rate > 0.1
LIMIT 50;
```

---

## 🔧 Usage Examples

### Example 1: Save Scraped YouTube Video

```typescript
import { dataWarehouse } from './services/dataWarehouse';

// When YouTube tool returns data
const videoData = {
  platform: 'youtube',
  externalId: 'dQw4w9WgXcQ',
  url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  author: 'Rick Astley',
  publishedAt: new Date('2009-10-25'),
  contentType: 'video',
  views: 1400000000,
  likes: 16000000,
  comments: 5000000,
  hashtags: ['music', 'rickroll', '80s'],
  thumbnailUrl: '...',
  videoUrl: '...',
  durationSeconds: 212,
  category: 'Music',
  rawJson: { /* complete API response */ },
  scrapeSource: 'crew_ai',
};

const postId = await dataWarehouse.saveScrapedPost(videoData);
console.log(`Saved post ${postId}`);
```

### Example 2: Track Metrics Over Time

```typescript
// Called hourly for trending posts
await dataWarehouse.recordMetricsSnapshot(postId, {
  views: 1401000000,
  likes: 16010000,
  comments: 5001000,
  shares: 120000
});
// Automatically calculates engagement_rate and velocity_score
```

### Example 3: Link Trend to Sources

```typescript
// After identifying a trend from multiple posts
await dataWarehouse.linkTrendToSources(
  trendId,
  [postId1, postId2, postId3],
  [0.95, 0.87, 0.76] // relevance scores
);
```

### Example 4: Log Crew Execution

```typescript
const executionId = await dataWarehouse.logCrewExecution({
  userId: user.id,
  crewType: 'discovery',
  status: 'running',
  platforms: ['youtube', 'twitter'],
  niches: ['AI tools'],
  startTime: new Date(),
  llmCalls: 0,
  toolCalls: 0,
});

// Update when complete
await dataWarehouse.updateCrewExecution(executionId, {
  status: 'completed',
  endTime: new Date(),
  durationMs: 45000,
  llmCalls: 12,
  toolCalls: 8,
  tokensUsed: 15000,
  costUsd: 0.045,
  trendsDiscovered: 5,
  postsScraped: 47,
});
```

### Example 5: Get Trending Hashtags

```typescript
const trending = await dataWarehouse.getTrendingHashtags('youtube', 50);

// Returns:
// [
//   { hashtag: '#ai', platform: 'youtube', postCount: 1247, totalViews: 45M, avgEngagementRate: 0.12 },
//   { hashtag: '#contentcreation', platform: 'youtube', postCount: 892, totalViews: 32M, avgEngagementRate: 0.09 },
//   ...
// ]
```

---

## 🔄 Integration Points

### 1. **CrewAI Tools** → **Data Warehouse**

Update each tool wrapper to save scraped data:

```typescript
// In crewai_integration.py
async def _run(self, mode: str, id_or_query: str, limit: int = 20):
    # Make API call
    response = await fetch_youtube_data(id_or_query, limit)

    # Save to warehouse
    for video in response['videos']:
        await dataWarehouse.saveScrapedPost({
            platform: 'youtube',
            externalId: video['id'],
            title: video['title'],
            author: video['author'],
            views: video['metrics']['views'],
            # ... etc
        })

    return response
```

### 2. **Trend Discovery** → **Trend Sources**

When creating a new trend, link it to source posts:

```typescript
// In viral_crew.py discover_trends()
const trendId = await db.insert(trends).values({ ... });
const sourcePostIds = scrapedDataUsedForTrend.map(p => p.id);
await dataWarehouse.linkTrendToSources(trendId, sourcePostIds);
```

### 3. **App Events** → **Analytics**

Track user events:

```typescript
// In frontend or backend
await dataWarehouse.trackEvent({
  userId: user.id,
  sessionId: sessionId,
  eventName: 'trend_discovery',
  eventType: 'api_call',
  platform: 'web',
  properties: { platform: 'youtube', niche: 'AI tools' }
});
```

---

## 📈 Analytics Dashboards

### Suggested Dashboard Metrics

**Scraping Health**:
- Posts scraped per day (by platform)
- Average engagement rate by platform
- Scraping error rate
- API cost per scraped post

**Trend Quality**:
- Trends discovered per execution
- Average source posts per trend
- Trend relevance scores
- User engagement with discovered trends

**User Behavior**:
- Discovery → Analysis → Generation funnel
- Most popular platforms
- Peak usage times
- Geographic distribution

**AI Performance**:
- Average crew execution time
- Cost per trend discovered
- LLM token usage trends
- Tool success rates

---

## 🚀 Next Steps

### Immediate (Do Now):
1. ✅ Run migration: `npm run db:migrate`
2. ✅ Update CrewAI tools to call `dataWarehouse.saveScrapedPost()`
3. ✅ Add crew execution logging to `viral_crew.py`
4. ✅ Set up hourly cron job to refresh materialized view

### Short Term (This Week):
5. Build analytics dashboard (React components)
6. Add PostHog integration for real-time events
7. Create Grafana dashboards for ops monitoring
8. Implement data retention policies (archive old data)

### Long Term (This Month):
9. Build ML models on historical data
10. Predictive viral potential scoring
11. Automated trend detection from time-series
12. Cost optimization recommendations

---

## 🔒 Data Privacy & Compliance

- **User Data**: All `user_id` fields are nullable and respect user privacy settings
- **IP Addresses**: Hashed before storage, retained for 30 days
- **GDPR**: Cascade deletes ensure user data removal
- **Rate Limiting**: Respect platform ToS and rate limits

---

## 📊 Performance Considerations

**Indexes**: All critical query paths are indexed
**Partitioning**: Consider partitioning `scraped_posts` by `scraped_at` (monthly) when >10M rows
**Archival**: Move posts >90 days old to cold storage (S3)
**Materialized Views**: Refresh during off-peak hours
**Connection Pooling**: Use Drizzle's built-in pooling (max 20 connections)

---

## 🎯 Success Metrics

After implementing this data warehouse, you should be able to answer:

✅ "What content went viral on YouTube last week?"
✅ "Which hashtags are trending across platforms?"
✅ "How much does each discovered trend cost us in API calls?"
✅ "What's our user engagement funnel conversion rate?"
✅ "Which AI agents are most effective at finding trends?"
✅ "How does content performance change over time?"
✅ "What's the ROI of our scraping infrastructure?"

---

**Status**: 🚧 **Infrastructure Ready** - Awaiting integration with CrewAI tools
**Migration**: `server/db/migrations/0002_add_scraped_data_warehouse.sql`
**Service**: `server/services/dataWarehouse.ts`
**Schema**: `shared/schema.ts`
