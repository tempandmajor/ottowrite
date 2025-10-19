# Security Implementation Guide

**Last Updated:** January 19, 2025
**Version:** 2.0
**Status:** ✅ All security measures implemented

## Table of Contents

- [Overview](#overview)
- [Dependency Security](#dependency-security)
- [Security Headers & CSP](#security-headers--csp)
- [Authentication Security](#authentication-security)
- [Rate Limiting](#rate-limiting)
- [API Security](#api-security)
- [Testing](#testing)
- [Monitoring](#monitoring)

## Overview

This document outlines the comprehensive security implementation for OttoWrite, including:

- **Zero vulnerabilities** in npm dependencies
- **Strict Content Security Policy** (CSP) and security headers
- **Authentication throttling** to prevent brute force attacks
- **AI endpoint rate limiting** to prevent abuse and control costs
- **API error handling** with security event logging

## Dependency Security

### npm Audit Results

```bash
npm audit
```

**Status:** ✅ **0 vulnerabilities** (0 low, 0 moderate, 0 high, 0 critical)

### Dependencies

- **Production:** 740 packages
- **Development:** 404 packages
- **Total:** 1,305 packages

### Security Practices

1. **Regular Audits:** Run `npm audit` before each deployment
2. **Automated Updates:** Dependabot configured for security patches
3. **Lock File:** package-lock.json committed to version control
4. **Minimal Dependencies:** Only essential packages included

### Audit Commands

```bash
# Run security audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

## Security Headers & CSP

### Implementation

**File:** `next.config.ts`

All routes receive comprehensive security headers:

### Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable sensitive browser APIs |

### Content Security Policy (CSP)

Strict CSP implemented to prevent XSS attacks:

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.vercel-insights.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://*.sentry.io;
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests;
```

**Why `unsafe-eval` and `unsafe-inline`?**
- Required for Next.js hot module replacement (HMR) in development
- Required for some third-party integrations (Vercel Analytics, Sentry)
- Only applies to specific trusted domains

### Testing Headers

```bash
# Check security headers on production
curl -I https://your-domain.com

# Validate CSP
# Visit: https://csp-evaluator.withgoogle.com/
```

## Authentication Security

### Throttling Implementation

**Files:**
- `lib/security/auth-throttle.ts` - Core throttling logic
- `middleware.ts` - Applied to all `/auth/*` routes

### Rate Limits

| Endpoint Type | Limit | Window | Action |
|--------------|-------|--------|--------|
| Login attempts | 5 requests | 15 minutes | Return 429 with retry-after |
| Password reset | 3 requests | 60 minutes | Return 429 with retry-after |
| Failed auth attempts | 10 requests | 15 minutes | Complete block |

### Implementation Details

```typescript
// In middleware.ts
if (request.nextUrl.pathname.startsWith('/auth/')) {
  const throttle = checkAuthThrottle(request)
  if (!throttle.allowed) {
    return NextResponse.json(
      {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: throttle.retryAfter || 60,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(throttle.retryAfter || 60),
        },
      }
    )
  }
}
```

### Supabase Auth Integration

OttoWrite uses Supabase Auth, which provides:

- **Built-in rate limiting** on auth endpoints
- **Email verification** before account activation
- **Secure password hashing** (bcrypt)
- **Session management** with JWT tokens
- **MFA support** (optional)

Our additional throttling layer adds:
- **IP-based throttling** before hitting Supabase
- **Custom retry-after responses**
- **Logging and monitoring** of throttle events

## Rate Limiting

### Architecture

**Token Bucket Algorithm** with LRU cache for serverless environments.

**Files:**
- `lib/security/rate-limiter.ts` - Core rate limiting engine
- `lib/security/ai-rate-limit.ts` - AI-specific rate limiting
- `lib/monitoring/api-wrapper.ts` - API wrapper with rate limiting

### Rate Limit Configurations

#### AI Endpoints

| Operation | Limit | Window | Cost |
|-----------|-------|--------|------|
| AI Generate | 10 requests | 1 minute | Standard |
| AI Ensemble | 5 requests | 1 minute | Expensive |
| AI Coverage | 5 requests | 1 minute | Expensive |

#### General API

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 60 requests | 1 minute |
| File Upload | 10 requests | 5 minutes |

### Implementation

#### AI Endpoint Example

```typescript
// app/api/ai/generate/route.ts
export async function POST(request: NextRequest) {
  // Apply rate limiting first (before any expensive operations)
  const rateLimitCheck = await checkAIRateLimit(request)
  if (!rateLimitCheck.allowed) {
    return createAIRateLimitResponse(rateLimitCheck.retryAfter)
  }

  // ... rest of handler
}
```

#### General API Example

```typescript
// Using the API wrapper
export const POST = withAPIErrorHandling(
  async (request) => {
    // Handler logic
    return NextResponse.json({ success: true })
  },
  {
    operation: 'create_document',
    rateLimit: RateLimits.API_GENERAL,
    getUserId: async (req) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id
    }
  }
)
```

### Response Format

When rate limited, clients receive:

```json
{
  "error": "AI generation rate limit exceeded. Please wait before trying again.",
  "retryAfter": 45
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-01-19T15:30:00.000Z
```

### Client Identifier Strategy

Rate limits are tracked per-client using:

1. **User ID** (if authenticated) - Most accurate
2. **IP Address** (if unauthenticated) - Fallback

**IP Detection:**
- Checks `cf-connecting-ip` (Cloudflare)
- Falls back to `x-real-ip`
- Falls back to `x-forwarded-for`

### Storage

**In-Memory LRU Cache**
- Maximum 10,000 entries per rate limit configuration
- Automatic cleanup every 5 minutes
- Suitable for serverless/edge environments
- No external dependencies (Redis not required)

**Why In-Memory?**
- Serverless-friendly (no external services)
- Low latency (<1ms lookup)
- Automatic scaling with application
- Simple deployment

**Limitations:**
- Resets on server restart
- Not shared across multiple instances
- Best for moderate traffic applications

**For High-Scale Production:**
Consider Redis-based rate limiting:
- Shared state across instances
- Persistent limits
- More accurate for distributed systems

## API Security

### API Wrapper

**File:** `lib/monitoring/api-wrapper.ts`

All API routes should use `withAPIErrorHandling` wrapper:

**Features:**
- Automatic error reporting to Sentry
- Performance tracking
- Rate limiting integration
- Request/response logging
- Slow request detection (>3 seconds)

**Usage:**

```typescript
import { withAPIErrorHandling, APIErrors, RateLimits } from '@/lib/monitoring/api-wrapper'

export const POST = withAPIErrorHandling(
  async (request) => {
    // Validate input
    const body = await request.json()
    if (!body.prompt) {
      throw APIErrors.badRequest('Prompt is required')
    }

    // Process request
    const result = await processAIRequest(body)

    return NextResponse.json(result)
  },
  {
    operation: 'ai_generation',
    rateLimit: RateLimits.AI_GENERATE,
    getUserId: async (req) => {
      // Extract user ID from session
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id
    }
  }
)
```

### Error Handling

**Standard API Errors:**

```typescript
APIErrors.unauthorized()      // 401
APIErrors.forbidden()          // 403
APIErrors.notFound()           // 404
APIErrors.badRequest()         // 400
APIErrors.tooManyRequests()    // 429
APIErrors.internal()           // 500
APIErrors.serviceUnavailable() // 503
```

All errors include:
- User-friendly error message
- Request ID for debugging
- Automatic Sentry reporting
- HTTP status code

## Testing

### Manual Testing

```bash
# Test security headers
curl -I https://localhost:3000

# Test rate limiting (make 11 requests quickly)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/ai/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test"}' &
done
wait

# Test authentication throttling
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}' &
done
wait
```

### Automated Testing

Create test scripts in `tests/security/`:

```typescript
// tests/security/rate-limit.test.ts
import { rateLimit, RateLimits } from '@/lib/security/rate-limiter'

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const result = rateLimit('test-user', RateLimits.AI_GENERATE)
    expect(result.allowed).toBe(true)
  })

  it('should block requests exceeding limit', () => {
    // Make 11 requests (limit is 10)
    for (let i = 0; i < 11; i++) {
      rateLimit('test-user-2', RateLimits.AI_GENERATE)
    }
    const result = rateLimit('test-user-2', RateLimits.AI_GENERATE)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})
```

### Security Scanning

```bash
# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.com

# Lighthouse security audit
npx lighthouse https://your-domain.com --preset=perf --view
```

## Monitoring

### Sentry Integration

All security events are logged to Sentry:

- Rate limit violations
- Authentication failures
- API errors
- Slow requests (>3 seconds)

### Metrics to Monitor

1. **Rate Limit Hit Rate**
   - Track `X-RateLimit-Remaining: 0` responses
   - Alert if >5% of requests are rate limited

2. **Authentication Failures**
   - Track 401/403 responses
   - Alert on unusual spikes

3. **Security Header Compliance**
   - Verify headers on all responses
   - Alert if headers are missing

4. **Slow Requests**
   - Track requests >3 seconds
   - Investigate potential DoS attacks

### Vercel Analytics

- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Performance insights

### Custom Logging

```typescript
// lib/security/rate-limiter.ts logs rate limit events
addBreadcrumb('Rate limit exceeded', 'http', 'warning', {
  identifier,
  retryAfter: result.retryAfter,
  operation,
})
```

## Security Checklist

### Pre-Deployment

- [ ] Run `npm audit` - ensure 0 vulnerabilities
- [ ] Test security headers - verify CSP and HSTS
- [ ] Test rate limiting - verify limits work
- [ ] Test authentication throttling - verify login protection
- [ ] Review Sentry events - check for security issues
- [ ] Update environment variables - ensure secrets are secure

### Post-Deployment

- [ ] Monitor rate limit metrics
- [ ] Monitor authentication failures
- [ ] Check security header compliance
- [ ] Review Sentry error reports
- [ ] Test endpoints with security scanner

### Monthly

- [ ] Review and update dependencies
- [ ] Review rate limit configurations
- [ ] Audit Sentry security events
- [ ] Review access logs for anomalies
- [ ] Update security documentation

## Security Incidents

### Response Plan

1. **Detect** - Monitor Sentry alerts and metrics
2. **Contain** - Block malicious IPs via Vercel firewall
3. **Investigate** - Review logs and breadcrumbs
4. **Remediate** - Fix vulnerabilities and deploy
5. **Report** - Document incident and lessons learned

### Emergency Contacts

- **Sentry:** https://sentry.io/organizations/your-org/
- **Vercel Security:** https://vercel.com/dashboard/security
- **Supabase Support:** https://supabase.com/dashboard/support

## Best Practices

### API Development

1. **Always use rate limiting** for expensive operations
2. **Always validate input** - never trust user data
3. **Use the API wrapper** - ensures consistent error handling
4. **Log security events** - helps with incident response
5. **Test rate limits** - ensure they work before deployment

### Authentication

1. **Never store passwords** - use Supabase Auth
2. **Always use HTTPS** - enforce with HSTS
3. **Rotate secrets regularly** - especially API keys
4. **Use MFA** for admin accounts
5. **Monitor failed login attempts**

### General Security

1. **Principle of least privilege** - minimal permissions
2. **Defense in depth** - multiple security layers
3. **Fail securely** - errors don't reveal sensitive data
4. **Keep dependencies updated** - run audit regularly
5. **Monitor everything** - logs, metrics, errors

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy](https://content-security-policy.com/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Vercel Security](https://vercel.com/docs/security)

---

**Maintained by:** Security Team
**Questions?** File an issue in the repository
