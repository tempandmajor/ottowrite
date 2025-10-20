# Production Readiness Tickets

**Total Estimated Time**: 80-120 hours (2-3 weeks for 1 developer)

---

## 🔴 Phase 1: Critical Security & Stability (6-8 hours)

### TICKET-001: Remove Secrets from Git History
**Priority**: P0 - BLOCKER
**Effort**: 1 hour
**Labels**: security, critical

**Description**:
The `.env.local` file containing Stripe test keys is currently tracked in git. This is a critical security issue.

**Acceptance Criteria**:
- [ ] Add `.env.local` to `.gitignore`
- [ ] Remove `.env.local` from git history using `git filter-branch` or BFG Repo Cleaner
- [ ] Rotate all exposed Stripe keys (get new test keys from Stripe dashboard)
- [ ] Update Vercel environment variables with new keys
- [ ] Create `.env.example` template without real values
- [ ] Document required environment variables in README

**Files to modify**:
- `.gitignore`
- `.env.example` (new)
- `README.md`

**References**: QUICK_START_FIXES.md - Priority 1, Item 1

---

### TICKET-002: Add Environment Variable Validation
**Priority**: P0 - BLOCKER
**Effort**: 30 minutes
**Labels**: config, critical

**Description**:
App currently starts even if critical environment variables are missing, leading to runtime failures.

**Acceptance Criteria**:
- [ ] Create `lib/env-validation.ts` with Zod schema
- [ ] Validate all required env vars on startup
- [ ] Add type-safe env helper: `env('NEXT_PUBLIC_SUPABASE_URL')`
- [ ] Fail fast with clear error messages for missing vars
- [ ] Test with missing required variables

**Required Variables to Validate**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

**Files to create**:
- `lib/env-validation.ts` (new)

**Files to modify**:
- `app/layout.tsx` (import and validate on app start)

**References**: QUICK_START_FIXES.md - Priority 1, Item 2

---

### TICKET-003: Add Request ID Tracking
**Priority**: P0 - CRITICAL
**Effort**: 2 hours
**Labels**: observability, error-handling

**Description**:
No way to correlate user error reports with server logs. Add request ID tracking throughout the request lifecycle.

**Acceptance Criteria**:
- [ ] Add `x-request-id` to all API responses
- [ ] Include request ID in all log statements
- [ ] Add request ID to Sentry error context
- [ ] Display request ID in user-facing error messages
- [ ] Create middleware to generate/forward request IDs
- [ ] Test request ID propagation through error flows

**Files to create**:
- `middleware/request-id.ts` (new)

**Files to modify**:
- `middleware.ts` (add request ID middleware)
- `lib/monitoring/structured-logger.ts` (include request ID)
- `lib/monitoring/sentry.ts` (add to error context)
- All API route handlers (return request ID in errors)

**Example Implementation**:
```typescript
// middleware/request-id.ts
export function requestIdMiddleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  request.headers.set('x-request-id', requestId)
  return requestId
}
```

**References**: QUICK_START_FIXES.md - Priority 1, Item 3

---

### TICKET-004: Standardize API Error Responses
**Priority**: P0 - CRITICAL
**Effort**: 2 hours
**Labels**: api, error-handling

**Description**:
API error responses are inconsistent. Some return objects, some return strings, varying status codes for same errors.

**Acceptance Criteria**:
- [ ] Create standard error response type
- [ ] Create error response helper utility
- [ ] Update all API routes to use standard format
- [ ] Document error response schema
- [ ] Add error code enum for common errors

**Standard Format**:
```typescript
{
  error: {
    message: string      // User-friendly message
    code: string        // Machine-readable error code
    requestId: string   // For support/debugging
    details?: any       // Optional additional context
  }
}
```

**Files to create**:
- `lib/api/error-responses.ts` (new)
- `types/api-errors.ts` (new)

**Files to modify**:
- All files in `app/api/**/route.ts` (75+ endpoints)

**References**: QUICK_START_FIXES.md - Priority 1, Item 4

---

### TICKET-005: Add Input Validation Middleware
**Priority**: P0 - CRITICAL
**Effort**: 4 hours
**Labels**: security, validation

**Description**:
Most API endpoints lack input validation, exposing the app to XSS, injection attacks, and data corruption.

**Acceptance Criteria**:
- [ ] Create Zod validation middleware
- [ ] Add validation schemas for all POST/PUT/PATCH endpoints
- [ ] Sanitize HTML input to prevent XSS
- [ ] Validate file uploads (type, size)
- [ ] Return 400 errors with field-level validation messages
- [ ] Test with malicious inputs (XSS payloads, SQL injection attempts)

**Priority Endpoints (Start Here)**:
1. `/api/ai/generate` - prompt injection risk
2. `/api/documents/[id]/autosave` - XSS risk (HTML content)
3. `/api/characters` - data validation
4. `/api/projects/query` - injection risk
5. `/api/webhooks/stripe` - signature validation

**Files to create**:
- `lib/validation/middleware.ts` (new)
- `lib/validation/schemas/` (directory with Zod schemas)
- `lib/security/sanitize.ts` (HTML sanitization)

**Files to modify**:
- All POST/PUT/PATCH API routes

**Example**:
```typescript
// lib/validation/schemas/ai-generate.ts
export const aiGenerateSchema = z.object({
  prompt: z.string().min(1).max(5000),
  documentId: z.string().uuid(),
  command: z.enum(['continue', 'rewrite', 'expand']).optional(),
})
```

**References**: QUICK_START_FIXES.md - Priority 1, Item 5

---

### TICKET-006: Create Health Check Endpoint
**Priority**: P1 - HIGH
**Effort**: 1 hour
**Labels**: monitoring, ops

**Description**:
No health check endpoint to verify app readiness in production. Needed for load balancers and monitoring.

**Acceptance Criteria**:
- [ ] Create `/api/health` endpoint
- [ ] Check Supabase connection
- [ ] Check Redis/rate limit store (if applicable)
- [ ] Return 200 OK when healthy
- [ ] Return 503 with details when unhealthy
- [ ] Add `/api/health/ready` for readiness probe
- [ ] Document in API documentation

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T12:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

**Files to create**:
- `app/api/health/route.ts` (new)
- `app/api/health/ready/route.ts` (new)

**References**: QUICK_START_FIXES.md - Priority 1, Item 6

---

## 🟠 Phase 2: High Priority (20-30 hours)

### TICKET-007: Add API Route Tests
**Priority**: P1 - HIGH
**Effort**: 8 hours
**Labels**: testing, quality

**Description**:
Critical API routes have no tests. Add integration tests for high-risk endpoints.

**Acceptance Criteria**:
- [ ] Set up API testing framework (MSW or similar)
- [ ] Test `/api/ai/generate` (success, rate limit, auth)
- [ ] Test `/api/documents/[id]/autosave` (conflict resolution)
- [ ] Test `/api/webhooks/stripe` (signature validation)
- [ ] Test `/api/characters` (CRUD operations)
- [ ] Test `/api/projects/query` (SQL injection attempts)
- [ ] All tests pass in CI/CD pipeline
- [ ] Achieve 60%+ coverage for API routes

**Files to create**:
- `__tests__/api/ai/generate.test.ts`
- `__tests__/api/documents/autosave.test.ts`
- `__tests__/api/webhooks/stripe.test.ts`
- `__tests__/api/characters.test.ts`
- `__tests__/api/projects/query.test.ts`

**References**: PRODUCTION_READINESS_REPORT.md - Testing Section

---

### TICKET-008: Add Database Connection Pooling
**Priority**: P1 - HIGH
**Effort**: 2 hours
**Labels**: performance, database

**Description**:
Current implementation may exhaust database connections under load. Add proper connection pooling.

**Acceptance Criteria**:
- [ ] Configure Supabase client with connection pool
- [ ] Set appropriate pool size (10-20 for serverless)
- [ ] Add connection timeout handling
- [ ] Monitor connection usage in production
- [ ] Document connection limits

**Files to modify**:
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`

**References**: PRODUCTION_READINESS_REPORT.md - Performance Section

---

### TICKET-009: Implement Pagination for List Endpoints
**Priority**: P1 - HIGH
**Effort**: 4 hours
**Labels**: performance, api

**Description**:
List endpoints return all records, causing performance issues and timeouts with large datasets.

**Acceptance Criteria**:
- [ ] Add pagination to `/api/documents` (currently returns all)
- [ ] Add pagination to `/api/projects`
- [ ] Add pagination to `/api/characters`
- [ ] Add pagination to `/api/locations`
- [ ] Add cursor-based pagination for consistent performance
- [ ] Add `limit` and `cursor` query params
- [ ] Return pagination metadata (total, hasMore, nextCursor)
- [ ] Default limit: 50, max limit: 100

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "limit": 50,
    "nextCursor": "uuid-here",
    "hasMore": true
  }
}
```

**Files to modify**:
- `app/api/documents/route.ts`
- `app/api/projects/route.ts`
- `app/api/characters/route.ts`
- `app/api/locations/route.ts`

**References**: PRODUCTION_READINESS_REPORT.md - Performance Section

---

### TICKET-010: Add Comprehensive Rate Limiting
**Priority**: P1 - HIGH
**Effort**: 3 hours
**Labels**: security, performance

**Description**:
Only AI endpoints have rate limiting. CRUD endpoints are vulnerable to abuse.

**Acceptance Criteria**:
- [ ] Add rate limiting to all write endpoints (POST/PUT/PATCH/DELETE)
- [ ] Add rate limiting to expensive read operations
- [ ] Use Redis-backed rate limiter (replace in-memory)
- [ ] Configure appropriate limits per endpoint type:
  - Write: 100/hour per user
  - Read: 1000/hour per user
  - AI: 50/hour per user (existing)
- [ ] Return `429 Too Many Requests` with Retry-After header
- [ ] Add rate limit headers to all responses (X-RateLimit-*)

**Files to create**:
- `lib/security/redis-rate-limiter.ts` (new)

**Files to modify**:
- `middleware.ts` (apply rate limiting)
- All write API routes

**References**: PRODUCTION_READINESS_REPORT.md - Security Section

---

### TICKET-011: Add Request/Response Logging
**Priority**: P1 - HIGH
**Effort**: 2 hours
**Labels**: observability, debugging

**Description**:
No systematic logging of API requests/responses. Add structured logging for debugging and analytics.

**Acceptance Criteria**:
- [ ] Log all API requests (method, path, status, duration)
- [ ] Log request body size (not content for privacy)
- [ ] Log response status and size
- [ ] Log slow requests (>1s warning, >5s error)
- [ ] Exclude `/api/health` from logs
- [ ] Include user ID if authenticated
- [ ] Sample verbose logs (10% of requests) to reduce cost

**Files to create**:
- `middleware/logging.ts` (new)

**Files to modify**:
- `middleware.ts`

**References**: PRODUCTION_READINESS_REPORT.md - Monitoring Section

---

### TICKET-012: Set Up Error Alerting Rules
**Priority**: P1 - HIGH
**Effort**: 2 hours
**Labels**: monitoring, ops

**Description**:
Sentry is configured but no alerting rules. Team won't know when critical errors occur.

**Acceptance Criteria**:
- [ ] Set up Slack/email notifications for Sentry
- [ ] Alert on error rate > 5% for 5 minutes
- [ ] Alert on 500 errors in critical endpoints
- [ ] Alert on rate limit exceeded (possible attack)
- [ ] Alert on database connection failures
- [ ] Set up on-call rotation
- [ ] Document alert response playbook

**Files to create**:
- `docs/ALERT_PLAYBOOK.md` (new)

**References**: PRODUCTION_READINESS_REPORT.md - Monitoring Section

---

### TICKET-013: Add Database Migration Rollback Scripts
**Priority**: P1 - HIGH
**Effort**: 3 hours
**Labels**: database, ops

**Description**:
All migrations go forward-only. No safe way to rollback a bad deployment.

**Acceptance Criteria**:
- [ ] Create `down.sql` for each existing migration
- [ ] Test rollback for last 5 migrations
- [ ] Document rollback procedure
- [ ] Add migration version tracking
- [ ] Create rollback script: `npm run db:rollback`

**Files to create**:
- `supabase/migrations/*_down.sql` (for each migration)
- `scripts/db-rollback.sh` (new)
- `docs/DATABASE_ROLLBACK.md` (new)

**References**: PRODUCTION_READINESS_REPORT.md - Database Section

---

### TICKET-014: Add API Documentation
**Priority**: P1 - HIGH
**Effort**: 4 hours
**Labels**: documentation

**Description**:
No API documentation. Frontend developers and integrators can't understand endpoints.

**Acceptance Criteria**:
- [ ] Set up OpenAPI/Swagger documentation
- [ ] Document all public API endpoints
- [ ] Include request/response examples
- [ ] Document authentication requirements
- [ ] Document rate limits
- [ ] Document error codes
- [ ] Host at `/api/docs`
- [ ] Add Postman collection export

**Files to create**:
- `docs/openapi.yaml` (new)
- `app/api/docs/route.ts` (new)

**Tools**: Consider using `next-swagger-doc` or similar

**References**: PRODUCTION_READINESS_REPORT.md - Documentation Section

---

### TICKET-015: Implement Proper Session Management
**Priority**: P1 - HIGH
**Effort**: 3 hours
**Labels**: security, auth

**Description**:
Review and harden session management, token refresh, and logout flows.

**Acceptance Criteria**:
- [ ] Verify token refresh works correctly
- [ ] Add session timeout (24 hours)
- [ ] Implement proper logout (revoke tokens)
- [ ] Add "remember me" functionality
- [ ] Test concurrent session handling
- [ ] Add session activity logging
- [ ] Invalidate sessions on password change

**Files to modify**:
- `app/auth/**/route.ts`
- `lib/supabase/middleware.ts`

**References**: PRODUCTION_READINESS_REPORT.md - Security Section

---

## 🟡 Phase 3: Medium Priority (15-20 hours)

### TICKET-016: Add Component Unit Tests
**Priority**: P2 - MEDIUM
**Effort**: 6 hours
**Labels**: testing, quality

**Description**:
Critical UI components have no tests. Add unit tests for complex components.

**Acceptance Criteria**:
- [ ] Test `AIAssistant` component (template handling, command routing)
- [ ] Test `EditorToolbar` (actions, state)
- [ ] Test `ChapterSidebar` (navigation, structure updates)
- [ ] Test `CharacterSceneIndex` (parsing, filtering)
- [ ] Test `ConflictResolutionDialog` (merge strategies)
- [ ] All tests pass in CI/CD
- [ ] Achieve 40%+ component coverage

**Files to create**:
- `__tests__/components/ai-assistant.test.tsx`
- `__tests__/components/editor-toolbar.test.tsx`
- `__tests__/components/chapter-sidebar.test.tsx`
- `__tests__/components/character-scene-index.test.tsx`
- `__tests__/components/conflict-resolution-dialog.test.tsx`

**References**: PRODUCTION_READINESS_REPORT.md - Testing Section

---

### TICKET-017: Optimize Database Indexes
**Priority**: P2 - MEDIUM
**Effort**: 2 hours
**Labels**: performance, database

**Description**:
Add indexes for commonly queried fields to improve performance.

**Acceptance Criteria**:
- [ ] Add index on `documents.user_id, documents.updated_at`
- [ ] Add index on `characters.project_id`
- [ ] Add index on `locations.project_id`
- [ ] Add index on `snapshots.document_id, snapshots.created_at`
- [ ] Add composite index on `user_profiles.subscription_tier, user_profiles.id`
- [ ] Test query performance before/after
- [ ] Document in migration

**Files to create**:
- `supabase/migrations/YYYYMMDD_add_performance_indexes.sql`

**References**: PRODUCTION_READINESS_REPORT.md - Performance Section

---

### TICKET-018: Add Database Query Timeout Protection
**Priority**: P2 - MEDIUM
**Effort**: 2 hours
**Labels**: performance, reliability

**Description**:
No timeout protection on database queries. A slow query can hang the entire request.

**Acceptance Criteria**:
- [ ] Add query timeout to Supabase client (10s default)
- [ ] Add timeout to expensive operations (AI context fetching)
- [ ] Return 504 Gateway Timeout on query timeout
- [ ] Log slow queries (>1s) for optimization
- [ ] Test with simulated slow queries

**Files to modify**:
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`

**References**: PRODUCTION_READINESS_REPORT.md - Performance Section

---

### TICKET-019: Implement Caching Strategy
**Priority**: P2 - MEDIUM
**Effort**: 4 hours
**Labels**: performance, optimization

**Description**:
No caching layer. Repeatedly fetching same data from database/APIs.

**Acceptance Criteria**:
- [ ] Add Redis caching for user profiles (TTL: 5 min)
- [ ] Cache project metadata (TTL: 10 min)
- [ ] Cache AI model routing decisions (TTL: 1 hour)
- [ ] Add cache-control headers to static endpoints
- [ ] Implement cache invalidation on updates
- [ ] Add cache hit/miss metrics

**Files to create**:
- `lib/cache/redis-client.ts` (new)
- `lib/cache/strategies.ts` (new)

**Files to modify**:
- High-traffic API endpoints

**References**: PRODUCTION_READINESS_REPORT.md - Performance Section

---

### TICKET-020: Add Deployment Runbook
**Priority**: P2 - MEDIUM
**Effort**: 2 hours
**Labels**: documentation, ops

**Description**:
No documented deployment procedure. Create runbook for production deployments.

**Acceptance Criteria**:
- [ ] Document pre-deployment checklist
- [ ] Document deployment steps
- [ ] Document rollback procedure
- [ ] Document smoke test checklist
- [ ] Document database migration procedure
- [ ] Document environment variable updates
- [ ] Include troubleshooting guide

**Files to create**:
- `docs/DEPLOYMENT_RUNBOOK.md` (new)
- `docs/ROLLBACK_PROCEDURE.md` (new)
- `docs/SMOKE_TESTS.md` (new)

**References**: PRODUCTION_READINESS_REPORT.md - Documentation Section

---

### TICKET-021: Set Up Performance Monitoring
**Priority**: P2 - MEDIUM
**Effort**: 3 hours
**Labels**: monitoring, performance

**Description**:
No performance monitoring. Can't detect slow endpoints or performance regressions.

**Acceptance Criteria**:
- [ ] Set up Vercel Analytics (built-in)
- [ ] Configure performance budgets
- [ ] Monitor Core Web Vitals (LCP, FID, CLS)
- [ ] Monitor API endpoint response times
- [ ] Set up slow query alerts (>1s)
- [ ] Create performance dashboard
- [ ] Alert on performance degradation

**Files to modify**:
- `app/layout.tsx` (add Analytics)
- `vercel.json` (configure budgets)

**References**: PRODUCTION_READINESS_REPORT.md - Monitoring Section

---

### TICKET-022: Add User Activity Logging
**Priority**: P2 - MEDIUM
**Effort**: 3 hours
**Labels**: analytics, compliance

**Description**:
Add audit logging for security-sensitive operations and compliance.

**Acceptance Criteria**:
- [ ] Log user authentication events (login, logout, failed attempts)
- [ ] Log subscription changes
- [ ] Log document deletion
- [ ] Log project deletion
- [ ] Log API key generation/revocation (if applicable)
- [ ] Store logs for 90 days minimum
- [ ] Add admin view for user activity

**Files to create**:
- `lib/audit/logger.ts` (new)
- Database table: `audit_logs`

**Files to modify**:
- Auth routes
- Deletion endpoints
- Subscription endpoints

**References**: PRODUCTION_READINESS_REPORT.md - Security Section

---

### TICKET-023: Implement Feature Flags
**Priority**: P2 - MEDIUM
**Effort**: 3 hours
**Labels**: infrastructure, deployment

**Description**:
No feature flag system. Can't toggle features without redeployment.

**Acceptance Criteria**:
- [ ] Set up feature flag service (LaunchDarkly, Unleash, or simple DB table)
- [ ] Add feature flag for AI ensemble mode
- [ ] Add feature flag for new UI features
- [ ] Add user-specific flags (beta access)
- [ ] Add admin UI to toggle flags
- [ ] Document flag management

**Files to create**:
- `lib/feature-flags/client.ts` (new)
- `lib/feature-flags/provider.tsx` (new)
- Database table: `feature_flags`

**References**: PRODUCTION_READINESS_REPORT.md - Configuration Section

---

## ✅ Phase 4: Nice-to-Have (Optional)

### TICKET-024: Add E2E Tests for Critical Flows
**Priority**: P3 - LOW
**Effort**: 8 hours
**Labels**: testing, quality

**Description**:
Add Playwright E2E tests for critical user journeys.

**Acceptance Criteria**:
- [ ] Test signup flow
- [ ] Test create project → create document → edit → save
- [ ] Test AI generation flow
- [ ] Test subscription upgrade flow
- [ ] All tests pass in CI/CD

**Files to create**:
- `e2e/signup.spec.ts`
- `e2e/project-creation.spec.ts`
- `e2e/ai-generation.spec.ts`
- `e2e/subscription.spec.ts`

---

### TICKET-025: Add GraphQL API (Optional)
**Priority**: P3 - LOW
**Effort**: 12 hours
**Labels**: api, enhancement

**Description**:
REST API works but GraphQL would reduce over-fetching.

**Acceptance Criteria**:
- [ ] Set up Apollo Server
- [ ] Create schema for key entities
- [ ] Implement resolvers
- [ ] Add DataLoader for N+1 query prevention
- [ ] Add GraphQL playground

---

### TICKET-026: Implement WebSocket Real-time Sync
**Priority**: P3 - LOW
**Effort**: 10 hours
**Labels**: feature, real-time

**Description**:
Add real-time collaboration using WebSockets.

**Acceptance Criteria**:
- [ ] Set up WebSocket server
- [ ] Implement cursor position sharing
- [ ] Implement live document updates
- [ ] Handle conflict resolution
- [ ] Test with multiple users

---

## 📊 Ticket Summary

| Phase | Tickets | Total Hours | Priority |
|-------|---------|-------------|----------|
| Phase 1 (Critical) | 6 | 6-8 | P0 |
| Phase 2 (High) | 9 | 20-30 | P1 |
| Phase 3 (Medium) | 8 | 15-20 | P2 |
| Phase 4 (Optional) | 3 | 30+ | P3 |
| **TOTAL** | **26** | **80-120+** | - |

---

## 🚀 Recommended Sprint Plan

### Sprint 1 (Week 1): Critical Security
- TICKET-001: Remove secrets from git
- TICKET-002: Environment validation
- TICKET-003: Request ID tracking
- TICKET-004: Standardize errors
- TICKET-005: Input validation
- TICKET-006: Health checks

**Goal**: Safe to deploy without major security issues

### Sprint 2 (Week 2): High Priority - Stability
- TICKET-007: API route tests
- TICKET-008: Connection pooling
- TICKET-009: Pagination
- TICKET-010: Rate limiting
- TICKET-011: Request logging

**Goal**: App is stable and performant under normal load

### Sprint 3 (Week 3): High Priority - Operations
- TICKET-012: Error alerting
- TICKET-013: Migration rollbacks
- TICKET-014: API documentation
- TICKET-015: Session management

**Goal**: Team can operate and maintain the app effectively

### Sprint 4 (Week 4): Polish & Launch Prep
- TICKET-016: Component tests
- TICKET-017: Database indexes
- TICKET-018: Query timeouts
- TICKET-019: Caching
- TICKET-020: Deployment runbook

**Goal**: Production-ready launch

---

## 📝 Notes

### Ticket Labels
- `P0`: Blocker - Must fix before launch
- `P1`: High - Should fix before launch
- `P2`: Medium - Nice to have at launch
- `P3`: Low - Can do after launch

### Estimation
- Small: < 2 hours
- Medium: 2-4 hours
- Large: 4-8 hours
- XL: 8+ hours

### Dependencies
Some tickets depend on others:
- TICKET-003 (Request IDs) should be done before TICKET-011 (Logging)
- TICKET-002 (Env validation) should be done before TICKET-006 (Health checks)
- TICKET-004 (Error standards) should be done early as many tickets depend on it

### Tools & Services Needed
- **Redis**: For rate limiting and caching (TICKET-010, TICKET-019)
- **Sentry**: Already configured, just needs alerting rules (TICKET-012)
- **Vercel Analytics**: Built-in, just needs configuration (TICKET-021)

### Cost Considerations
- Redis hosting: ~$5-20/month (Upstash free tier may suffice initially)
- Sentry: Free tier for <5k errors/month
- Vercel: Pro plan needed for Analytics (~$20/month)

---

**Ready to start?** Begin with Sprint 1, TICKET-001. Each ticket has clear acceptance criteria and file references.
