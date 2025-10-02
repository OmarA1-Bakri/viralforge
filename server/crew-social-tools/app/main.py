from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger
from .common.schemas import UnifiedResponse, ErrorModel
from .tools import ddg, searxng, twitter_snscrape, instagram_instaloader, tiktok_playwright, youtube_ytdlp, reddit_praw

app = FastAPI(title="crew-social-tools", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/v1/search/ddg", response_model=UnifiedResponse)
async def search_ddg(payload: ddg.DDGArgs):
    try:
        items = await ddg.search(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("ddg search failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="DDG_ERROR", retryable=True))

@app.post("/v1/search/searxng", response_model=UnifiedResponse)
async def search_searxng(payload: searxng.SearxArgs):
    try:
        items = await searxng.search(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("searxng search failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="SEARXNG_ERROR", retryable=True))

@app.post("/v1/twitter/search", response_model=UnifiedResponse)
async def twitter_search(payload: twitter_snscrape.TwitterArgs):
    try:
        items = await twitter_snscrape.search(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("twitter snscrape failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="TWITTER_ERROR", retryable=True))

@app.post("/v1/instagram/fetch", response_model=UnifiedResponse)
async def instagram_fetch(payload: instagram_instaloader.InstagramArgs):
    try:
        items = await instagram_instaloader.fetch(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("instagram fetch failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="INSTAGRAM_ERROR", retryable=True))

@app.post("/v1/tiktok/search", response_model=UnifiedResponse)
async def tiktok_search(payload: tiktok_playwright.TikTokArgs):
    try:
        items = await tiktok_playwright.search(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("tiktok search failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="TIKTOK_ERROR", retryable=True))

@app.post("/v1/youtube/lookup", response_model=UnifiedResponse)
async def youtube_lookup(payload: youtube_ytdlp.YouTubeArgs):
    try:
        items = await youtube_ytdlp.lookup(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("youtube lookup failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="YOUTUBE_ERROR", retryable=True))

@app.post("/v1/reddit/scan", response_model=UnifiedResponse)
async def reddit_scan(payload: reddit_praw.RedditArgs):
    try:
        items = await reddit_praw.scan(payload)
        return UnifiedResponse(items=items)
    except Exception as e:
        logger.exception("reddit scan failed")
        return UnifiedResponse(error=ErrorModel(error=str(e), code="REDDIT_ERROR", retryable=True))
