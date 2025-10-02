from pydantic import BaseModel, Field
from typing import List, Optional
from ..common.schemas import UnifiedItem
import httpx
from ..common.config import settings

class SearxArgs(BaseModel):
    query: str
    categories: Optional[list[str]] = None
    num: int = Field(default=10, ge=1, le=50)

async def search(args: SearxArgs) -> List[UnifiedItem]:
    async with httpx.AsyncClient(timeout=7.0) as client:
        resp = await client.get(
            f"{settings.searxng_url}/search",
            params={"q": args.query, "format": "json", "categories": ",".join(args.categories or [])}
        )
        resp.raise_for_status()
        data = resp.json()
    items = []
    for r in data.get("results", [])[:args.num]:
        items.append(UnifiedItem(
            source="searxng",
            url=r.get("url"),
            title=r.get("title"),
            text=r.get("content")
        ))
    return items
