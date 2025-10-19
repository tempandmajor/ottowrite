# Error Reporting & Monitoring

This document explains the error reporting and monitoring infrastructure for Ottowrite, including Sentry error tracking and Vercel Web Analytics.

## Table of Contents

- [Overview](#overview)
- [Sentry Setup](#sentry-setup)
- [Vercel Analytics Setup](#vercel-analytics-setup)
- [Using Error Reporting](#using-error-reporting)
- [API Route Instrumentation](#api-route-instrumentation)
- [Background Task Monitoring](#background-task-monitoring)
- [Environment Configuration](#environment-configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

We use two complementary monitoring solutions:

1. **Sentry** (Free Tier) - Error tracking, performance monitoring, and session replay
2. **Vercel Web Analytics** (Free) - Page views, visitor metrics, and Web Vitals

### What Gets Monitored

- ✅ **Client-side errors** - JavaScript errors in the browser
- ✅ **Server-side errors** - API route failures, database errors
- ✅ **Background tasks** - AI generation failures, long-running operations
- ✅ **Performance issues** - Slow API requests, page load times
- ✅ **Autosave failures** - Document saving conflicts and errors
- ✅ **AI generation errors** - Model failures, quota exceeded, timeout errors
- ✅ **Payment errors** - Stripe checkout and subscription failures

## Sentry Setup

### Step 1: Create Sentry Account

1. Go to [sentry.io](https://sentry.io/)
2. Sign up for a free account (generous free tier: 5,000 errors/month)
3. Create a new project
4. Select **Next.js** as the platform
5. Copy the DSN (Data Source Name)

### Step 2: Configure Environment Variables

Add these variables to your `.env.local` (local) and Vercel environment (production):

```bash
# Sentry DSN (required)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Sentry auth token for source map uploads (optional, production only)
SENTRY_AUTH_TOKEN=your_auth_token_here

# Sentry organization and project (optional, for source maps)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
```

### Step 3: Enable in Vercel

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the variables above
4. Deploy your application

### Features Enabled

#### Client-Side Monitoring
- JavaScript error tracking
- Performance monitoring (10% sample rate)
- Session replay for debugging (1% of sessions, 100% of errors)
- User feedback collection

#### Server-Side Monitoring
- API route error tracking
- Performance monitoring (5% sample rate)
- Database error tracking
- Background job failures

#### Edge Runtime Monitoring
- Middleware errors
- Edge function failures
- Performance tracking

### Privacy & Security

- All text in session replays is masked by default
- Images and media are blocked from replays
- Authorization headers and cookies are stripped from error reports
- Sensitive query parameters are removed
- User IDs are anonymized (only UUID stored)

## Vercel Analytics Setup

Vercel Web Analytics is **completely free** and privacy-friendly (no cookies, GDPR compliant).

### Step 1: Enable in Vercel Dashboard

1. Go to your Vercel project
2. Click **Analytics** tab
3. Click **Enable Web Analytics**
4. That's it! Already configured in the code.

### What You Get

- Page views and unique visitors
- Top pages and referrers
- Web Vitals (LCP, FID, CLS)
- Geographic distribution
- Device and browser breakdown

**Note**: No code changes needed - already integrated in `app/layout.tsx`

## Using Error Reporting

### Client-Side Error Reporting

For client components, errors are automatically caught by Sentry. For manual reporting:

```typescript
import { reportError } from '@/lib/monitoring/error-reporter'

try {
  // Your code
} catch (error) {
  reportError(error, {
    userId: user.id,
    operation: 'document_save',
    documentId: doc.id,
  })

  // Handle error for user
  toast.error('Failed to save document')
}
```

### Server-Side Error Reporting

For API routes, use the `withAPIErrorHandling` wrapper:

```typescript
import { withAPIErrorHandling, APIErrors } from '@/lib/monitoring/api-wrapper'
import { NextResponse } from 'next/server'

export const POST = withAPIErrorHandling(
  async (request) => {
    // Your handler logic
    const body = await request.json()

    if (!body.name) {
      throw APIErrors.badRequest('Name is required')
    }

    // Process request...

    return NextResponse.json({ success: true })
  },
  { operation: 'create_project' }
)
```

### Specialized Error Reporters

#### AI Generation Errors

```typescript
import { reportAIError } from '@/lib/monitoring/error-reporter'

try {
  const response = await generateWithAI(prompt, model)
} catch (error) {
  reportAIError('text_generation', error, {
    userId: user.id,
    model: 'gpt-5',
    promptLength: prompt.length,
    documentId: doc.id,
  })
}
```

#### Background Task Errors

```typescript
import { reportBackgroundTaskError } from '@/lib/monitoring/error-reporter'

try {
  await processBackgroundTask(task)
} catch (error) {
  reportBackgroundTaskError('plot_analysis', error, {
    userId: user.id,
    projectId: project.id,
    metadata: {
      taskId: task.id,
      retryCount: 3,
    },
  })
}
```

#### Autosave Errors

```typescript
import { reportAutosaveError } from '@/lib/monitoring/error-reporter'

reportAutosaveError('Conflict detected', {
  userId: user.id,
  documentId: doc.id,
  failureType: 'conflict',
  retryCount: 2,
  clientHash: hash1,
  serverHash: hash2,
})
```

#### Database Errors

```typescript
import { reportDatabaseError } from '@/lib/monitoring/error-reporter'

try {
  const { data, error } = await supabase
    .from('documents')
    .insert({ ... })

  if (error) throw error
} catch (error) {
  reportDatabaseError('insert_document', error, {
    userId: user.id,
    table: 'documents',
  })
}
```

#### Payment Errors

```typescript
import { reportPaymentError } from '@/lib/monitoring/error-reporter'

try {
  const session = await stripe.checkout.sessions.create({ ... })
} catch (error) {
  reportPaymentError('create_checkout', error, {
    userId: user.id,
    customerId: customer.id,
    amount: 999,
  })
}
```

## API Route Instrumentation

### Basic Usage

```typescript
import { withAPIErrorHandling } from '@/lib/monitoring/api-wrapper'

export const POST = withAPIErrorHandling(
  async (request) => {
    // Your code here
    return NextResponse.json({ success: true })
  },
  { operation: 'your_operation_name' }
)
```

### Features

- ✅ Automatic error catching and reporting
- ✅ Request/response logging
- ✅ Slow request detection (> 3 seconds)
- ✅ Automatic breadcrumb tracking
- ✅ Request ID generation
- ✅ Context preservation

### Custom API Errors

```typescript
import { APIErrors } from '@/lib/monitoring/api-wrapper'

// 401 Unauthorized
throw APIErrors.unauthorized('Please log in')

// 403 Forbidden
throw APIErrors.forbidden('You do not have permission')

// 404 Not Found
throw APIErrors.notFound('Document not found')

// 400 Bad Request
throw APIErrors.badRequest('Invalid input')

// 429 Too Many Requests
throw APIErrors.tooManyRequests('Rate limit exceeded')

// 500 Internal Server Error
throw APIErrors.internal('Something went wrong')

// 503 Service Unavailable
throw APIErrors.serviceUnavailable('Try again later')
```

## Background Task Monitoring

### Automatic Failure Tracking

Background tasks are automatically monitored. When a task fails:

1. Error is reported to Sentry with full context
2. Task status is updated in database
3. User is notified (if applicable)
4. Retry logic is triggered (if configured)

### Adding Breadcrumbs

Track progress of long-running tasks:

```typescript
import { addBreadcrumb } from '@/lib/monitoring/error-reporter'

// Start of task
addBreadcrumb('Plot analysis started', 'background_task', 'info', {
  projectId: project.id,
  analysisType: 'plot_holes',
})

// Mid-task progress
addBreadcrumb('Analyzing act structure', 'background_task', 'info', {
  currentAct: 2,
  totalActs: 3,
})

// Task completion
addBreadcrumb('Plot analysis completed', 'background_task', 'info', {
  issuesFound: 5,
  duration: 1234,
})
```

Breadcrumbs appear in Sentry error reports to help debug issues.

## Environment Configuration

### Development

In development, errors are logged to console only (unless `SENTRY_DEBUG=true`):

```bash
# .env.local
NODE_ENV=development
SENTRY_DEBUG=false  # Set to true to test Sentry in development
```

### Production

Sentry is automatically enabled in production when `NEXT_PUBLIC_SENTRY_DSN` is set.

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Sentry project DSN |
| `SENTRY_AUTH_TOKEN` | No | For uploading source maps (production) |
| `SENTRY_ORG` | No | Your Sentry organization slug |
| `SENTRY_PROJECT` | No | Your Sentry project name |
| `SENTRY_DEBUG` | No | Enable Sentry in development |

## Best Practices

### Do's

✅ **Use specialized error reporters** for different error types (AI, database, payment, etc.)

✅ **Add context** to error reports (user ID, document ID, operation name)

✅ **Use breadcrumbs** for long-running operations to track progress

✅ **Throw semantic errors** using `APIErrors` helpers

✅ **Filter sensitive data** before reporting (already handled by default)

✅ **Set appropriate severity levels** (fatal, error, warning, info, debug)

### Don'ts

❌ **Don't log sensitive data** (passwords, tokens, API keys)

❌ **Don't report expected errors** (401 Unauthorized, 404 Not Found)

❌ **Don't report in tight loops** (causes noise in Sentry)

❌ **Don't forget to add operation context** (makes debugging harder)

❌ **Don't ignore errors** (always report or handle them)

### Error Categorization

**Report to Sentry:**
- Unexpected server errors (500s)
- Database failures
- AI generation failures
- Payment processing errors
- Background task failures
- Autosave conflicts
- Performance issues (slow requests)

**Don't Report to Sentry:**
- User input validation errors (400s)
- Authentication failures (401s)
- Authorization failures (403s)
- Not found errors (404s)
- Rate limiting (429s)

## Monitoring Dashboard

### Sentry Dashboard

Access your Sentry dashboard at [sentry.io](https://sentry.io)

**Key Metrics:**
- Error count and trends
- Affected users
- Release health
- Performance bottlenecks
- Session replays

**Alerts:**
- Set up alerts for error spikes
- Get notified of new error types
- Monitor release health
- Track performance degradation

### Vercel Analytics Dashboard

Access via Vercel project → **Analytics** tab

**Key Metrics:**
- Page views
- Unique visitors
- Top pages
- Web Vitals (LCP, FID, CLS)
- Geographic distribution

## Troubleshooting

### Errors Not Appearing in Sentry

**Check:**
1. Is `NEXT_PUBLIC_SENTRY_DSN` set correctly?
2. Is `NODE_ENV=production` or `SENTRY_DEBUG=true`?
3. Check browser console for Sentry initialization errors
4. Verify DSN is correct and project exists in Sentry

**Test Sentry:**
```typescript
import * as Sentry from '@sentry/nextjs'

// Trigger test error
Sentry.captureException(new Error('Test error from Ottowrite'))
```

### Source Maps Not Uploading

**Check:**
1. Is `SENTRY_AUTH_TOKEN` set in Vercel?
2. Are `SENTRY_ORG` and `SENTRY_PROJECT` correct?
3. Check build logs for Sentry plugin errors

**Generate auth token:**
1. Go to Sentry → Settings → Developer Settings
2. Create new token with `project:releases` and `org:read` scopes
3. Add to Vercel environment variables

### Too Many Errors Reported

**Solutions:**
1. Increase `ignoreErrors` list in Sentry config
2. Use `beforeSend` to filter errors
3. Adjust sample rates (currently 10% client, 5% server)
4. Add error fingerprinting to group related errors

### Analytics Not Showing

**Check:**
1. Is Vercel Analytics enabled in project settings?
2. Wait 24 hours for data to appear
3. Check that `<Analytics />` is in root layout
4. Verify deployment is successful

## Cost Optimization

### Sentry Free Tier Limits

- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month
- 1 user

**Tips to stay under limits:**
1. Use sampling (10% client, 5% server)
2. Filter common errors in `ignoreErrors`
3. Don't report validation errors
4. Use breadcrumbs instead of extra events

### Vercel Analytics

**Completely free!** No limits on:
- Page views
- Unique visitors
- Web Vitals
- Data retention (90 days)

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Error Reporter Source](../lib/monitoring/error-reporter.ts)
- [API Wrapper Source](../lib/monitoring/api-wrapper.ts)

## Support

If you encounter issues with error reporting:

1. Check this documentation
2. Review Sentry/Vercel documentation
3. Check GitHub issues
4. Ask in team chat
