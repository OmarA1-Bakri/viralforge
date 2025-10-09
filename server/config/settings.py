"""
Application settings and configuration management.
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings

from .feature_flags import FeatureFlags


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Supports .env file loading via pydantic-settings.
    """

    # Application
    node_env: str = Field(default="development", env="NODE_ENV")
    port: int = Field(default=5000, env="PORT")
    frontend_url: str = Field(default="http://localhost:5173", env="FRONTEND_URL")

    # Database
    database_url: str = Field(..., env="DATABASE_URL")

    # AI/LLM Configuration
    openrouter_api_key: str = Field(..., env="OPENROUTER_API_KEY")
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")

    # YouTube Configuration
    youtube_api_key: Optional[str] = Field(None, env="YOUTUBE_API_KEY")
    youtube_client_id: Optional[str] = Field(None, env="YOUTUBE_CLIENT_ID")
    youtube_client_secret: Optional[str] = Field(None, env="YOUTUBE_CLIENT_SECRET")
    youtube_redirect_uri: Optional[str] = Field(None, env="YOUTUBE_REDIRECT_URI")

    # CrewAI Services
    crew_tools_url: str = Field(default="http://localhost:8001", env="CREW_TOOLS_URL")
    crew_agent_url: str = Field(default="http://localhost:8002", env="CREW_AGENT_URL")

    # Authentication
    jwt_secret: str = Field(..., env="JWT_SECRET")
    jwt_expires_in: str = Field(default="24h", env="JWT_EXPIRES_IN")
    session_secret: str = Field(..., env="SESSION_SECRET")
    encryption_key: str = Field(..., env="ENCRYPTION_KEY")

    # Payment Integration
    stripe_secret_key: Optional[str] = Field(None, env="STRIPE_SECRET_KEY")
    stripe_publishable_key: Optional[str] = Field(None, env="STRIPE_PUBLISHABLE_KEY")
    stripe_webhook_secret: Optional[str] = Field(None, env="STRIPE_WEBHOOK_SECRET")

    # Analytics
    posthog_api_key: Optional[str] = Field(None, env="POSTHOG_API_KEY")

    # Feature Flags
    feature_flags: FeatureFlags = Field(default_factory=FeatureFlags)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

        # Enable nested models to load from environment
        # e.g., FEATURE_FLAGS__YOUTUBE_ONLY_MODE=true
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()
