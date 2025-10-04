# Task Completion Checklist

## Before Committing Code

### 1. Type Check
```bash
npm run check
```
Ensure no TypeScript errors exist.

### 2. Build Test
```bash
npm run build
```
Verify the build completes successfully.

### 3. Run Tests (if applicable)
```bash
npm test
```
Ensure all tests pass.

### 4. Manual Testing
- Test the feature in the browser
- Check mobile view (responsive)
- Test error cases
- Verify API responses

### 5. Security Check
- No hardcoded secrets
- Input validation in place
- Rate limiting considered
- Authentication/authorization correct

### 6. Code Quality
- No console.logs left behind (use logger)
- Proper error handling
- Clean code structure
- Comments where needed

### 7. Database Changes
If schema changed:
```bash
npm run db:push
```

### 8. Git
```bash
git add .
git commit -m "meaningful message"
git push
```

## Production Deployment Checklist

### 1. Environment Variables
- All required env vars set
- Secrets properly secured
- Database URL correct

### 2. Database Migrations
```bash
npm run db:push
```

### 3. Build
```bash
npm run build
```

### 4. Health Check
- Test `/api/health` endpoint
- Verify database connection
- Check AI system status (`/api/agents/status`)

### 5. Monitoring
- Sentry configured
- PostHog tracking active
- Logs being captured

### 6. Performance
- Rate limits configured
- Caching enabled
- CDN for static assets

### 7. Mobile
```bash
npx cap sync
```
If mobile changes were made.
