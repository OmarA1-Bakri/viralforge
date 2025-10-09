# ViralForge - CrewAI Standard Structure Migration

## ✅ COMPLETED: Standard CrewAI YAML Scaffolding

The project has been successfully migrated to the standard CrewAI structure with YAML configuration files.

## 📁 New Project Structure

```
viralforge/
├── .env                              # Environment variables & feature flags
├── .venv/                           # Virtual environment (created by crewai install)
├── pyproject.toml                   # Project configuration for CrewAI CLI
├── requirements.txt                 # Python dependencies
├── knowledge/                       # Knowledge base (existing)
│   ├── viral_patterns.md
│   ├── platform_guidelines.md
│   └── content_strategies.md
└── src/
    └── viralforge/
        ├── __init__.py
        ├── main.py                  # Entry point (run/train/test)
        ├── crew.py                  # Crew orchestration (@CrewBase)
        ├── tools/
        │   ├── __init__.py
        │   └── youtube_rag_tools.py # YouTube RAG tools
        └── config/
            ├── agents.yaml          # 5 YouTube-focused agents
            └── tasks.yaml           # 6 sequential tasks
```

## 🎯 What Changed

### ✅ Phase 1: Infrastructure Fixes (Completed)
1. **Knowledge Injection Bug Fixed** - All agents now have `knowledge_sources` parameter
2. **Service Health Checks Added** - Prevents silent failures when crew-social-tools is down
3. **Feature Flag Architecture** - Safe rollout/rollback via environment variables

### ✅ Phase 2: CrewAI Tools (Completed)
1. **Installed `crewai[tools]`** - Includes YouTube RAG tools
2. **Created YouTube Tool Wrappers** - `YouTubeRAGVideoTool` and `YouTubeRAGChannelTool`
3. **API Key Configuration** - OpenAI key required for embeddings

### ✅ RESTRUCTURE: Standard YAML Scaffolding (Completed)
1. **Created Standard Structure** - `src/viralforge/` with proper package layout
2. **YAML Configs** - `agents.yaml` and `tasks.yaml` define all agents and tasks
3. **Crew Orchestration** - `crew.py` uses `@CrewBase`, `@agent`, `@task`, `@crew` decorators
4. **Entry Points** - `main.py` with run/train/replay/test functions
5. **pyproject.toml** - Enables `crewai install` and `crewai run` commands

## 🎬 YouTube-Focused Agents (5 Total)

All agents defined in `src/viralforge/config/agents.yaml`:

1. **trend_scout** - Discovers trending YouTube videos and viral opportunities
2. **content_analyzer** - Analyzes retention patterns and provides optimization insights
3. **content_creator** - Creates viral-ready YouTube content packages
4. **publish_manager** - Optimizes scheduling and distribution strategies
5. **performance_tracker** - Monitors metrics and provides improvement recommendations

## 📋 Workflow Tasks (6 Total)

All tasks defined in `src/viralforge/config/tasks.yaml`:

1. **discover_youtube_trends** - Find trending content and viral patterns
2. **analyze_youtube_performance** - Identify what makes content succeed
3. **create_youtube_content** - Generate complete content packages
4. **optimize_youtube_content** - Review and improve viral potential
5. **plan_youtube_publication** - Create distribution strategy
6. **setup_performance_tracking** - Set up monitoring framework

## 🎛️ Feature Flags

Configure in `.env`:

```bash
# YouTube-Only Mode (default: true for this branch)
FEATURE_FLAGS__YOUTUBE_ONLY_MODE=true

# Use CrewAI YouTube RAG Tools (default: true)
FEATURE_FLAGS__USE_CREWAI_YOUTUBE_TOOLS=true

# Service Health Checks (default: true)
FEATURE_FLAGS__ENABLE_SERVICE_HEALTH_CHECKS=true

# Inject Knowledge Sources (default: true)
FEATURE_FLAGS__INJECT_KNOWLEDGE_SOURCES=true
```

## 🔑 Required API Keys

```bash
# OpenRouter (for Grok-4-fast LLM)
OPENROUTER_API_KEY=your_key_here

# OpenAI (for YouTube RAG tool embeddings)
OPENAI_API_KEY=your_key_here
# OR
CHROMA_OPENAI_API_KEY=your_key_here
```

## 🚀 Running the Crew

### Standard CrewAI Commands:

```bash
# Install dependencies
crewai install

# Run the full workflow
crewai run

# Train the crew
crewai train 10

# Test the crew
crewai test 3
```

### Direct Python Execution:

```bash
# Run
python src/viralforge/main.py

# Or with virtual environment
source .venv/bin/activate
python -m viralforge.main
```

## 📊 Migration Status

| Phase | Status | Hours |
|-------|--------|-------|
| Phase 1: Infrastructure Fixes | ✅ Complete | 3h |
| Phase 2: YouTube Tools Setup | ✅ Complete | 2h |
| RESTRUCTURE: YAML Scaffolding | ✅ Complete | 3h |
| Phase 3: Knowledge Base Rewrite | ⏸️ Pending | 10h |
| Phase 4: Agent YouTube Conversion | ⏸️ Pending | 8h |
| Phase 5: Testing & Validation | ⏸️ Pending | 8h |

**Total Progress: 8/38 hours (21% complete)**

## 🎯 Next Steps

Since the structure is now properly set up, the remaining work is:

1. **Phase 3: Knowledge Base** - Rewrite `viral_patterns.md` for YouTube-specific patterns
2. **Phase 4: Agent Refinement** - Ensure agents use YouTube RAG tools effectively  
3. **Phase 5: Testing** - Create unit/integration tests and validate output quality

## 🔄 Legacy vs New Structure

### Old Structure (Python-based):
```
server/agents/viral_crew.py  # Agents defined in Python code
```

### New Structure (YAML-based):
```
src/viralforge/config/agents.yaml  # Agents defined declaratively
src/viralforge/crew.py              # Orchestration with decorators
```

The new structure follows CrewAI best practices and enables CLI tools like `crewai run`.

## 📝 Key Benefits

1. **Standard Structure** - Follows official CrewAI conventions
2. **CLI Support** - `crewai install`, `crewai run`, `crewai train` all work
3. **YAML Configs** - Easier to modify agents/tasks without changing code
4. **Feature Flags** - Safe rollout and instant rollback capabilities
5. **YouTube-Focused** - All agents/tasks optimized for YouTube viral content

---

**Migration completed on**: October 9, 2025
**CrewAI Version**: 0.203.0
**Python Version**: 3.11.12
