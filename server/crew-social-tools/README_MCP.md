# Crew Social Tools MCP Server

Model Context Protocol (MCP) server that exposes social media scraping tools to AI agents.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol for connecting AI assistants to external tools and data sources. This server exposes the crew-social-tools FastAPI endpoints as MCP tools that can be used by Claude Desktop, Claude Code, or any MCP-compatible client.

## Quick Start

### 1. Install Dependencies

```bash
cd server/crew-social-tools
pip install -e .
```

This installs the MCP server along with required dependencies:
- `mcp` - Model Context Protocol SDK
- `httpx` - Async HTTP client
- `pydantic` - Data validation

### 2. Start the FastAPI Backend

The MCP server acts as a bridge to the FastAPI backend, so ensure it's running:

```bash
# Option 1: Docker (recommended)
docker-compose up -d

# Option 2: Local
uvicorn app.main:app --reload --port 8001
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "crew-social-tools": {
      "command": "python",
      "args": [
        "-m",
        "mcp_server"
      ],
      "cwd": "/path/to/viralforge/server/crew-social-tools",
      "env": {
        "CREW_TOOLS_URL": "http://localhost:8001"
      }
    }
  }
}
```

Or for Claude Code (`~/.config/claude-code/mcp_config.json`):

```json
{
  "mcpServers": {
    "crew-social-tools": {
      "command": "python",
      "args": ["/path/to/viralforge/server/crew-social-tools/mcp_server.py"]
    }
  }
}
```

### 4. Restart Claude

Restart Claude Desktop or Claude Code to load the new MCP server.

## Available Tools

Once configured, these tools are available to AI agents:

### 1. `twitter_search`
Search Twitter for tweets matching a query.

**Parameters:**
- `query` (required): Search query (e.g., "AI trends", "#viral")
- `since` (optional): Start date (YYYY-MM-DD)
- `until` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Max tweets (default: 50)

**Example:**
```json
{
  "query": "AI content creation",
  "since": "2025-01-01",
  "limit": 100
}
```

### 2. `youtube_search`
Search YouTube or get video/channel details.

**Parameters:**
- `mode` (required): "search", "video", or "channel"
- `id_or_query` (required): Video ID, channel ID, or search query
- `limit` (optional): Max results (default: 25)

**Example:**
```json
{
  "mode": "search",
  "id_or_query": "viral video trends 2025",
  "limit": 50
}
```

### 3. `reddit_scan`
Scan a subreddit for posts.

**Parameters:**
- `subreddit` (required): Subreddit name (without r/)
- `sort` (optional): "hot", "new", "top", "rising" (default: "hot")
- `time_filter` (optional): "hour", "day", "week", "month", "year", "all" (default: "day")
- `limit` (optional): Max posts (default: 50)

**Example:**
```json
{
  "subreddit": "videos",
  "sort": "top",
  "time_filter": "week",
  "limit": 100
}
```

### 4. `instagram_fetch`
Fetch Instagram content.

**Parameters:**
- `mode` (required): "profile", "hashtag", or "post"
- `target` (required): Username, hashtag (without #), or post shortcode
- `max_items` (optional): Max items (default: 30)

**Example:**
```json
{
  "mode": "hashtag",
  "target": "contentcreator",
  "max_items": 50
}
```

### 5. `tiktok_search`
Search TikTok (limited results due to anti-scraping).

**Parameters:**
- `mode` (required): "trending" or "search"
- `query` (optional): Search query (required for "search" mode)
- `region` (optional): Region code like "US" (default: "US")
- `limit` (optional): Max results (default: 20)

### 6. `ddg_search`
Search DuckDuckGo (no API key needed).

**Parameters:**
- `query` (required): Search query
- `region` (optional): Region code like "us-en" (default: "us-en")
- `max_results` (optional): Max results (default: 20)

### 7. `searxng_search`
Search via SearxNG (if configured).

**Parameters:**
- `query` (required): Search query
- `categories` (optional): Array like ["general", "news", "videos"]
- `engines` (optional): Specific engines to use
- `limit` (optional): Max results (default: 20)

## Response Format

All tools return a unified JSON response:

```json
{
  "success": true,
  "count": 10,
  "items": [
    {
      "source": "twitter",
      "id": "1234567890",
      "url": "https://twitter.com/user/status/1234567890",
      "text": "Tweet content...",
      "author": "username",
      "published_at": "2025-01-15T10:30:00Z",
      "metrics": {
        "likes": 150,
        "retweets": 30,
        "comments": 12
      }
    }
  ]
}
```

Error response:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "TWITTER_ERROR",
  "retryable": true,
  "hint": "Wait 15 minutes before retrying"
}
```

## Usage in AI Agents

Example conversation with Claude:

```
User: Find trending AI content on Twitter from the last week

Claude: I'll search Twitter for AI trends.
[Uses twitter_search tool with query="AI trending", since="2025-01-08"]

Here are the top trending AI topics:
1. GPT-4 improvements - 2.3K likes
2. AI art controversy - 1.8K likes
...
```

## Troubleshooting

### "Connection refused" Error
The FastAPI backend isn't running. Start it with:
```bash
docker-compose up -d
```

### Tools Not Appearing in Claude
1. Check config file syntax (valid JSON)
2. Verify path to mcp_server.py is correct
3. Restart Claude completely
4. Check Claude logs for MCP errors

### Empty Results from TikTok
This is expected - TikTok actively blocks scrapers. Consider using their official API or a paid service.

### Reddit Authentication Required
Some Reddit operations need API credentials. Set them in `.env`:
```bash
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_secret
```

## Development

### Testing the MCP Server

```bash
# Install in development mode
pip install -e .

# Test manually (reads from stdin, writes to stdout)
python mcp_server.py

# The server communicates via JSON-RPC over stdio
# Send initialization message:
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {...}}
```

### Adding New Tools

1. Add endpoint to FastAPI backend (`app/main.py`)
2. Add tool definition to `list_tools()` in `mcp_server.py`
3. Add endpoint mapping in `call_tool()`
4. Update this README

## Architecture

```
┌─────────────┐
│ AI Agent    │
│ (Claude)    │
└──────┬──────┘
       │ MCP Protocol
       │ (stdio/JSON-RPC)
┌──────▼──────┐
│ MCP Server  │
│ (Python)    │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────┐
│ FastAPI     │
│ Backend     │
└──────┬──────┘
       │
┌──────▼──────┐
│ Social      │
│ Platforms   │
└─────────────┘
```

The MCP server is a lightweight bridge that:
1. Exposes tools via MCP protocol
2. Forwards requests to FastAPI backend
3. Returns formatted results to the AI agent

## Production Considerations

For production use:

1. **Authentication**: Add API key validation
2. **Rate Limiting**: Prevent abuse
3. **Logging**: Track usage and errors
4. **Monitoring**: Health checks and metrics
5. **Caching**: Redis for repeated queries
6. **Error Handling**: Graceful degradation

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Claude Desktop Config](https://docs.anthropic.com/claude/docs)
