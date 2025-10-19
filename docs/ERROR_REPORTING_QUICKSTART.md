# Error Reporting Quick Start

Get Sentry and Vercel Analytics up and running in 10 minutes.

## Prerequisites

- Vercel project deployed
- Admin access to Vercel project
- GitHub account (for Sentry signup)

## Setup Steps

### 1. Enable Vercel Analytics (2 minutes)

✅ **Already configured in code!** Just enable in dashboard:

1. Go to your Vercel project
2. Click **Analytics** tab
3. Click **Enable Web Analytics**
4. Done! Analytics will start collecting data

### 2. Set Up Sentry (8 minutes)

#### Create Sentry Account

1. Go to [sentry.io](https://sentry.io/)
2. Sign up with GitHub (free tier: 5,000 errors/month)
3. Create new project → Choose **Next.js**
4. Copy the DSN shown (looks like `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

#### Add DSN to Vercel

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `NEXT_PUBLIC_SENTRY_DSN`
   - **Value**: Paste your DSN
   - **Environments**: All (Production, Preview, Development)
3. Click **Save**

#### Redeploy

1. Go to **Deployments** tab
2. Click ••• on latest deployment → **Redeploy**
3. Wait for deployment to complete

That's it! Error reporting is now active.

## Verify Setup

### Test Sentry (Optional)

Create a test page to verify Sentry is working:

```typescript
// app/test-error/page.tsx
'use client'

export default function TestErrorPage() {
  const triggerError = () => {
    throw new Error('Test error from Ottowrite')
  }

  return (
    <div className="p-8">
      <button onClick={triggerError} className="px-4 py-2 bg-red-500 text-white rounded">
        Trigger Test Error
      </button>
    </div>
  )
}
```

1. Deploy and visit `/test-error`
2. Click the button
3. Check Sentry dashboard for the error
4. Delete the test page

### Check Vercel Analytics

1. Go to Vercel project → **Analytics**
2. Wait 24 hours for data to appear
3. View page views, Web Vitals, and visitor metrics

## Usage Examples

### In API Routes

```typescript
import { withAPIErrorHandling } from '@/lib/monitoring/api-wrapper'

export const POST = withAPIErrorHandling(
  async (request) => {
    // Your code - errors are automatically reported
    return NextResponse.json({ success: true })
  },
  { operation: 'my_operation' }
)
```

### In Client Components

```typescript
import { reportError } from '@/lib/monitoring/error-reporter'

try {
  await saveDocument(doc)
} catch (error) {
  reportError(error, {
    userId: user.id,
    documentId: doc.id,
    operation: 'save_document',
  })

  toast.error('Failed to save')
}
```

## What Gets Tracked

### Automatically Tracked

- ✅ All API route errors
- ✅ Client-side JavaScript errors
- ✅ Unhandled promise rejections
- ✅ React error boundaries
- ✅ Background task failures (already instrumented)
- ✅ Autosave failures (already instrumented)

### What You Need to Add

For specialized operations, use the error reporters:

```typescript
import {
  reportAIError,
  reportDatabaseError,
  reportPaymentError,
} from '@/lib/monitoring/error-reporter'

// AI failures
reportAIError('generation', error, { userId, model: 'gpt-5' })

// Database errors
reportDatabaseError('insert', error, { userId, table: 'documents' })

// Payment errors
reportPaymentError('checkout', error, { userId, customerId })
```

## Monitoring Dashboard

### Sentry

- **URL**: [sentry.io](https://sentry.io)
- **View**: Errors, performance, session replays
- **Alerts**: Email notifications for new errors

### Vercel Analytics

- **URL**: Your Vercel project → Analytics tab
- **View**: Page views, Web Vitals, visitor stats
- **Updates**: Real-time (with ~24hr lag for aggregation)

## Free Tier Limits

### Sentry

- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month

**Our settings:**
- Client performance: 10% sampled (saves quota)
- Server performance: 5% sampled
- Session replay: 1% of sessions, 100% of errors

### Vercel Analytics

**Completely free!** No limits.

## Advanced Setup (Optional)

### Source Maps

For better stack traces in production:

1. Go to Sentry → Settings → Developer Settings
2. Create auth token with `project:releases` and `org:read` scopes
3. Add to Vercel environment variables:
   ```
   SENTRY_AUTH_TOKEN=your_token
   SENTRY_ORG=your_org_slug
   SENTRY_PROJECT=your_project_name
   ```

Source maps will be automatically uploaded on deployment.

### Alerts

Set up email alerts in Sentry:

1. Go to project → **Alerts** → **Create Alert**
2. Choose trigger (e.g., "An issue is first seen")
3. Set action (email, Slack, etc.)
4. Save

## Common Issues

**Errors not appearing in Sentry?**
- Check DSN is correct
- Verify deployment finished
- Wait a few minutes for errors to appear
- Check browser console for Sentry errors

**Analytics not showing?**
- Enable in Vercel dashboard
- Wait 24 hours for data
- Check deployment was successful
- Verify `<Analytics />` component is in root layout (already done)

## Resources

- [Full Documentation](./ERROR_REPORTING.md)
- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)

## Next Steps

1. ✅ Set up Sentry and Vercel Analytics
2. 📝 Set up Sentry alerts for critical errors
3. 📝 Review error reports weekly
4. 📝 Monitor Web Vitals in Vercel Analytics
5. 📝 Add custom error tracking to new features

---

**Questions?** Check the [Full Documentation](./ERROR_REPORTING.md)
