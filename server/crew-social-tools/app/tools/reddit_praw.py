from pydantic import BaseModel, Field
from typing import List, Literal
from ..common.schemas import UnifiedItem, MetricModel
from ..common.config import settings
import praw

class RedditArgs(BaseModel):
    subreddit: str
    sort: Literal["hot","new","top","rising"] = "hot"
    time_filter: Literal["hour","day","week","month","year","all"] = "day"
    limit: int = Field(default=50, ge=1, le=200)

def _client():
    return praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent,
    )

async def scan(args: RedditArgs) -> List[UnifiedItem]:
    reddit = _client()
    sub = reddit.subreddit(args.subreddit)
    if args.sort == "hot":
        gen = sub.hot(limit=args.limit)
    elif args.sort == "new":
        gen = sub.new(limit=args.limit)
    elif args.sort == "top":
        gen = sub.top(limit=args.limit, time_filter=args.time_filter)
    else:
        gen = sub.rising(limit=args.limit)

    items: List[UnifiedItem] = []
    for post in gen:
        items.append(UnifiedItem(
            source="reddit",
            id=post.id,
            url=f"https://www.reddit.com{post.permalink}",
            title=post.title,
            text=post.selftext or "",
            author=str(post.author) if post.author else None,
            published_at=str(post.created_utc),
            metrics=MetricModel(views=None, likes=post.score, comments=post.num_comments)
        ))
    return items
