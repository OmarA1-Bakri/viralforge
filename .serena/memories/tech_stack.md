# Tech Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) v5
- **UI Components**: shadcn/ui (Radix UI + TailwindCSS)
- **Styling**: TailwindCSS 3 + tailwindcss-animate
- **Forms**: React Hook Form + Zod validation
- **Animation**: Framer Motion
- **Mobile**: Capacitor 7 (iOS/Android support)

## Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js 4
- **Database**: PostgreSQL 16+ with Drizzle ORM
- **Session Store**: connect-pg-simple / memorystore
- **Authentication**: JWT + bcryptjs
- **Queue System**: BullMQ (Redis-based)
- **File Storage**: AWS S3 / Cloudflare R2
- **Video Processing**: FFmpeg (fluent-ffmpeg)

## AI & Automation
- **AI Router**: OpenRouter API (supports multiple models)
- **Agent System**: CrewAI (Python 3.11+)
- **Search Tools**: Serper API, Tavily API, Firecrawl API
- **Scheduling**: node-cron for automation workflows

## DevOps & Monitoring
- **Error Tracking**: Sentry
- **Analytics**: PostHog
- **Logging**: Pino with pino-pretty
- **Containerization**: Docker + docker-compose
- **Testing**: Jest + Supertest + Playwright

## Security
- **Middleware**: Helmet, CORS, express-rate-limit
- **Biometric Auth**: @aparajita/capacitor-biometric-auth
- **OAuth**: passport (Google OAuth)

## Development Tools
- **Type Safety**: TypeScript 5.6
- **Database Migrations**: Drizzle Kit
- **Module System**: ESM (type: "module")
- **Build**: esbuild for server, Vite for client
