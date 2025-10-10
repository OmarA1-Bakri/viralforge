"""
ViralForge Crew - YouTube-Focused Viral Content System

This module orchestrates the multi-agent workflow for discovering,
analyzing, and creating viral YouTube content.
"""

import os
from typing import List
from pathlib import Path

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource
from langchain_google_genai import ChatGoogleGenerativeAI

# Import YouTube RAG tools
from .tools.youtube_rag_tools import get_youtube_rag_tools


@CrewBase
class ViralForgeCrew():
    """
    ViralForge Crew for YouTube viral content discovery and creation.

    Agents:
    - TrendScout: Discovers YouTube trends and viral opportunities
    - ContentAnalyzer: Analyzes performance patterns and provides insights
    - ContentCreator: Creates viral-ready content based on data
    - PublishManager: Optimizes scheduling and distribution
    - PerformanceTracker: Monitors and optimizes results
    """

    # Path configuration
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def __init__(self):
        """Initialize the crew with configuration and tools."""
        super().__init__()
        self._load_feature_flags()
        self._setup_llm()
        self._setup_knowledge()
        self._setup_tools()

    def _load_feature_flags(self):
        """Load feature flags from environment."""
        self.youtube_only_mode = os.getenv('FEATURE_FLAGS__YOUTUBE_ONLY_MODE', 'true').lower() == 'true'
        self.use_crewai_tools = os.getenv('FEATURE_FLAGS__USE_CREWAI_YOUTUBE_TOOLS', 'true').lower() == 'true'
        self.inject_knowledge = os.getenv('FEATURE_FLAGS__INJECT_KNOWLEDGE_SOURCES', 'true').lower() == 'true'

    def _setup_llm(self):
        """Configure the LLM models for agents using Google Gemini."""
        # Support both GOOGLE_API_KEY and GOOGLE_AI_API_KEY
        google_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        # Gemini 2.5 Pro for analytical tasks (trend analysis, performance analysis)
        self.llm_pro = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro-latest",
            temperature=0.7,
            max_output_tokens=8192,
            google_api_key=google_key
        )

        # Gemini 2.5 Flash for faster generation tasks (content creation, publishing)
        self.llm_flash = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-latest",
            temperature=0.8,
            max_output_tokens=8192,
            google_api_key=google_key
        )

        # Default LLM (Pro for most tasks)
        self.llm = self.llm_pro

    def _setup_knowledge(self) -> List[StringKnowledgeSource]:
        """Load knowledge base files for agent context."""
        if not self.inject_knowledge:
            return []

        knowledge_sources = []

        # Get knowledge directory (project root/knowledge)
        project_root = Path(__file__).parent.parent.parent
        knowledge_dir = project_root / 'knowledge'

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
                        StringKnowledgeSource(
                            content=content,
                            metadata={"source": filename}
                        )
                    )

        return knowledge_sources

    def _setup_tools(self):
        """Initialize YouTube RAG tools."""
        if self.use_crewai_tools:
            self.youtube_tools = get_youtube_rag_tools()
        else:
            self.youtube_tools = {}

    @agent
    def trend_scout(self) -> Agent:
        """YouTube Trend Scout agent - discovers viral opportunities."""
        tools = []
        if self.use_crewai_tools:
            tools = [
                self.youtube_tools.get('video'),
                self.youtube_tools.get('channel')
            ]

        return Agent(
            config=self.agents_config['trend_scout'],
            llm=self.llm,
            tools=[t for t in tools if t is not None],
            knowledge_sources=self._setup_knowledge(),
            verbose=True
        )

    @agent
    def content_analyzer(self) -> Agent:
        """YouTube Content Analyst - analyzes performance patterns."""
        return Agent(
            config=self.agents_config['content_analyzer'],
            llm=self.llm,
            knowledge_sources=self._setup_knowledge(),
            verbose=True
        )

    @agent
    def content_creator(self) -> Agent:
        """Viral Content Creator - creates optimized YouTube content."""
        return Agent(
            config=self.agents_config['content_creator'],
            llm=self.llm_flash,  # Use faster Flash model for creative generation
            knowledge_sources=self._setup_knowledge(),
            verbose=True
        )

    @agent
    def publish_manager(self) -> Agent:
        """Publication Manager - optimizes distribution strategy."""
        return Agent(
            config=self.agents_config['publish_manager'],
            llm=self.llm_flash,  # Use faster Flash model for planning tasks
            knowledge_sources=self._setup_knowledge(),
            verbose=True
        )

    @agent
    def performance_tracker(self) -> Agent:
        """Performance Tracker - monitors and optimizes results."""
        return Agent(
            config=self.agents_config['performance_tracker'],
            llm=self.llm,
            knowledge_sources=self._setup_knowledge(),
            verbose=True
        )

    @task
    def discover_youtube_trends(self) -> Task:
        """Task: Discover trending YouTube content."""
        return Task(
            config=self.tasks_config['discover_youtube_trends'],
            agent=self.trend_scout()
        )

    @task
    def analyze_youtube_performance(self) -> Task:
        """Task: Analyze YouTube performance patterns."""
        return Task(
            config=self.tasks_config['analyze_youtube_performance'],
            agent=self.content_analyzer()
        )

    @task
    def create_youtube_content(self) -> Task:
        """Task: Create viral YouTube content."""
        return Task(
            config=self.tasks_config['create_youtube_content'],
            agent=self.content_creator()
        )

    @task
    def optimize_youtube_content(self) -> Task:
        """Task: Optimize content for viral potential."""
        return Task(
            config=self.tasks_config['optimize_youtube_content'],
            agent=self.content_analyzer()
        )

    @task
    def plan_youtube_publication(self) -> Task:
        """Task: Plan publication schedule and distribution."""
        return Task(
            config=self.tasks_config['plan_youtube_publication'],
            agent=self.publish_manager()
        )

    @task
    def setup_performance_tracking(self) -> Task:
        """Task: Set up performance monitoring framework."""
        return Task(
            config=self.tasks_config['setup_performance_tracking'],
            agent=self.performance_tracker()
        )

    @crew
    def crew(self) -> Crew:
        """
        Creates the ViralForge crew for YouTube viral content workflow.

        Returns:
            Crew: Configured crew with all agents and tasks
        """
        return Crew(
            agents=self.agents,  # Automatically populated by @agent decorators
            tasks=self.tasks,    # Automatically populated by @task decorators
            process=Process.sequential,
            verbose=True,
            memory=False,  # Disable memory to avoid embeddings requirement
            max_rpm=30
        )
