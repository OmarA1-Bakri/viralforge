# How to Use crew-social-tools

## Quick Start (3 Steps)

### Step 1: Start the Service

```bash
cd server/crew-social-tools
docker-compose up -d
```

The service will be available at `http://localhost:8001`

### Step 2: Test It Works

```bash
# Run the test script
./test_endpoints.sh

# Or manually test health
curl http://localhost:8001/health
# Should return: {"status":"ok"}
```

### Step 3: Use from Your Express App

```typescript
import * as crewTools from './services/crewSocialTools';

// Search YouTube
const videos = await crewTools.lookupYouTube({
  mode: 'search',
  idOrQuery: 'viral content creation',
  limit: 10
});

console.log(videos);
```

## Complete Integration Example

### 1. Add a New API Endpoint

Edit `server/routes.ts`:

```typescript
import * as crewTools from './services/crewSocialTools';

// New endpoint: Discover trending content
app.post("/api/social/discover-trends",
  authenticateToken,
  checkSubscriptionLimit('videoAnalysis'),
  async (req: AuthRequest, res) => {
    try {
      const { query, platforms, limit } = req.body;

      // Aggregate trends from multiple platforms
      const trends = await crewTools.aggregateTrends({
        query: query || 'viral content',
        platforms: platforms || ['youtube', 'reddit', 'twitter'],
        limit: limit || 50
      });

      // Track usage
      await trackUsage(req.user!.id, 'videoAnalysis');

      res.json({
        success: true,
        trends,
        count: trends.length
      });
    } catch (error: any) {
      console.error('Trend discovery failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Platform-specific endpoint
app.post("/api/social/youtube/search",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { query, limit } = req.body;

      const videos = await crewTools.lookupYouTube({
        mode: 'search',
        idOrQuery: query,
        limit: limit || 25
      });

      res.json({
        success: true,
        videos,
        count: videos.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

### 2. Use from Frontend

Create a new component `client/src/components/SocialTrendExplorer.tsx`:

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TrendItem {
  source: string;
  title?: string;
  text?: string;
  author?: string;
  url?: string;
  metrics?: {
    likes?: number;
    views?: number;
    comments?: number;
  };
}

export default function SocialTrendExplorer() {
  const [query, setQuery] = useState('viral content');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'reddit']);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['social-trends', query, selectedPlatforms],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/social/discover-trends', {
        query,
        platforms: selectedPlatforms,
        limit: 50
      });
      return response.json();
    },
    enabled: false // Manual trigger
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Discover Social Trends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for trends..."
              onKeyDown={(e) => e.key === 'Enter' && refetch()}
            />
            <Button onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div className="flex gap-2">
            {['youtube', 'reddit', 'twitter'].map(platform => (
              <Button
                key={platform}
                variant={selectedPlatforms.includes(platform) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedPlatforms(prev =>
                    prev.includes(platform)
                      ? prev.filter(p => p !== platform)
                      : [...prev, platform]
                  );
                }}
              >
                {platform}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {data?.success && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found {data.count} trending items
          </p>
          {data.trends.map((item: TrendItem, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{item.title || item.text?.slice(0, 100)}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.source} · {item.author}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      {item.metrics?.views && <span>👁️ {item.metrics.views.toLocaleString()}</span>}
                      {item.metrics?.likes && <span>❤️ {item.metrics.likes.toLocaleString()}</span>}
                      {item.metrics?.comments && <span>💬 {item.metrics.comments}</span>}
                    </div>
                  </div>
                  {item.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Real-World Use Cases

#### Use Case 1: Automated Trend Discovery

```typescript
// server/automation/social_trends.ts
import * as crewTools from '../services/crewSocialTools';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function discoverAndStoreTrends() {
  console.log('🔍 Discovering trending content...');

  // Search multiple platforms
  const trends = await crewTools.aggregateTrends({
    query: 'viral content 2025',
    platforms: ['youtube', 'reddit', 'twitter'],
    limit: 100
  });

  // Filter high-engagement content
  const viral = trends.filter(item => {
    const engagement = (item.metrics?.likes || 0) + (item.metrics?.views || 0);
    return engagement > 10000;
  });

  // Store in database
  for (const trend of viral) {
    await db.execute(sql`
      INSERT INTO discovered_trends (source, url, title, author, metrics, discovered_at)
      VALUES (${trend.source}, ${trend.url}, ${trend.title}, ${trend.author},
              ${JSON.stringify(trend.metrics)}, now())
      ON CONFLICT (url) DO NOTHING
    `);
  }

  console.log(`✅ Stored ${viral.length} trending items`);
}

// Run every hour
setInterval(discoverAndStoreTrends, 60 * 60 * 1000);
```

#### Use Case 2: Competitor Analysis

```typescript
// Analyze competitor content performance
app.post("/api/analytics/competitor",
  authenticateToken,
  async (req: AuthRequest, res) => {
    const { competitorHandle, platform } = req.body;

    let content;
    switch (platform) {
      case 'youtube':
        content = await crewTools.lookupYouTube({
          mode: 'channel_recent',
          idOrQuery: competitorHandle,
          limit: 50
        });
        break;
      case 'instagram':
        content = await crewTools.fetchInstagram({
          mode: 'profile',
          target: competitorHandle,
          maxItems: 50
        });
        break;
      case 'reddit':
        content = await crewTools.scanReddit({
          subreddit: competitorHandle,
          sort: 'top',
          timeFilter: 'month',
          limit: 50
        });
        break;
    }

    // Analyze metrics
    const avgLikes = content.reduce((sum, item) => sum + (item.metrics?.likes || 0), 0) / content.length;
    const avgViews = content.reduce((sum, item) => sum + (item.metrics?.views || 0), 0) / content.length;
    const avgComments = content.reduce((sum, item) => sum + (item.metrics?.comments || 0), 0) / content.length;

    res.json({
      success: true,
      analytics: {
        totalPosts: content.length,
        avgLikes,
        avgViews,
        avgComments,
        topPosts: content.slice(0, 10)
      }
    });
  }
);
```

#### Use Case 3: Content Inspiration Engine

```typescript
// Find similar viral content for inspiration
app.post("/api/content/inspiration",
  authenticateToken,
  checkSubscriptionLimit('contentGeneration'),
  async (req: AuthRequest, res) => {
    const { topic, platforms } = req.body;

    // Discover trending content
    const trends = await crewTools.aggregateTrends({
      query: topic,
      platforms: platforms || ['youtube', 'reddit'],
      limit: 100
    });

    // Sort by engagement
    trends.sort((a, b) => {
      const aScore = (a.metrics?.likes || 0) + (a.metrics?.views || 0) / 100;
      const bScore = (b.metrics?.likes || 0) + (b.metrics?.views || 0) / 100;
      return bScore - aScore;
    });

    // Get top 10 for AI analysis
    const topTrends = trends.slice(0, 10);

    // Analyze with AI to extract patterns
    const analysis = await analyzeContentPatterns(topTrends);

    res.json({
      success: true,
      inspiration: topTrends,
      insights: analysis
    });
  }
);
```

## Platform-Specific Examples

### YouTube

```typescript
// Search for videos
const searchResults = await crewTools.lookupYouTube({
  mode: 'search',
  idOrQuery: 'AI content creation',
  limit: 25
});

// Get channel's recent videos
const channelVideos = await crewTools.lookupYouTube({
  mode: 'channel_recent',
  idOrQuery: 'UC_channel_id_here',
  limit: 50
});

// Get specific video info
const videoInfo = await crewTools.lookupYouTube({
  mode: 'video',
  idOrQuery: 'https://youtube.com/watch?v=VIDEO_ID',
  limit: 1
});
```

### Reddit

```typescript
// Hot posts from subreddit
const hotPosts = await crewTools.scanReddit({
  subreddit: 'videos',
  sort: 'hot',
  limit: 50
});

// Top posts of the week
const topWeekly = await crewTools.scanReddit({
  subreddit: 'ContentCreators',
  sort: 'top',
  timeFilter: 'week',
  limit: 100
});

// New posts
const newPosts = await crewTools.scanReddit({
  subreddit: 'viral',
  sort: 'new',
  limit: 25
});
```

### Twitter

```typescript
// Search with date range
const tweets = await crewTools.searchTwitter({
  query: 'viral content',
  since: '2025-01-01',
  until: '2025-01-31',
  limit: 100
});

// Recent tweets about topic
const recentTweets = await crewTools.searchTwitter({
  query: 'AI tools',
  limit: 50
});
```

### Instagram

```typescript
// Profile posts
const profilePosts = await crewTools.fetchInstagram({
  mode: 'profile',
  target: 'influencer_handle',
  maxItems: 50
});

// Hashtag posts
const hashtagPosts = await crewTools.fetchInstagram({
  mode: 'hashtag',
  target: 'contentcreator',
  maxItems: 50
});

// Single post
const post = await crewTools.fetchInstagram({
  mode: 'post',
  target: 'https://www.instagram.com/p/POST_CODE/',
  maxItems: 1
});
```

## Environment Setup

Add to your main `.env`:

```bash
# Crew Social Tools
CREW_TOOLS_URL=http://localhost:8001

# Reddit API (optional but recommended)
REDDIT_CLIENT_ID=your_reddit_app_client_id
REDDIT_CLIENT_SECRET=your_reddit_app_secret
```

To get Reddit credentials:
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" type
4. Fill in name and redirect URI (can be http://localhost)
5. Copy the client ID (under app name) and secret

## Monitoring and Health Checks

```typescript
// Check if service is healthy before using
const isHealthy = await crewTools.checkHealth();

if (!isHealthy) {
  console.error('Crew social tools service is down!');
  // Fall back to alternative data source or show error
}
```

## Common Issues

### Service not responding
```bash
# Check if service is running
docker-compose ps

# View logs
docker-compose logs -f crew-social-tools

# Restart service
docker-compose restart crew-social-tools
```

### Reddit returns errors
You need Reddit API credentials. See Environment Setup above.

### TikTok returns empty results
The TikTok scraper needs implementation - TikTok's web structure changes frequently. Consider using TikTok's official API.

### Rate limiting
Social platforms will rate limit. Add delays between requests or use caching to reduce API calls.

## Next Steps

1. **Start the service**: `docker-compose up -d`
2. **Test endpoints**: `./test_endpoints.sh`
3. **Integrate into your app**: Copy the TypeScript service wrapper
4. **Build features**: Use the examples above as templates
5. **Monitor usage**: Track which platforms work best for your use case

The service is ready to use - just start it and begin making API calls!
