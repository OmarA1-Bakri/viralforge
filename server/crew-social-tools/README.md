# Crew Social Tools - Usage Guide

FastAPI microservice for social media scraping and trend discovery.

## Quick Start

### Option 1: Docker (Recommended)

```bash
# From the crew-social-tools directory
cd server/crew-social-tools

# Start services
docker-compose up -d

# Check health
curl http://localhost:8001/health

# View logs
docker-compose logs -f crew-social-tools
```

### Option 2: Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Run the server
uvicorn app.main:app --reload --port 8001
```

## API Endpoints

### Twitter Search
```bash
curl -X POST http://localhost:8001/v1/twitter/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI trends",
    "limit": 50
  }'
```

### TikTok Search
```bash
curl -X POST http://localhost:8001/v1/tiktok/search \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "trending",
    "region": "US",
    "limit": 20
  }'
```

### Instagram Fetch
```bash
curl -X POST http://localhost:8001/v1/instagram/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "hashtag",
    "target": "contentcreator",
    "max_items": 30
  }'
```

### YouTube Lookup
```bash
curl -X POST http://localhost:8001/v1/youtube/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "id_or_query": "viral video trends",
    "limit": 25
  }'
```

### Reddit Scan
```bash
curl -X POST http://localhost:8001/v1/reddit/scan \
  -H "Content-Type: application/json" \
  -d '{
    "subreddit": "videos",
    "sort": "hot",
    "time_filter": "day",
    "limit": 50
  }'
```

### DuckDuckGo Search
```bash
curl -X POST http://localhost:8001/v1/search/ddg \
  -H "Content-Type: application/json" \
  -d '{
    "query": "viral content trends 2025",
    "region": "us-en",
    "max_results": 20
  }'
```

## Integration with ViralForge

### 1. Add Environment Variable

```bash
# In your main .env file
CREW_TOOLS_URL=http://localhost:8001

# Optional: Reddit API credentials
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
```

### 2. Use in Your Express Routes

```typescript
import * as crewTools from '../services/crewSocialTools';

// Discover trending content across platforms
app.post('/api/trends/discover-social', async (req, res) => {
  const { query, platforms, limit } = req.body;

  const trends = await crewTools.aggregateTrends({
    query,
    platforms: platforms || ['twitter', 'reddit', 'youtube'],
    limit: limit || 100
  });

  res.json({ success: true, trends });
});

// Search specific platform
app.post('/api/social/twitter/search', async (req, res) => {
  const { query, since, until, limit } = req.body;

  const tweets = await crewTools.searchTwitter({
    query,
    since,
    until,
    limit
  });

  res.json({ success: true, tweets });
});
```

### 3. Example Frontend Usage

```typescript
// Discover viral content
const response = await apiRequest('POST', '/api/trends/discover-social', {
  query: 'AI content creation',
  platforms: ['twitter', 'youtube', 'reddit'],
  limit: 50
});

console.log(response.trends);
// [
//   {
//     source: 'twitter',
//     text: 'Check out this AI tool...',
//     author: 'techinfluencer',
//     metrics: { likes: 1500, retweets: 300 }
//   },
//   ...
// ]
```

## Response Format

All endpoints return a unified response:

```typescript
{
  items: [
    {
      source: string;        // 'twitter' | 'tiktok' | 'instagram' | etc.
      id?: string;           // Platform-specific ID
      url?: string;          // Link to original content
      title?: string;        // Title/headline
      text?: string;         // Content text
      author?: string;       // Username/creator
      published_at?: string; // ISO timestamp or unix
      lang?: string;         // Language code
      media?: [              // Media attachments
        { type: 'image', url: 'https://...' }
      ];
      metrics?: {            // Engagement metrics
        views?: number;
        likes?: number;
        comments?: number;
        shares?: number;
        retweets?: number;
        playCount?: number;
      }
    }
  ],
  error?: {
    error: string;
    code: string;
    retryable: boolean;
    hint?: string;
  }
}
```

## Platform-Specific Notes

### Twitter
- Uses snscrape (no API key needed)
- Supports date range filtering
- May be rate-limited by IP

### TikTok
- Uses Playwright browser automation
- **Note:** Currently returns empty results - needs implementation
- Scraping TikTok is challenging due to frequent API changes

### Instagram
- Uses instaloader library
- Can fetch profiles, hashtags, or individual posts
- May require session file for private accounts

### YouTube
- Uses yt-dlp (very reliable)
- Supports video lookup, channel content, search
- No API key required

### Reddit
- Uses PRAW (official Reddit API)
- **Requires:** Reddit API credentials
- Set `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`

### DuckDuckGo
- No API key needed
- Good fallback for web search
- Region-specific results

## Configuration

Edit `app/common/config.py` or set environment variables:

```bash
SEARXNG_URL=http://localhost:8080          # SearxNG instance
REDDIT_CLIENT_ID=your_client_id            # Reddit API
REDDIT_CLIENT_SECRET=your_secret           # Reddit API
REDDIT_USER_AGENT=ViralForgeAI/1.0        # User agent
INSTALOADER_SESSION_FILE=/path/session    # Instagram session
```

## Error Handling

All endpoints return errors in a consistent format:

```typescript
{
  items: [],
  error: {
    error: "Rate limit exceeded",
    code: "TWITTER_ERROR",
    retryable: true,
    hint: "Wait 15 minutes before retrying"
  }
}
```

## Performance Tips

1. **Use appropriate limits** - Start small and increase as needed
2. **Cache results** - Social content doesn't change every second
3. **Batch requests** - Use `aggregateTrends()` for multi-platform
4. **Handle failures** - Platforms can go down, always have fallbacks
5. **Rate limiting** - Add delays between requests to same platform

## Troubleshooting

### Service Won't Start
```bash
# Check if port is available
lsof -i :8001

# View logs
docker-compose logs crew-social-tools

# Rebuild containers
docker-compose down
docker-compose up --build
```

### TikTok Returns Empty Results
This is expected - the TikTok scraper needs proper implementation. TikTok frequently changes their web structure. Consider using TikTok's official API or a third-party service.

### Reddit Returns Errors
Make sure you've set up Reddit API credentials:
1. Go to https://www.reddit.com/prefs/apps
2. Create an app (script type)
3. Copy client ID and secret
4. Add to `.env`

### Instagram Rate Limited
Instagram aggressively rate limits. Solutions:
- Use authenticated session file
- Add delays between requests
- Rotate IP addresses (proxy pool)

## Production Deployment

For production, add:

1. **Rate Limiting** - Prevent abuse
2. **Caching** - Redis for repeated queries
3. **Authentication** - JWT validation
4. **Monitoring** - Health checks, metrics
5. **Proxies** - Rotate IPs to avoid bans

See the analysis document for implementation examples.
