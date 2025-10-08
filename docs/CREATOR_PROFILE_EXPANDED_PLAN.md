# Creator Profile Analysis - Expanded Feature Plan

## 📋 Overview

This document expands on the Creator Profile Analysis plan to include:
1. **Gamification System** - Achievements, streaks, leveling
2. **Reminders & Notifications** - Push, email, in-app
3. **Tier Differentiators & Paywalls** - Clear value ladders between Free and Creator Class

---

## 🎮 GAMIFICATION SYSTEM

### Goals
- Increase user engagement and retention
- Encourage regular use of features
- Create sense of progress and achievement
- Build community through leaderboards

---

### Database Schema

#### achievements Table
```sql
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR NOT NULL, -- 'profile', 'content', 'engagement', 'consistency'
  tier VARCHAR NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
  icon_url TEXT,
  points INTEGER DEFAULT 0,
  criteria JSON NOT NULL, -- {type: 'viral_score_reached', value: 75}
  unlock_message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Achievement Categories:**
- **Profile:** Profile analysis, viral score milestones
- **Content:** Content creation, trend usage
- **Engagement:** Saves, likes, shares
- **Consistency:** Streaks, regular usage

**Example Achievements:**
```json
[
  {
    "name": "first_analysis",
    "display_name": "Getting Started",
    "description": "Complete your first profile analysis",
    "category": "profile",
    "tier": "bronze",
    "points": 10,
    "criteria": {"type": "profile_analyzed", "count": 1}
  },
  {
    "name": "viral_veteran",
    "display_name": "Viral Veteran",
    "description": "Reach a Viral Score of 75+",
    "category": "profile",
    "tier": "gold",
    "points": 50,
    "criteria": {"type": "viral_score_reached", "value": 75}
  },
  {
    "name": "trending_master",
    "display_name": "Trending Master",
    "description": "Use 25 trends from Ideas page",
    "category": "content",
    "tier": "silver",
    "points": 30,
    "criteria": {"type": "trends_used", "count": 25}
  },
  {
    "name": "consistency_king",
    "display_name": "Consistency King",
    "description": "Maintain a 30-day login streak",
    "category": "consistency",
    "tier": "gold",
    "points": 100,
    "criteria": {"type": "login_streak", "days": 30}
  }
]
```

---

#### user_achievements Table
```sql
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  seen BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unseen ON user_achievements(user_id, seen) WHERE seen = FALSE;
```

---

#### user_gamification_stats Table
```sql
CREATE TABLE user_gamification_stats (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Points & Level
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  points_to_next_level INTEGER DEFAULT 100,

  -- Streaks
  current_login_streak INTEGER DEFAULT 0,
  longest_login_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  current_content_streak INTEGER DEFAULT 0,

  -- Milestones
  total_trends_used INTEGER DEFAULT 0,
  total_content_created INTEGER DEFAULT 0,
  total_analyses_run INTEGER DEFAULT 0,

  -- Badges
  badges_earned JSON DEFAULT '[]', -- ["early_adopter", "power_user"]

  -- Progress
  viral_score_history JSON DEFAULT '[]', -- [{date: "2025-10-05", score: 75}]

  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### leaderboards Table (Optional)
```sql
CREATE TABLE leaderboards (
  id SERIAL PRIMARY KEY,
  leaderboard_type VARCHAR NOT NULL, -- 'weekly', 'monthly', 'all_time'
  category VARCHAR NOT NULL, -- 'viral_score', 'points', 'consistency'
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  value INTEGER NOT NULL, -- score or points
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(leaderboard_type, category, user_id, period_start)
);

CREATE INDEX idx_leaderboards_type_category ON leaderboards(leaderboard_type, category);
CREATE INDEX idx_leaderboards_user ON leaderboards(user_id);
```

---

### Gamification Features

#### 1. Level System
**Progression:**
```
Level 1: Beginner (0-99 points)
Level 2: Rising Star (100-299 points)
Level 3: Content Creator (300-599 points)
Level 4: Viral Expert (600-999 points)
Level 5: Influencer (1000-1999 points)
Level 6: Legend (2000+ points)
```

**Points Calculation:**
```typescript
const POINT_SOURCES = {
  profile_analysis_first: 10,
  profile_analysis_monthly: 5,
  viral_score_increase_10: 20,
  trend_used: 3,
  content_created: 5,
  login_daily: 1,
  streak_7_days: 15,
  streak_30_days: 100,
  achievement_bronze: 10,
  achievement_silver: 25,
  achievement_gold: 50,
  achievement_platinum: 100
};
```

---

#### 2. Achievement System

**Achievement Types:**

**Profile Achievements:**
- First Analysis (10 pts)
- Viral Score 50+ (20 pts)
- Viral Score 75+ (50 pts)
- Viral Score 90+ (100 pts)
- Score Improved 10 Points (20 pts)

**Content Achievements:**
- First Trend Used (5 pts)
- 10 Trends Used (15 pts)
- 25 Trends Used (30 pts)
- 50 Trends Used (50 pts)
- First Content Created (10 pts)

**Consistency Achievements:**
- 3-Day Streak (5 pts)
- 7-Day Streak (15 pts)
- 14-Day Streak (30 pts)
- 30-Day Streak (100 pts)
- Early Bird (login before 8am, 5 pts)
- Night Owl (login after 10pm, 5 pts)

**Engagement Achievements:**
- 10 Saved Trends (10 pts)
- 50 Saved Trends (25 pts)
- Shared First Trend (5 pts)

---

#### 3. Streak System

**Types:**
- **Login Streak:** Consecutive days logging in
- **Content Streak:** Consecutive days creating/using content
- **Analysis Streak:** Weekly profile re-analysis

**Streak Rewards:**
```
Day 3: +5 pts + Bronze Badge
Day 7: +15 pts + Silver Badge
Day 14: +30 pts
Day 30: +100 pts + Gold Badge
Day 60: +200 pts + Platinum Badge
```

**Streak Recovery:**
- 1 "Freeze" per week (paid tier only)
- Maintain streak with late login (within 24h grace period)

---

#### 4. Progress Bars & Visual Feedback

**Progress Tracking:**
- Points to next level
- Days to next streak milestone
- Achievements progress (e.g., "23/25 trends used")
- Viral score improvement graph

**Dashboard Widgets:**
```
┌────────────────────────────────────────┐
│  LEVEL 4 - VIRAL EXPERT                │
│  [████████████████░░] 850/1000 pts     │
│  150 points to Level 5                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  🔥 CURRENT STREAK: 12 DAYS            │
│  Longest: 18 days                      │
│  Next milestone: 14 days (+30 pts)     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  🏆 ACHIEVEMENTS: 8/25                 │
│  Recent: Viral Veteran (Gold)          │
│  [View All]                            │
└────────────────────────────────────────┘
```

---

#### 5. Leaderboards (Optional for MVP)

**Leaderboard Types:**
- Weekly Top Viral Scores
- Monthly Most Active (by points)
- All-Time Legends
- Niche-Specific Rankings (fitness, beauty, etc.)

**Display:**
```
┌─────────────────────────────────────────────┐
│  🏆 WEEKLY VIRAL SCORE LEADERBOARD          │
│                                             │
│  1. 🥇 @fitnessguru    - 95 pts            │
│  2. 🥈 @beautytips     - 92 pts            │
│  3. 🥉 @comedyking     - 88 pts            │
│  ...                                        │
│  47. 👤 You            - 75 pts            │
│                                             │
│  [View Full Leaderboard]                   │
└─────────────────────────────────────────────┘
```

---

### Gamification API Endpoints

```typescript
// Get user gamification stats
GET /api/gamification/stats

// Get achievements
GET /api/gamification/achievements
GET /api/gamification/achievements/:id/progress

// Mark achievement as seen
POST /api/gamification/achievements/:id/seen

// Get leaderboard
GET /api/gamification/leaderboard?type=weekly&category=viral_score

// Claim streak reward
POST /api/gamification/streak/claim
```

---

## 🔔 REMINDERS & NOTIFICATIONS SYSTEM

### Goals
- Re-engage inactive users
- Remind users of incomplete actions
- Celebrate achievements and milestones
- Drive feature adoption

---

### Database Schema

#### notifications Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,

  -- Classification
  notification_type VARCHAR NOT NULL, -- 'achievement', 'reminder', 'milestone', 'feature', 'system'
  category VARCHAR NOT NULL, -- 'profile_analysis', 'trend', 'content', 'streak'
  priority VARCHAR DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_text TEXT, -- "View Report", "Try Now"
  action_url TEXT, -- "/creator-profile/report"
  icon_url TEXT,

  -- Metadata
  metadata JSON, -- {viral_score: 75, achievement_id: 123}

  -- Status
  status VARCHAR DEFAULT 'unread', -- 'unread', 'read', 'dismissed'
  read_at TIMESTAMP,

  -- Delivery
  delivered_via JSON DEFAULT '[]', -- ["in_app", "email", "push"]
  scheduled_for TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'unread';
```

---

#### user_notification_preferences Table
```sql
CREATE TABLE user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- In-App Notifications
  in_app_enabled BOOLEAN DEFAULT TRUE,

  -- Email Notifications
  email_enabled BOOLEAN DEFAULT TRUE,
  email_achievements BOOLEAN DEFAULT TRUE,
  email_reminders BOOLEAN DEFAULT TRUE,
  email_weekly_summary BOOLEAN DEFAULT TRUE,
  email_marketing BOOLEAN DEFAULT TRUE,

  -- Push Notifications (future)
  push_enabled BOOLEAN DEFAULT FALSE,
  push_token TEXT,
  push_achievements BOOLEAN DEFAULT TRUE,
  push_reminders BOOLEAN DEFAULT TRUE,
  push_streaks BOOLEAN DEFAULT TRUE,

  -- Reminder Settings
  reminder_profile_analysis BOOLEAN DEFAULT TRUE, -- Monthly reminder
  reminder_streak_at_risk BOOLEAN DEFAULT TRUE, -- Streak about to break
  reminder_new_trends BOOLEAN DEFAULT TRUE, -- Weekly new trends digest

  -- Frequency
  daily_digest BOOLEAN DEFAULT FALSE,
  weekly_digest BOOLEAN DEFAULT TRUE,

  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### notification_queue Table (for scheduled notifications)
```sql
CREATE TABLE notification_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL,
  payload JSON NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for, status);
```

---

### Notification Types

#### 1. Achievement Notifications
**Trigger:** User unlocks achievement
**Delivery:** In-app (immediate), Email (batched)

**Example:**
```json
{
  "type": "achievement",
  "title": "🏆 Achievement Unlocked!",
  "message": "You've earned 'Viral Veteran' for reaching a Viral Score of 75!",
  "action_text": "View Achievement",
  "action_url": "/achievements/viral-veteran",
  "priority": "high"
}
```

---

#### 2. Reminder Notifications

**2a. Profile Analysis Reminder**
**Trigger:** 30 days since last analysis
**Delivery:** Email + In-app

```json
{
  "type": "reminder",
  "category": "profile_analysis",
  "title": "Time to Refresh Your Viral Score",
  "message": "It's been 30 days since your last analysis. See how your content has improved!",
  "action_text": "Analyze Now",
  "action_url": "/creator-profile/analyze",
  "priority": "normal"
}
```

**2b. Streak At Risk**
**Trigger:** User hasn't logged in for 20+ hours (streak breaks at 24h)
**Delivery:** Push (if enabled) + Email

```json
{
  "type": "reminder",
  "category": "streak",
  "title": "🔥 Your 12-day streak is at risk!",
  "message": "Log in within 4 hours to keep your streak alive.",
  "action_text": "Save My Streak",
  "action_url": "/dashboard",
  "priority": "high"
}
```

**2c. New Trends Available**
**Trigger:** Weekly on Sunday
**Delivery:** Email

```json
{
  "type": "reminder",
  "category": "trend",
  "title": "🔥 50 New Trending Ideas This Week",
  "message": "Check out the latest viral trends in your niche.",
  "action_text": "View Trends",
  "action_url": "/ideas",
  "priority": "normal"
}
```

---

#### 3. Milestone Notifications

**3a. Viral Score Improvement**
**Trigger:** Viral score increased by 10+ points
**Delivery:** In-app + Email

```json
{
  "type": "milestone",
  "category": "profile_analysis",
  "title": "📈 Your Viral Score Jumped to 80!",
  "message": "That's a 15-point increase since last month. Keep up the great work!",
  "action_text": "View Report",
  "action_url": "/creator-profile/report",
  "priority": "high"
}
```

**3b. Level Up**
**Trigger:** User reaches new level
**Delivery:** In-app (immediate)

```json
{
  "type": "milestone",
  "category": "gamification",
  "title": "🎉 Level Up! You're now a Viral Expert",
  "message": "You've reached Level 4 with 850 points!",
  "action_text": "View Stats",
  "action_url": "/profile/stats",
  "priority": "high"
}
```

---

#### 4. Feature Notifications

**4a. New Feature Announcement**
**Trigger:** Manual (admin triggered)
**Delivery:** In-app + Email

```json
{
  "type": "feature",
  "title": "✨ New: Get Your Viral Score",
  "message": "Creator Class now includes AI-powered profile analysis. Get your score today!",
  "action_text": "Try It Now",
  "action_url": "/creator-profile/setup",
  "priority": "normal"
}
```

---

#### 5. System Notifications

**5a. Analysis Complete**
**Trigger:** Profile analysis finished
**Delivery:** In-app + Email

```json
{
  "type": "system",
  "category": "profile_analysis",
  "title": "✅ Your Profile Analysis is Ready",
  "message": "Your Viral Score: 75/100. View your full report now.",
  "action_text": "View Report",
  "action_url": "/creator-profile/report",
  "priority": "high"
}
```

**5b. Subscription Expiring**
**Trigger:** 7 days before expiration
**Delivery:** Email

```json
{
  "type": "system",
  "category": "subscription",
  "title": "⚠️ Your Creator Class expires in 7 days",
  "message": "Renew now to keep access to profile analysis and personalized trends.",
  "action_text": "Renew Subscription",
  "action_url": "/subscription",
  "priority": "urgent"
}
```

---

### Notification Delivery Channels

#### 1. In-App Notifications
**Location:** Bell icon in header
**Display:**
```
┌────────────────────────────────────────────┐
│  🔔 Notifications (3 unread)               │
│                                            │
│  [•] 🏆 Achievement Unlocked!              │
│      You've earned 'Viral Veteran'         │
│      2 hours ago                           │
│                                            │
│  [•] 📈 Your Viral Score Jumped to 80!     │
│      That's a 15-point increase            │
│      Yesterday                             │
│                                            │
│  [ ] 🔥 50 New Trending Ideas This Week    │
│      Check out the latest viral trends     │
│      3 days ago                            │
│                                            │
│  [Mark All Read]  [View All]              │
└────────────────────────────────────────────┘
```

---

#### 2. Email Notifications

**Email Types:**

**Immediate Emails:**
- Analysis complete
- Achievement unlocked (high value)
- Streak milestone reached
- Subscription expiring

**Daily Digest:**
- Summary of achievements
- Top trends for your niche
- Quick stats update

**Weekly Summary:**
- Weekly progress report
- New trends count
- Viral score trend
- Upcoming milestones

**Email Template Example:**
```html
Subject: 🏆 Achievement Unlocked: Viral Veteran!

Hi [Name],

Congratulations! You've just unlocked the "Viral Veteran" achievement for reaching a Viral Score of 75.

Your Viral Score: 75/100
Achievement Tier: Gold
Points Earned: +50

Keep up the great work! You're only 75 points away from Level 5.

[View Full Report] [Update Preferences]

---
ViralForge
Unsubscribe | Manage Preferences
```

---

#### 3. Push Notifications (Future)
**Requires:** Mobile app or browser push API
**Use Cases:**
- Streak at risk
- Breaking news in niche
- Time-sensitive trends
- High-value achievements

---

### Notification API Endpoints

```typescript
// Get user notifications
GET /api/notifications?status=unread&limit=10

// Mark as read
PATCH /api/notifications/:id/read

// Dismiss notification
DELETE /api/notifications/:id

// Mark all as read
POST /api/notifications/mark-all-read

// Get notification preferences
GET /api/notifications/preferences

// Update preferences
PATCH /api/notifications/preferences

// Test notification (admin only)
POST /api/admin/notifications/test
```

---

### Notification Service Implementation

```typescript
class NotificationService {
  // Send notification to user
  async send(
    userId: string,
    notification: NotificationPayload
  ): Promise<void>

  // Schedule notification for future
  async schedule(
    userId: string,
    notification: NotificationPayload,
    scheduledFor: Date
  ): Promise<void>

  // Batch send (for announcements)
  async sendBatch(
    userIds: string[],
    notification: NotificationPayload
  ): Promise<void>

  // Process scheduled notifications (cron job)
  async processQueue(): Promise<void>

  // Send email
  private async sendEmail(
    userId: string,
    notification: NotificationPayload
  ): Promise<void>

  // Send push (future)
  private async sendPush(
    userId: string,
    notification: NotificationPayload
  ): Promise<void>
}
```

---

## 💎 TIER DIFFERENTIATORS & PAYWALLS

### Goals
- Clear value proposition for each tier
- Compelling upgrade path
- Reduce churn with progressive feature gating
- Maximize LTV with strategic paywalls

---

### Subscription Tiers

#### FREE TIER
**Price:** $0/month
**Target:** Casual users, browsers

**Features:**
✅ Browse trending ideas (limited to 10/day)
✅ Basic search & filters
✅ Save up to 5 trends
✅ Basic dashboard stats
✅ 1 profile analysis per quarter
✅ View viral score (refreshed quarterly)
✅ Gamification (levels & achievements - limited)

**Limitations:**
❌ No personalized trend recommendations
❌ No "Use This" AI analysis
❌ No unlimited saves
❌ No priority support
❌ No streak freeze
❌ No monthly profile re-analysis

---

#### CREATOR CLASS
**Price:** $10/month or $96/year (20% off)
**Target:** Serious creators, influencers

**Features:**
✅ **Unlimited trending ideas**
✅ **Personalized trend recommendations** based on niche
✅ **"Use This" AI analysis** for every trend
✅ **Unlimited saves & collections**
✅ **Monthly profile analysis** with Viral Score
✅ **Full gamification** (all achievements, streak freeze)
✅ **Priority email support**
✅ **Advanced dashboard stats**
✅ **Content performance tracking**
✅ **Weekly trend digest**
✅ **Early access to new features**

**Exclusive Gamification:**
✅ Streak freeze (1/week)
✅ Exclusive platinum achievements
✅ Leaderboard access
✅ Profile badge ("Creator Class")

---

#### AGENCY (Future)
**Price:** $49/month
**Target:** Agencies, teams, brands

**Features:**
✅ Everything in Creator Class
✅ **5 team member seats**
✅ **Client management dashboard**
✅ **White-label reports**
✅ **API access**
✅ **Bulk analysis (up to 25 profiles)**
✅ **Dedicated account manager**

---

### Feature Gating Strategy

#### Paywall Placement

**Soft Paywalls (Teasers):**
- Show 10 trends/day → "Unlock unlimited with Creator Class"
- Show Viral Score → "Get monthly updates with Creator Class"
- Show "Use This" button → Requires Creator Class

**Hard Paywalls:**
- Click "Use This" → Upgrade modal
- Save 6th trend → Upgrade modal
- Monthly re-analysis → Upgrade modal

**Value-First Paywalls:**
- Let users browse freely
- Gate advanced features (personalization, AI analysis)
- Allow 1 free profile analysis to prove value

---

### Paywall UI/UX

#### 1. Upgrade Modal (Soft)
**Trigger:** Click gated feature
```
┌──────────────────────────────────────────────┐
│  ✨ Unlock Creator Class Features            │
│                                              │
│  Get AI-powered insights for every trend:    │
│  ✓ Personalized recommendations              │
│  ✓ "Use This" viral analysis                 │
│  ✓ Monthly profile score updates             │
│  ✓ Unlimited saves                           │
│                                              │
│  $10/month or $96/year (save 20%)           │
│                                              │
│  [Maybe Later]  [Upgrade Now →]             │
└──────────────────────────────────────────────┘
```

---

#### 2. Feature Comparison Table
**Location:** Pricing page, settings
```
┌─────────────────────────────────────────────────────────┐
│  Feature                    │ Free    │ Creator Class   │
│─────────────────────────────┼─────────┼─────────────────│
│ Trending ideas/day          │ 10      │ Unlimited       │
│ Personalized recommendations│ ❌      │ ✅              │
│ "Use This" AI analysis      │ ❌      │ ✅              │
│ Saved trends                │ 5       │ Unlimited       │
│ Profile analysis frequency  │ Quarterly│ Monthly        │
│ Streak freeze               │ ❌      │ ✅ (1/week)     │
│ Priority support            │ ❌      │ ✅              │
│ Early access features       │ ❌      │ ✅              │
│─────────────────────────────┼─────────┼─────────────────│
│ Price                       │ Free    │ $10/month       │
│                             │         │ $96/year        │
└─────────────────────────────────────────────────────────┘

[Start Free]  [Upgrade to Creator Class →]
```

---

#### 3. In-Feature Upgrade Prompts

**Trend Card (Free User):**
```
┌────────────────────────────────────────────┐
│ 🔥 POV: When your favorite song comes on   │
│ 4.2M views · 2h ago · TikTok              │
│                                            │
│ [Save (3/5 used)] [Use This 🔒]           │
│                                            │
│ 💎 Upgrade to Creator Class to unlock:    │
│ • Personalized trend matching              │
│ • AI "Use This" analysis                   │
│ • Unlimited saves                          │
│ [Learn More]                               │
└────────────────────────────────────────────┘
```

**Dashboard Widget (Free User):**
```
┌────────────────────────────────────────────┐
│  YOUR VIRAL SCORE                          │
│                                            │
│         ╱───────╲                          │
│       ╱    68     ╲                        │
│      │             │  Intermediate Creator │
│       ╲           ╱                        │
│         ╲───────╱                          │
│                                            │
│  Last analyzed: 85 days ago 🔒             │
│                                            │
│  💎 Upgrade for monthly updates            │
│  [Upgrade to Creator Class]                │
└────────────────────────────────────────────┘
```

---

### Paywall Conversion Optimization

#### Conversion Funnel
```
Step 1: User hits paywall
        ↓
Step 2: Show value proposition modal
        ↓
Step 3: Offer trial or discount (first month 50% off)
        ↓
Step 4: Simple checkout (Stripe)
        ↓
Step 5: Immediate feature unlock
        ↓
Step 6: Onboarding tutorial
```

---

#### Conversion Tactics

**1. Free Trial**
- 7-day free trial of Creator Class
- No credit card required
- Email reminder 2 days before expiration

**2. Limited-Time Offers**
- First month 50% off ($5)
- Annual plan saves 20% ($96/year)
- Early adopter pricing (first 100 users)

**3. Social Proof**
- "Join 1,247 creators using Creator Class"
- Testimonials from successful creators
- Before/after viral score improvements

**4. Urgency**
- "Unlock your full potential today"
- "Limited spots at this price"
- Countdown timer for discounts

**5. Exit Intent**
- Show special offer when about to leave
- "Wait! Get 50% off your first month"

---

### Paywall Middleware

```typescript
// Middleware to check subscription tier
async function requireCreatorClass(req, res, next) {
  const user = req.user;
  const subscription = await storage.getUserSubscription(user.id);

  if (!subscription || subscription.tierId !== 'creator') {
    return res.status(403).json({
      error: 'Creator Class subscription required',
      feature: req.originalUrl,
      upgradeUrl: '/subscription/upgrade',
      message: 'Upgrade to Creator Class to unlock this feature'
    });
  }

  next();
}

// Usage
app.post('/api/trends/:id/apply',
  requireAuth,
  requireCreatorClass, // ⭐ Paywall
  async (req, res) => {
    // ... personalized advice logic
  }
);
```

---

### Feature Gates in Frontend

```typescript
// Component wrapper for gated features
function CreatorClassGate({ children, fallback }) {
  const { user, subscription } = useAuth();

  if (!subscription || subscription.tierId !== 'creator') {
    return fallback || <UpgradePrompt />;
  }

  return children;
}

// Usage
<CreatorClassGate
  fallback={<UpgradeButton feature="Use This Analysis" />}
>
  <UseThisButton trendId={trend.id} />
</CreatorClassGate>
```

---

## 📊 COMBINED METRICS & SUCCESS CRITERIA

### User Engagement Metrics
- **Gamification:**
  - % users with achievements unlocked
  - Average streak length
  - % users at Level 3+
  - Leaderboard participation rate

- **Notifications:**
  - Open rate (in-app, email)
  - Click-through rate
  - Opt-out rate
  - Notification preference changes

- **Paywalls:**
  - Paywall conversion rate
  - Trial-to-paid conversion rate
  - Churn rate by tier
  - Feature usage by tier

---

### Business Impact Metrics
- **Revenue:**
  - MRR (Monthly Recurring Revenue)
  - ARPU (Average Revenue Per User)
  - LTV (Lifetime Value)
  - CAC (Customer Acquisition Cost)

- **Retention:**
  - Day 7 retention
  - Day 30 retention
  - Churn rate (free vs paid)
  - Reactivation rate

- **Conversion:**
  - Free → Creator Class conversion
  - Trial → Paid conversion
  - Annual plan adoption rate

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Week 1)
- [ ] Database schema for all 3 systems
- [ ] Basic tier gating middleware
- [ ] In-app notification system
- [ ] Achievement tracking foundation

### Phase 2: Core Features (Week 2-3)
- [ ] Profile analysis with paywall
- [ ] Achievement unlock system
- [ ] Email notification service
- [ ] Upgrade flow & Stripe integration

### Phase 3: Gamification (Week 4)
- [ ] Level system
- [ ] Streak tracking
- [ ] Achievement UI
- [ ] Progress dashboard

### Phase 4: Notifications (Week 5)
- [ ] Scheduled notifications
- [ ] Email templates
- [ ] Notification preferences
- [ ] Weekly digest emails

### Phase 5: Polish & Optimize (Week 6)
- [ ] A/B test paywall copy
- [ ] Optimize email open rates
- [ ] Tune gamification rewards
- [ ] Analytics dashboard

---

**STATUS:** 📋 Expanded plan complete
**NEXT:** Review & approve → Begin Phase 1 implementation
**ESTIMATED TIMELINE:** 6 weeks for full feature set
**MVP TIMELINE:** 2 weeks (Phase 1-2 only)
