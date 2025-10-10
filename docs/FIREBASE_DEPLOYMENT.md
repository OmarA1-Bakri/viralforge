# Firebase Deployment Guide 🔥

Complete guide for deploying ViralForge to Google Firebase (Hosting + Functions)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Debugging](#monitoring--debugging)
8. [Cost Optimization](#cost-optimization)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Node.js 20+ installed
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud account with billing enabled
- PostgreSQL database (Neon, Supabase, or Cloud SQL)
- Redis instance (Upstash, Railway, or Cloud Memorystore)

### Required API Keys
- OpenRouter API key (AI)
- YouTube Data API v3 key
- Stripe keys (if using payments)
- Google OAuth credentials (if using Google Sign-In)

---

## Architecture Overview

### Firebase Components

```
┌─────────────────────────────────────────────────────────┐
│                    Firebase Hosting                      │
│  https://viralforge-de120.web.app                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React App (Vite Build)                          │  │
│  │  - Static files served via CDN                   │  │
│  │  - Aggressive caching (1 year for assets)        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ /api/* requests
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Firebase Cloud Functions                   │
│  https://us-central1-viralforge-de120.                  │
│         cloudfunctions.net/api                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express.js Backend                              │  │
│  │  - Node.js 20 runtime                            │  │
│  │  - 1GiB memory, 540s timeout                     │  │
│  │  - Auto-scaling: 1-10 instances                  │  │
│  │  - Secrets from Google Secret Manager           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ├──▶ PostgreSQL (External)
                           ├──▶ Redis (External)
                           └──▶ External APIs (YouTube, OpenRouter, Stripe)
```

### Request Routing

1. **Frontend Assets** (`/*`)
   - Served directly from Firebase Hosting CDN
   - Cached aggressively (1 year for CSS/JS/images)
   - SPA fallback: All routes → `index.html`

2. **API Requests** (`/api/*`)
   - Routed to Firebase Function
   - Handled by Express.js backend
   - Auto-scaling based on traffic

---

## Initial Setup

### 1. Login to Firebase

```bash
firebase login
```

This will open a browser for Google authentication.

### 2. Verify Project

```bash
firebase projects:list
```

Should show: `viralforge-de120`

### 3. Select Project (if needed)

```bash
firebase use viralforge-de120
```

### 4. Initialize Firebase (Already Done)

The project is already configured with:
- `firebase.json` - Hosting and Functions configuration
- `.firebaserc` - Project ID
- `functions/` - Cloud Functions code

---

## Environment Configuration

### Required Secrets

Firebase Functions use Google Secret Manager for sensitive data. You must configure these secrets before deployment:

```bash
# Database
firebase functions:secrets:set DATABASE_URL
# Paste: postgresql://user:password@host:5432/database?sslmode=require

# Authentication
firebase functions:secrets:set SESSION_SECRET
# Paste: Random 64-character string

firebase functions:secrets:set JWT_SECRET
# Paste: Random 64-character string

# Google OAuth
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET

# Stripe
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# AI
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set OPENROUTER_API_KEY

# YouTube
firebase functions:secrets:set YOUTUBE_API_KEY
firebase functions:secrets:set YOUTUBE_CLIENT_ID
firebase functions:secrets:set YOUTUBE_CLIENT_SECRET

# Redis
firebase functions:secrets:set REDIS_HOST
firebase functions:secrets:set REDIS_PORT
firebase functions:secrets:set REDIS_PASSWORD  # If applicable
```

### Non-Secret Environment Variables

For non-sensitive configuration, update `functions/index.js` or set via:

```bash
firebase functions:config:set app.environment=production
```

---

## Deployment Process

### Option 1: One-Command Deployment (Recommended)

```bash
npm run deploy
```

This automated script will:
1. Generate Sass color variables
2. Build React frontend with Vite
3. Build Express backend for Firebase
4. Copy backend to `functions/app.js`
5. Install Firebase Functions dependencies
6. Deploy to Firebase Hosting + Functions

### Option 2: Step-by-Step Deployment

```bash
# 1. Build for Firebase
npm run build:firebase

# 2. Copy backend to functions
cp dist/firebase.js functions/app.js

# 3. Install function dependencies
cd functions
npm install
cd ..

# 4. Deploy
firebase deploy --only hosting,functions
```

### Option 3: Deploy Components Separately

```bash
# Deploy only frontend (fast updates)
npm run deploy:hosting

# Deploy only backend (when API changes)
npm run deploy:functions
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check hosting status
curl https://viralforge-de120.web.app

# Check API health
curl https://us-central1-viralforge-de120.cloudfunctions.net/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-10T00:00:00.000Z",
  "environment": "production"
}
```

### 2. Run Database Migrations

⚠️ **IMPORTANT**: Migrations must be run manually against your PostgreSQL database.

```bash
# If using Neon or remote PostgreSQL
export DATABASE_URL="your_database_url"
psql "$DATABASE_URL" -f migrations/0009_youtube_api_resilience.sql
psql "$DATABASE_URL" -f migrations/0010_fix_youtube_quota_constraint.sql
```

### 3. Test Critical Paths

```bash
# Test authentication
curl -X POST https://us-central1-viralforge-de120.cloudfunctions.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test YouTube API resilience
curl https://us-central1-viralforge-de120.cloudfunctions.net/api/youtube/quota-status
```

### 4. Configure Custom Domain (Optional)

```bash
# Add custom domain in Firebase Console
# Or via CLI:
firebase hosting:sites:create myapp
firebase target:apply hosting myapp myapp
```

---

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs (all functions)
firebase functions:log --only api

# Last 100 log entries
firebase functions:log --only api --limit 100

# Filter by severity
firebase functions:log --only api --severity error
```

### View Metrics

```bash
# List all functions with stats
firebase functions:list

# View function config
firebase functions:config:get
```

### Debug Locally

```bash
# Run Firebase emulators (hosting + functions)
firebase emulators:start

# Access locally:
# Frontend: http://localhost:5000
# Functions: http://localhost:5001/viralforge-de120/us-central1/api
```

### Performance Monitoring

1. Open [Firebase Console](https://console.firebase.google.com/project/viralforge-de120)
2. Go to **Functions** → Select `api` function
3. View:
   - Invocations per second
   - Execution time (p50, p95, p99)
   - Error rate
   - Memory usage

---

## Cost Optimization

### Firebase Hosting
- **Free Tier**: 10GB storage, 360MB/day transfer
- **Paid**: $0.026/GB storage, $0.15/GB transfer
- **Optimization**: CDN caching reduces bandwidth costs by 90%+

### Cloud Functions
- **Free Tier**: 2M invocations/month, 400K GB-seconds
- **Paid**: $0.40 per million invocations, $0.0000025/GB-second
- **Current Config**: 1GiB memory, 540s timeout
- **Optimization**:
  - 1 min instance = Reduced cold starts (-50% latency)
  - Proper caching in code reduces invocations
  - Bundle size optimization reduces memory usage

### Secret Manager
- **Cost**: $0.06 per secret per month, $0.03 per 10K accesses
- **Current**: ~15 secrets = $0.90/month

### Estimated Monthly Costs

| Traffic Level | Hosting | Functions | Secrets | Total |
|---------------|---------|-----------|---------|-------|
| Low (1K users) | Free | $5-10 | $1 | $6-11 |
| Medium (10K users) | $5 | $20-40 | $1 | $26-46 |
| High (100K users) | $20 | $100-200 | $2 | $122-222 |

**Savings Tips**:
1. Enable caching in Express middleware
2. Use Cloud CDN for static assets
3. Optimize function memory (current: 1GiB, test with 512MB)
4. Use Firebase Performance Monitoring to identify slow endpoints

---

## Troubleshooting

### Issue: "Deployment failed: Function failed to build"

**Cause**: TypeScript compilation or dependency errors

**Solution**:
```bash
# Check TypeScript errors
npm run check

# Test build locally
npm run build:firebase

# Check functions logs
cd functions
npm install
npm run build  # If build script exists
```

---

### Issue: "Function returned 503: Backend initialization failed"

**Cause**: Missing environment secrets or database connection failure

**Solution**:
```bash
# Verify secrets are set
firebase functions:secrets:access DATABASE_URL

# Check function logs
firebase functions:log --only api --limit 50

# Test database connection
curl https://us-central1-viralforge-de120.cloudfunctions.net/api/health
```

---

### Issue: "CORS errors in browser"

**Cause**: CORS middleware not configured for Firebase Functions domain

**Solution**: Already handled in `server/middleware/security.ts`:
```typescript
const corsMiddleware = cors({
  origin: [
    'https://viralforge-de120.web.app',
    'https://viralforge-de120.firebaseapp.com',
    'http://localhost:5173', // Vite dev
  ],
  credentials: true,
});
```

If still failing, add your custom domain to the whitelist.

---

### Issue: "Cold start latency (5-10s)"

**Cause**: Firebase Functions need to spin up new instances

**Solution**: Already optimized with `minInstances: 1` in `functions/index.js`:
```javascript
export const api = onRequest({
  minInstances: 1,  // Keep 1 instance warm
  maxInstances: 10,
  // ...
}, app);
```

**Cost**: Minimal (~$5-10/month for 1 warm instance)
**Benefit**: 90% reduction in cold start latency

---

### Issue: "Function timeout (540s exceeded)"

**Cause**: Long-running operations (video processing, AI analysis)

**Solutions**:
1. Move to background jobs (BullMQ + separate worker)
2. Increase timeout (max: 540s for HTTP functions)
3. Use Cloud Run for longer operations (max: 3600s)

---

### Issue: "Database connection pool exhausted"

**Cause**: Too many concurrent connections to PostgreSQL

**Solution**: Use connection pooling (already configured in Neon):
```typescript
// server/db.ts
import { neon } from '@neondatabase/serverless';

// Neon automatically pools connections
const sql = neon(process.env.DATABASE_URL!);
```

**Neon Limits**:
- Free: 1 concurrent connection
- Pro: 100+ concurrent connections

---

## Advanced Configuration

### Custom Function Regions

To deploy to multiple regions for lower latency:

```javascript
// functions/index.js
import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
  region: ['us-central1', 'europe-west1', 'asia-east1'],
});
```

**Note**: Multi-region increases costs proportionally.

---

### Scheduled Functions (Cron Jobs)

For automation (trend discovery, analysis):

```javascript
// functions/scheduled.js
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const hourlyTrendDiscovery = onSchedule({
  schedule: 'every 1 hours',
  timeZone: 'America/Los_Angeles',
}, async (event) => {
  // Run trend discovery
});
```

Deploy: `firebase deploy --only functions:hourlyTrendDiscovery`

---

## Security Checklist

Before going to production:

- [ ] All secrets configured in Secret Manager (not hardcoded)
- [ ] CORS configured with specific domains (no `*` wildcard in production)
- [ ] Rate limiting enabled (`server/middleware/security.ts`)
- [ ] HTTPS enforced (Firebase Hosting does this automatically)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Function IAM permissions restricted (only authenticated users can invoke)
- [ ] Environment variables validated on function startup

---

## Rollback Procedure

If deployment breaks production:

```bash
# View deployment history
firebase hosting:releases:list

# Rollback to previous release
firebase hosting:rollback

# View function versions
firebase functions:list

# Rollback specific function (not available via CLI)
# Must be done in Firebase Console → Functions → Version History
```

---

## Next Steps

1. **Set up monitoring**: [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
2. **Configure alerts**: [Cloud Monitoring Alerts](https://console.cloud.google.com/monitoring)
3. **Optimize costs**: Review function memory and timeout after 1 week
4. **Custom domain**: Add `app.viralforge.ai` in Firebase Console
5. **CDN**: Enable Cloud CDN for global distribution

---

**Deployment complete!** 🎉

Your app is now live on Google Cloud infrastructure with:
- ✅ Global CDN distribution
- ✅ Auto-scaling backend
- ✅ Secure secret management
- ✅ 99.95% SLA uptime

Monitor at: https://console.firebase.google.com/project/viralforge-de120
