#!/usr/bin/env python3
"""Test suite for ViralForge Agent System functionality."""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

# Set up test environment
os.environ.setdefault('OPENROUTER_API_KEY', 'test-key-for-testing')
os.environ.setdefault('DATABASE_URL', 'postgresql://test')
os.environ.setdefault('CREW_TOOLS_URL', 'http://localhost:8001')

from viral_crew import ViralForgeAgentSystem


async def test_agent_system_initialization():
    """Verify the agent system initializes correctly with all components."""
    system = ViralForgeAgentSystem()

    # Verify agents are created
    assert "trend_scout" in system.agents
    assert "content_analyzer" in system.agents
    assert "content_creator" in system.agents
    assert "publish_manager" in system.agents
    assert "performance_tracker" in system.agents

    # Verify crews are created
    assert "discovery" in system.crews
    assert "creation" in system.crews
    assert "publication" in system.crews
    assert "full_pipeline" in system.crews

    print("✅ Agent system initialization test passed!")


async def test_analyze_performance_method_exists():
    """Verify the analyze_performance method exists and has correct signature."""
    system = ViralForgeAgentSystem()

    # Check method exists
    assert hasattr(system, 'analyze_performance')
    assert callable(system.analyze_performance)

    # Verify it's an async method
    import inspect
    assert inspect.iscoroutinefunction(system.analyze_performance)

    print("✅ analyze_performance method signature test passed!")


async def test_analyze_performance_workflow():
    """Verify the newly implemented analyze_performance method functionality."""
    system = ViralForgeAgentSystem()

    # Mock internal CrewAI components
    mock_crew = AsyncMock()
    mock_result = MagicMock()
    mock_result.raw = "Performance analysis complete: Content A performing well with 85% engagement rate."
    mock_crew.kickoff_async.return_value = mock_result
    system.crews["publication"] = mock_crew

    print("\n🧪 Testing Performance Analysis Workflow...")
    result = await system.analyze_performance(
        analysis_period="7d",
        metrics=["engagement", "virality", "retention"]
    )

    # Verify result structure
    assert result["status"] == "success"
    assert result["period"] == "7d"
    assert "engagement" in result["metrics_analyzed"]
    assert "virality" in result["metrics_analyzed"]
    assert "retention" in result["metrics_analyzed"]
    assert "report" in result
    assert "timestamp" in result

    # Verify task configuration
    assert len(system.crews["publication"].tasks) == 2
    assert system.crews["publication"].tasks[0].agent == system.agents["content_analyzer"]
    assert system.crews["publication"].tasks[1].agent == system.agents["performance_tracker"]

    print("✅ Performance Analysis workflow test passed!")


async def test_analyze_performance_default_metrics():
    """Test that analyze_performance uses default metrics when none provided."""
    system = ViralForgeAgentSystem()

    # Mock the crew
    mock_crew = AsyncMock()
    mock_result = MagicMock()
    mock_result.raw = "Default metrics analysis"
    mock_crew.kickoff_async.return_value = mock_result
    system.crews["publication"] = mock_crew

    result = await system.analyze_performance(analysis_period="24h")

    assert result["status"] == "success"
    assert "views" in result["metrics_analyzed"]
    assert "engagement" in result["metrics_analyzed"]
    assert "retention" in result["metrics_analyzed"]

    print("✅ Default metrics test passed!")


async def test_analyze_performance_error_handling():
    """Test error handling in analyze_performance method."""
    system = ViralForgeAgentSystem()

    # Mock the crew to raise an exception
    mock_crew = AsyncMock()
    mock_crew.kickoff_async.side_effect = Exception("Test error")
    system.crews["publication"] = mock_crew

    result = await system.analyze_performance(
        analysis_period="30d",
        metrics=["engagement"]
    )

    assert result["status"] == "error"
    assert "error" in result
    assert result["period"] == "30d"
    assert "timestamp" in result

    print("✅ Error handling test passed!")


async def test_discover_trends_method():
    """Test the discover_trends method works correctly."""
    system = ViralForgeAgentSystem()

    # Mock the crew
    mock_crew = AsyncMock()
    mock_result = MagicMock()
    mock_result.raw = "Trending topics discovered"
    mock_crew.kickoff_async.return_value = mock_result
    system.crews["discovery"] = mock_crew

    result = await system.discover_trends(
        platforms=["tiktok", "youtube"],
        niches=["tech", "gaming"]
    )

    assert result["status"] == "success"
    assert "trends" in result
    assert result["platforms"] == ["tiktok", "youtube"]
    assert result["niches"] == ["tech", "gaming"]

    print("✅ Trend discovery test passed!")


async def test_create_viral_content_method():
    """Test the create_viral_content method works correctly."""
    system = ViralForgeAgentSystem()

    # Mock the crew
    mock_crew = AsyncMock()
    mock_result = MagicMock()
    mock_result.raw = "Viral content created"
    mock_crew.kickoff_async.return_value = mock_result
    system.crews["creation"] = mock_crew

    trend_data = {"topic": "AI trends", "platform": "tiktok"}
    result = await system.create_viral_content(
        trend_data=trend_data,
        content_type="video"
    )

    assert result["status"] == "success"
    assert "content" in result
    assert result["content_type"] == "video"

    print("✅ Content creation test passed!")


def test_knowledge_setup():
    """Test that knowledge sources are properly loaded."""
    system = ViralForgeAgentSystem()

    # Knowledge sources should be a list (might be empty if files don't exist)
    assert isinstance(system.knowledge, list)

    print("✅ Knowledge setup test passed!")


def test_tools_setup():
    """Test that tools are properly configured."""
    system = ViralForgeAgentSystem()

    # Verify essential tools are present
    assert "file_writer" in system.tools
    assert "web_scraper" in system.tools
    assert "twitter_search" in system.tools
    assert "youtube_search" in system.tools

    print("✅ Tools setup test passed!")


if __name__ == "__main__":
    print("🧪 Running ViralForge Agent System Tests...\n")
    print("=" * 60)

    # Run synchronous tests
    print("\n📋 Running synchronous tests...")
    test_knowledge_setup()
    test_tools_setup()

    # Run async tests
    print("\n⚡ Running async tests...")
    asyncio.run(test_agent_system_initialization())
    asyncio.run(test_analyze_performance_method_exists())
    asyncio.run(test_analyze_performance_workflow())
    asyncio.run(test_analyze_performance_default_metrics())
    asyncio.run(test_analyze_performance_error_handling())
    asyncio.run(test_discover_trends_method())
    asyncio.run(test_create_viral_content_method())

    print("\n" + "=" * 60)
    print("🎉 All tests passed successfully!")
    print("\nNext steps:")
    print("1. Start the agent API: uvicorn server.agents.api.main:app --port 8002")
    print("2. Test the endpoint: POST http://localhost:8002/agents/performance-analysis")
    print("3. Integrate with frontend components")
