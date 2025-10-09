#!/usr/bin/env python3

"""
ViralForge Multi-Agent System using CrewAI
==========================================

This module implements a sophisticated multi-agent system for viral content creation
using CrewAI's state persistence, memory management, and parallel execution capabilities.

Agent Roles:
- TrendScout: Discovers trending content and opportunities
- ContentAnalyzer: Analyzes content performance and patterns  
- ContentCreator: Generates viral content based on insights
- PublishManager: Schedules and manages content publication
- PerformanceTracker: Monitors and analyzes results
"""

import os
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path

try:
    import httpx
except ImportError:
    httpx = None

from server.exceptions import ServiceUnavailableError
from server.config import get_settings

logger = logging.getLogger(__name__)

from crewai import Agent, Task, Crew, Process, LLM
from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource
from crewai_tools import (
    ScrapeWebsiteTool, VisionTool, FileWriterTool, CSVSearchTool, 
    DallETool, CodeInterpreterTool, PGSearchTool, RagTool,
    ZapierActionTool, FirecrawlCrawlWebsiteTool, TavilySearchTool
)

# Import custom social media tools
from pathlib import Path
import importlib.util

# Load crewai_integration module without modifying sys.path
_crew_tools_path = Path(__file__).parent.parent / 'crew-social-tools' / 'crewai_integration.py'
_spec = importlib.util.spec_from_file_location("crewai_integration", _crew_tools_path)
_crewai_integration = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_crewai_integration)
get_crew_social_tools = _crewai_integration.get_crew_social_tools

# Storage will be injected from TypeScript side when needed
# No need to import here as this causes module errors


class ViralForgeAgentSystem:
    """
    Main orchestrator for the ViralForge multi-agent system.
    Manages specialized agents for viral content discovery, creation, and optimization.
    """
    
    def __init__(self):
        """Initialize the multi-agent system with specialized crews."""
        self.settings = get_settings()
        self.feature_flags = self.settings.feature_flags
        self.llm = self._setup_llm()
        self.knowledge = self._setup_knowledge() if self.feature_flags.inject_knowledge_sources else []
        self.tools = self._setup_tools()
        self.agents = self._create_agents()
        self.crews = self._create_crews()
        self.crew_tools_url = self.settings.crew_tools_url
        
    def _setup_llm(self) -> LLM:
        """Configure the LLM for all agents using OpenRouter."""
        return LLM(
            model="openrouter/x-ai/grok-4-fast",  # Using Grok-4-fast via OpenRouter (free tier)
            api_key=self.settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.7,
            max_tokens=4000
        )
    
    def _setup_knowledge(self) -> List[StringKnowledgeSource]:
        """Set up persistent knowledge storage for agents."""
        # Get knowledge directory relative to this script
        script_dir = Path(__file__).parent.parent.parent
        knowledge_dir = script_dir / 'knowledge'
        
        knowledge_sources = []
        knowledge_files = [
            'viral_patterns.md',
            'platform_guidelines.md', 
            'content_strategies.md'
        ]
        
        for filename in knowledge_files:
            filepath = knowledge_dir / filename
            if filepath.exists():
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    knowledge_sources.append(
                        StringKnowledgeSource(content=content, metadata={"source": filename})
                    )
        
        return knowledge_sources
    
    def _setup_tools(self) -> Dict[str, Any]:
        """Initialize all tools needed by agents."""
        tools = {}
        
        # Check if YouTube-only mode is enabled
        if self.feature_flags.youtube_only_mode and self.feature_flags.use_crewai_youtube_tools:
            # Use CrewAI's built-in YouTube RAG tools
            logger.info("🎬 YouTube-only mode enabled with CrewAI RAG tools")
            try:
                from crewai_tools import YoutubeVideoSearchTool, YoutubeChannelSearchTool
                tools["youtube_video_search"] = YoutubeVideoSearchTool()
                tools["youtube_channel_search"] = YoutubeChannelSearchTool()
                logger.info("✅ CrewAI YouTube RAG tools loaded successfully")
            except ImportError as e:
                logger.error(f"❌ Failed to import CrewAI YouTube tools: {e}")
                logger.error("Install with: pip install 'crewai[tools]'")
                raise
            
            # Add general-purpose tools
            tools["web_scraper"] = ScrapeWebsiteTool()
            tools["file_writer"] = FileWriterTool()
            
        else:
            # Use existing multi-platform tools
            logger.info("🌐 Multi-platform mode enabled with custom social tools")
            social_tools = get_crew_social_tools(base_url=self.crew_tools_url)
            
            tools.update({
                # Custom Social Media Discovery Tools (from crew-social-tools)
                "twitter_search": social_tools["twitter"],
                "youtube_search": social_tools["youtube"],
                "reddit_scan": social_tools["reddit"],
                "instagram_fetch": social_tools["instagram"],
                "ddg_search": social_tools["ddg"],
                "social_aggregator": social_tools["aggregator"],
                
                # Other Discovery Tools
                "web_scraper": ScrapeWebsiteTool(),
                
                # Content Creation Tools
                "file_writer": FileWriterTool(),
            })
        
        return tools
    
    def _create_agents(self) -> Dict[str, Agent]:
        """Create specialized agents with distinct roles and capabilities."""
        
        agents = {}
        
        # 1. TrendScout Agent - Discovers viral opportunities
        agents["trend_scout"] = Agent(
            role="Viral Trend Scout",
            goal="Discover trending content, viral patterns, and emerging opportunities across platforms",
            backstory="""You are an expert trend analyst who lives and breathes viral content. 
            You have an uncanny ability to spot trends before they explode, understand what makes 
            content shareable, and identify untapped opportunities in the viral content landscape. 
            You constantly monitor YouTube, TikTok, Instagram, and emerging platforms for signals.""",
            llm=self.llm,
            tools=[
                self.tools["twitter_search"],
                self.tools["youtube_search"],
                self.tools["reddit_scan"],
                self.tools["instagram_fetch"],
                self.tools["social_aggregator"],
                self.tools["ddg_search"],
                self.tools["web_scraper"]
            ],
            knowledge_sources=self.knowledge,
            verbose=True,
            allow_delegation=False,
            memory=True,
            max_iter=3,
            max_retry_limit=2
        )
        
        # 2. ContentAnalyzer Agent - Analyzes performance patterns
        agents["content_analyzer"] = Agent(
            role="Content Performance Analyst", 
            goal="Analyze content performance, identify successful patterns, and provide data-driven insights",
            backstory="""You are a data scientist specialized in viral content analytics. 
            You can dissect any piece of content to understand why it succeeded or failed, 
            identify patterns in audience engagement, and predict viral potential. You work 
            with engagement metrics, timing data, and audience demographics to provide 
            actionable insights.""",
            llm=self.llm,
            tools=[
                self.tools["file_writer"]
            ],
            knowledge_sources=self.knowledge,
            verbose=True,
            allow_delegation=False,
            memory=True,
            max_iter=3,
            max_retry_limit=2
        )
        
        # 3. ContentCreator Agent - Generates viral content
        agents["content_creator"] = Agent(
            role="Viral Content Creator",
            goal="Create compelling, viral-ready content based on trending insights and performance data",
            backstory="""You are a creative genius who specializes in viral content creation. 
            You understand the psychology of shareability, the art of hook writing, and the 
            science of engagement. You can adapt any trending format, create original viral 
            concepts, and optimize content for maximum reach across platforms.""",
            llm=self.llm,
            tools=[
                self.tools["file_writer"]
            ],
            knowledge_sources=self.knowledge,
            verbose=True,
            allow_delegation=False,
            memory=True,
            max_iter=4,
            max_retry_limit=2
        )
        
        # 4. PublishManager Agent - Manages content distribution
        agents["publish_manager"] = Agent(
            role="Content Publication Manager",
            goal="Optimize content scheduling, distribution strategy, and platform-specific formatting",
            backstory="""You are a strategic content distribution expert who knows the optimal 
            times to post on every platform, understands each platform's algorithm, and can 
            adapt content format for maximum performance. You manage the entire publication 
            pipeline from scheduling to cross-platform optimization.""",
            llm=self.llm,
            tools=[
                self.tools["file_writer"]
            ],
            knowledge_sources=self.knowledge,
            verbose=True,
            allow_delegation=False,
            memory=True,
            max_iter=3,
            max_retry_limit=2
        )
        
        # 5. PerformanceTracker Agent - Monitors and optimizes results
        agents["performance_tracker"] = Agent(
            role="Performance Analytics Specialist",
            goal="Monitor content performance, track ROI, and provide optimization recommendations",
            backstory="""You are an analytics expert focused on measuring and improving viral 
            content performance. You track every metric that matters, identify what's working, 
            and provide specific recommendations for improvement. You understand the correlation 
            between different engagement signals and long-term viral success.""",
            llm=self.llm,
            tools=[
                self.tools["file_writer"]
            ],
            knowledge_sources=self.knowledge,
            verbose=True,
            allow_delegation=False,
            memory=True,
            max_iter=3,
            max_retry_limit=2
        )
        
        return agents
    
    def _create_crews(self) -> Dict[str, Crew]:
        """Create specialized crews for different workflows."""
        
        crews = {}
        
        # 1. Discovery Crew - Find trending opportunities
        crews["discovery"] = Crew(
            agents=[self.agents["trend_scout"], self.agents["content_analyzer"]],
            tasks=[],  # Tasks will be created dynamically
            process=Process.sequential,
            verbose=True,
            memory=False,  # Disable memory to avoid embeddings requirement
            max_rpm=30
        )

        # 2. Creation Crew - Generate viral content
        crews["creation"] = Crew(
            agents=[self.agents["content_creator"], self.agents["content_analyzer"]],
            tasks=[],
            process=Process.sequential,
            verbose=True,
            memory=False,
            max_rpm=30
        )

        # 3. Publication Crew - Distribute and optimize
        crews["publication"] = Crew(
            agents=[self.agents["publish_manager"], self.agents["performance_tracker"]],
            tasks=[],
            process=Process.sequential,
            verbose=True,
            memory=False,
            max_rpm=30
        )

        # 4. Full Pipeline Crew - End-to-end viral content pipeline
        crews["full_pipeline"] = Crew(
            agents=list(self.agents.values()),
            tasks=[],
            process=Process.sequential,
            verbose=True,
            memory=False,
            max_rpm=30
        )
        
        return crews
    
    async def _check_service_health(self) -> Dict[str, bool]:
        """
        Check health of external service dependencies.
        
        Returns:
            Dictionary mapping service names to their health status (True = healthy)
            
        Raises:
            ServiceUnavailableError: If a critical service is unavailable
        """
        if httpx is None:
            logger.warning("httpx not installed, skipping service health checks")
            return {"crew_social_tools": True}  # Assume healthy if can't check
        
        health = {}
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.crew_tools_url}/health")
                health["crew_social_tools"] = response.status_code == 200
                
                if not health["crew_social_tools"]:
                    logger.warning(
                        f"crew-social-tools health check returned status {response.status_code}"
                    )
        except httpx.TimeoutException:
            logger.error("crew-social-tools health check timed out after 5 seconds")
            health["crew_social_tools"] = False
        except httpx.ConnectError:
            logger.error(f"crew-social-tools service not reachable at {self.crew_tools_url}")
            health["crew_social_tools"] = False
        except Exception as e:
            logger.error(f"crew-social-tools health check failed: {e}")
            health["crew_social_tools"] = False
        
        # Raise exception if critical service is down
        if not health["crew_social_tools"]:
            raise ServiceUnavailableError(
                service_name="crew-social-tools",
                message=(
                    f"crew-social-tools service is unavailable at {self.crew_tools_url}. "
                    "Please ensure the service is running:
"
                    "  cd server/crew-social-tools && python main.py"
                )
            )
        
        return health
    
    async def discover_trends(self, platforms: List[str] = None, niches: List[str] = None) -> Dict[str, Any]:
        """
        Run the discovery crew to find trending opportunities.
        
        Args:
            platforms: List of platforms to search (e.g., ['youtube', 'tiktok'])
            niches: List of content niches to focus on
            
        Returns:
            Dictionary containing discovered trends and opportunities
        """
        # Check service health before executing
        try:
            await self._check_service_health()
        except ServiceUnavailableError as e:
            return {
                "status": "error",
                "error": str(e),
                "error_type": "service_unavailable",
                "timestamp": datetime.now().isoformat()
            }
        
        platforms = platforms or ['youtube', 'tiktok', 'instagram']
        niches = niches or ['general']
        
        # Create discovery tasks
        discovery_task = Task(
            description=f"""
            Discover trending content and viral opportunities across {', '.join(platforms)} 
            for the following niches: {', '.join(niches)}.
            
            Your analysis should include:
            1. Current trending topics and hashtags
            2. Viral content formats and patterns  
            3. Emerging opportunities and gaps
            4. Audience engagement signals
            5. Timing and frequency insights
            
            Focus on content with high engagement rates and viral potential.
            """,
            agent=self.agents["trend_scout"],
            expected_output="Comprehensive trend analysis report with specific opportunities"
        )
        
        analysis_task = Task(
            description="""
            Analyze the discovered trends to identify:
            1. Content patterns that consistently perform well
            2. Optimal posting times and frequencies  
            3. Audience behavior insights
            4. Platform-specific optimization opportunities
            5. Competitive landscape analysis
            
            Provide data-driven recommendations for content strategy.
            """,
            agent=self.agents["content_analyzer"],
            expected_output="Detailed analysis report with actionable recommendations",
            context=[discovery_task]
        )
        
        # Set tasks and execute
        self.crews["discovery"].tasks = [discovery_task, analysis_task]
        
        try:
            result = await self.crews["discovery"].kickoff_async()
            return {
                "status": "success",
                "trends": result.raw,
                "timestamp": datetime.now().isoformat(),
                "platforms": platforms,
                "niches": niches
            }
        except Exception as e:
            return {
                "status": "error", 
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def create_viral_content(self, trend_data: Dict[str, Any], content_type: str = "video") -> Dict[str, Any]:
        """
        Run the creation crew to generate viral content based on trends.
        
        Args:
            trend_data: Data from trend discovery
            content_type: Type of content to create (video, image, text)
            
        Returns:
            Dictionary containing created content and metadata
        """
        # Check service health before executing
        try:
            await self._check_service_health()
        except ServiceUnavailableError as e:
            return {
                "status": "error",
                "error": str(e),
                "error_type": "service_unavailable",
                "timestamp": datetime.now().isoformat()
            }
        
        creation_task = Task(
            description=f"""
            Create viral {content_type} content based on the following trend insights:
            {trend_data}
            
            Your content should include:
            1. Compelling hook that grabs attention in first 3 seconds
            2. Trending elements and patterns identified in research
            3. Platform-optimized format and structure
            4. Clear call-to-action for engagement
            5. Relevant hashtags and timing recommendations
            
            Ensure the content is original while leveraging proven viral patterns.
            """,
            agent=self.agents["content_creator"],
            expected_output=f"Complete {content_type} content package with optimization details"
        )
        
        optimization_task = Task(
            description="""
            Review and optimize the created content for viral potential:
            1. Analyze hook effectiveness and engagement triggers
            2. Verify platform compliance and best practices
            3. Suggest A/B testing variations
            4. Predict viral potential score
            5. Recommend distribution strategy
            """,
            agent=self.agents["content_analyzer"],
            expected_output="Content optimization report with viral potential assessment",
            context=[creation_task]
        )
        
        # Set tasks and execute
        self.crews["creation"].tasks = [creation_task, optimization_task]
        
        try:
            result = await self.crews["creation"].kickoff_async()
            return {
                "status": "success",
                "content": result.raw,
                "content_type": content_type,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def run_full_pipeline(self, user_id: str, campaign_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the complete viral content pipeline from discovery to publication.
        
        Args:
            user_id: User ID for personalization
            campaign_config: Configuration for the campaign
            
        Returns:
            Complete pipeline execution results
        """
        # Check service health before executing
        try:
            await self._check_service_health()
        except ServiceUnavailableError as e:
            return {
                "status": "error",
                "error": str(e),
                "error_type": "service_unavailable",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }
        
        pipeline_tasks = [
            # 1. Trend Discovery
            Task(
                description=f"""
                Discover trending opportunities for user {user_id} with configuration:
                {campaign_config}
                
                Focus on trends that align with the user's niche and audience.
                """,
                agent=self.agents["trend_scout"],
                expected_output="Personalized trend opportunities report"
            ),
            
            # 2. Performance Analysis  
            Task(
                description="""
                Analyze discovered trends and user's historical performance to identify
                the most promising content opportunities and optimization strategies.
                """,
                agent=self.agents["content_analyzer"],
                expected_output="Strategic content recommendations with performance predictions"
            ),
            
            # 3. Content Creation
            Task(
                description="""
                Create optimized viral content based on trend analysis and performance insights.
                Generate multiple content variations for A/B testing.
                """,
                agent=self.agents["content_creator"], 
                expected_output="Complete content package with variations"
            ),
            
            # 4. Publication Planning
            Task(
                description="""
                Create optimized publication schedule and distribution strategy.
                Set up cross-platform posting and engagement monitoring.
                """,
                agent=self.agents["publish_manager"],
                expected_output="Publication schedule and distribution plan"
            ),
            
            # 5. Performance Tracking Setup
            Task(
                description="""
                Set up comprehensive performance tracking and monitoring for the campaign.
                Define success metrics and optimization triggers.
                """,
                agent=self.agents["performance_tracker"],
                expected_output="Performance monitoring and optimization framework"
            )
        ]
        
        # Set tasks with proper context chaining
        for i in range(1, len(pipeline_tasks)):
            pipeline_tasks[i].context = pipeline_tasks[:i]
        
        self.crews["full_pipeline"].tasks = pipeline_tasks
        
        try:
            result = await self.crews["full_pipeline"].kickoff_async()
            
            # Store results in database
            await self._store_pipeline_results(user_id, result, campaign_config)
            
            return {
                "status": "success",
                "pipeline_result": result.raw,
                "user_id": user_id,
                "campaign_config": campaign_config,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _store_pipeline_results(self, user_id: str, result: Any, config: Dict[str, Any]) -> None:
        """Store pipeline execution results in the database."""
        # Results will be stored by the TypeScript layer that calls this
        # Just log the completion here
        print(f"✅ Pipeline completed for user {user_id}")
        print(f"📊 Agents used: {list(self.agents.keys())}")
        print(f"📅 Timestamp: {datetime.now().isoformat()}")


# Global instance - will be lazily initialized on first use
viral_agent_system = None

def get_agent_system() -> ViralForgeAgentSystem:
    """Get or create the global agent system instance."""
    global viral_agent_system
    if viral_agent_system is None:
        viral_agent_system = ViralForgeAgentSystem()
    return viral_agent_system
