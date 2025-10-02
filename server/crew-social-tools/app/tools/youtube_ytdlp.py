from pydantic import BaseModel, Field
from typing import List, Literal
from ..common.schemas import UnifiedItem, MetricModel
import yt_dlp

class YouTubeArgs(BaseModel):
    mode: Literal["video","channel_recent","search"] = "video"
    id_or_query: str
    limit: int = Field(default=25, ge=1, le=100)

def _format(entry) -> UnifiedItem:
    return UnifiedItem(
        source="youtube",
        id=str(entry.get("id") or entry.get("id2") or entry.get("display_id")),
        url=entry.get("webpage_url"),
        title=entry.get("title"),
        author=entry.get("uploader"),
        published_at=str(entry.get("upload_date")) if entry.get("upload_date") else None,
        metrics=MetricModel(views=entry.get("view_count"), likes=entry.get("like_count")),
    )

async def lookup(args: YouTubeArgs) -> List[UnifiedItem]:
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "noplaylist": False,
        "extract_flat": True,
    }
    items: List[UnifiedItem] = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        if args.mode == "video":
            info = ydl.extract_info(args.id_or_query, download=False)
            items.append(_format(info))
        elif args.mode == "channel_recent":
            info = ydl.extract_info(f"https://www.youtube.com/channel/{args.id_or_query}/videos", download=False)
            for e in (info.get("entries") or [])[:args.limit]:
                items.append(_format(e))
        else:  # search
            info = ydl.extract_info(f"ytsearch{args.limit}:{args.id_or_query}", download=False)
            for e in (info.get("entries") or [])[:args.limit]:
                items.append(_format(e))
    return items
