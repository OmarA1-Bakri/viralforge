# Creator Profile Analysis - Implementation Plan

## 📋 Executive Summary

**Feature:** AI-Powered Creator Profile Analysis with Viral Score
**Target Users:** Creator Class subscribers (paid tier)
**Core Value:** Personalized content audit that provides actionable feedback and objective baseline for improvement
**Timeline:** 2-3 days for MVP
**Cost:** ~$0.50 per analysis | ~$100/month for 100 users | 90% profit margin

---

## 🎯 Product Requirements

### User Story
```
As a Creator Class subscriber
I want to connect my social media profiles and get an AI analysis
So that I can understand my current performance and get personalized improvement tips
```

### Acceptance Criteria
1. User can input TikTok, Instagram, and/or YouTube profile URLs
2. System scrapes top 5 posts from each connected platform
3. AI analyzes each post for viral elements and engagement patterns
4. System calculates overall Viral Score (0-100)
5. User receives comprehensive report with:
   - Content strengths & weaknesses
   - Quick wins (easy improvements)
   - Strategic recommendations
   - Platform-specific scores
6. Dashboard updates with personalized stats
7. Feature is gated to Creator Class subscribers only

---

## 🏗️ Technical Architecture

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT PHASE                          │
│  User provides social media URLs in profile settings        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   SCRAPING PHASE                             │
│  Background Job: Call crew-social-tools for each platform   │
│  • TikTok: Get top 5 videos by engagement                   │
│  • Instagram: Get top 5 posts/reels by engagement           │
│  • YouTube: Get top 5 videos by views                       │
│  Store in analyzed_posts table                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   ANALYSIS PHASE                             │
│  Background Job: Analyze each scraped post                  │
│  • Call Grok Vision for thumbnail analysis                  │
│  • Analyze metadata (engagement rate, viral elements)       │
│  • Generate post-specific feedback                          │
│  • Calculate post score (0-100)                             │
│  Store analysis in analyzed_posts table                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 AGGREGATION PHASE                            │
│  • Collect all post analyses                                │
│  • Calculate platform-specific scores                       │
│  • Calculate overall Viral Score (weighted average)         │
│  • Identify patterns (strengths/weaknesses)                 │
│  • Generate comprehensive report with AI                    │
│  Store in profile_analysis_reports table                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                PERSONALIZATION PHASE                         │
│  • Update user_preferences with insights                    │
│  • Update dashboard stats                                   │
│  • Enable personalized trend recommendations                │
│  • Show Viral Score widget                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Design

### New Tables (3 total)

#### 1. creator_profiles
**Purpose:** Store user's social media handles and analysis status
```sql
CREATE TABLE creator_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,

  -- Social handles
  tiktok_username VARCHAR,
  instagram_username VARCHAR,
  youtube_channel_id VARCHAR,

  -- Status tracking
  analysis_status VARCHAR DEFAULT 'pending',
  last_analyzed_at TIMESTAMP,

  -- Scores
  viral_score INTEGER,
  tiktok_score INTEGER,
  instagram_score INTEGER,
  youtube_score INTEGER,

  -- Quick insights
  content_strengths TEXT[],
  content_weaknesses TEXT[],
  recommended_improvements TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_creator_profiles_user ON creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_status ON creator_profiles(analysis_status);
```

---

#### 2. analyzed_posts
**Purpose:** Store scraped posts and AI analysis for each
```sql
CREATE TABLE analyzed_posts (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Post metadata
  platform VARCHAR NOT NULL,
  post_url VARCHAR NOT NULL,
  post_id VARCHAR NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,

  -- Engagement metrics
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  engagement_rate REAL,
  posted_at TIMESTAMP,

  -- AI analysis results
  viral_elements TEXT[],
  emotional_triggers TEXT[],
  post_score INTEGER,
  what_worked TEXT,
  what_didnt_work TEXT,
  improvement_tips TEXT[],

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_analyzed_posts_profile ON analyzed_posts(profile_id);
CREATE INDEX idx_analyzed_posts_platform ON analyzed_posts(platform);
```

---

#### 3. profile_analysis_reports
**Purpose:** Store comprehensive analysis reports
```sql
CREATE TABLE profile_analysis_reports (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Scores
  viral_score INTEGER NOT NULL,
  posts_analyzed INTEGER NOT NULL,
  platform_scores JSON,

  -- Insights
  overall_strengths TEXT[],
  overall_weaknesses TEXT[],
  content_style_summary TEXT,
  target_audience_insight TEXT,

  -- Recommendations
  quick_wins TEXT[],
  strategic_recommendations TEXT[],

  -- Patterns
  most_viral_pattern VARCHAR,
  least_effective_pattern VARCHAR,

  -- Benchmarking
  compared_to_niche VARCHAR,
  growth_potential VARCHAR,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_reports_profile ON profile_analysis_reports(profile_id);
```

---

## 🔧 Service Layer Design

### 1. SocialMediaScraperService
**File:** `server/services/socialMediaScraperService.ts`

**Responsibilities:**
- Interface with crew-social-tools Python scrapers
- Fetch top posts from TikTok, Instagram, YouTube
- Handle rate limiting and errors
- Return normalized post data

**Key Methods:**
```typescript
class SocialMediaScraperService {
  async scrapeTopPosts(
    platform: 'tiktok' | 'instagram' | 'youtube',
    username: string,
    limit: number = 5
  ): Promise<ScrapedPost[]>

  private async scrapeTikTok(username: string, limit: number)
  private async scrapeInstagram(username: string, limit: number)
  private async scrapeYouTube(channelId: string, limit: number)

  private normalizePostData(rawData: any, platform: string): ScrapedPost
}
```

---

### 2. ProfileAnalysisService
**File:** `server/ai/profileAnalysisService.ts`

**Responsibilities:**
- Orchestrate entire analysis workflow
- Call AI for post analysis and report generation
- Calculate Viral Score
- Store results in database

**Key Methods:**
```typescript
class ProfileAnalysisService {
  async analyzeCreatorProfile(
    userId: string,
    socialHandles: SocialHandles
  ): Promise<ProfileAnalysisReport>

  private async analyzePost(
    post: ScrapedPost,
    platform: string
  ): Promise<PostAnalysis>

  private async generateReport(
    userId: string,
    postAnalyses: PostAnalysis[],
    viralScore: number
  ): Promise<ProfileAnalysisReport>

  private calculateViralScore(
    postAnalyses: PostAnalysis[]
  ): number

  private async updateUserPreferences(
    userId: string,
    report: ProfileAnalysisReport
  ): Promise<void>
}
```

---

### 3. BackgroundJobService (Optional for MVP)
**File:** `server/services/backgroundJobService.ts`

**Responsibilities:**
- Queue and process long-running analysis jobs
- Track job progress
- Handle retries on failure

**For MVP:** Can use simple async/await
**For Production:** Use Bull, BullMQ, or similar

---

## 📡 API Endpoints

### 1. Setup Creator Profile
```http
POST /api/creator-profile/setup
Authorization: Bearer <token>

Request:
{
  "tiktokUsername": "@fitnesscreator",
  "instagramUsername": "@fitnesscreator",
  "youtubeChannelId": "UC1234567890"
}

Response:
{
  "success": true,
  "profileId": 123,
  "message": "Profile setup complete. Analysis will begin shortly.",
  "estimatedTime": "5-10 minutes"
}
```

---

### 2. Trigger Analysis
```http
POST /api/creator-profile/analyze
Authorization: Bearer <token>
Subscription: creator (middleware check)

Response:
{
  "success": true,
  "jobId": "analysis-123",
  "status": "processing",
  "message": "Analyzing your content...",
  "estimatedTime": "5-10 minutes"
}
```

---

### 3. Get Analysis Status
```http
GET /api/creator-profile/status
Authorization: Bearer <token>

Response:
{
  "status": "completed", // pending, analyzing, completed, failed
  "progress": 100,
  "message": "Analysis complete!",
  "viralScore": 75,
  "completedAt": "2025-10-05T10:30:00Z"
}
```

---

### 4. Get Full Report
```http
GET /api/creator-profile/report
Authorization: Bearer <token>

Response:
{
  "viralScore": 75,
  "tier": "Advanced Creator",
  "postsAnalyzed": 15,
  "platformScores": {
    "tiktok": 78,
    "instagram": 72,
    "youtube": 75
  },
  "strengths": [
    "Consistent use of trending audio",
    "Strong hooks in first 3 seconds",
    "High engagement rate on educational content"
  ],
  "weaknesses": [
    "Inconsistent posting schedule",
    "CTA clarity could be improved"
  ],
  "quickWins": [
    "Add text overlays to all videos",
    "Post at 6-9 PM for better reach",
    "Use 2 trending + 2 niche hashtags"
  ],
  "strategicRecommendations": [
    "Develop signature content format",
    "Build community through regular Q&A",
    "Experiment with longer-form content on YouTube"
  ],
  "mostViralPattern": "POV format with trending audio",
  "growthPotential": "high"
}
```

---

### 5. Update Social Handles
```http
PATCH /api/creator-profile/handles
Authorization: Bearer <token>

Request:
{
  "tiktokUsername": "@newhandle"
}

Response:
{
  "success": true,
  "message": "Handles updated. Trigger new analysis to refresh your score."
}
```

---

## 🎨 UI/UX Design

### 1. Profile Setup Modal
**Trigger:** Dashboard button "Unlock Your Viral Score" (Creator Class only)

**Modal Content:**
```
┌────────────────────────────────────────────────────┐
│  🎯 Get Your Personalized Viral Score             │
│                                                    │
│  We'll analyze your top performing content to:    │
│  ✓ Identify what's working                        │
│  ✓ Spot improvement opportunities                 │
│  ✓ Give you a Viral Score (0-100)                 │
│                                                    │
│  Connect Your Profiles:                           │
│  ┌──────────────────────────────────────────────┐ │
│  │ TikTok Username:   [@____________]           │ │
│  │ Instagram Username: [@____________]          │ │
│  │ YouTube Channel ID: [UC___________]          │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ⏱️ Analysis takes 5-10 minutes                    │
│  💰 Included in Creator Class subscription        │
│                                                    │
│  [Cancel]  [Start Analysis →]                     │
└────────────────────────────────────────────────────┘
```

---

### 2. Analysis Progress View
**Location:** Dashboard overlay during analysis

```
┌────────────────────────────────────────────────────┐
│  🔍 Analyzing Your Content...                      │
│                                                    │
│  [████████████████░░░░░░] 75%                     │
│                                                    │
│  ✓ Scraped 15 posts                               │
│  ✓ Analyzed 12 posts                              │
│  ⏳ Generating your Viral Score...                 │
│                                                    │
│  You can close this and we'll notify you when     │
│  your analysis is ready.                          │
│                                                    │
│  [Close]                                           │
└────────────────────────────────────────────────────┘
```

---

### 3. Viral Score Dashboard Widget
**Location:** Top of dashboard (prominent placement)

```
┌────────────────────────────────────────────────────┐
│  YOUR VIRAL SCORE                                  │
│                                                    │
│         ╱───────╲                                  │
│       ╱           ╲                                │
│      │     75      │  Advanced Creator            │
│       ╲           ╱                                │
│         ╲───────╱                                  │
│                                                    │
│  Analyzed 3 days ago | Based on 15 posts          │
│                                                    │
│  [View Full Report]  [Analyze Again]              │
└────────────────────────────────────────────────────┘
```

---

### 4. Full Report View
**Location:** Dedicated page `/creator-profile/report`

```
┌──────────────────────────────────────────────────────────┐
│  YOUR CONTENT ANALYSIS REPORT                            │
│                                                          │
│  Viral Score: 75/100 - Advanced Creator                 │
│  Analyzed: Oct 5, 2025 | 15 posts across 3 platforms   │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  📊 PLATFORM PERFORMANCE                                │
│  TikTok:     [████████████░░] 78/100                    │
│  Instagram:  [██████████░░░░] 72/100                    │
│  YouTube:    [███████████░░░] 75/100                    │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ✅ YOUR STRENGTHS                                      │
│  • Consistent use of trending audio                     │
│  • Strong hooks in first 3 seconds                      │
│  • High engagement rate on educational content          │
│                                                          │
│  ⚠️ AREAS FOR IMPROVEMENT                               │
│  • Inconsistent posting schedule                        │
│  • CTA clarity could be improved                        │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ⚡ QUICK WINS (Implement This Week)                    │
│  □ Add text overlays to all videos                      │
│  □ Post at 6-9 PM for better reach                      │
│  □ Use 2 trending + 2 niche hashtags                    │
│                                                          │
│  🎯 STRATEGIC RECOMMENDATIONS (Next 30 Days)            │
│  □ Develop signature content format                     │
│  □ Build community through regular Q&A                  │
│  □ Experiment with longer-form content on YouTube       │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  🔥 YOUR MOST VIRAL PATTERN                             │
│  POV format with trending audio                         │
│                                                          │
│  📈 GROWTH POTENTIAL: HIGH                              │
│  You're using proven viral tactics but have room to     │
│  optimize timing and consistency for explosive growth.  │
│                                                          │
│  [Download PDF]  [Share]  [Analyze Again]              │
└──────────────────────────────────────────────────────────┘
```

---

## 💰 Cost & Revenue Analysis

### Development Costs (Time)
- Database schema: 2 hours
- Scraping service integration: 4 hours
- Analysis service: 6 hours
- API endpoints: 3 hours
- Frontend UI: 8 hours
- Testing & polish: 4 hours
**Total: ~27 hours (3-4 days)**

### Operational Costs (Per Month)
- AI analysis per user: $0.50
- 100 Creator Class users: $50/month
- Re-analysis (monthly): $50/month
**Total: ~$100/month**

### Revenue
- Creator Class: $10/month
- 100 users: $1,000/month
**Profit: $900/month (90% margin)** ✅

### Break-Even Analysis
- Need ~10 Creator Class subscribers to break even
- Each additional subscriber is 90% profit

---

## 🚦 Implementation Phases

### Phase 1: MVP (Week 1)
**Goal:** Basic profile analysis with Viral Score

**Deliverables:**
- [ ] Database schema + migration
- [ ] SocialMediaScraperService (3 platforms)
- [ ] ProfileAnalysisService (basic scoring)
- [ ] 5 API endpoints
- [ ] Creator Class subscription check
- [ ] Basic dashboard widget

**Success Criteria:**
- User can connect profiles
- System scrapes & analyzes posts
- User receives Viral Score
- Gated to Creator Class subscribers

---

### Phase 2: Enhanced UI (Week 2)
**Goal:** Beautiful, engaging user experience

**Deliverables:**
- [ ] Profile setup modal
- [ ] Analysis progress view
- [ ] Viral Score widget (animated)
- [ ] Full report page
- [ ] Quick wins checklist
- [ ] Platform performance chart

**Success Criteria:**
- Smooth onboarding flow
- Clear value communication
- Actionable insights displayed

---

### Phase 3: Optimization (Week 3)
**Goal:** Performance, reliability, polish

**Deliverables:**
- [ ] Background job queue (Bull)
- [ ] Error handling & retries
- [ ] Email notifications
- [ ] Progress tracking improvements
- [ ] Analytics tracking
- [ ] A/B testing setup

**Success Criteria:**
- Jobs complete reliably
- Users are notified on completion
- Performance is acceptable (<10 min)

---

### Phase 4: Advanced Features (Future)
**Goal:** Competitive differentiation

**Deliverables:**
- [ ] Monthly re-analysis with trend chart
- [ ] Competitive benchmarking
- [ ] Improvement milestone tracking
- [ ] Automated posting recommendations
- [ ] Content calendar suggestions

---

## 🎯 Success Metrics

### User Engagement
- % of Creator Class users who connect profiles
- % who complete analysis
- % who re-analyze monthly
- Average time spent viewing report

### Business Impact
- Creator Class conversion rate
- Creator Class retention rate
- Feature satisfaction score (CSAT)
- Correlation: Viral Score improvement → retention

### Technical Performance
- Analysis completion time (target: <10 min)
- Success rate (target: >95%)
- API error rate (target: <2%)
- Cost per analysis (target: <$0.75)

---

## ⚠️ Risks & Mitigation

### Risk 1: Scraping Rate Limits
**Impact:** High - Could prevent analysis
**Mitigation:**
- Implement exponential backoff
- Cache scraped data for 24 hours
- Offer manual URL input fallback

### Risk 2: AI Analysis Cost Explosion
**Impact:** Medium - Could hurt margins
**Mitigation:**
- Set hard limits (max 15 posts analyzed)
- Aggressive result caching
- Monitor costs per user

### Risk 3: Low Adoption
**Impact:** Medium - Feature underutilized
**Mitigation:**
- Prominent dashboard placement
- Email campaign to Creator Class users
- Free trial for first 50 users

### Risk 4: Inaccurate Scores
**Impact:** High - Loss of trust
**Mitigation:**
- Calibrate scoring algorithm with test data
- Show score components (transparency)
- Allow user feedback on accuracy

---

## 📋 Implementation Checklist

### Database
- [ ] Design schema
- [ ] Write migration script
- [ ] Create TypeScript types
- [ ] Add to storage interface
- [ ] Implement in PostgresStorage
- [ ] Test CRUD operations

### Backend Services
- [ ] SocialMediaScraperService
  - [ ] TikTok scraper integration
  - [ ] Instagram scraper integration
  - [ ] YouTube scraper integration
  - [ ] Error handling
  - [ ] Rate limiting
- [ ] ProfileAnalysisService
  - [ ] Post analysis with AI
  - [ ] Viral Score calculation
  - [ ] Report generation
  - [ ] User preferences update

### API Layer
- [ ] POST /creator-profile/setup
- [ ] POST /creator-profile/analyze
- [ ] GET /creator-profile/status
- [ ] GET /creator-profile/report
- [ ] PATCH /creator-profile/handles
- [ ] Creator Class middleware
- [ ] Input validation
- [ ] Error responses

### Frontend
- [ ] Profile setup modal
- [ ] Analysis progress view
- [ ] Viral Score widget
- [ ] Full report page
- [ ] Quick wins checklist
- [ ] Platform performance chart
- [ ] Subscription gate UI

### Testing
- [ ] Unit tests for Viral Score calculation
- [ ] Integration tests for scrapers
- [ ] E2E test for full flow
- [ ] Load testing (100 concurrent analyses)

### Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Admin dashboard guide

---

## 🚀 Launch Strategy

### Pre-Launch
1. Beta test with 10 Creator Class users
2. Collect feedback on scoring accuracy
3. Refine UI based on user feedback
4. Prepare marketing materials

### Launch
1. Email announcement to Creator Class subscribers
2. Dashboard banner promoting feature
3. Social media announcement
4. Case study from beta tester

### Post-Launch
1. Monitor adoption metrics
2. Collect user feedback
3. Iterate on scoring algorithm
4. Plan Phase 2 features

---

**Status:** 📋 Plan Complete
**Next Step:** Review with team → Start Phase 1 implementation
**Owner:** Development Team
**Timeline:** Start Week of Oct 7, 2025
