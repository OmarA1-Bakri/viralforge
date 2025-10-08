# Creator Profile Analysis System - Architecture

## 🎯 Feature Overview

**Value Proposition:**
Transform user onboarding into an AI-powered content audit that provides:
1. Analysis of their top 5 posts per platform
2. Detailed feedback on content style & approach
3. **Viral Score (0-100)** - objective baseline for improvement
4. Personalized dashboard stats based on actual content

**Subscription Differentiator:**
- **Free Tier:** Basic trend discovery
- **Creator Class:** AI profile analysis + Viral Score + personalized recommendations

---

## 🏗️ System Architecture

```
User provides social media URLs
    ↓
Scrape top 5 posts per platform (TikTok/Instagram/YouTube)
    ↓
AI analyzes each post (structure, engagement, viral elements)
    ↓
Aggregate analysis + calculate Viral Score
    ↓
Generate personalized feedback report
    ↓
Update user preferences & dashboard stats
    ↓
Unlock personalized viral recommendations
```

---

## 🗄️ Database Schema

### 1. Creator Profiles Table
```sql
CREATE TABLE creator_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Social media handles
  tiktok_username VARCHAR,
  instagram_username VARCHAR,
  youtube_channel_id VARCHAR,

  -- Analysis status
  analysis_status VARCHAR DEFAULT 'pending',  -- pending, analyzing, completed, failed
  last_analyzed_at TIMESTAMP,

  -- Viral Score (0-100)
  viral_score INTEGER,

  -- Aggregated insights
  content_strengths TEXT[],
  content_weaknesses TEXT[],
  recommended_improvements TEXT[],

  -- Platform-specific scores
  tiktok_score INTEGER,
  instagram_score INTEGER,
  youtube_score INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Analyzed Posts Table
```sql
CREATE TABLE analyzed_posts (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Post metadata
  platform VARCHAR NOT NULL,  -- 'tiktok', 'instagram', 'youtube'
  post_url VARCHAR NOT NULL,
  post_id VARCHAR NOT NULL,

  -- Scraped data
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  posted_at TIMESTAMP,

  -- AI analysis
  viral_elements TEXT[],       -- ["trending_audio", "strong_hook", "clear_cta"]
  content_structure JSON,      -- {hook: "0-3s", body: "3-25s", cta: "25-30s"}
  engagement_rate REAL,
  emotional_triggers TEXT[],   -- ["curiosity", "humor", "fomo"]
  post_score INTEGER,          -- 0-100 score for this specific post

  -- AI feedback
  what_worked TEXT,
  what_didnt_work TEXT,
  improvement_tips TEXT[],

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyzed_posts_profile ON analyzed_posts(profile_id);
CREATE INDEX idx_analyzed_posts_platform ON analyzed_posts(platform);
```

### 3. Profile Analysis Reports Table
```sql
CREATE TABLE profile_analysis_reports (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Overall analysis
  viral_score INTEGER NOT NULL,
  posts_analyzed INTEGER NOT NULL,

  -- Platform breakdown
  platform_scores JSON,  -- {tiktok: 75, instagram: 68, youtube: 82}

  -- Detailed feedback
  overall_strengths TEXT[],
  overall_weaknesses TEXT[],
  content_style_summary TEXT,
  target_audience_insight TEXT,

  -- Actionable recommendations
  quick_wins TEXT[],              -- 3-5 easy improvements
  strategic_recommendations TEXT[], -- Long-term growth tactics

  -- Pattern recognition
  most_viral_pattern VARCHAR,     -- "POV format with trending audio"
  least_effective_pattern VARCHAR,

  -- Benchmarking
  compared_to_niche VARCHAR,      -- "Above average in fitness niche"
  growth_potential VARCHAR,       -- "high", "medium", "low"

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_profile ON profile_analysis_reports(profile_id);
```

---

## 🔧 Service Layer Architecture

### ProfileAnalysisService (`server/ai/profileAnalysisService.ts`)

```typescript
class ProfileAnalysisService {
  /**
   * Main orchestration method
   */
  async analyzeCreatorProfile(
    userId: string,
    socialHandles: {
      tiktok?: string;
      instagram?: string;
      youtube?: string;
    }
  ): Promise<ProfileAnalysisReport>

  /**
   * Scrape top posts from each platform
   */
  private async scrapeTopPosts(
    platform: 'tiktok' | 'instagram' | 'youtube',
    username: string,
    limit: number = 5
  ): Promise<ScrapedPost[]>

  /**
   * Analyze individual post with AI
   */
  private async analyzePost(
    post: ScrapedPost,
    platform: string
  ): Promise<PostAnalysis>

  /**
   * Aggregate analysis across all posts
   */
  private async aggregateAnalysis(
    postAnalyses: PostAnalysis[]
  ): Promise<AggregatedInsights>

  /**
   * Calculate Viral Score (0-100)
   */
  private calculateViralScore(
    postAnalyses: PostAnalysis[],
    aggregated: AggregatedInsights
  ): number

  /**
   * Generate personalized feedback report
   */
  private async generateReport(
    userId: string,
    postAnalyses: PostAnalysis[],
    viralScore: number
  ): Promise<ProfileAnalysisReport>

  /**
   * Update user preferences based on analysis
   */
  private async updateUserPreferences(
    userId: string,
    report: ProfileAnalysisReport
  ): Promise<void>
}
```

---

## 🤖 AI Analysis Prompts

### Individual Post Analysis Prompt

```typescript
ROLE: Social Media Content Analyst

ATTRIBUTES:
You're a data-driven content strategist who has analyzed thousands of
viral posts across TikTok, Instagram, and YouTube. You understand the
specific elements that make content perform well on each platform,
from hooks and pacing to visual composition and audio strategy.

GOAL:
Analyze this ${platform} post to identify viral elements, engagement
drivers, and areas for improvement. Focus on actionable insights the
creator can implement immediately.

POST DATA:
Platform: ${platform}
Title: ${post.title}
Views: ${post.viewCount}
Likes: ${post.likeCount}
Comments: ${post.commentCount}
Engagement Rate: ${post.engagementRate}%
${post.thumbnailUrl ? '[THUMBNAIL IMAGE ATTACHED]' : ''}

ANALYZE:

1. **Viral Elements Present:**
   - What specific elements contributed to virality?
   - Hook effectiveness (first 3 seconds)
   - Content structure and pacing
   - Visual composition quality
   - Audio/music strategy
   - Hashtag effectiveness

2. **Engagement Analysis:**
   - Why did viewers engage (like, comment, share)?
   - Emotional triggers activated
   - Call-to-action effectiveness
   - Community-building elements

3. **What Worked:**
   - 2-3 specific strengths of this post
   - Which elements should be replicated

4. **What Didn't Work:**
   - 1-2 areas that limited performance
   - Missed opportunities

5. **Improvement Tips:**
   - 3 specific, actionable improvements
   - Quick wins vs. strategic changes

OUTPUT FORMAT: JSON
{
  "viralElements": ["trending_audio", "strong_hook", ...],
  "emotionalTriggers": ["curiosity", "humor", ...],
  "postScore": 75,
  "whatWorked": "Strong hook with trending audio...",
  "whatDidntWork": "CTA was unclear...",
  "improvementTips": ["Add text overlay", "Improve lighting", ...]
}
```

### Aggregated Report Generation Prompt

```typescript
ROLE: Creator Growth Strategist

ATTRIBUTES:
You're a viral content coach who specializes in helping creators
identify their unique strengths and systematically improve their
content. You provide honest, constructive feedback with clear action
plans for growth.

GOAL:
Generate a comprehensive profile analysis report based on ${postsCount}
analyzed posts. Identify patterns, calculate an overall Viral Score,
and provide a clear roadmap for improvement.

ANALYZED POSTS SUMMARY:
${postSummaries}

PLATFORM PERFORMANCE:
TikTok: ${tiktokAvgScore}/100 (${tiktokPostCount} posts)
Instagram: ${instagramAvgScore}/100 (${instagramPostCount} posts)
YouTube: ${youtubeAvgScore}/100 (${youtubePostCount} posts)

GENERATE COMPREHENSIVE REPORT:

1. **Overall Viral Score (0-100):**
   - Calculate weighted average across platforms
   - Consider engagement rates, viral elements, content quality

2. **Content Strengths:**
   - 3-5 patterns that consistently work well
   - Creator's unique advantages

3. **Content Weaknesses:**
   - 2-3 patterns that limit growth
   - Common mistakes across posts

4. **Content Style Summary:**
   - Overall tone and approach
   - Target audience profile (inferred)
   - Content format preferences

5. **Quick Wins (3-5 items):**
   - Easy improvements for immediate impact
   - Low-effort, high-reward changes

6. **Strategic Recommendations (3-5 items):**
   - Long-term growth tactics
   - Skill development priorities
   - Platform-specific strategies

7. **Growth Potential:**
   - "high" | "medium" | "low"
   - Based on current score and improvement opportunities

OUTPUT FORMAT: Structured JSON with all sections
```

---

## 📊 Viral Score Calculation Algorithm

```typescript
function calculateViralScore(postAnalyses: PostAnalysis[]): number {
  // Weighted components (total = 100)
  const weights = {
    engagementRate: 30,      // How well audience engages
    viralElements: 25,       // Use of proven viral tactics
    contentQuality: 20,      // Production value, structure
    consistency: 15,         // Score variance across posts
    platformOptimization: 10 // Platform-specific best practices
  };

  // 1. Average engagement rate score
  const avgEngagement = average(posts.map(p => p.engagementRate));
  const engagementScore = normalizeEngagement(avgEngagement); // 0-100

  // 2. Viral elements usage
  const totalViralElements = sum(posts.map(p => p.viralElements.length));
  const avgViralElements = totalViralElements / posts.length;
  const viralElementsScore = Math.min((avgViralElements / 5) * 100, 100);

  // 3. Content quality (average post scores)
  const contentQualityScore = average(posts.map(p => p.postScore));

  // 4. Consistency (inverse of score variance)
  const scoreVariance = calculateVariance(posts.map(p => p.postScore));
  const consistencyScore = Math.max(0, 100 - (scoreVariance * 2));

  // 5. Platform optimization
  const platformScore = calculatePlatformOptimization(posts);

  // Weighted sum
  const viralScore =
    (engagementScore * weights.engagementRate +
     viralElementsScore * weights.viralElements +
     contentQualityScore * weights.contentQuality +
     consistencyScore * weights.consistency +
     platformScore * weights.platformOptimization) / 100;

  return Math.round(viralScore);
}
```

**Score Interpretation:**
- **90-100:** Viral Creator - Consistently producing high-performing content
- **75-89:** Advanced Creator - Strong content with room for optimization
- **60-74:** Intermediate Creator - Good foundation, needs strategic improvements
- **40-59:** Developing Creator - Building skills, many growth opportunities
- **0-39:** Beginner Creator - Needs fundamental improvements

---

## 🔄 Analysis Flow

### Phase 1: Profile Setup (User Input)
```typescript
POST /api/creator-profile/setup
{
  "tiktokUsername": "@fitnesscreator",
  "instagramUsername": "@fitnesscreator",
  "youtubeChannelId": "UC1234567890"
}
```

### Phase 2: Scraping (Background Job)
```typescript
// For each platform:
1. Call crew-social-tools scraper
2. Get top 5 posts (sorted by engagement)
3. Extract metadata (views, likes, comments, etc.)
4. Download thumbnails
5. Store in analyzed_posts table
```

### Phase 3: AI Analysis (Background Job)
```typescript
// For each scraped post:
1. Call Grok Vision for thumbnail analysis
2. Analyze metadata for engagement patterns
3. Generate post-specific feedback
4. Calculate post score (0-100)
5. Store analysis results
```

### Phase 4: Aggregation
```typescript
1. Collect all post analyses
2. Calculate platform-specific scores
3. Calculate overall Viral Score
4. Generate comprehensive report
5. Store in profile_analysis_reports
```

### Phase 5: Dashboard Update
```typescript
1. Update user preferences with insights
2. Personalize dashboard stats
3. Unlock personalized trend recommendations
4. Show "Your Viral Score" widget
```

---

## 🎨 Dashboard Integration

### New Dashboard Widgets

**1. Viral Score Card**
```tsx
<ViralScoreCard>
  <CircularProgress value={viralScore} max={100} />
  <ScoreLabel>Your Viral Score</ScoreLabel>
  <ScoreValue>{viralScore}/100</ScoreValue>
  <ScoreTier>Advanced Creator</ScoreTier>
  <LastAnalyzed>Analyzed 3 days ago</LastAnalyzed>
  <ReanalyzeButton>Analyze Again</ReanalyzeButton>
</ViralScoreCard>
```

**2. Content Strengths Widget**
```tsx
<StrengthsWidget>
  <Title>Your Content Strengths</Title>
  {strengths.map(strength => (
    <StrengthItem>
      <Icon>✅</Icon>
      <Text>{strength}</Text>
    </StrengthItem>
  ))}
</StrengthsWidget>
```

**3. Quick Wins Widget**
```tsx
<QuickWinsWidget>
  <Title>Quick Wins for You</Title>
  {quickWins.map(win => (
    <WinItem>
      <Checkbox />
      <Text>{win}</Text>
    </WinItem>
  ))}
</QuickWinsWidget>
```

**4. Platform Performance Comparison**
```tsx
<PlatformComparisonChart>
  <BarChart data={{
    TikTok: tiktokScore,
    Instagram: instagramScore,
    YouTube: youtubeScore
  }} />
</PlatformComparisonChart>
```

---

## 🔐 Subscription Tier Logic

```typescript
// Middleware check
async function requireCreatorClass(req, res, next) {
  const user = req.user;
  const subscription = await getSubscription(user.id);

  if (!subscription || subscription.tier !== 'creator') {
    return res.status(403).json({
      error: 'Creator Class subscription required',
      upgradeUrl: '/subscription/upgrade'
    });
  }

  next();
}

// Route protection
app.post('/api/creator-profile/analyze',
  requireAuth,
  requireCreatorClass,  // ⭐ Creator-only feature
  async (req, res) => {
    // ... analysis logic
  }
);
```

---

## 💰 Cost Considerations

**Per User Analysis:**
- Scrape 5-15 posts (free - using existing tools)
- AI analyze 5-15 posts × $0.04 = **$0.20-0.60**
- Generate report × $0.05 = **$0.05**
- **Total: $0.25-0.65 per creator analysis**

**Monthly Cost (assuming 100 Creator Class users):**
- Initial analysis: 100 × $0.50 = $50
- Re-analysis (monthly): 100 × $0.50 = $50
- **Total: ~$100/month**

**Revenue (assuming $10/month Creator Class):**
- 100 users × $10 = $1,000/month
- **Profit margin: 90%** ✅

---

## 📋 Implementation Checklist

### Phase 1: Database & Schema
- [ ] Create creator_profiles table
- [ ] Create analyzed_posts table
- [ ] Create profile_analysis_reports table
- [ ] Add migration script
- [ ] Update TypeScript types

### Phase 2: Scraping Integration
- [ ] Create SocialMediaScraperService
- [ ] Integrate crew-social-tools (TikTok)
- [ ] Integrate crew-social-tools (Instagram)
- [ ] Integrate crew-social-tools (YouTube)
- [ ] Handle rate limiting & errors

### Phase 3: AI Analysis
- [ ] Create ProfileAnalysisService
- [ ] Implement post analysis with Grok Vision
- [ ] Implement aggregation logic
- [ ] Implement Viral Score calculation
- [ ] Implement report generation

### Phase 4: API Endpoints
- [ ] POST /api/creator-profile/setup
- [ ] POST /api/creator-profile/analyze (Creator Class only)
- [ ] GET /api/creator-profile/report
- [ ] GET /api/creator-profile/viral-score
- [ ] PATCH /api/creator-profile/update-handles

### Phase 5: Dashboard Integration
- [ ] Viral Score widget
- [ ] Content Strengths widget
- [ ] Quick Wins widget
- [ ] Platform Performance chart
- [ ] Profile setup modal

### Phase 6: Background Jobs
- [ ] Create job queue system
- [ ] Implement scraping job
- [ ] Implement analysis job
- [ ] Add job status tracking
- [ ] Error handling & retries

---

## 🚀 Future Enhancements

1. **Progress Tracking**
   - Monthly re-analysis
   - Viral Score trend chart
   - Improvement milestones

2. **Competitive Benchmarking**
   - Compare to niche average
   - Identify top performers in niche
   - Learn from best-in-class

3. **A/B Testing Recommendations**
   - Test different content styles
   - Track what improves Viral Score
   - Data-driven optimization

4. **Automated Posting Schedule**
   - Best times based on analysis
   - Content calendar suggestions
   - Reminder notifications

---

**Status:** 📋 Architecture Designed
**Next:** Database schema implementation
**Timeline:** 2-3 days for MVP
