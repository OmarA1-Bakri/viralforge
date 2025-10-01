# ViralForge Build Fix & AI Integration Plan

## Phase 1: Fix Main Branch (Priority: Critical)

### 1.1 Storage Schema Alignment (2-3 hours)
**Objective:** Fix all Drizzle ORM type mismatches between schema definitions and usage

**Tasks:**
1. Review `shared/schema.ts` and document current schema structure
2. Audit all storage method calls in:
   - `server/storage.ts` (2 errors)
   - `server/storage-postgres.ts` (3 errors)
   - `server/automation/scheduler.ts` (multiple schema mismatches)
   - `server/automation/notifications.ts` (metadata type errors)
3. Fix user creation schema - add `createdAt` default value
4. Fix analytics schema - ensure `views`, `likes`, `shares`, `comments` are required fields
5. Fix user activity metadata type - create proper interface for metadata instead of `unknown`
6. Update Drizzle schema or fix call sites to match
7. Run `npm run check` after each fix to verify

**Acceptance Criteria:**
- All storage-related TypeScript errors resolved
- `npm run check` shows 0 errors in storage files

### 1.2 Component Type Fixes (30 min)
**Objective:** Fix remaining component type errors

**Tasks:**
1. Fix `BottomTabNavigation.tsx` - add "preferences" to tab type union
2. Verify all UI components compile without errors

**Acceptance Criteria:**
- `npm run check` passes with 0 errors
- Build completes successfully with `npm run build`

### 1.3 Production Readiness (1 hour)
**Objective:** Ensure main branch is production-ready

**Tasks:**
1. Update `.gitignore` to exclude:
   - `.cache/`
   - `server.pid`
   - `*.log`
2. Remove or commit `mobile-dev.sh` script
3. Verify environment variables are documented
4. Test dev server startup: `npm run dev`
5. Test production build: `npm run build && npm start`
6. Create git commit with all fixes: "fix: resolve TypeScript build errors"

**Acceptance Criteria:**
- Clean git status (no uncommitted generated files)
- Dev server starts without errors
- Production build succeeds
- All tests pass (if tests exist)

## Phase 2: Prepare AI Integration (Priority: High)

### 2.1 Architecture Planning (1 hour)
**Objective:** Design clean integration strategy for CrewAI agents

**Tasks:**
1. Document current architecture in `docs/architecture.md`
2. Design microservice architecture for Python agents:
   - Separate Python service with REST API
   - Docker container for Python environment
   - Environment-agnostic configuration
3. Define API contract between TypeScript and Python
4. Create integration checklist

**Deliverables:**
- Architecture diagram
- API specification document
- Migration strategy document

### 2.2 Clean Agentic Branch (2 hours)
**Objective:** Prepare agentic-branch code for integration

**Tasks:**
1. Merge main branch fixes into agentic-branch
2. Remove hardcoded paths:
   - Replace `/home/omar/viralforge/` with `process.cwd()` or env vars
   - Use relative imports
3. Fix Python agent integration:
   - Create environment variable for Python script paths
   - Add error handling for missing Python environment
   - Improve fallback mechanism
4. Update `server/routes/agents.ts`:
   - Remove mock implementations
   - Connect to real agent system OR remove endpoints
5. Document Python dependencies in `requirements.txt`
6. Test Python agent system independently

**Acceptance Criteria:**
- No hardcoded absolute paths
- Environment-agnostic configuration
- All TypeScript errors fixed
- Python scripts executable from any directory

## Phase 3: Incremental AI Integration (Priority: Medium)

### 3.1 Infrastructure Setup (3-4 hours)
**Objective:** Create production-ready Python service infrastructure

**Tasks:**
1. Create `docker/` directory with:
   - `Dockerfile.python-agents` - Python service container
   - `docker-compose.yml` - Full stack orchestration
2. Create Python REST API service:
   - FastAPI or Flask app in `server/agents/api/`
   - Endpoints matching `server/routes/agents.ts` expectations
   - Health check endpoint
   - Authentication middleware
3. Update TypeScript bridge:
   - Replace `child_process` with HTTP requests
   - Add connection pooling
   - Add retry logic with exponential backoff
   - Add circuit breaker pattern
4. Add environment variables:
   - `PYTHON_AGENT_SERVICE_URL`
   - `PYTHON_AGENT_API_KEY`
   - `PYTHON_AGENT_TIMEOUT`

**Deliverables:**
- Docker setup for local development
- Python API service
- Updated TypeScript integration layer

### 3.2 Agent System Integration (2-3 hours)
**Objective:** Integrate CrewAI agents into main branch

**Tasks:**
1. Create feature branch: `feature/ai-agents`
2. Copy cleaned agent files from agentic-branch:
   - `server/agents/viral_crew.py`
   - `knowledge/` directory files
3. Integrate AI scheduler:
   - Copy `server/automation/ai_scheduler.ts`
   - Update imports and paths
   - Add feature flag for enabling AI features
4. Update `server/index.ts`:
   - Conditionally start AI scheduler based on env var
   - Add graceful degradation
5. Add comprehensive error logging
6. Create monitoring dashboard placeholders

**Acceptance Criteria:**
- AI features can be toggled via environment variable
- System works with AI disabled (fallback mode)
- No TypeScript errors
- Docker containers start successfully

### 3.3 Testing & Validation (2-3 hours)
**Objective:** Ensure AI integration works reliably

**Tasks:**
1. Create integration tests:
   - Test fallback mechanism
   - Test Python service connectivity
   - Test workflow execution
2. Load testing:
   - Test concurrent user workflows
   - Measure performance impact
   - Verify no memory leaks
3. Manual testing:
   - Test each agent type (TrendScout, ContentAnalyzer, etc.)
   - Verify knowledge base loading
   - Test error scenarios
4. Documentation:
   - Update README with AI setup instructions
   - Document environment variables
   - Add troubleshooting guide

**Deliverables:**
- Integration test suite
- Performance benchmarks
- Updated documentation

## Phase 4: Deployment & Monitoring (Priority: Low)

### 4.1 Production Deployment (2-3 hours)
**Objective:** Deploy AI-enhanced system to production

**Tasks:**
1. Create deployment pipeline:
   - GitHub Actions workflow
   - Docker image builds
   - Automated testing
2. Setup production infrastructure:
   - Container orchestration (Kubernetes/ECS)
   - Service mesh for Python/TypeScript communication
   - Auto-scaling configuration
3. Configure monitoring:
   - Application performance monitoring (APM)
   - Error tracking (Sentry/Rollbar)
   - Log aggregation (CloudWatch/Datadog)
4. Setup alerting:
   - Python service health
   - Agent workflow failures
   - Performance degradation

**Deliverables:**
- Production deployment scripts
- Monitoring dashboards
- Runbook for operations team

### 4.2 Post-Deployment Validation (1 hour)
**Objective:** Verify production stability

**Tasks:**
1. Smoke tests in production
2. Monitor for 24-48 hours
3. Review error rates and performance metrics
4. Gather user feedback
5. Create improvement backlog

## Timeline Summary

**Week 1:**
- Day 1-2: Phase 1 (Fix Main Branch)
- Day 3: Phase 2 (Prepare AI Integration)
- Day 4-5: Phase 3.1 (Infrastructure Setup)

**Week 2:**
- Day 1-2: Phase 3.2 (Agent Integration)
- Day 3: Phase 3.3 (Testing)
- Day 4-5: Phase 4 (Deployment)

**Total Estimated Time:** 18-24 hours of focused development

## Risk Mitigation

**High Risk:**
- Python/TypeScript integration complexity
  - *Mitigation:* Use proven HTTP API pattern, comprehensive testing
- Production performance issues
  - *Mitigation:* Load testing, gradual rollout, feature flags

**Medium Risk:**
- Schema migration challenges
  - *Mitigation:* Database backups, rollback plan
- Third-party API rate limits (OpenAI, etc.)
  - *Mitigation:* Rate limiting, caching, fallback providers

**Low Risk:**
- TypeScript compilation issues
  - *Mitigation:* Already addressed in Phase 1

## Success Metrics

1. **Code Quality:**
   - 0 TypeScript errors
   - 0 critical security vulnerabilities
   - >80% test coverage for new code

2. **Performance:**
   - <500ms API response time (p95)
   - <5% error rate
   - System handles 100+ concurrent users

3. **Reliability:**
   - 99.9% uptime
   - Graceful degradation when AI unavailable
   - <1 hour recovery time for failures

## Next Steps

After reviewing this plan:
1. Approve/modify timeline
2. Assign resources
3. Setup development environment
4. Begin Phase 1 execution
5. Daily standups to track progress