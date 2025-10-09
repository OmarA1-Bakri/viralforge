"""
YouTube RAG Tools - Wrappers for CrewAI YouTube semantic search tools.

These wrappers provide error handling, logging, and a consistent interface
for semantic search within YouTube videos and channels.
"""

import os
import logging
from typing import Optional, Dict, Any

try:
    from crewai_tools import YoutubeVideoSearchTool, YoutubeChannelSearchTool
except ImportError as e:
    raise ImportError(
        "CrewAI YouTube tools not available. Install with: pip install 'crewai[tools]'"
    ) from e

logger = logging.getLogger(__name__)


def _check_api_keys() -> None:
    """
    Verify that required API keys are set for YouTube RAG tools.

    Raises:
        EnvironmentError: If required API keys are not set
    """
    openai_key = os.getenv("OPENAI_API_KEY") or os.getenv("CHROMA_OPENAI_API_KEY")

    if not openai_key:
        raise EnvironmentError(
            "YouTube RAG tools require OpenAI API key for embeddings. "
            "Set either OPENAI_API_KEY or CHROMA_OPENAI_API_KEY environment variable. "
            "Get your key from: https://platform.openai.com/api-keys"
        )


class YouTubeRAGVideoTool:
    """
    Wrapper for CrewAI's YoutubeVideoSearchTool.

    Provides semantic search within YouTube video transcripts using RAG
    (Retrieval-Augmented Generation) for content discovery and analysis.

    Example:
        tool = YouTubeRAGVideoTool()
        result = tool.search(
            video_url="https://youtube.com/watch?v=dQw4w9WgXcQ",
            query="main topics discussed in the video"
        )
    """

    def __init__(self):
        """Initialize the YouTube video RAG tool."""
        _check_api_keys()  # Verify API keys before initialization
        self.tool = YoutubeVideoSearchTool()
        logger.info("✅ YouTubeRAGVideoTool initialized")

    def search(self, video_url: str, query: str) -> Dict[str, Any]:
        """
        Perform semantic search within a specific YouTube video transcript.

        Args:
            video_url: Full YouTube video URL (e.g., https://youtube.com/watch?v=VIDEO_ID)
            query: Natural language query describing what to search for

        Returns:
            Dictionary containing:
                - success (bool): Whether the search was successful
                - video_url (str): The video URL searched
                - query (str): The search query
                - results (str): Relevant content extracted from video transcript
                - error (str, optional): Error message if search failed

        Example:
            result = tool.search(
                video_url="https://youtube.com/watch?v=example",
                query="What are the main arguments presented?"
            )

            if result["success"]:
                print(result["results"])
        """
        try:
            logger.info(f"🔍 Searching video: {video_url}")
            logger.debug(f"Query: {query}")

            # Initialize tool with specific video
            video_tool = YoutubeVideoSearchTool(youtube_video_url=video_url)

            # Perform semantic search
            search_result = video_tool.run(query)

            logger.info(f"✅ Video search completed successfully")

            return {
                "success": True,
                "video_url": video_url,
                "query": query,
                "results": search_result,
                "tool_type": "youtube_video_rag"
            }

        except Exception as e:
            logger.error(f"❌ YouTube video RAG search failed: {e}")
            logger.debug(f"Video URL: {video_url}, Query: {query}")

            return {
                "success": False,
                "error": str(e),
                "video_url": video_url,
                "query": query,
                "tool_type": "youtube_video_rag"
            }


class YouTubeRAGChannelTool:
    """
    Wrapper for CrewAI's YoutubeChannelSearchTool.

    Provides semantic search across all videos in a YouTube channel using RAG
    for discovering content patterns and channel strategy analysis.

    Example:
        tool = YouTubeRAGChannelTool()
        result = tool.search(
            channel_handle="@MrBeast",
            query="viral video hooks and intro patterns"
        )
    """

    def __init__(self):
        """Initialize the YouTube channel RAG tool."""
        _check_api_keys()  # Verify API keys before initialization
        self.tool = YoutubeChannelSearchTool()
        logger.info("✅ YouTubeRAGChannelTool initialized")

    def search(self, channel_handle: str, query: str) -> Dict[str, Any]:
        """
        Perform semantic search across all videos in a YouTube channel.

        Args:
            channel_handle: YouTube channel handle (e.g., '@MrBeast', '@MKBHD')
            query: Natural language query describing what to find across channel

        Returns:
            Dictionary containing:
                - success (bool): Whether the search was successful
                - channel (str): The channel handle searched
                - query (str): The search query
                - results (str): Relevant content found across channel videos
                - error (str, optional): Error message if search failed

        Example:
            result = tool.search(
                channel_handle="@MrBeast",
                query="How does this creator structure their video intros?"
            )

            if result["success"]:
                print(result["results"])
        """
        try:
            logger.info(f"🔍 Searching channel: {channel_handle}")
            logger.debug(f"Query: {query}")

            # Initialize tool with specific channel
            channel_tool = YoutubeChannelSearchTool(
                youtube_channel_handle=channel_handle
            )

            # Perform semantic search across channel
            search_result = channel_tool.run(query)

            logger.info(f"✅ Channel search completed successfully")

            return {
                "success": True,
                "channel": channel_handle,
                "query": query,
                "results": search_result,
                "tool_type": "youtube_channel_rag"
            }

        except Exception as e:
            logger.error(f"❌ YouTube channel RAG search failed: {e}")
            logger.debug(f"Channel: {channel_handle}, Query: {query}")

            return {
                "success": False,
                "error": str(e),
                "channel": channel_handle,
                "query": query,
                "tool_type": "youtube_channel_rag"
            }


def get_youtube_rag_tools() -> Dict[str, Any]:
    """
    Get instances of all YouTube RAG tools.

    Returns:
        Dictionary mapping tool names to initialized tool instances:
            - "video": YouTubeRAGVideoTool instance
            - "channel": YouTubeRAGChannelTool instance

    Example:
        tools = get_youtube_rag_tools()
        video_tool = tools["video"]
        channel_tool = tools["channel"]
    """
    return {
        "video": YouTubeRAGVideoTool(),
        "channel": YouTubeRAGChannelTool()
    }
