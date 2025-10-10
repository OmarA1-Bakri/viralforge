"""
YouTube RAG Tools - Wrappers for CrewAI YouTube semantic search tools.

These wrappers provide error handling, logging, and a consistent interface
for semantic search within YouTube videos and channels.
"""

import os
import logging
from typing import Dict, Any, Tuple, Union

try:
    from crewai_tools import YoutubeVideoSearchTool, YoutubeChannelSearchTool
    from langchain_mistralai import MistralAIEmbeddings
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
except ImportError as e:
    raise ImportError(
        "CrewAI YouTube tools not available. "
        "Install with: pip install 'crewai[tools]' "
        "langchain-mistralai langchain-google-genai"
    ) from e

logger = logging.getLogger(__name__)


def _get_embeddings() -> Tuple[Union[MistralAIEmbeddings, GoogleGenerativeAIEmbeddings], str]:
    """
    Get embeddings for YouTube RAG tools (Mistral preferred, Google as fallback).

    Mistral is prioritized due to performance. Falls back to Google if Mistral key not available.

    Returns:
        Tuple of (embeddings_instance, provider_name)

    Raises:
        EnvironmentError: If no API keys are available
    """
    # Try Mistral first (prioritized)
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if mistral_key:
        logger.info("Using Mistral embeddings")
        return MistralAIEmbeddings(
            model="mistral-embed",
            mistral_api_key=mistral_key
        ), "mistral"

    # Fallback to Google
    google_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if google_key:
        logger.info("Using Google embeddings (fallback)")
        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=google_key
        ), "google"

    # No keys available
    raise EnvironmentError(
        "YouTube RAG tools require either Mistral or Google API key for embeddings."
        "\n\nOptions (in priority order):"
        "\n1. Add Mistral key: MISTRAL_API_KEY=your_key_here (https://console.mistral.ai/)"
        "\n2. Use Google key: GOOGLE_AI_API_KEY=AIza... (https://aistudio.google.com/apikey)"
        "\n3. Disable YouTube tools: FEATURE_FLAGS__USE_CREWAI_YOUTUBE_TOOLS=false"
    )


def _check_api_keys() -> None:
    """
    Verify that required API keys are set for YouTube RAG tools.

    Prioritizes Mistral, falls back to Google.

    Raises:
        EnvironmentError: If no API keys are available
    """
    # Just verify an embedding provider is available
    _get_embeddings()


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
        """
        Initialize the YouTube video RAG tool.

        Uses Mistral embeddings (preferred) with Google fallback.
        """
        _check_api_keys()  # Verify API keys before initialization

        # Get embeddings (tries Mistral first, falls back to Google)
        self.embeddings, self.provider = _get_embeddings()

        # Configure CrewAI embedding model structure
        if self.provider == "mistral":
            self.embedding_config = {
                "embedding_model": {
                    "provider": "mistral",
                    "config": {"model": "mistral-embed"}
                }
            }
        else:  # google
            self.embedding_config = {
                "embedding_model": {
                    "provider": "google",
                    "config": {"model": "models/embedding-001"}
                }
            }

        logger.info("✅ YouTubeRAGVideoTool initialized with %s embeddings", self.provider.title())

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
            logger.info("🔍 Searching video: %s", video_url)
            logger.debug("Query: %s", query)

            # Initialize tool with specific video and embeddings config
            video_tool = YoutubeVideoSearchTool(
                youtube_video_url=video_url,
                config=self.embedding_config
            )

            # Perform semantic search
            search_result = video_tool.run(query)

            logger.info("✅ Video search completed successfully")

            return {
                "success": True,
                "video_url": video_url,
                "query": query,
                "results": search_result,
                "tool_type": "youtube_video_rag"
            }

        except Exception as e:
            logger.error("❌ YouTube video RAG search failed: %s", e)
            logger.debug("Video URL: %s, Query: %s", video_url, query)

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
        """
        Initialize the YouTube channel RAG tool.

        Uses Mistral embeddings (preferred) with Google fallback.
        """
        _check_api_keys()  # Verify API keys before initialization

        # Get embeddings (tries Mistral first, falls back to Google)
        self.embeddings, self.provider = _get_embeddings()

        # Configure CrewAI embedding model structure
        if self.provider == "mistral":
            self.embedding_config = {
                "embedding_model": {
                    "provider": "mistral",
                    "config": {"model": "mistral-embed"}
                }
            }
        else:  # google
            self.embedding_config = {
                "embedding_model": {
                    "provider": "google",
                    "config": {"model": "models/embedding-001"}
                }
            }

        logger.info("✅ YouTubeRAGChannelTool initialized with %s embeddings", self.provider.title())

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
            logger.info("🔍 Searching channel: %s", channel_handle)
            logger.debug("Query: %s", query)

            # Initialize tool with specific channel and embeddings config
            channel_tool = YoutubeChannelSearchTool(
                youtube_channel_handle=channel_handle,
                config=self.embedding_config
            )

            # Perform semantic search across channel
            search_result = channel_tool.run(query)

            logger.info("✅ Channel search completed successfully")

            return {
                "success": True,
                "channel": channel_handle,
                "query": query,
                "results": search_result,
                "tool_type": "youtube_channel_rag"
            }

        except Exception as e:
            logger.error("❌ YouTube channel RAG search failed: %s", e)
            logger.debug("Channel: %s, Query: %s", channel_handle, query)

            return {
                "success": False,
                "error": str(e),
                "channel": channel_handle,
                "query": query,
                "tool_type": "youtube_channel_rag"
            }


def get_youtube_rag_tools() -> Dict[str, Any]:
    """
    Get configured CrewAI YouTube tools for agent use.

    Note: CrewAI YouTube tools only support specific embedding providers.
    Uses Google Generative AI embeddings (requires GOOGLE_API_KEY).

    Returns:
        Dictionary mapping tool names to CrewAI BaseTool instances:
            - "video": YoutubeVideoSearchTool configured with embeddings
            - "channel": YoutubeChannelSearchTool configured with embeddings

    Example:
        tools = get_youtube_rag_tools()
        # Use directly with CrewAI agents
        agent = Agent(tools=[tools["video"], tools["channel"]])
    """
    # Verify Google API key is available
    google_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not google_key:
        raise EnvironmentError(
            "YouTube RAG tools require GOOGLE_API_KEY for embeddings."
            "\n\nGet your API key from: https://aistudio.google.com/apikey"
            "\nOr disable YouTube tools: FEATURE_FLAGS__USE_CREWAI_YOUTUBE_TOOLS=false"
        )

    # CrewAI YouTube tools require EMBEDDINGS_GOOGLE_API_KEY environment variable
    os.environ["EMBEDDINGS_GOOGLE_API_KEY"] = google_key

    # Configure Google embeddings for CrewAI tools
    embedding_config = {
        "embedding_model": {
            "provider": "google-generativeai",
            "config": {
                "model": "models/embedding-001"
            }
        }
    }

    # Return configured CrewAI tools (BaseTool instances)
    return {
        "video": YoutubeVideoSearchTool(config=embedding_config),
        "channel": YoutubeChannelSearchTool(config=embedding_config)
    }
