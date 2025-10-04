# Crew Social Tools - Integration Guide

## ✅ Integration Complete

The crew-social-tools are now fully integrated with your ViralForge CrewAI agents!

## What Was Done

### 1. Created CrewAI Tool Wrappers
**File**: `server/crew-social-tools/crewai_integration.py`

Six custom CrewAI tools that wrap the FastAPI endpoints:
- `TwitterSearchTool` - Search Twitter for trending tweets
- `YouTubeSearchTool` - Search YouTube videos and channels
- `RedditScanTool` - Scan subreddits for viral posts
- `InstagramFetchTool` - Fetch Instagram content
- `DDGSearchTool` - DuckDuckGo web search
- `SocialMediaAggregator` - Search multiple platforms at once

### 2. Updated viral_crew.py
**File**: `server/agents/viral_crew.py`

The TrendScout agent now has access to all social media tools:
```python
tools=[
    self.tools["twitter_search"],
    self.tools["youtube_search"],
    self.tools["reddit_scan"],
    self.tools["instagram_fetch"],
    self.tools["social_aggregator"],
    self.tools["web_scraper"],
    self.tools["advanced_search"],
    self.tools["web_crawler"]
]
```

## How It Works

```
┌─────────────────────┐
│  ViralForge App     │
│  (Express Server)   │
└──────────┬──────────┘
           │
           │ Python spawn
           ▼
┌─────────────────────┐
│  viral_crew.py      │
│  (CrewAI Agents)    │
└──────────┬──────────┘
           │
           │ CrewAI Tools
           ▼
┌─────────────────────┐
│ crewai_integration  │
│ (Tool Wrappers)     │
└──────────┬──────────┘
           │
           │ HTTP POST
           ▼
┌─────────────────────┐
│  FastAPI Backend    │
│  (crew-social-tools)│
└──────────┬──────────┘
           │
           │ Scraping
           ▼
┌─────────────────────┐
│  Social Platforms   │
│  (Twitter, YouTube) │
└─────────────────────┘
```

## Usage in Your App

### Starting the Services

**Terminal 1: Start FastAPI backend**
```bash
cd server/crew-social-tools
uvicorn app.main:app --port 8001
```

**Terminal 2: Start ViralForge app**
```bash
npm run dev
```

### Environment Variables

Add to your `.env`:
```bash
# Crew Social Tools
CREW_TOOLS_URL=http://localhost:8001

# Optional: Reddit API (for better results)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_secret
```

### Example: Using in Your Agents

The agents automatically have access to the tools. For example, the TrendScout agent can now:

```python
# From your Express API, call the Python agents:
POST /api/agents/discover-trends
{
  "platforms": ["twitter", "youtube", "reddit"],
  "niches": ["AI content creation"]
}

# TrendScout agent will automatically use:
# - twitter_search tool to find trending tweets
# - youtube_search tool to find viral videos
# - reddit_scan tool to find hot discussions
# - social_aggregator to combine all results
```

## Tool Capabilities

### TwitterSearchTool
```python
# What it does:
# - Searches Twitter for matching tweets
# - Returns: author, text, likes, retweets, comments, URL
# - Date filtering supported (since/until)

# Example use by agent:
"Search Twitter for #AI tweets from the last week with high engagement"
```

### YouTubeSearchTool
```python
# What it does:
# - Searches YouTube videos
# - Gets video/channel details
# - Returns: title, views, likes, comments, description

# Example use by agent:
"Find viral YouTube videos about content creation from the last month"
```

### RedditScanTool
```python
# What it does:
# - Scans subreddit posts
# - Returns: title, upvotes, comments, URL, author
# - Supports sorting (hot, new, top, rising)

# Example use by agent:
"Scan r/videos for top posts this week"
```

### InstagramFetchTool
```python
# What it does:
# - Fetches posts from profiles/hashtags
# - Returns: likes, comments, media URLs
# - Note: Rate limiting applies

# Example use by agent:
"Fetch top posts from #contentcreator hashtag"
```

### SocialMediaAggregator
```python
# What it does:
# - Searches multiple platforms at once
# - Combines and normalizes results
# - Returns unified engagement metrics

# Example use by agent:
"Find trending AI content across all platforms"
```

## Testing the Integration

### 1. Test FastAPI Backend
```bash
curl http://localhost:8001/health
# Should return: {"status":"ok"}

curl -X POST http://localhost:8001/v1/twitter/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI trends", "limit": 5}'
```

### 2. Test CrewAI Tools
```python
# Create a simple test script:
from crewai_integration import get_crew_social_tools

tools = get_crew_social_tools()

# Test Twitter search
result = tools["twitter"]._run(query="AI trends", limit=5)
print(result)
```

### 3. Test Full Pipeline
```bash
# From your Express API:
curl -X POST http://localhost:3000/api/agents/discover-trends \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["twitter", "youtube"],
    "niches": ["AI"]
  }'
```

## Common Issues

### Tools Not Found
**Error**: `ModuleNotFoundError: No module named 'crewai_integration'`

**Fix**: The path is automatically added in viral_crew.py, but ensure:
```python
# In viral_crew.py, this should be present:
crew_tools_path = Path(__file__).parent.parent / 'crew-social-tools'
sys.path.insert(0, str(crew_tools_path))
```

### FastAPI Not Running
**Error**: `Connection refused` or `error: HTTP error`

**Fix**: Start the FastAPI backend:
```bash
cd server/crew-social-tools
uvicorn app.main:app --port 8001
```

### Missing Dependencies
**Error**: `ModuleNotFoundError: No module named 'httpx'`

**Fix**: Install requirements:
```bash
cd server/crew-social-tools
pip install -r requirements.txt
```

## Advanced Usage

### Custom Tool Configuration
```python
from crewai_integration import get_crew_social_tools, CrewSocialToolsConfig

# Custom configuration
config = CrewSocialToolsConfig(
    base_url="http://your-server:8001",
    timeout=120.0  # 2 minutes
)

tools = get_crew_social_tools(config.base_url)
```

### Using Individual Tools
```python
from crewai_integration import TwitterSearchTool

twitter_tool = TwitterSearchTool()

agent = Agent(
    role="Twitter Analyst",
    tools=[twitter_tool],
    ...
)
```

### Aggregating Multiple Platforms
```python
# The agent can use the aggregator tool:
result = social_aggregator._run(
    query="viral AI content",
    platforms=["twitter", "youtube", "reddit"],
    limit_per_platform=10
)
# Returns combined results from all platforms
```

## Next Steps

1. ✅ Integration complete
2. ⏳ Start both services (FastAPI + Express)
3. ⏳ Test with a simple trend discovery request
4. ⏳ Monitor agent logs to see tools in action
5. ⏳ Optimize based on results

## File Structure

```
server/
├── agents/
│   └── viral_crew.py          # ✅ Updated with social tools
└── crew-social-tools/
    ├── app/                   # FastAPI backend
    ├── crewai_integration.py  # ✅ NEW: CrewAI tool wrappers
    ├── mcp_server.py          # For MCP (optional)
    ├── INTEGRATION_GUIDE.md   # ✅ This file
    └── requirements.txt       # Python dependencies
```

## Resources

- [CrewAI Tools Documentation](https://docs.crewai.com/core-concepts/Tools/)
- [CrewAI BaseTool](https://github.com/joaomdmoura/crewAI-tools)
- [Original FastAPI Docs](./README.md)
