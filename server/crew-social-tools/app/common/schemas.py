from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict

class ErrorModel(BaseModel):
    error: str
    code: str
    retryable: bool = False
    hint: Optional[str] = None

class MetricModel(BaseModel):
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    retweets: Optional[int] = None
    playCount: Optional[int] = None

class MediaItem(BaseModel):
    type: str = "image"
    url: str

class UnifiedItem(BaseModel):
    source: str
    id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    text: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    lang: Optional[str] = None
    media: Optional[List[MediaItem]] = None
    metrics: Optional[MetricModel] = None

class UnifiedResponse(BaseModel):
    items: List[UnifiedItem] = Field(default_factory=list)
    error: Optional[ErrorModel] = None
