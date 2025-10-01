# ViralForge AI 🚀

Mobile-first viral content creation platform powered by AI multi-agent automation.

## Features

### 🎯 Idea Lab
- **AI Trend Discovery**: Real-time trending content across TikTok, YouTube, Instagram
- **Smart Recommendations**: Personalized trends based on your niche and audience
- **Platform Intelligence**: Direct API integration for live trend data

### 🚀 Launch Pad
- **Content Analysis**: AI-powered optimization for titles and thumbnails
- **Viral Score**: Predictive scoring for clickability, clarity, intrigue, emotion
- **Actionable Feedback**: Specific suggestions to maximize engagement
- **Roast Mode**: Brutally honest analysis for serious creators

### 📹 Multiplier
- **AI Video Clipping**: Automatically identify viral-worthy segments
- **Smart Timestamps**: Optimal clip start/end times for each platform
- **Viral Potential**: Score each clip's likelihood of going viral
- **Platform Optimization**: Customized for TikTok, YouTube Shorts, Reels

### 📊 Analytics Dashboard
- **Performance Tracking**: Views, engagement, viral metrics
- **Automated Insights**: AI-generated performance recommendations
- **Activity Feed**: Real-time updates on AI processes

### 🤖 CrewAI Multi-Agent System (Optional)
- **5 Specialized Agents**: Each with unique expertise and tools
- **Intelligent Workflows**: Automated trend discovery, content creation, performance optimization
- **Knowledge Base**: Learns from viral patterns and platform guidelines
- **Scheduled Automation**: Auto-runs workflows at optimal times

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Python 3.11+ (optional, for AI agents)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd viralforge

# Install Node.js dependencies
npm install

# Install Python dependencies (optional, for AI agents)
pip3 install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Configuration

### Required Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/viralforge
JWT_SECRET=your-super-secret-key
OPENROUTER_API_KEY=your_openrouter_key
```

### Optional AI Agent Setup

To enable the CrewAI multi-agent system:

```env
CREWAI_SCRIPT_PATH=server/agents/viral_crew.py
OPENAI_API_KEY=your_openai_key
SERPER_API_KEY=your_serper_key  # For Google search
TAVILY_API_KEY=your_tavily_key  # For advanced search
FIRECRAWL_API_KEY=your_firecrawl_key  # For web crawling
```

### Platform Integration (Optional - Real Data)

To enable real platform data instead of AI fallbacks:

```env
# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_oauth_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:5000/api/oauth/youtube/callback

# Cloudflare R2 for file storage
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET=viralforge-uploads
```

### Analytics (Optional)

```env
POSTHOG_API_KEY=your_posthog_key
```

## Architecture

### Tech Stack
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Mobile**: Capacitor (iOS/Android)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: CrewAI (Python) + OpenRouter API
- **Analytics**: PostHog

### AI Agent System

When enabled, the CrewAI system provides:

**Agents:**
1. **TrendScout**: Discovers viral opportunities
2. **ContentAnalyzer**: Analyzes performance patterns
3. **ContentCreator**: Generates viral content
4. **PublishManager**: Optimizes distribution
5. **PerformanceTracker**: Monitors results

**Workflows:**
- Trend Discovery (every 4 hours)
- Content Creation (every 6 hours)
- Performance Analysis (every 2 hours)
- Full Pipeline (daily at 8 AM)

## API Documentation

### Authentication

```typescript
POST /api/auth/register  // Create account
POST /api/auth/login     // Login
GET  /api/auth/me        // Get current user
```

### Trends

```typescript
POST /api/trends/discover           // Discover new trends
GET  /api/trends                    // Get all trends
GET  /api/trends/personalized       // Get personalized trends
POST /api/trends/:id/action         // Save/like/use trend
```

### Content Analysis

```typescript
POST /api/content/analyze           // Analyze title/thumbnail
GET  /api/content/history           // Get analysis history
GET  /api/content/:id/analysis      // Get specific analysis
```

### Video Processing

```typescript
POST /api/videos/process            // Process video into clips
GET  /api/videos/:id/clips          // Get clips for video
GET  /api/clips/:id                 // Get clip details
PUT  /api/clips/:id                 // Update clip
```

### AI Agents (when enabled)

```typescript
GET  /api/agents/status             // Agent system status
GET  /api/agents/config             // Configuration details
GET  /api/agents/activity           // AI-generated activities
```

### Dashboard

```typescript
GET  /api/dashboard/stats           // Performance statistics
GET  /api/dashboard/insights        // AI insights
GET  /api/dashboard/activity        // Recent activity
```

## Development

### Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes to database
```

### Mobile Development

```bash
# Start dev server with mobile support
./mobile-dev.sh

# Or manually:
npx cap sync
npx cap open android  # For Android
npx cap open ios      # For iOS
```

## Testing

```bash
# Test database connection
npm run db:test

# Test AI integration (requires Python setup)
python3 server/agents/viral_crew.py
```

## Production Deployment

### Using Docker

```bash
# Build and deploy
docker-compose up -d

# Check logs
docker-compose logs -f app

# Scale services
docker-compose up -d --scale app=3
```

### Manual Deployment

1. Setup PostgreSQL database
2. Configure environment variables
3. Run migrations: `npm run db:push`
4. Build: `npm run build`
5. Start: `npm start`

## Monitoring

### Agent System
- Check `/api/agents/status` for system health
- View `/api/agents/activity` for AI-generated insights
- Monitor logs for workflow execution

### Performance
- PostHog dashboard for user analytics
- `/api/cache/stats` for AI token savings
- `/api/health` for service status

## Troubleshooting

### AI Agents Not Running
1. Check `CREWAI_SCRIPT_PATH` is set
2. Verify Python dependencies: `pip3 list | grep crewai`
3. Check logs for Python errors
4. Test script directly: `python3 server/agents/viral_crew.py`

### Database Issues
1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL is running
3. Run migrations: `npm run db:push`

### Build Errors
1. Run type check: `npm run check`
2. Clear cache: `rm -rf .cache node_modules`
3. Reinstall: `npm install`

## Contributing

See `IMPLEMENTATION_PLAN.md` for development roadmap.

## License

MIT
