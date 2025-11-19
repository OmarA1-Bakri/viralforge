# ViralForge AI - Production Hardening Plan (Option B)

**Goal:** Ship full platform with real uploads, video processing, platform OAuth, security hardening, and mobile features in 2 weeks.

## Week 1: Core Infrastructure & Security

### Day 1-2: Security Hardening

**Rate Limiting**
- Add express-rate-limit middleware
- Per-route limits: 100/15min general, 10/min AI analysis, 5/min uploads
- Per-user quotas stored in Redis
- IP-based + user-based rate limiting

**Input Validation**
- Add zod validation to all API endpoints
- File upload constraints: max 100MB videos, 10MB images
- MIME type validation, file signature checking
- Sanitize all user inputs

**Security Headers & CORS**
- Add helmet middleware
- Configure CORS whitelist
- Add CSRF protection tokens
- Implement CSP headers

**JWT Improvements**
- Add refresh token flow
- Implement token rotation
- Add token blacklist in Redis
- Short-lived access tokens (15min), long-lived refresh (7 days)

**Secrets Management**
- Move to environment-based secrets
- Add .env.production template
- Document all required env vars
- Add secrets validation on startup

### Day 3-4: Monitoring & Observability

**Error Tracking**
- Integrate Sentry for error tracking
- Add source maps upload
- Configure error sampling and filtering
- Add user context to errors

**Application Performance Monitoring**
- Add metrics collection (response times, throughput)
- Instrument database queries
- Track AI API call latency and costs
- Add performance budgets

**Health Checks**
- Implement /health endpoint (liveness)
- Implement /ready endpoint (readiness)
- Check database, Redis, file storage connectivity
- Add dependency health checks

**Structured Logging**
- Add Winston or Pino logger
- Structured JSON logs
- Log levels (error, warn, info, debug)
- Request ID tracing

### Day 5: Testing Infrastructure

**Unit Tests**
- Setup Jest + ts-jest
- Test critical business logic:
  - AI analysis service
  - Success pattern service
  - Auth utilities
  - Storage layer
- Target 60% coverage minimum

**Integration Tests**
- Test API endpoints with supertest
- Mock external services (OpenRouter, platforms)
- Test authentication flows
- Test file upload flows

**E2E Tests**
- Setup Playwright
- Critical user flows:
  - Sign up → analyze content → view results
  - Discover trends → save trend
  - Upload video → generate clips
- Mobile viewport testing

**CI/CD Pipeline**
- GitHub Actions workflow
- Run tests on PR
- Type checking gate
- Build verification
- Deploy preview environments

## Week 2: File Storage, Video Processing & Platform Integration

### Day 6-7: Real File Storage

**Object Storage Setup**
- Choose provider: Cloudflare R2 (recommended) or AWS S3
- Setup buckets: uploads, thumbnails, videos, clips
- Configure CDN for public assets
- Implement pre-signed URLs for uploads

**Upload Pipeline**
- Multipart upload for large files
- Client-side chunking
- Server-side validation and virus scanning
- Generate thumbnails on upload (sharp library)
- Store metadata in database

**File Serving**
- Implement signed URL generation
- CDN integration for public files
- Streaming for video playback
- Thumbnail variants (small, medium, large)

### Day 8-9: Video Processing Pipeline

**Job Queue Setup**
- Setup BullMQ + Redis
- Create queues: video-processing, clip-generation, thumbnail-generation
- Implement workers with concurrency limits
- Add retry logic and dead letter queue

**FFmpeg Integration**
- Install FFmpeg in Docker container
- Implement video transcoding (H.264, various bitrates)
- Scene detection for clip suggestions
- Audio waveform analysis
- Generate preview thumbnails

**Clip Generation**
- Combine AI suggestions with scene detection
- Extract clips based on timestamps
- Transcode for each platform (TikTok 9:16, YouTube 16:9, etc.)
- Add platform-specific optimizations

**Progress Tracking**
- Real-time job status updates
- WebSocket or SSE for progress notifications
- Estimated time remaining
- Detailed error messages

### Day 10: Platform API Integration

**OAuth Setup**
- Implement OAuth2 flow for each platform
- TikTok OAuth (pending approval)
- YouTube OAuth (Google API)
- Instagram OAuth (Meta API)
- Store tokens securely (encrypted)

**YouTube Integration**
- YouTube Data API v3 integration
- Fetch channel analytics
- Get video performance metrics
- Trending videos by category
- Channel recommendations

**TikTok Integration**
- TikTok Research API (if approved)
- Fallback to web scraping (legal compliance)
- Trending hashtags and sounds
- Creator metrics
- Content discovery

**Instagram Integration**
- Instagram Graph API
- Account insights
- Reels performance
- Trending audio

**Data Sync**
- Periodic sync jobs for user analytics
- Cache platform data (1-hour TTL)
- Webhook listeners for real-time updates

### Day 11: Mobile Native Features

**Offline Support**
- IndexedDB for local storage
- Service worker for offline detection
- Queue failed requests for retry
- Sync when back online

**Push Notifications**
- Capacitor Push Notifications plugin
- Firebase Cloud Messaging setup
- Notification types:
  - Video processing complete
  - Trending opportunity detected
  - High viral potential content
  - Weekly performance summary

**Native Upload**
- Use Capacitor Filesystem
- Background upload support
- Progress indicators
- Upload queue management

**Enhanced Camera**
- Video recording with preview
- Trim and edit before upload
- Apply filters and effects
- Direct upload to processing queue

### Day 12-13: Performance & Scalability

**Database Optimization**
- Add indexes on hot queries:
  - userContent(userId, createdAt)
  - trends(platform, createdAt)
  - userAnalytics(userId, recordedAt)
  - contentAnalysis(contentId)
- Query optimization review
- Connection pooling configuration

**Caching Strategy**
- Redis for session storage
- Cache AI responses (already done)
- Cache platform API responses
- Cache user preferences
- Implement cache invalidation

**API Optimization**
- Add response compression (gzip/brotli)
- Implement pagination on all list endpoints
- Add cursor-based pagination for infinite scroll
- Lazy load related data

**Load Testing**
- k6 load test scripts
- Test concurrent users: 100, 500, 1000
- Identify bottlenecks
- Set performance SLOs:
  - p50 < 200ms
  - p95 < 500ms
  - p99 < 1000ms

### Day 14: Final Polish & Deployment

**Documentation**
- API documentation (OpenAPI/Swagger)
- Deployment runbook
- Troubleshooting guide
- Environment setup guide
- User documentation updates

**Deployment Setup**
- Production Docker images
- Kubernetes manifests (or Railway/Render config)
- Database migrations strategy
- Blue-green deployment setup
- Rollback procedures

**Monitoring & Alerts**
- Setup alerts in Sentry
- Create dashboards:
  - API performance
  - Error rates
  - AI token usage & costs
  - User activity
- On-call rotation setup

**Final Testing**
- Smoke tests on staging
- Security audit
- Performance verification
- Mobile device testing (iOS + Android)
- User acceptance testing

**Launch Checklist**
- [ ] All tests passing
- [ ] Performance SLOs met
- [ ] Security audit complete
- [ ] Monitoring and alerts configured
- [ ] Backups verified
- [ ] Documentation complete
- [ ] Rollback plan tested
- [ ] Support team trained
- [ ] Privacy policy and ToS ready

## Implementation Priority Order

1. **Security (Days 1-2)** - Critical, prevents exploits
2. **Monitoring (Days 3-4)** - Critical, know when things break
3. **Testing & CI (Day 5)** - Critical, prevent regressions
4. **File Storage (Days 6-7)** - High, core feature
5. **Video Processing (Days 8-9)** - High, core feature
6. **Platform APIs (Day 10)** - High, core feature
7. **Mobile Features (Day 11)** - Medium, improves UX
8. **Performance (Days 12-13)** - Medium, handles scale
9. **Polish & Deploy (Day 14)** - High, go live!

## Risk Mitigation

**High Risk Items:**
- TikTok API approval pending → Use web scraping fallback
- FFmpeg complexity → Start with simple clips, iterate
- Platform rate limits → Implement aggressive caching

**Rollback Strategy:**
- Feature flags for all new features
- Database migrations with down scripts
- Blue-green deployment for zero downtime
- Canary releases (5% → 50% → 100%)

## Success Metrics

**Technical:**
- 0 critical security vulnerabilities
- >95% uptime
- <500ms p95 API response time
- >70% test coverage

**Business:**
- Users can upload and process videos
- Real platform data integration working
- Mobile app fully functional
- No data loss or corruption

## Post-Launch (Week 3+)

- Monitor error rates and performance
- Gather user feedback
- Prioritize bug fixes
- Plan feature iteration
- Scale infrastructure as needed
