from pydantic import BaseModel, Field
from typing import List, Optional
from ..common.schemas import UnifiedItem, MetricModel
import asyncio, json, subprocess, shlex

class TwitterArgs(BaseModel):
    query: str
    since: Optional[str] = None  # YYYY-MM-DD
    until: Optional[str] = None  # YYYY-MM-DD
    limit: int = Field(default=100, ge=1, le=1000)

def _build_cmd(args: TwitterArgs) -> str:
    q = args.query
    if args.since:
        q += f" since:{args.since}"
    if args.until:
        q += f" until:{args.until}"
    cmd = f"snscrape --jsonl twitter-search {shlex.quote(q)}"
    return cmd

async def search(args: TwitterArgs) -> List[UnifiedItem]:
    cmd = _build_cmd(args)
    proc = await asyncio.create_subprocess_shell(
        cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    items: List[UnifiedItem] = []
    count = 0
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        try:
            obj = json.loads(line.decode("utf-8"))
            items.append(UnifiedItem(
                source="twitter",
                id=str(obj.get("id")),
                url=obj.get("url"),
                title=None,
                text=obj.get("content"),
                author=(obj.get("user") or {}).get("username"),
                published_at=obj.get("date"),
                metrics=MetricModel(
                    likes=obj.get("likeCount"),
                    retweets=obj.get("retweetCount"),
                    comments=obj.get("replyCount")
                ),
                lang=obj.get("lang")
            ))
            count += 1
            if count >= args.limit:
                break
        except Exception:
            continue
    await proc.wait()
    return items
