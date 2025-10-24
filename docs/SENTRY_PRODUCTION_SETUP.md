# Sentry Production Error Tracking Setup

**Status:** Ready for Production
**Last Updated:** 2025-10-23

## Overview

Sentry is fully integrated into Ottowrite with comprehensive error monitoring, intelligent alerting, and session replay capabilities. This document covers the production setup and configuration.

---

## Current Integration Status

### ✅ Completed

1. **Sentry SDK Installed**
   - Package: `@sentry/nextjs@10.20.0`
   - Full Next.js integration with client, server, and edge runtime support

2. **Configuration Files**
   - `sentry.client.config.ts` - Client-side error tracking with session replay
   - `sentry.server.config.ts` - Server-side error tracking
   - `sentry.edge.config.ts` - Edge runtime error tracking
   - `lib/monitoring/sentry-config.ts` - Intelligent error classification and alerting rules
   - `lib/monitoring/sentry-context.ts` - Request ID tracking and context management

3. **Next.js Integration**
   - `next.config.ts` configured with `withSentryConfig`
   - Source map upload configured
   - React component annotation enabled
   - CSP headers allow Sentry connections

4. **Sampling Rates Optimized** (Free Tier Friendly)
   - **Client traces:** 10% (100 out of 1000 pageviews)
   - **Server traces:** 5% (50 out of 1000 API calls)
   - **Edge traces:** 10%
   - **Session replay:** 1% of normal sessions, 100% of error sessions
   - **Error filtering:** Noise errors filtered out (404s, browser extensions, etc.)

5. **Intelligent Error Classification**
   - **CRITICAL** errors (immediate alerts):
     - Database connection failures
     - Payment processing failures
     - Authentication system failures
   - **HIGH** priority errors (15-min batched alerts):
     - AI generation failures
     - Autosave failures
     - Rate limit abuse
   - **MEDIUM** priority errors (daily summary):
     - Database query errors
     - External API failures
     - Export failures
   - **LOW** priority errors (weekly summary):
     - Network timeouts
     - UI render errors
   - **NOISE** filtered out:
     - 404 errors
     - Browser extension errors
     - User-cancelled actions

6. **Privacy & Security**
   - All text content masked in session replays
   - All media blocked in session replays
   - All form inputs masked
   - Sensitive headers removed (Authorization, Cookie)
   - Sensitive query params scrubbed (token, key, secret, password)

---

## Required Setup Steps

### Step 1: Create Sentry Project

1. Go to https://sentry.io
2. Create an account or log in
3. Create a new project:
   - **Platform:** Next.js
   - **Project name:** `ottowrite`
   - **Team:** Your organization

### Step 2: Get Sentry Credentials

From your Sentry project dashboard:

1. **DSN (Data Source Name)**
   - Location: Settings → Projects → ottowrite → Client Keys (DSN)
   - Format: `https://[key]@[org].ingest.sentry.io/[project]`
   - Copy this value

2. **Organization Slug**
   - Location: Settings → General
   - Your organization identifier (e.g., `your-org`)

3. **Project Slug**
   - Usually `ottowrite`

4. **Auth Token** (for source map uploads)
   - Location: Settings → Account → Auth Tokens
   - Click "Create New Token"
   - Scopes needed:
     - `project:read`
     - `project:releases`
     - `org:read`
   - Copy the token (starts with `sntrys_`)

### Step 3: Add Environment Variables to Vercel

Go to your Vercel project: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite/settings/environment-variables

Add these variables for **Production** environment only:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[your-key]@[your-org].ingest.sentry.io/[your-project-id]
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=ottowrite
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

**Important:**
- `NEXT_PUBLIC_SENTRY_DSN` must be public (starts with `NEXT_PUBLIC_`)
- `SENTRY_AUTH_TOKEN` should be kept secret (encrypt in Vercel)
- Set environment scope to **Production** only

### Step 4: Configure Alert Rules in Sentry

#### A. Critical Alerts (Immediate Notification)

1. Go to **Alerts → Alert Rules → Create Alert**
2. Create alert for **Database Connection Failures**:
   - **Alert name:** "Database Connection Failure"
   - **Environment:** Production
   - **Filter:** `error_category:database AND error_priority:critical`
   - **Threshold:** When event count >= 1 in 1 minute
   - **Actions:**
     - Send to Slack channel (if configured)
     - Email team@ottowrite.app
     - (Optional) PagerDuty integration

3. Repeat for other critical errors:
   - Payment Processing Failures
   - Authentication System Failures

#### B. High Priority Alerts (Batched)

Create alert for **AI Generation Failures**:
- **Alert name:** "AI Generation High Failure Rate"
- **Filter:** `error_category:ai AND error_priority:high`
- **Threshold:** When event count >= 5 in 15 minutes
- **Actions:**
  - Send to Slack channel
  - Email team@ottowrite.app

Repeat for:
- Autosave Failures
- Rate Limit Abuse

#### C. Daily/Weekly Summaries

1. Go to **Settings → Projects → ottowrite → Issue Alerts**
2. Set up daily digest for MEDIUM priority errors
3. Set up weekly digest for LOW priority errors

### Step 5: Set Up Performance Monitoring

1. Go to **Performance → Settings**
2. Configure transaction thresholds:
   - **API routes:** P95 < 2s, P99 < 5s
   - **AI requests:** P95 < 10s, P99 < 30s
   - **Database queries:** P95 < 500ms, P99 < 1s
   - **Autosave:** P95 < 2s, P99 < 5s

3. Create performance alerts:
   - **Alert name:** "API Performance Degradation"
   - **Filter:** `transaction:"/api/*"`
   - **Threshold:** When P95(transaction.duration) >= 2000ms
   - **Actions:** Email notification

### Step 6: Test Error Capture

After deploying with Sentry credentials:

1. **Test client-side error:**
   ```javascript
   // In browser console on your production site
   throw new Error("Test client error");
   ```

2. **Test server-side error:**
   - Create a test API route that throws an error
   - Call it from production

3. **Verify in Sentry:**
   - Go to **Issues** tab
   - You should see your test errors
   - Check that they're properly classified
   - Verify tags include: `error_priority`, `error_category`, `alert_rule`

4. **Test session replay:**
   - Navigate your production site
   - Trigger an error
   - Go to Sentry → Replays
   - You should see a session recording (with all text/media masked)

---

## Monitoring Dashboard Setup

### Key Metrics to Track

1. **Error Rate**
   - Go to **Dashboards → Create Dashboard**
   - Add widget: Error rate over time
   - Filter by priority: `error_priority:[critical,high]`

2. **Performance Metrics**
   - Add widget: Transaction duration (P50, P95, P99)
   - Filter by critical paths: `/api/ai/*`, `/api/autosave/*`, `/api/stripe/*`

3. **User Impact**
   - Add widget: Affected users
   - Group by: `error_category`

4. **Alert Response Time**
   - Track time to resolution for CRITICAL errors
   - Target: < 15 minutes

### Sentry Integrations (Optional)

1. **Slack Integration**
   - Go to Settings → Integrations → Slack
   - Connect your workspace
   - Configure alert routing to specific channels

2. **GitHub Integration**
   - Link errors to commits
   - Track which deploy introduced an error
   - Automatically assign issues to developers

3. **Vercel Integration**
   - Already configured via environment variables
   - Provides deploy context in errors

---

## Error Budget & SLOs

Based on our alert configuration:

- **Target Error Rate:** < 0.1% (1 error per 1000 requests)
- **Critical Error Budget:** 0 critical errors per day (immediate fix required)
- **High Priority Budget:** < 5 high priority errors per hour
- **Performance SLO:**
  - 95% of API requests < 2 seconds
  - 95% of AI requests < 10 seconds

---

## Cost Optimization

### Free Tier Limits (Sentry)

- **Errors:** 5,000 errors/month
- **Transactions:** 10,000 transactions/month
- **Session Replays:** 500 replays/month

### Current Configuration (Estimated Usage)

**Assumptions:**
- 100,000 requests/month
- 1% error rate = 1,000 errors/month

**Error Tracking:**
- Raw errors: ~1,000/month
- After filtering (NOISE removal): ~700/month ✅ Under limit

**Performance Monitoring:**
- Total transactions: 100,000/month
- Sample rate (client 10%, server 5%): ~7,500/month ✅ Under limit

**Session Replay:**
- Total sessions: 10,000/month
- Normal sessions (1%): 100/month
- Error sessions (100% of ~100 error sessions): 100/month
- Total: ~200/month ✅ Under limit

### If You Exceed Free Tier

Increase sampling rates gradually:
1. Lower trace sample rates to 5% (client) and 2% (server)
2. Lower session replay to 0.5% for normal sessions
3. Consider Team plan ($26/month) if growth continues

---

## Testing Checklist

Before going live, verify:

- [ ] Sentry DSN environment variable set in Vercel production
- [ ] Test error captured and appears in Sentry dashboard
- [ ] Error is correctly classified with tags (priority, category, rule)
- [ ] NOISE errors (404s, browser extensions) are filtered out
- [ ] Session replay captures error scenarios (with privacy masking)
- [ ] Alert rules configured for CRITICAL errors
- [ ] Slack/Email notifications working
- [ ] Source maps uploaded correctly (errors show actual code, not minified)
- [ ] Performance transactions appear in dashboard
- [ ] Request IDs appear in error context

---

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel
2. Verify `NODE_ENV=production` (Sentry disabled in development)
3. Check browser console for Sentry connection errors
4. Verify CSP allows `https://*.sentry.io` connections

### Source Maps Not Working

1. Check `SENTRY_AUTH_TOKEN` is valid
2. Verify `SENTRY_ORG` and `SENTRY_PROJECT` match exactly
3. Look for upload errors in build logs
4. Ensure `hideSourceMaps: true` in next.config.ts

### Too Many Errors

1. Check if NOISE filtering is working (should filter 404s, extensions)
2. Review error logs for patterns
3. Adjust alert thresholds if getting too many notifications
4. Consider lowering sample rates

### Session Replays Not Recording

1. Verify free tier limits not exceeded
2. Check privacy settings aren't blocking (AdBlock, etc.)
3. Ensure browser supports session replay (modern browsers only)
4. Check `replaysOnErrorSampleRate` is set to 1.0

---

## Post-Deployment Verification

After deploying to production:

1. **Day 1:** Monitor dashboard for unexpected error spikes
2. **Day 3:** Review error classification accuracy
3. **Week 1:** Adjust alert thresholds based on actual traffic
4. **Week 2:** Review performance metrics and optimize slow endpoints
5. **Month 1:** Analyze error trends and prioritize fixes

---

## Related Documentation

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Session Replay](https://docs.sentry.io/product/session-replay/)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Environment Variables Guide](../.env.production.example)

---

## Support

If you encounter issues:

1. Check Sentry Status: https://status.sentry.io/
2. Review Sentry Docs: https://docs.sentry.io/
3. Check build logs in Vercel for Sentry upload errors
4. Verify environment variables are correctly set

---

**Summary:** Sentry is production-ready. Just add the environment variables to Vercel and set up alert rules in the Sentry dashboard.
