#!/usr/bin/env python3
"""
MCP Server for Crew Social Tools
Exposes social media scraping tools via Model Context Protocol
"""
import asyncio
import json
import sys
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from pydantic import BaseModel, Field

# Configuration
CREW_TOOLS_URL = "http://localhost:8001"


class MCPServer:
    def __init__(self):
        self.server = Server("crew-social-tools")
        self.client = httpx.AsyncClient(timeout=60.0)
        self.setup_handlers()

    def setup_handlers(self):
        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            return [
                Tool(
                    name="twitter_search",
                    description="Search Twitter for tweets matching a query. Returns tweets with metrics (likes, retweets), author info, and content.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query (e.g., 'AI trends', '#viral')"
                            },
                            "since": {
                                "type": "string",
                                "description": "Start date (YYYY-MM-DD) - optional"
                            },
                            "until": {
                                "type": "string",
                                "description": "End date (YYYY-MM-DD) - optional"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum tweets to return (default: 50)",
                                "default": 50
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="youtube_search",
                    description="Search YouTube for videos or get channel/video details. Returns video metadata, view counts, and engagement metrics.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "mode": {
                                "type": "string",
                                "enum": ["search", "video", "channel"],
                                "description": "Search mode: 'search' for query, 'video' for video ID, 'channel' for channel ID"
                            },
                            "id_or_query": {
                                "type": "string",
                                "description": "Video ID, channel ID, or search query depending on mode"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum results to return (default: 25)",
                                "default": 25
                            }
                        },
                        "required": ["mode", "id_or_query"]
                    }
                ),
                Tool(
                    name="reddit_scan",
                    description="Scan Reddit subreddit for posts. Returns posts with upvotes, comments, and content.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "subreddit": {
                                "type": "string",
                                "description": "Subreddit name (without r/)"
                            },
                            "sort": {
                                "type": "string",
                                "enum": ["hot", "new", "top", "rising"],
                                "description": "Sort order (default: 'hot')",
                                "default": "hot"
                            },
                            "time_filter": {
                                "type": "string",
                                "enum": ["hour", "day", "week", "month", "year", "all"],
                                "description": "Time filter for 'top' sort (default: 'day')",
                                "default": "day"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum posts to return (default: 50)",
                                "default": 50
                            }
                        },
                        "required": ["subreddit"]
                    }
                ),
                Tool(
                    name="instagram_fetch",
                    description="Fetch Instagram content from profiles, hashtags, or posts. Returns posts with likes, comments, and media.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "mode": {
                                "type": "string",
                                "enum": ["profile", "hashtag", "post"],
                                "description": "Fetch mode: 'profile', 'hashtag', or 'post'"
                            },
                            "target": {
                                "type": "string",
                                "description": "Username, hashtag (without #), or post shortcode"
                            },
                            "max_items": {
                                "type": "integer",
                                "description": "Maximum items to fetch (default: 30)",
                                "default": 30
                            }
                        },
                        "required": ["mode", "target"]
                    }
                ),
                Tool(
                    name="tiktok_search",
                    description="Search TikTok for trending videos or specific queries. Note: May return limited results due to TikTok's anti-scraping measures.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "mode": {
                                "type": "string",
                                "enum": ["trending", "search"],
                                "description": "Search mode: 'trending' or 'search'"
                            },
                            "query": {
                                "type": "string",
                                "description": "Search query (required for 'search' mode)"
                            },
                            "region": {
                                "type": "string",
                                "description": "Region code (e.g., 'US', 'GB') - for trending",
                                "default": "US"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum results (default: 20)",
                                "default": 20
                            }
                        },
                        "required": ["mode"]
                    }
                ),
                Tool(
                    name="ddg_search",
                    description="Search DuckDuckGo for web content. Good fallback for general web search without API keys.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            },
                            "region": {
                                "type": "string",
                                "description": "Region code (e.g., 'us-en', 'uk-en') - default: 'us-en'",
                                "default": "us-en"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum results (default: 20)",
                                "default": 20
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="searxng_search",
                    description="Search using SearxNG meta-search engine (if configured). Aggregates results from multiple search engines.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            },
                            "categories": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Search categories (e.g., ['general', 'news', 'videos'])",
                                "default": ["general"]
                            },
                            "engines": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Specific search engines to use",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum results (default: 20)",
                                "default": 20
                            }
                        },
                        "required": ["query"]
                    }
                )
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: Any) -> List[TextContent]:
            """Handle tool calls"""
            try:
                # Map tool names to API endpoints
                endpoint_map = {
                    "twitter_search": "/v1/twitter/search",
                    "youtube_search": "/v1/youtube/lookup",
                    "reddit_scan": "/v1/reddit/scan",
                    "instagram_fetch": "/v1/instagram/fetch",
                    "tiktok_search": "/v1/tiktok/search",
                    "ddg_search": "/v1/search/ddg",
                    "searxng_search": "/v1/search/searxng"
                }

                if name not in endpoint_map:
                    return [TextContent(
                        type="text",
                        text=json.dumps({"error": f"Unknown tool: {name}"})
                    )]

                endpoint = endpoint_map[name]
                url = f"{CREW_TOOLS_URL}{endpoint}"

                # Make request to FastAPI backend
                response = await self.client.post(url, json=arguments)
                response.raise_for_status()
                data = response.json()

                # Format response
                if data.get("error"):
                    error_info = data["error"]
                    result = {
                        "success": False,
                        "error": error_info.get("error"),
                        "code": error_info.get("code"),
                        "retryable": error_info.get("retryable", False),
                        "hint": error_info.get("hint")
                    }
                else:
                    result = {
                        "success": True,
                        "count": len(data.get("items", [])),
                        "items": data.get("items", [])
                    }

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]

            except httpx.HTTPError as e:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"HTTP error: {str(e)}",
                        "hint": "Ensure crew-social-tools FastAPI server is running on localhost:8001"
                    })
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": str(e)
                    })
                )]

    async def run(self):
        """Run the MCP server"""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )


async def main():
    server = MCPServer()
    await server.run()


if __name__ == "__main__":
    asyncio.run(main())
