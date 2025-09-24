# CreatorKit AI

## Overview

CreatorKit AI is a mobile-first content creation platform designed specifically for TikTok and YouTube creators. The application consolidates the entire content lifecycle into a single AI-powered toolkit with three core modules: Idea Lab (trend discovery), Launch Pad (content optimization), and Multiplier (video processing). Built with a modern tech stack emphasizing automation and creator workflow optimization, the platform aims to become the essential daily co-pilot for content creators seeking to accelerate their creative process.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript in a single-page application architecture
- **Styling**: Tailwind CSS with a comprehensive design system based on shadcn/ui components
- **Mobile-First Design**: Optimized for thumb navigation with TikTok-inspired vertical feed UI
- **Component Library**: Modular component system with reusable UI primitives (cards, badges, buttons, progress indicators)
- **Build System**: Vite for fast development and optimized production builds
- **State Management**: TanStack Query for server state management and caching

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with structured error handling and logging middleware
- **Processing Pipeline**: Asynchronous job processing for AI-intensive tasks like trend discovery and video analysis

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL with WebSocket connections
- **Schema Design**: Comprehensive relational model covering users, trends, user interactions, content analysis, and video processing jobs
- **Migration System**: Drizzle Kit for database schema versioning and migrations

### Authentication and Authorization
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **User Model**: Simple username-based system with UUID primary keys
- **Security**: Environment-based configuration with secure session handling

### AI Integration Architecture
- **Primary AI Provider**: OpenRouter service acting as a unified gateway to multiple AI models
- **Target Model**: Grok (via OpenRouter) for trend analysis, content optimization, and video processing
- **Service Pattern**: Centralized AI service layer with structured request/response interfaces
- **Processing Types**: 
  - Trend discovery with platform-specific analysis
  - Content analysis with scoring algorithms
  - Video processing with clip generation and hook suggestions

### External Dependencies

- **AI Services**: OpenRouter API for accessing Grok and other LLMs
- **Database**: Neon serverless PostgreSQL
- **Frontend Libraries**: 
  - Radix UI primitives for accessible components
  - Lucide React for consistent iconography
  - Class Variance Authority for component variants
  - React Hook Form with Zod validation
- **Development Tools**:
  - Replit-specific plugins for development environment
  - ESBuild for production bundling
  - PostCSS with Autoprefixer for CSS processing

### Design System Integration
- **Color Scheme**: Dual-mode support (light/dark) with purple-primary branding
- **Typography**: Inter for primary text, JetBrains Mono for AI processing states
- **Component Consistency**: Standardized spacing, elevation, and interaction patterns
- **Mobile Optimization**: Touch-friendly interfaces with bottom navigation and card-based layouts