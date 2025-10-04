# Code Style & Conventions

## TypeScript Configuration
- **Module System**: ESM (import/export, not require)
- **Strict Mode**: Enabled
- **Type Safety**: Full TypeScript with no implicit any
- **Path Aliases**: 
  - `@/*` → `./client/src/*`
  - `@shared/*` → `./shared/*`

## File Naming
- **React Components**: PascalCase (e.g., `CreatorDashboard.tsx`)
- **Utilities/Libs**: camelCase (e.g., `queryClient.ts`)
- **Routes/API**: kebab-case directories, camelCase files
- **Database**: snake_case for migrations

## Code Structure
- **Client**: `client/src/` - React frontend
- **Server**: `server/` - Express backend
- **Shared**: `shared/` - Common types/schemas
- **Components**: Use functional components with hooks
- **State**: TanStack Query for server state, useState/useContext for local

## React Patterns
- Use functional components exclusively
- Hooks-based state management
- React Hook Form + Zod for forms
- shadcn/ui components for UI
- Tailwind for styling (avoid inline styles)
- Proper TypeScript typing for props

## Backend Patterns
- Express routes organized by feature
- Middleware for auth, validation, security
- Drizzle ORM for database queries
- Proper error handling with try/catch
- Structured logging with Pino
- Input validation with express-validator or Zod

## Database Schema
- Drizzle ORM with PostgreSQL
- Schema defined in TypeScript
- Use migrations for schema changes
- Proper indexing for performance

## API Design
- RESTful endpoints
- Consistent error responses
- JWT authentication
- Rate limiting on all endpoints
- Proper HTTP status codes

## Error Handling
- Always use try/catch in async code
- Return proper error messages
- Log errors with context
- Don't expose internal errors to client

## Security
- Never commit secrets
- Use environment variables
- Validate all inputs
- Rate limit all endpoints
- Helmet for security headers
- CORS properly configured

## Git Workflow
- Meaningful commit messages
- Feature branches
- Small, focused commits
- Test before committing
