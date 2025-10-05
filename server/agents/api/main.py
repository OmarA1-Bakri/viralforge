"""FastAPI wrapper for the ViralForge CrewAI agent system."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ..viral_crew import get_agent_system


app = FastAPI(
    title="ViralForge Agents API",
    version="1.0.0",
    description="HTTP interface for running CrewAI-powered ViralForge workflows.",
)


class TrendDiscoveryRequest(BaseModel):
    platforms: Optional[List[str]] = Field(default=None, description="Platforms to search")
    niches: Optional[List[str]] = Field(default=None, description="Niches or topics to prioritise")


class TrendDiscoveryResponse(BaseModel):
    success: bool
    trends_discovered: int
    trends: Any
    metadata: Dict[str, Any]


class ContentCreationRequest(BaseModel):
    trend_data: Dict[str, Any] = Field(default_factory=dict)
    content_type: str = Field(default="video", description="Content type to generate")


class ContentCreationResponse(BaseModel):
    success: bool
    content_created: int
    content: Any
    metadata: Dict[str, Any]


class PerformanceRequest(BaseModel):
    analysis_period: str = Field(default="24h")
    metrics: List[str] = Field(default_factory=lambda: ["engagement"])


class PerformanceResponse(BaseModel):
    success: bool
    content_analyzed: int
    report: Dict[str, Any]


class FullPipelineRequest(BaseModel):
    user_id: str
    campaign_config: Dict[str, Any] = Field(default_factory=dict)


class FullPipelineResponse(BaseModel):
    success: bool
    workflow: Dict[str, Any]
    metadata: Dict[str, Any]


def _parse_payload(payload: Any) -> Any:
    """Attempt to JSON-decode string payloads returned by CrewAI."""

    if isinstance(payload, str):
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return payload
    return payload


def _count_items(payload: Any) -> int:
    if payload is None:
        return 0
    if isinstance(payload, (list, tuple, set)):
        return len(payload)
    if isinstance(payload, dict):
        return len(payload)
    return 1


@app.get("/health", response_model=dict)
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/agents/trend-discovery", response_model=TrendDiscoveryResponse)
async def trend_discovery(request: TrendDiscoveryRequest) -> TrendDiscoveryResponse:
    agent_system = get_agent_system()

    result = await agent_system.discover_trends(
        platforms=request.platforms,
        niches=request.niches,
    )

    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("error", "Agent execution failed"))

    trends = _parse_payload(result.get("trends"))

    return TrendDiscoveryResponse(
        success=True,
        trends_discovered=_count_items(trends),
        trends=trends,
        metadata={
            "timestamp": result.get("timestamp"),
            "platforms": result.get("platforms"),
            "niches": result.get("niches"),
        },
    )


@app.post("/agents/content-creation", response_model=ContentCreationResponse)
async def content_creation(request: ContentCreationRequest) -> ContentCreationResponse:
    agent_system = get_agent_system()

    result = await agent_system.create_viral_content(
        trend_data=request.trend_data,
        content_type=request.content_type,
    )

    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("error", "Agent execution failed"))

    content = _parse_payload(result.get("content"))

    return ContentCreationResponse(
        success=True,
        content_created=_count_items(content),
        content=content,
        metadata={"content_type": request.content_type, "timestamp": result.get("timestamp")},
    )


@app.post("/agents/performance-analysis", response_model=PerformanceResponse)
async def performance_analysis(request: PerformanceRequest) -> PerformanceResponse:
    """Placeholder endpoint to surface structured errors to callers."""

    # Performance analysis workflow has not been implemented in CrewAI layer yet.
    # Fail fast with a clear error so callers can fall back to TypeScript routines.
    raise HTTPException(
        status_code=501,
        detail={
            "message": "Performance analysis via CrewAI not implemented",
            "analysis_period": request.analysis_period,
            "metrics": request.metrics,
        },
    )


@app.post("/agents/full-pipeline", response_model=FullPipelineResponse)
async def full_pipeline(request: FullPipelineRequest) -> FullPipelineResponse:
    agent_system = get_agent_system()

    result = await agent_system.run_full_pipeline(
        user_id=request.user_id,
        campaign_config=request.campaign_config,
    )

    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("error", "Agent execution failed"))

    workflow = _parse_payload(result.get("pipeline_result"))

    return FullPipelineResponse(
        success=True,
        workflow={
            "result": workflow,
            "campaign_config": request.campaign_config,
        },
        metadata={
            "user_id": request.user_id,
            "timestamp": result.get("timestamp"),
        },
    )
