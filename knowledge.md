# ViralForge AI - Project Knowledge

## Mission
ViralForge AI is a mobile-first viral content creation platform that helps creators generate trending content across TikTok, YouTube, and Instagram using AI-powered multi-agent automation.

## Tech Stack
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Mobile**: Capacitor for iOS/Android
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: CrewAI multi-agent system (Python) + OpenRouter API
- **Analytics**: PostHog
- **Auth**: Biometric authentication with @aparajita/capacitor-biometric-auth

## Architecture

### Multi-Agent System
The project uses CrewAI for viral content automation:
- **Trend Discovery Agent**: Analyzes platform trends
- **Content Strategy Agent**: Creates viral content strategies
- **Video Processing Agent**: Handles video editing and optimization
- **Scheduling Agent**: Optimizes posting times

Python agents in `server/agents/` are integrated with TypeScript via `server/automation/ai_scheduler.ts`.

### Development Workflow
- Use `npm run dev` to start the full-stack development server
- Mobile development: Use `./mobile-dev.sh` script for Android/iOS
- The server runs on port 5000, Vite dev server proxies API requests

### Environment Variables
**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing (change in production!)

**Optional (AI Features):**
- `CREWAI_SCRIPT_PATH` - Path to Python CrewAI script (enables AI agents)
- `OPENROUTER_API_KEY` - OpenRouter API key for AI completions
- `POSTHOG_API_KEY` - PostHog analytics key
- `SERPER_API_KEY`, `TAVILY_API_KEY`, `FIRECRAWL_API_KEY` - For CrewAI tools

### Key Directories
- `client/src/`: React frontend code
- `server/`: Express backend with routes, agents, automation
- `shared/`: Shared TypeScript schemas (Drizzle)
- `knowledge/`: Domain knowledge files for AI agents

## Important Notes

### Mobile Development
- Always test biometric auth on real devices (doesn't work in emulators)
- Use secure storage for sensitive data via `client/src/lib/mobileStorage.ts`
- PostHog analytics configured for mobile tracking

### AI Integration
- OpenRouter API used for AI completions (not OpenAI directly)
- Caching system in `.cache/ai/` for performance
- Python CrewAI agents communicate with TypeScript via child processes

### Database
- Use Drizzle migrations in `migrations/`
- Schema defined in `shared/schema.ts`
- Storage layer in `server/storage.ts` (with PostgreSQL implementation in `server/storage-postgres.ts`)

### Style Guidelines
- Dark theme with cyan/pink accent colors
- Mobile-first responsive design
- Use shadcn/ui components consistently
- Follow the design guidelines in `design_guidelines.md`

## AI Agent System

### CrewAI Multi-Agent Platform
The agentic-branch includes a full CrewAI multi-agent system:
- **5 Specialized Agents**: TrendScout, ContentAnalyzer, ContentCreator, PublishManager, PerformanceTracker
- **Intelligent Workflows**: Trend discovery, content creation, performance analysis, full pipeline
- **Knowledge Base**: Domain expertise in viral_patterns.md, platform_guidelines.md, content_strategies.md

### Enabling AI Agents
1. Install Python dependencies: `pip3 install -r requirements.txt`
2. Set environment variable: `CREWAI_SCRIPT_PATH=server/agents/viral_crew.py`
3. Configure API keys (see .env.example)
4. Restart server - AI workflows will auto-schedule

### Agent Monitoring
- Status: `GET /api/agents/status`
- Config: `GET /api/agents/config`
- Activity: `GET /api/agents/activity`

## Common Tasks

### Adding New Features
1. Define schema in `shared/schema.ts`
2. Create migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`
4. Add API routes in `server/routes/`
5. Create UI components in `client/src/components/`

### Running Tests
- Type checking: `npm run typecheck`
- Build check: `npm run build`

### Debugging
- Backend logs to console
- Frontend uses React DevTools
- Mobile logs: Use native debugging tools or browser_logs tool
