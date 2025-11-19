# ViralForge CrewAI Multi-Agent System

## Overview

This branch introduces a sophisticated multi-agent system for ViralForge using CrewAI, replacing traditional cron-based automation with intelligent agent-driven processes.

## 🚀 Features

### Multi-Agent Architecture
- **TrendScout Agent**: Discovers viral opportunities and emerging trends
- **ContentAnalyzer Agent**: Analyzes performance patterns and provides data-driven insights  
- **ContentCreator Agent**: Generates viral content based on trending insights
- **PublishManager Agent**: Optimizes content distribution and scheduling
- **PerformanceTracker Agent**: Monitors results and provides optimization recommendations

### Key Capabilities
- **State Persistence**: Agents maintain context across workflows using CrewAI memory
- **Knowledge Management**: Comprehensive knowledge base with viral patterns, platform guidelines, and content strategies
- **Parallel Execution**: Async workflow processing for multiple users and platforms
- **Intelligent Fallback**: Automatic fallback to traditional automation if agents fail
- **Real-time Monitoring**: Dashboard for agent performance, workflow status, and debugging

## 📁 File Structure

```
server/
├── agents/
│   └── viral_crew.py              # Main CrewAI multi-agent system
├── automation/
│   ├── ai_scheduler.py            # AI-enhanced automation scheduler  
│   └── scheduler.ts               # Original scheduler (fallback)
└── routes/
    └── agents.ts                  # Agent monitoring and control API

knowledge/
├── viral_patterns.md              # Viral content psychology and patterns
├── platform_guidelines.md        # Platform-specific compliance rules
└── content_strategies.md         # Content creation workflows and strategies
```

## 🛠 Installation & Setup

### 1. Install CrewAI Dependencies
```bash
pip install crewai crewai-tools
```

### 2. Environment Variables
Add to your `.env` file:
```
OPENAI_API_KEY=your_openai_key
SERPER_API_KEY=your_serper_key
TAVILY_API_KEY=your_tavily_key
FIRECRAWL_API_KEY=your_firecrawl_key
ZAPIER_NLA_API_KEY=your_zapier_key
```

### 3. Knowledge Base
The knowledge base is automatically loaded from:
- `knowledge/viral_patterns.md`
- `knowledge/platform_guidelines.md`  
- `knowledge/content_strategies.md`

## 🎯 Available Tools

### Phase 1 (Implemented)
- **YoutubeChannelSearchTool**: Search YouTube for trending content
- **ScrapeWebsiteTool**: General web scraping for content discovery
- **SerperDevTool**: Google search API for trend discovery
- **VisionTool**: Analyze images and visual content
- **FileWriterTool**: Save generated content and reports
- **CSVSearchTool**: Analyze performance data
- **ZapierActionTool**: Integrate with 5000+ apps

### Phase 2 (Planned)
- **DallETool**: Generate images for viral content
- **CodeInterpreterTool**: Advanced analytics and data processing
- **FirecrawlCrawlWebsiteTool**: Advanced website crawling
- **S3WriterTool**: Cloud storage for content
- **PGSearchTool**: Database queries for analytics
- **RagTool**: Intelligent content recommendations

## 🔄 Workflow Types

### 1. Trend Discovery
```python
result = await viral_agent_system.discover_trends(
    platforms=['tiktok', 'instagram', 'youtube'],
    niches=['tech', 'business', 'lifestyle']
)
```

### 2. Content Creation
```python
result = await viral_agent_system.create_viral_content(
    trend_data=discovered_trends,
    content_type='video'
)
```

### 3. Full Pipeline
```python
result = await viral_agent_system.run_full_pipeline(
    user_id=123,
    campaign_config={
        'platforms': ['tiktok', 'instagram'],
        'content_goals': ['viral_growth'],
        'frequency': 'daily'
    }
)
```

## 📊 Monitoring & Debugging

### Agent Status API
```
GET /api/agents/status       # Overall system health
GET /api/agents/health       # Detailed agent health checks
GET /api/agents/workflows    # Active and recent workflows
GET /api/agents/metrics      # Performance metrics
```

### Manual Execution
```
POST /api/agents/execute     # Trigger workflows manually
POST /api/agents/restart     # Restart agents or system
```

### Knowledge Base Management
```
GET /api/agents/knowledge           # View knowledge base status
POST /api/agents/knowledge/refresh  # Refresh knowledge base
```

## 🔧 Scheduled Workflows

The AI-enhanced scheduler runs these workflows:

- **Trend Discovery**: Every 4 hours for all users
- **Content Creation**: Every 6 hours for pending requests  
- **Performance Analysis**: Every 2 hours for recent content
- **User Onboarding**: Every 30 minutes for new users
- **Full Pipeline**: Daily at 8 AM for premium users
- **Agent Monitoring**: Hourly performance checks

## 🎨 Agent Personalities

### TrendScout Agent
> "Expert trend analyst who lives and breathes viral content. Uncanny ability to spot trends before they explode."

### ContentAnalyzer Agent  
> "Data scientist specialized in viral content analytics. Dissects content to understand success/failure patterns."

### ContentCreator Agent
> "Creative genius specializing in viral content creation. Understands psychology of shareability and engagement science."

### PublishManager Agent
> "Strategic content distribution expert. Knows optimal posting times and platform algorithms."

### PerformanceTracker Agent
> "Analytics expert focused on measuring and improving viral content performance."

## 🚦 System Status

- **Coverage**: 61.3% of viral content needs covered by existing CrewAI tools
- **Missing Tools**: 24 custom tools identified for future development
- **Integration**: Seamless fallback to traditional automation
- **Performance**: Real-time monitoring and optimization

## 🔮 Future Enhancements

### Phase 3 (Advanced Features)
- Custom TikTokAPITool for direct API integration
- Custom VideoEditorTool for automated video editing  
- Custom ViralMetricsTool for viral performance tracking
- Custom TrendAnalysisTool for deep trend prediction
- Custom ContentSchedulerTool for advanced scheduling

### Platform Expansion
- Direct social media API integrations
- Video editing and thumbnail generation
- Advanced analytics and competitor monitoring
- A/B testing and content optimization

## 📈 Performance Benefits

- **Intelligent Processing**: Context-aware content creation vs rule-based automation
- **Parallel Execution**: Multiple users/platforms processed simultaneously
- **Learning System**: Agents improve over time through memory and knowledge
- **Scalability**: Easy horizontal scaling with additional agent instances
- **Reliability**: Automatic fallback ensures system continuity

## 🔍 Debugging Tips

1. **Check Agent Health**: `GET /api/agents/health`
2. **View Active Workflows**: `GET /api/agents/workflows`
3. **Monitor Performance**: `GET /api/agents/metrics`
4. **Execute Test Workflows**: `POST /api/agents/execute`
5. **Restart if Needed**: `POST /api/agents/restart`

## 📝 Notes

- All agents use GPT-4 for optimal reasoning capabilities
- Knowledge base is embedded using OpenAI's text-embedding-3-large model
- Workflows are designed to be idempotent and retryable
- Memory and state persist across agent executions
- System gracefully handles API rate limits and failures

---

**Branch**: `agentic-branch`  
**Created**: September 26, 2024  
**CrewAI Version**: 0.201.0  
**Status**: Ready for testing and integration