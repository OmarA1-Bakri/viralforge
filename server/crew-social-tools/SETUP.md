# Crew Social Tools MCP - Setup Guide

## Overview

The crew-social-tools MCP server exposes social media scraping tools to AI agents via the Model Context Protocol. This allows Claude and other AI assistants to search Twitter, YouTube, Reddit, Instagram, TikTok, and more.

## Architecture

```
AI Agent (Claude) <-> MCP Server <-> FastAPI Backend <-> Social Platforms
```

## Quick Setup

### 1. Add to Claude Code Config

Edit `~/.config/claude-code/mcp_config.json`:

```json
{
  "mcpServers": {
    "crew-social-tools": {
      "command": "python",
      "args": ["/home/omar/viralforge/server/crew-social-tools/mcp_server.py"],
      "env": {
        "CREW_TOOLS_URL": "http://localhost:8001"
      }
    }
  }
}
```

### 2. Start the FastAPI Backend

**Option A: Using system Python (development)**

```bash
cd /home/omar/viralforge/server/crew-social-tools

# Install requirements (one-time)
pip install --user -r requirements.txt

# Start server
uvicorn app.main:app --reload --port 8001
```

**Option B: Using Docker (production)**

```bash
cd /home/omar/viralforge/server/crew-social-tools

# Fix Dockerfile first (see below)
docker compose up -d

# Check logs
docker compose logs -f
```

**Option C: Using the main project server**

The FastAPI backend can also be started alongside your main Express server:

```bash
cd /home/omar/viralforge

# Add to your startup script
npm run start &
cd server/crew-social-tools && uvicorn app.main:app --port 8001 &
```

### 3. Verify Setup

```bash
# Check FastAPI is running
curl http://localhost:8001/health
# Should return: {"status":"ok"}

# Test Twitter search
curl -X POST http://localhost:8001/v1/twitter/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI trends", "limit": 10}'
```

### 4. Restart Claude Code

After adding the config, restart Claude Code to load the MCP server.

## Available Tools

Once configured, these tools will be available in Claude Code:

1. **twitter_search** - Search Twitter tweets
2. **youtube_search** - Search YouTube videos or channels
3. **reddit_scan** - Scan Reddit subreddits
4. **instagram_fetch** - Fetch Instagram content
5. **tiktok_search** - Search TikTok (limited)
6. **ddg_search** - DuckDuckGo web search
7. **searxng_search** - SearxNG meta-search

## Troubleshooting

### MCP Server Not Loading

```bash
# Check Claude Code logs
tail -f ~/.config/claude-code/logs/mcp-*.log

# Test MCP server manually
python /home/omar/viralforge/server/crew-social-tools/mcp_server.py
```

### FastAPI Dependencies Missing

```bash
# Full reinstall
cd /home/omar/viralforge/server/crew-social-tools
pip uninstall -y -r requirements.txt
pip install --user -r requirements.txt
```

### Docker Build Fails

The current Dockerfile has issues with Playwright installation. To fix:

```dockerfile
# Replace Dockerfile content:
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (skip Playwright for now)
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Note: TikTok scraping requires Playwright which has complex dependencies. For production, consider using TikTok's official API instead.

### Tools Return Empty Results

**Twitter**: snscrape can be unreliable. Consider using Twitter API.

**TikTok**: Anti-scraping measures make this difficult. Returns empty by design.

**Instagram**: Requires authenticated session for many operations.

**Reddit**: Needs API credentials in .env:
```bash
REDDIT_CLIENT_ID=your_id
REDDIT_CLIENT_SECRET=your_secret
```

## Usage Example

Once configured, use in Claude Code:

```
You: Search Twitter for trending AI content from the last 3 days

Claude: [Uses twitter_search tool]
I found these trending AI topics:
1. GPT-4 improvements - 2.3K likes
2. AI art tools - 1.8K retweets
...
```

## Production Deployment

For production:

1. Use Docker with proper health checks
2. Add rate limiting (Redis)
3. Add API authentication
4. Use official APIs where possible (Twitter, Reddit)
5. Set up monitoring/logging
6. Consider proxy rotation for scraping

## Next Steps

1. ✅ MCP server created (mcp_server.py)
2. ✅ Configuration files added
3. ⏳ Start FastAPI backend
4. ⏳ Test with Claude Code
5. ⏳ Integrate with viral_crew.py agents

## File Structure

```
server/crew-social-tools/
├── app/
│   ├── main.py              # FastAPI endpoints
│   ├── common/
│   │   ├── schemas.py       # Pydantic models
│   │   └── config.py        # Configuration
│   └── tools/               # Platform scrapers
│       ├── twitter_snscrape.py
│       ├── youtube_ytdlp.py
│       ├── reddit_praw.py
│       ├── instagram_instaloader.py
│       ├── tiktok_playwright.py
│       ├── ddg.py
│       └── searxng.py
├── mcp_server.py            # ✨ NEW: MCP server
├── pyproject.toml           # ✨ NEW: Package config
├── requirements.txt         # Python dependencies
├── Dockerfile               # Docker build
├── docker-compose.yml       # Docker orchestration
├── README.md                # Original usage guide
├── README_MCP.md            # ✨ NEW: MCP documentation
└── SETUP.md                 # ✨ NEW: This file
```

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Original crew-social-tools README](./README.md)
- [MCP Server Details](./README_MCP.md)
