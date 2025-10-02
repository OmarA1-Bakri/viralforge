from pydantic import BaseModel, Field
from typing import List, Literal
from ..common.schemas import UnifiedItem, MetricModel
from ..common.config import settings
import instaloader

class InstagramArgs(BaseModel):
    mode: Literal["profile", "hashtag", "post"]
    target: str
    max_items: int = Field(default=50, ge=1, le=500)

async def fetch(args: InstagramArgs) -> List[UnifiedItem]:
    L = instaloader.Instaloader(dirname_pattern="/tmp/insta")
    if settings.instaloader_session_file:
        try:
            L.load_session_from_file(username=None, filename=settings.instaloader_session_file)
        except Exception:
            pass

    items: List[UnifiedItem] = []

    if args.mode == "profile":
        profile = instaloader.Profile.from_username(L.context, args.target)
        for post in profile.get_posts():
            items.append(UnifiedItem(
                source="instagram",
                id=post.shortcode,
                url=f"https://www.instagram.com/p/{post.shortcode}/",
                title=None,
                text=post.caption or "",
                author=profile.username,
                published_at=str(post.date_utc),
                metrics=MetricModel(likes=post.likes, comments=post.comments),
            ))
            if len(items) >= args.max_items:
                break
    elif args.mode == "hashtag":
        hashtag = instaloader.Hashtag.from_name(L.context, args.target)
        for post in hashtag.get_posts():
            items.append(UnifiedItem(
                source="instagram",
                id=post.shortcode,
                url=f"https://www.instagram.com/p/{post.shortcode}/",
                text=post.caption or "",
                published_at=str(post.date_utc),
                metrics=MetricModel(likes=post.likes, comments=post.comments),
            ))
            if len(items) >= args.max_items:
                break
    else:  # post
        shortcode = args.target.strip().replace("https://www.instagram.com/p/", "").strip("/")
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        items.append(UnifiedItem(
            source="instagram",
            id=post.shortcode,
            url=f"https://www.instagram.com/p/{post.shortcode}/",
            text=post.caption or "",
            published_at=str(post.date_utc),
            metrics=MetricModel(likes=post.likes, comments=post.comments),
        ))
    return items
