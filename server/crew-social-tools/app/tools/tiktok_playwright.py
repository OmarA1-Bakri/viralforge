from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from ..common.schemas import UnifiedItem, MetricModel
from playwright.async_api import async_playwright
import asyncio, json

class TikTokArgs(BaseModel):
    mode: Literal["trending","hashtag","user","search"]
    query_or_id: Optional[str] = None
    region: str = "GB"
    limit: int = Field(default=50, ge=1, le=200)

async def _collect_json(page) -> list[dict]:
    # This is a placeholder; TikTok changes frequently.
    # Strategy: wait for network idle, evaluate global JSON state.
    await page.wait_for_timeout(3000)
    content = await page.content()
    # You would parse scripts containing JSON initial state here.
    return []

async def search(args: TikTokArgs) -> List[UnifiedItem]:
    items: List[UnifiedItem] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale=f"en-{args.region}", user_agent=None)
        page = await context.new_page()

        if args.mode == "trending":
            url = "https://www.tiktok.com/explore"
        elif args.mode == "hashtag":
            url = f"https://www.tiktok.com/tag/{args.query_or_id}"
        elif args.mode == "user":
            url = f"https://www.tiktok.com/@{args.query_or_id}"
        else:
            url = f"https://www.tiktok.com/search?q={args.query_or_id}"

        await page.goto(url, wait_until="networkidle")
        data = await _collect_json(page)

        for obj in data[:args.limit]:
            items.append(UnifiedItem(
                source="tiktok",
                id=str(obj.get("id")) if obj.get("id") else None,
                url=obj.get("url"),
                title=obj.get("desc"),
                text=obj.get("desc"),
                author=(obj.get("author") or {}).get("uniqueId"),
                metrics=MetricModel(
                    playCount=obj.get("stats",{}).get("playCount"),
                    likes=obj.get("stats",{}).get("diggCount"),
                    comments=obj.get("stats",{}).get("commentCount"),
                    shares=obj.get("stats",{}).get("shareCount"),
                )
            ))
        await browser.close()
    return items
