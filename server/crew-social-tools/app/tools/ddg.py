from pydantic import BaseModel, Field
from typing import List
from ..common.schemas import UnifiedItem
from ddgs import DDGS

class DDGArgs(BaseModel):
    query: str
    max_results: int = Field(default=10, ge=1, le=50)

async def search(args: DDGArgs) -> List[UnifiedItem]:
    results = []
    with DDGS() as ddg:
        for r in ddg.text(args.query, max_results=args.max_results):
            results.append(UnifiedItem(
                source="ddg",
                id=r.get("id") if isinstance(r.get("id"), str) else None,
                url=r.get("href"),
                title=r.get("title"),
                text=r.get("body")
            ))
    return results
