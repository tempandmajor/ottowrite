# Rate Limiting Strategy

**Ticket:** PROD-008
**Status:** ✅ COMPLETED
**Created:** 2025-01-23
**Last Updated:** 2025-01-23

This document outlines OttoWrite's production-ready rate limiting strategy, including limits, burst allowances, monitoring, and operational procedures.

---

## Table of Contents

1. [Overview](#overview)
2. [Rate Limit Architecture](#rate-limit-architecture)
3. [Production Rate Limits](#production-rate-limits)
4. [Burst Allowances](#burst-allowances)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Expected Traffic Patterns](#expected-traffic-patterns)
7. [Operational Procedures](#operational-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

Rate limiting protects OttoWrite from:
- **Abuse:** Prevents malicious actors from overwhelming the system
- **Cost overruns:** Controls AI API usage and infrastructure costs
- **Poor UX:** Ensures fair resource allocation for all users
- **System instability:** Prevents cascading failures from traffic spikes

### Architecture

OttoWrite uses a **multi-layer rate limiting** approach:

1. **Per-Request Limits** (Token Bucket) - Prevents rapid-fire requests
2. **Hourly API Limits** - Controls sustained usage patterns
3. **Daily Quotas** (Plan-Based) - Enforces subscription tier limits
4. **Monthly AI Quotas** - Manages AI service costs
5. **Database Triggers** - Enforces resource limits (projects, documents, etc.)

---

## Rate Limit Architecture

### Token Bucket Algorithm

**Implementation:** `lib/security/rate-limiter.ts`

```typescript
interface RateLimitConfig {
  max: number           // Base capacity
  windowMs: number      // Time window
  burst?: number        // Additional burst capacity
  costPerRequest?: number // Token cost (default: 1)
  message?: string      // Error message
}
```

**Features:**
- In-memory LRU cache (10,000 entry limit per configuration)
- Automatic cleanup every 5 minutes
- Supports burst capacity for traffic spikes
- Variable cost per request for expensive operations
- Serverless-friendly (no Redis dependency)

**Storage Keys:**
- Authenticated users: `user:{userId}`
- Anonymous users: `ip:{ipAddress}`

**Headers Returned:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735000000
Retry-After: 42  # seconds (only when rate limited)
```

---

## Production Rate Limits

### Per-Request Limits (Token Bucket)

All limits include **base capacity + burst capacity** for better UX during normal usage spikes.

| Category | Limit | Window | Burst | Total Capacity | Use Case |
|----------|-------|--------|-------|----------------|----------|
| **AI Generation** | 20/min | 1 min | +10 | 30/min | Text generation, summarization |
| **AI Expensive** | 10/min | 1 min | +5 | 15/min | Ensemble, complex analysis (costs 3 tokens/request) |
| **Auth Login** | 10 | 15 min | +5 | 15 | Login attempts |
| **Auth Password Reset** | 5 | 1 hour | +2 | 7 | Password reset requests |
| **General API** | 100/min | 1 min | +50 | 150/min | Standard API calls |
| **File Upload** | 20 | 5 min | +10 | 30 | File uploads |
| **Document Save** | 120/min | 1 min | +60 | 180/min | Autosave operations |
| **Search** | 60/min | 1 min | +30 | 90/min | Search queries |
| **Email Send** | 10 | 1 hour | +5 | 15 | User-initiated emails |
| **Webhook** | 1000/hour | 1 hour | +200 | 1200/hour | External integrations |

### Hourly API Limits

Applied at middleware level (`lib/security/api-rate-limiter.ts`):

| Operation Type | Limit | Notes |
|----------------|-------|-------|
| Write (POST/PUT/PATCH/DELETE) | 100/hour | Mutations |
| Read (GET) | 1000/hour | Queries |
| AI Operations | 50/hour | Additional AI limit |
| Auth Operations | 20/hour | Login, signup, etc. |
| Webhooks | 1000/hour | External callbacks |

### Daily API Limits (Plan-Based)

From `lib/api/rate-limit.ts`:

| Plan | API Calls/Day | Notes |
|------|---------------|-------|
| Free | 0 | No API access |
| Hobbyist | 0 | No API access |
| Professional | 50 | Basic API access |
| Studio | 1000 | Full API access |

### Monthly Quotas (Plan-Based)

From `subscription_plan_limits` table:

| Resource | Free | Hobbyist | Professional | Studio |
|----------|------|----------|--------------|--------|
| **Projects** | 5 | 15 | 40 | Unlimited |
| **Documents** | 20 | 100 | 300 | Unlimited |
| **Snapshots** | 200 | 1,000 | 4,000 | Unlimited |
| **Templates** | 10 | 25 | 100 | Unlimited |
| **AI Words** | 25,000 | 120,000 | 400,000 | Unlimited |
| **AI Requests** | 300 | 1,500 | 5,000 | Unlimited |
| **Collaborators** | 0 | 1 | 3 | 10 |

---

## Burst Allowances

### What is Burst Capacity?

Burst capacity allows users to **temporarily exceed** their base rate limit to handle legitimate traffic spikes, such as:
- Batch operations (multiple file uploads)
- Quick editing bursts (rapid autosave)
- Initial page load (multiple API calls)
- Copy-paste operations (multiple saves)

### How It Works

1. **Normal usage:** Consumes from base capacity (e.g., 100 tokens)
2. **Base depleted:** Automatically switches to burst capacity (e.g., +50 tokens)
3. **Both depleted:** Rate limit enforced until window resets
4. **Window reset:** Both base and burst capacities fully restored

**Example:**
```
AI Generation: 20/min base + 10 burst = 30/min total
- Request 1-20: Uses base capacity ✅
- Request 21-30: Uses burst capacity ⚡
- Request 31+: Rate limited ❌ (retry after reset)
```

### Burst Strategy by Use Case

| Use Case | Base | Burst | Ratio | Reasoning |
|----------|------|-------|-------|-----------|
| AI Generation | 20 | 10 | 1.5x | Moderate bursts for experimentation |
| Document Save | 120 | 60 | 1.5x | Heavy editing sessions |
| General API | 100 | 50 | 1.5x | Page load spikes |
| File Upload | 20 | 10 | 1.5x | Batch uploads |
| Auth | 10 | 5 | 1.5x | Legitimate retry attempts |

**Monitoring:** Burst usage is tracked separately and visible in monitoring dashboards.

---

## Monitoring & Alerts

### Monitoring Tools

**1. CLI Monitoring Script**
```bash
# View current stats
npm run monitor:rate-limits

# Last 24 hours
npm run monitor:rate-limits --window=24

# Auto-refresh every 10s
npm run monitor:rate-limits --watch
```

**2. Admin API Endpoint**
```http
GET /api/admin/rate-limits?window=1&format=json

# Response:
{
  "stats": {
    "totalRequests": 1250,
    "allowedRequests": 1200,
    "blockedRequests": 50,
    "burstUsage": 45,
    "uniqueIdentifiers": 25
  },
  "healthScore": 96,
  "violations": [...],
  "abusePatterns": [...]
}
```

**3. Text Report**
```http
GET /api/admin/rate-limits?format=text

# Returns formatted console output
```

### Key Metrics

| Metric | Good | Warning | Critical | Action |
|--------|------|---------|----------|--------|
| **Health Score** | 90-100 | 75-89 | <75 | Review limits if sustained |
| **Block Rate** | <10% | 10-20% | >20% | Investigate abuse patterns |
| **Burst Usage** | <30% | 30-50% | >50% | Consider increasing base limits |
| **Unique IPs Blocked** | <5 | 5-20 | >20 | Check for DDoS attack |

### Abuse Detection

**Automatic abuse pattern detection:**
- Tracks request counts and block rates per identifier
- Flags patterns with >30% block rate and >10 requests
- Severity levels: Low, Medium, High, Critical

**Severity Thresholds:**
- **Critical:** >80% block rate, >100 requests
- **High:** >60% block rate, >50 requests
- **Medium:** >40% block rate, >20 requests
- **Low:** >30% block rate, >10 requests

**Example Alert:**
```
⚠️  ABUSE PATTERNS DETECTED

1. CRITICAL - user:abc123
   Endpoint: /api/ai/generate
   Requests: 150 (125 blocked, 83.3% block rate)
   Active: 10:15:00 AM - 10:45:00 AM

   → Action: Consider temporary suspension or IP block
```

---

## Expected Traffic Patterns

### Launch Estimates (First Month)

**Assumptions:**
- 100 active users
- Mix of plans: 60% Free, 30% Hobbyist, 10% Professional
- Average usage: 30 min/day per active user

| Metric | Daily | Monthly | Peak (per min) |
|--------|-------|---------|----------------|
| **API Requests** | 15,000 | 450,000 | 50 |
| **AI Generations** | 500 | 15,000 | 5 |
| **Document Saves** | 3,000 | 90,000 | 15 |
| **Auth Requests** | 200 | 6,000 | 2 |
| **File Uploads** | 100 | 3,000 | 1 |

### Growth Projections (6 Months)

| Metric | Month 1 | Month 3 | Month 6 | Notes |
|--------|---------|---------|---------|-------|
| **Active Users** | 100 | 500 | 2,000 | 100% MoM growth |
| **API Requests/day** | 15K | 75K | 300K | Linear with users |
| **Peak Requests/min** | 50 | 250 | 1,000 | 3x avg for peaks |

**Current Limits Support:**
- ✅ **Month 1-2:** Current limits sufficient with 5x safety margin
- ✅ **Month 3-4:** Current limits adequate with 2x safety margin
- ⚠️ **Month 5-6:** May need to increase limits for General API

### Capacity Planning

**When to Adjust Limits:**
1. **Block rate >15%** for sustained period (>24 hours)
2. **Burst usage >40%** consistently
3. **Health score <85** for >48 hours
4. **User complaints** about rate limiting

**Adjustment Strategy:**
1. Increase base limit by 50% (e.g., 100 → 150)
2. Increase burst by same proportion (e.g., 50 → 75)
3. Monitor for 7 days
4. Adjust again if needed

---

## Operational Procedures

### Responding to Rate Limit Alerts

**1. High Block Rate (>20%)**

```bash
# Step 1: View monitoring report
npm run monitor:rate-limits

# Step 2: Identify top blocked endpoints
# → Check stats.topBlockedEndpoints

# Step 3: Check if legitimate traffic
# → Review recent code changes
# → Check for autosave loops
# → Verify user behavior is expected

# Step 4: Take action
# → If abuse: Block IP or suspend user
# → If legitimate: Increase rate limits
```

**2. Abuse Pattern Detected (Critical/High)**

```bash
# Step 1: Get abuse details
curl https://your-domain.com/api/admin/rate-limits?format=json

# Step 2: Identify user/IP
# → Check identifier in abusePatterns array

# Step 3: Investigate
# → Review user profile
# → Check application logs
# → Look for patterns (time of day, endpoints)

# Step 4: Mitigate
# → Temporary ban: Update user role
# → IP block: Add to firewall rules (Vercel/Cloudflare)
# → Rate limit bypass: For support debugging

# Step 5: Monitor
# → Watch for 24 hours
# → Document incident
```

**3. Burst Capacity Heavily Used (>50%)**

```bash
# Step 1: Analyze usage pattern
npm run monitor:rate-limits --window=24

# Step 2: Determine if legitimate
# → Check stats.burstUsage vs stats.allowedRequests
# → Look for sustained high usage, not temporary spikes

# Step 3: Adjust limits
# → Edit lib/security/rate-limiter.ts
# → Increase base capacity by 50%
# → Redeploy application

# Step 4: Monitor impact
# → Watch health score
# → Track block rate
# → Verify user experience improves
```

### Temporary Rate Limit Bypass

For support/debugging purposes:

```typescript
// lib/security/rate-limiter.ts

// Add bypass for specific users
const BYPASS_USERS = [
  'user:support-team-member-id',
  'user:debugging-session-id',
]

export function rateLimit(identifier: string, config: RateLimitConfig) {
  // Bypass for support team
  if (BYPASS_USERS.includes(identifier)) {
    return {
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + 999999,
      burst: false,
    }
  }

  // Normal rate limiting...
}
```

**IMPORTANT:** Remove bypass after debugging session!

### Rate Limit Configuration Changes

**Process:**
1. **Test locally** with adjusted limits
2. **Deploy to staging** (if available)
3. **Monitor for 24 hours** in staging
4. **Deploy to production** during low-traffic period
5. **Monitor closely** for 48 hours
6. **Document change** in CHANGELOG

**Git Workflow:**
```bash
# Create branch
git checkout -b rate-limit-adjustment-YYYY-MM-DD

# Make changes
# → Edit lib/security/rate-limiter.ts
# → Update this documentation

# Commit
git add .
git commit -m "Adjust rate limits for [reason]

- Increase API_GENERAL from 100 to 150/min
- Increase burst from 50 to 75
- Reason: Sustained high block rate (18%)

Refs: PROD-008"

# Push and deploy
git push origin rate-limit-adjustment-YYYY-MM-DD
```

---

## Troubleshooting

### Common Issues

**1. Legitimate Users Being Rate Limited**

**Symptoms:**
- Block rate >15%
- User complaints
- Specific feature unusable

**Diagnosis:**
```bash
npm run monitor:rate-limits
# → Check topBlockedEndpoints
# → Look for patterns (e.g., autosave)
```

**Solution:**
- Increase limit for affected endpoint
- Add burst capacity
- Implement request batching in frontend

**2. Rate Limit Not Enforcing**

**Symptoms:**
- Abuse not blocked
- Health score 100% but suspicious traffic

**Diagnosis:**
- Check if rate limiter properly initialized
- Verify middleware is applied to route
- Check identifier extraction (user ID vs IP)

**Solution:**
```bash
# Check middleware.ts
# Ensure applyRateLimit() is called

# Check rate-limiter.ts
# Verify LRU cache is populated
```

**3. Burst Capacity Not Working**

**Symptoms:**
- Users blocked despite burst allowance
- Burst usage shows 0%

**Diagnosis:**
- Check RateLimitConfig has `burst` property
- Verify updated rate-limiter.ts is deployed
- Check if costPerRequest exceeds burst capacity

**Solution:**
- Redeploy with updated rate-limiter.ts
- Verify burst property in RateLimits config

**4. Memory Issues with LRU Cache**

**Symptoms:**
- High memory usage
- Serverless function OOM errors

**Diagnosis:**
```bash
# Check number of rate limit stores
# Each config creates separate LRU cache
# Each cache holds up to 10,000 entries
```

**Solution:**
- Reduce MAX_SIZE in LRUCache constructor
- Consolidate similar rate limit configs
- Implement external cache (Redis) if needed

---

## API Reference

### Rate Limiter Function

```typescript
import { rateLimit, RateLimits } from '@/lib/security/rate-limiter'

const result = rateLimit('user:123', RateLimits.AI_GENERATE)

// result = {
//   allowed: boolean,
//   remaining: number,  // Total tokens remaining (base + burst)
//   resetAt: number,    // Unix timestamp when limit resets
//   retryAfter?: number, // Seconds to wait (only if !allowed)
//   burst?: boolean,     // True if burst capacity was used
// }
```

### Monitoring Functions

```typescript
import {
  getRateLimitStats,
  getRateLimitHealthScore,
  getRecentViolations,
  detectAbusePatterns,
  shouldAdjustRateLimits,
} from '@/lib/monitoring/rate-limit-monitor'

// Get stats for last hour
const stats = getRateLimitStats(60 * 60 * 1000)

// Get health score (0-100)
const health = getRateLimitHealthScore()

// Get recent violations
const violations = getRecentViolations(20)

// Detect abuse
const abuse = detectAbusePatterns()

// Check if adjustments needed
const { shouldAdjust, reason } = shouldAdjustRateLimits()
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/security/rate-limiter.ts` | Core rate limiting engine |
| `lib/security/api-rate-limiter.ts` | API endpoint rate limits |
| `lib/api/rate-limit.ts` | Daily API quota checks |
| `lib/monitoring/rate-limit-monitor.ts` | Monitoring utilities |
| `middleware.ts` | Applies rate limits globally |
| `app/api/admin/rate-limits/route.ts` | Monitoring API endpoint |
| `scripts/monitor-rate-limits.ts` | CLI monitoring tool |

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-01-23 | Initial production limits set | PROD-008 launch preparation |
| 2025-01-23 | Added burst allowances (1.5x base) | Improve UX for traffic spikes |
| 2025-01-23 | Increased AI generation from 10 to 20/min | Expected higher AI usage |
| 2025-01-23 | Added DOCUMENT_SAVE limit (120/min + 60 burst) | Support autosave feature |
| 2025-01-23 | Added monitoring tools and alerts | Proactive abuse detection |

---

**Last Updated:** 2025-01-23
**Version:** 1.0.0
**Status:** ✅ Production Ready
