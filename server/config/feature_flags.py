"""
Feature flags for safe deployment and experimentation.

Feature flags allow you to enable/disable features without code changes,
enabling safe rollout, A/B testing, and instant rollback capabilities.
"""

from pydantic import BaseModel, Field


class FeatureFlags(BaseModel):
    """
    Feature flags for ViralForge.

    Set these in .env file using the prefix FEATURE_FLAGS__
    Example: FEATURE_FLAGS__YOUTUBE_ONLY_MODE=true
    """

    # YouTube-only migration flag
    youtube_only_mode: bool = Field(
        default=False,
        description="Enable YouTube-only content discovery and creation (disable multi-platform)"
    )

    # CrewAI YouTube RAG tools flag
    use_crewai_youtube_tools: bool = Field(
        default=False,
        description="Use CrewAI's built-in YouTube RAG tools instead of custom tools"
    )

    # Infrastructure feature flags
    enable_service_health_checks: bool = Field(
        default=True,
        description="Enable health checks for external service dependencies"
    )

    inject_knowledge_sources: bool = Field(
        default=True,
        description="Inject knowledge base files into agent context"
    )

    # Future expansion flags
    enable_content_caching: bool = Field(
        default=False,
        description="Enable caching for discovered content and analysis results"
    )

    enable_performance_monitoring: bool = Field(
        default=False,
        description="Enable detailed performance metrics and monitoring"
    )

    class Config:
        env_prefix = "FEATURE_FLAGS__"
        case_sensitive = False
