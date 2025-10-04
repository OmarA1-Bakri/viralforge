#!/usr/bin/env python3
"""
CrewAI Integration for Crew Social Tools
==========================================

Custom CrewAI tools that wrap the crew-social-tools FastAPI endpoints.
These tools can be used directly by CrewAI agents in viral_crew.py
"""

import httpx
import json
from typing import Any, Dict, List, Optional
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class CrewSocialToolsConfig(BaseModel):
    """Configuration for crew-social-tools connection"""
    base_url: str = Field(default="http://localhost:8001", description="Base URL for crew-social-tools API")
    timeout: float = Field(default=60.0, description="Request timeout in seconds")


class TwitterSearchTool(BaseTool):
    name: str = "Twitter Search Tool"
    description: str = (
        "Search Twitter for tweets matching a query. Returns tweets with engagement metrics "
        "(likes, retweets, comments), author info, URLs, and content. "
        "Use this to discover trending topics, viral tweets, and audience sentiment."
    )

    config: CrewSocialToolsConfig = Field(default_factory=CrewSocialToolsConfig)
    _client: Optional[httpx.Client] = None

    def model_post_init(self, __context):
        """Initialize after Pydantic model creation"""
        super().model_post_init(__context)

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            object.__setattr__(self, '_client', httpx.Client(timeout=self.config.timeout))
        return self._client

    def __del__(self):
        if self._client is not None and not self._client.is_closed:
            self._client.close()

    def _run(
        self,
        query: str,
        since: Optional[str] = None,
        until: Optional[str] = None,
        limit: int = 50
    ) -> str:
        """
        Search Twitter for tweets.

        Args:
            query: Search query (e.g., "AI trends", "#viral")
            since: Start date (YYYY-MM-DD) - optional
            until: End date (YYYY-MM-DD) - optional
            limit: Maximum tweets to return (default: 50)
        """
        try:
            payload = {
                "query": query,
                "limit": limit
            }
            if since:
                payload["since"] = since
            if until:
                payload["until"] = until

            response = self._get_client().post(
                f"{self.config.base_url}/v1/twitter/search",
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            if data.get("error"):
                error_info = data["error"]
                return json.dumps({
                    "success": False,
                    "error": error_info.get("error", str(error_info)),
                    "code": error_info.get("code"),
                    "retryable": error_info.get("retryable", False),
                    "hint": error_info.get("hint")
                })

            return json.dumps({
                "success": True,
                "count": len(data.get("items", [])),
                "tweets": data.get("items", [])
            }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })


class YouTubeSearchTool(BaseTool):
    name: str = "YouTube Search Tool"
    description: str = (
        "Search YouTube for videos or get video/channel details. Returns video metadata, "
        "view counts, likes, comments, and engagement metrics. "
        "Use this to find trending videos, analyze viral content, and discover successful channels."
    )

    config: CrewSocialToolsConfig = Field(default_factory=CrewSocialToolsConfig)
    _client: Optional[httpx.Client] = None

    def model_post_init(self, __context):
        """Initialize after Pydantic model creation"""
        super().model_post_init(__context)

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            object.__setattr__(self, '_client', httpx.Client(timeout=self.config.timeout))
        return self._client

    def __del__(self):
        if self._client is not None and not self._client.is_closed:
            self._client.close()

    def _run(
        self,
        mode: str,
        id_or_query: str,
        limit: int = 25
    ) -> str:
        """
        Search YouTube or get video/channel details.

        Args:
            mode: "search", "video", or "channel"
            id_or_query: Video ID, channel ID, or search query
            limit: Maximum results (default: 25)
        """
        try:
            response = self._get_client().post(
                f"{self.config.base_url}/v1/youtube/lookup",
                json={
                    "mode": mode,
                    "id_or_query": id_or_query,
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()

            if data.get("error"):
                return json.dumps({
                    "success": False,
                    "error": data["error"]["error"]
                })

            return json.dumps({
                "success": True,
                "count": len(data.get("items", [])),
                "videos": data.get("items", [])
            }, indent=2)

        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


class RedditScanTool(BaseTool):
    name: str = "Reddit Scan Tool"
    description: str = (
        "Scan Reddit subreddit for posts. Returns posts with upvotes, comments, awards, and content. "
        "Use this to discover trending discussions, viral posts, and community sentiment."
    )

    config: CrewSocialToolsConfig = Field(default_factory=CrewSocialToolsConfig)
    _client: Optional[httpx.Client] = None

    def model_post_init(self, __context):
        """Initialize after Pydantic model creation"""
        super().model_post_init(__context)

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            object.__setattr__(self, '_client', httpx.Client(timeout=self.config.timeout))
        return self._client

    def __del__(self):
        if self._client is not None and not self._client.is_closed:
            self._client.close()

    def _run(
        self,
        subreddit: str,
        sort: str = "hot",
        time_filter: str = "day",
        limit: int = 50
    ) -> str:
        """
        Scan a subreddit for posts.

        Args:
            subreddit: Subreddit name (without r/)
            sort: "hot", "new", "top", "rising" (default: "hot")
            time_filter: "hour", "day", "week", "month", "year", "all" (default: "day")
            limit: Maximum posts (default: 50)
        """
        try:
            response = self._get_client().post(
                f"{self.config.base_url}/v1/reddit/scan",
                json={
                    "subreddit": subreddit,
                    "sort": sort,
                    "time_filter": time_filter,
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()

            if data.get("error"):
                return json.dumps({
                    "success": False,
                    "error": data["error"]["error"]
                })

            return json.dumps({
                "success": True,
                "count": len(data.get("items", [])),
                "posts": data.get("items", [])
            }, indent=2)

        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


class InstagramFetchTool(BaseTool):
    name: str = "Instagram Fetch Tool"
    description: str = (
        "Fetch Instagram content from profiles, hashtags, or posts. Returns posts with likes, "
        "comments, media URLs, and engagement data. "
        "Use this to analyze influencer content, trending hashtags, and viral posts."
    )

    config: CrewSocialToolsConfig = Field(default_factory=CrewSocialToolsConfig)
    _client: Optional[httpx.Client] = None

    def model_post_init(self, __context):
        """Initialize after Pydantic model creation"""
        super().model_post_init(__context)

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            object.__setattr__(self, '_client', httpx.Client(timeout=self.config.timeout))
        return self._client

    def __del__(self):
        if self._client is not None and not self._client.is_closed:
            self._client.close()

    def _run(
        self,
        mode: str,
        target: str,
        max_items: int = 30
    ) -> str:
        """
        Fetch Instagram content.

        Args:
            mode: "profile", "hashtag", or "post"
            target: Username, hashtag (without #), or post shortcode
            max_items: Maximum items to fetch (default: 30)
        """
        try:
            response = self._get_client().post(
                f"{self.config.base_url}/v1/instagram/fetch",
                json={
                    "mode": mode,
                    "target": target,
                    "max_items": max_items
                }
            )
            response.raise_for_status()
            data = response.json()

            if data.get("error"):
                return json.dumps({
                    "success": False,
                    "error": data["error"]["error"]
                })

            return json.dumps({
                "success": True,
                "count": len(data.get("items", [])),
                "posts": data.get("items", [])
            }, indent=2)

        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


class DDGSearchTool(BaseTool):
    name: str = "DuckDuckGo Search Tool"
    description: str = (
        "Search DuckDuckGo for web content. No API key required. "
        "Use this as a fallback for general web search, news, and content discovery."
    )

    config: CrewSocialToolsConfig = Field(default_factory=CrewSocialToolsConfig)
    _client: Optional[httpx.Client] = None

    def model_post_init(self, __context):
        """Initialize after Pydantic model creation"""
        super().model_post_init(__context)

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            object.__setattr__(self, '_client', httpx.Client(timeout=self.config.timeout))
        return self._client

    def __del__(self):
        if self._client is not None and not self._client.is_closed:
            self._client.close()

    def _run(
        self,
        query: str,
        region: str = "us-en",
        max_results: int = 20
    ) -> str:
        """
        Search DuckDuckGo.

        Args:
            query: Search query
            region: Region code (e.g., "us-en", "uk-en")
            max_results: Maximum results (default: 20)
        """
        try:
            response = self._get_client().post(
                f"{self.config.base_url}/v1/search/ddg",
                json={
                    "query": query,
                    "region": region,
                    "max_results": max_results
                }
            )
            response.raise_for_status()
            data = response.json()

            if data.get("error"):
                return json.dumps({
                    "success": False,
                    "error": data["error"]["error"]
                })

            return json.dumps({
                "success": True,
                "count": len(data.get("items", [])),
                "results": data.get("items", [])
            }, indent=2)

        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


class SocialMediaAggregator(BaseTool):
    name: str = "Social Media Trend Aggregator"
    description: str = (
        "Aggregate trending content across multiple social platforms (Twitter, YouTube, Reddit). "
        "Returns unified results with engagement metrics for comprehensive trend analysis. "
        "Use this to get a holistic view of what's trending across platforms."
    )

    config: CrewSocialToolsConfig = Field(default_factory=CrewSocialToolsConfig)

    def model_post_init(self, __context):
        """Initialize sub-tools after Pydantic model creation"""
        super().model_post_init(__context)
        object.__setattr__(self, 'twitter', TwitterSearchTool(config=self.config))
        object.__setattr__(self, 'youtube', YouTubeSearchTool(config=self.config))
        object.__setattr__(self, 'reddit', RedditScanTool(config=self.config))

    def _run(
        self,
        query: str,
        platforms: List[str] = None,
        limit_per_platform: int = 20
    ) -> str:
        """
        Aggregate trends across multiple platforms.

        Args:
            query: Search query
            platforms: List of platforms ["twitter", "youtube", "reddit"] (default: all)
            limit_per_platform: Items per platform (default: 20)
        """
        platforms = platforms or ["twitter", "youtube", "reddit"]
        results = {"query": query, "platforms": {}}

        if "twitter" in platforms:
            twitter_result = self.twitter._run(query=query, limit=limit_per_platform)
            results["platforms"]["twitter"] = json.loads(twitter_result)

        if "youtube" in platforms:
            youtube_result = self.youtube._run(mode="search", id_or_query=query, limit=limit_per_platform)
            results["platforms"]["youtube"] = json.loads(youtube_result)

        if "reddit" in platforms:
            # For Reddit, try to find relevant subreddit or use 'all'
            reddit_result = self.reddit._run(subreddit="all", limit=limit_per_platform)
            results["platforms"]["reddit"] = json.loads(reddit_result)

        # Calculate aggregate metrics
        total_items = sum(
            platform_data.get("count", 0)
            for platform_data in results["platforms"].values()
        )

        results["summary"] = {
            "total_items": total_items,
            "platforms_searched": len(platforms),
            "query": query
        }

        return json.dumps(results, indent=2)


# Convenience function to get all tools
def get_crew_social_tools(base_url: str = "http://localhost:8001") -> Dict[str, BaseTool]:
    """
    Get all crew-social-tools as CrewAI tools.

    Usage:
        tools = get_crew_social_tools()
        agent = Agent(
            tools=[tools["twitter"], tools["youtube"], tools["aggregator"]],
            ...
        )
    """
    config = CrewSocialToolsConfig(base_url=base_url)

    return {
        "twitter": TwitterSearchTool(config=config),
        "youtube": YouTubeSearchTool(config=config),
        "reddit": RedditScanTool(config=config),
        "instagram": InstagramFetchTool(config=config),
        "ddg": DDGSearchTool(config=config),
        "aggregator": SocialMediaAggregator(config=config),
    }
