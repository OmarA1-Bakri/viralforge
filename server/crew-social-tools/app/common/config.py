from pydantic_settings import BaseSettings
from pydantic import AnyUrl
from typing import Optional

class Settings(BaseSettings):
    searxng_url: str = "http://localhost:8080"
    proxy_pool: Optional[str] = None
    reddit_client_id: Optional[str] = None
    reddit_client_secret: Optional[str] = None
    reddit_user_agent: str = "crew-social-tools/1.0"
    instaloader_session_file: Optional[str] = None
    jwt_public_keys_url: Optional[str] = None

    class Config:
        env_prefix = ""
        case_sensitive = False

settings = Settings()
