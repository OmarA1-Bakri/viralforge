# CrewAI Multi-Agent System Setup Guide

## Quick Start (3 steps)

### 1. Install Python Dependencies ✅

Already done! CrewAI dependencies are installed.

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Required: Enable CrewAI agents via HTTP bridge
CREW_AGENT_URL=http://localhost:8002

# Optional legacy fallback if you prefer spawning the script directly
# CREWAI_SCRIPT_PATH=server/agents/viral_crew.py

# Required: OpenRouter API key (agents use Grok via OpenRouter)
OPENROUTER_API_KEY=your-openrouter-key-here

# Already configured (check your .env):
# DATABASE_URL=your-postgres-url
```

### 3. Start the Agent Service

```bash
uvicorn server.agents.api:app --reload --port 8002
```

### 4. Restart Your Server

```bash
npm run dev
```

You should see: `🤖 Agent service detected - enabling enhanced AI workflows`

## Verification

Check agent status:

```bash
curl http://localhost:5000/api/agents/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "system_status": "operational",
      "python_agents_available": true,
      "environment_variables": {
      "crewai_http_configured": true,
      "crewai_script_configured": false,
      "openrouter_configured": true,
      "database_configured": true
    }
  }
}
```

## Optional: Advanced Tools

For enhanced agent capabilities, add these API keys:

```bash
# Web Search (highly recommended for trend discovery)
SERPER_API_KEY=your-serper-key  # Get at: https://serper.dev

# Advanced Search
TAVILY_API_KEY=your-tavily-key  # Get at: https://tavily.com

# Web Crawling
FIRECRAWL_API_KEY=your-firecrawl-key  # Get at: https://firecrawl.dev

# Automation
ZAPIER_NLA_API_KEY=your-zapier-key  # Get at: https://nla.zapier.com
```

## What Gets Enabled

Once configured, these AI workflows run automatically:

### Automated Workflows
- **AI Trend Discovery**: Every 4 hours
- **AI Content Creation**: Every 6 hours  
- **AI Performance Analysis**: Every 2 hours
- **Full AI Pipeline**: Daily at 8 AM

### 5 Specialized Agents
1. **TrendScout**: Discovers viral opportunities
2. **ContentAnalyzer**: Analyzes performance patterns
3. **ContentCreator**: Generates viral content
4. **PublishManager**: Optimizes distribution
5. **PerformanceTracker**: Monitors results

### 3 Agent Crews
1. **Discovery Crew**: Trend analysis + insights
2. **Creation Crew**: Content generation + optimization
3. **Publication Crew**: Scheduling + tracking

## API Endpoints

```bash
# Check agent system status
GET /api/agents/status

# Get agent configuration
GET /api/agents/config

# View AI-generated activities
GET /api/agents/activity
```

## Troubleshooting

### "Python agents not available"

**Check:**
1. `CREW_AGENT_URL` is set in `.env`
2. FastAPI service is running (`curl http://localhost:8002/health`)
3. Optional: legacy CLI path configured via `CREWAI_SCRIPT_PATH`

### "OPENROUTER_API_KEY not found"

**Solution:**
- Add your OpenRouter API key to `.env`
- The agents use Grok-4-fast via OpenRouter for reasoning
- Get key at: https://openrouter.ai/keys

### Agent workflows not running

**Check server logs:**
```bash
npm run dev
```

Look for:
- `🤖 Python CrewAI agents detected`
- `🤖 Enhanced AI workflows scheduled`

### Tool initialization errors

**Common causes:**
- Missing optional API keys (Serper, Tavily, etc.)
- These are optional - agents will work without them
- Add keys only if you want those specific tools

## Cost Considerations

### OpenRouter API Usage
- Agents use Grok-4-fast for reasoning (via OpenRouter)
- Automated workflows run on schedule
- Monitor usage at: https://openrouter.ai/activity

### Optimization Tips
- Start with just `OPENROUTER_API_KEY` (powers both base features and agents)
- Add search tools (Serper/Tavily) later if needed
- Adjust workflow schedules in `server/automation/ai_scheduler.ts`

## Testing Agent Execution

Test individual agent functions:

```python
# In Python REPL
from server.agents.viral_crew import viral_agent_system
import asyncio

# Test trend discovery
result = asyncio.run(
    viral_agent_system.discover_trends(
        platforms=['tiktok', 'youtube'],
        niches=['tech', 'education']
    )
)
print(result)
```

## Next Steps

1. ✅ Dependencies installed
2. ⏳ Launch FastAPI service: `uvicorn server.agents.api:app --reload --port 8002`
3. ⏳ Add `CREW_AGENT_URL` and `OPENROUTER_API_KEY` to `.env`
4. ⏳ Restart Node server (`npm run dev`)
5. ⏳ Verify with `/api/agents/status`
6. ⏳ Monitor automated workflows
7. ⏳ Add optional search tools as needed

## Support

- Agent logs: Check server console output
- Workflow logs: Look for `🤖` emoji in logs
- Debug mode: Set `verbose=True` in agents (already enabled)

---

**Ready to enable?** Launch the agent API and add `CREW_AGENT_URL` + `OPENROUTER_API_KEY` to your `.env`!
