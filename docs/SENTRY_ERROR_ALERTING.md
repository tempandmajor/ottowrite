# Sentry Error Alerting & Monitoring

Comprehensive error monitoring and alerting system using Sentry with intelligent classification, grouping, and notification routing.

## Overview

Our Sentry setup provides:
- **Intelligent error classification** with 4 priority levels
- **Smart error grouping** using custom fingerprints
- **Automated alert routing** based on severity
- **Privacy-first data scrubbing** for sensitive information
- **Session replay** for critical errors
- **Performance monitoring** with custom thresholds

## Architecture

```
Error Occurs
    ↓
Sentry beforeSend Hook
    ↓
Enhanced Classification (lib/monitoring/sentry-config.ts)
    ├─ Match against 14 alert rules
    ├─ Assign priority (CRITICAL/HIGH/MEDIUM/LOW)
    ├─ Categorize (database/api/ai/payment/etc)
    ├─ Generate fingerprint for grouping
    └─ Filter out NOISE
    ↓
Add Context & Tags
    ├─ error_priority
    ├─ error_category
    ├─ alert_rule
    └─ classification details
    ↓
Send to Sentry
    ↓
Alert Rules (Sentry UI)
    ├─ CRITICAL → Immediate (Slack, PagerDuty, Email)
    ├─ HIGH → Batched 15min (Slack, Email)
    ├─ MEDIUM → Daily summary (Email)
    └─ LOW → Weekly summary (Email)
```

## Error Priority Levels

### CRITICAL (Immediate Action Required)

**Channels**: Slack, PagerDuty, Email
**Frequency**: Immediate (alert on first occurrence)

Examples:
- Database connection failures
- Authentication system down
- Payment processing failures
- Service completely unavailable

**Alert Threshold**: 1 error in 1 minute

### HIGH (Action Required Within Hours)

**Channels**: Slack, Email
**Frequency**: Batched (every 15 minutes)

Examples:
- AI generation high failure rate
- Autosave failures (data loss risk)
- Rate limit abuse (security)
- Repeated API failures

**Alert Threshold**: 5 errors in 15 minutes

### MEDIUM (Action Required Within Days)

**Channels**: Email
**Frequency**: Daily summary

Examples:
- Database query errors
- External API integration failures
- Export failures
- Occasional timeouts

**Alert Threshold**: 10 errors in 24 hours

### LOW (Monitor Only)

**Channels**: Email
**Frequency**: Weekly summary

Examples:
- Network timeouts (transient)
- Client-side UI errors
- Performance degradation
- Edge cases

**Alert Threshold**: 50 errors in 7 days

### NOISE (Filtered Out)

**Action**: Automatically filtered, not sent to Sentry

Examples:
- 404 errors (expected user behavior)
- Browser extension interference
- User-cancelled actions
- Expected validation errors

## Error Categories

Each error is categorized for better organization and routing:

| Category | Description | Examples |
|----------|-------------|----------|
| `database` | Database connectivity, queries | Connection failures, query errors |
| `api` | API route errors | 500 errors, external API failures |
| `network` | Network-related issues | Timeouts, connection refused |
| `authentication` | Auth system failures | Login failures, session errors |
| `ai` | AI generation errors | Model failures, quota exceeded |
| `autosave` | Autosave failures | Conflict errors, save failures |
| `payment` | Stripe/payment errors | Charge failures, webhook errors |
| `export` | Document export errors | PDF/DOCX generation failures |
| `ui` | Client-side rendering | React errors, unhandled rejections |
| `browser` | Browser-specific issues | Extension conflicts |
| `performance` | Slow operations | API timeout, slow queries |
| `security` | Security-related | Rate limit abuse, unauthorized access |
| `unknown` | Uncategorized errors | Fallback category |

## Alert Rules

### 1. Database Connection Failure (CRITICAL)

**Matches**:
- `ECONNREFUSED`
- "connection refused"
- "database is down"
- PostgresError 53300 (too many connections)

**Fingerprint**: `['database', 'connection', 'failure']`

**Why Critical**: App is likely completely down

---

### 2. Payment Processing Failure (CRITICAL)

**Matches**:
- Errors with `operation` tag containing "payment"
- Errors containing "stripe" or "payment failed"

**Fingerprint**: `['payment', 'processing', 'failure']`

**Why Critical**: Direct revenue impact

---

### 3. Authentication System Failure (CRITICAL)

**Matches**:
- `AuthApiError`
- "Supabase auth" errors
- Auth operations returning 500

**Fingerprint**: `['auth', 'system', 'failure']`

**Why Critical**: Users cannot log in

---

### 4. AI Generation High Failure Rate (HIGH)

**Matches**:
- Errors with `operation` tag starting with "ai:"
- Errors with `ai_model` tag

**Fingerprint**: `['ai', 'generation', 'failure']`

**Why High**: Core feature degraded

---

### 5. Autosave Failure (HIGH)

**Matches**:
- `operation` tag = "autosave"
- Presence of `autosave` context

**Fingerprint**: `['autosave', 'failure']`

**Why High**: Potential data loss

---

### 6. Rate Limit Abuse (HIGH)

**Matches**:
- HTTP 429 status
- Error contains "rate limit"

**Fingerprint**: `['security', 'rate_limit', 'abuse']`

**Why High**: Potential security threat or abuse

---

### 7-14. Additional Rules

See `lib/monitoring/sentry-config.ts` for complete list including:
- Database query errors (MEDIUM)
- External API failures (MEDIUM)
- Export failures (MEDIUM)
- Network timeouts (LOW)
- UI render errors (LOW)
- 404 errors (NOISE)
- Browser extensions (NOISE)
- User cancellations (NOISE)

## Error Fingerprinting

Fingerprints group similar errors together in Sentry. We use intelligent fingerprinting:

### Predefined Fingerprints

For known error types (from alert rules):
```typescript
fingerprint: ['database', 'connection', 'failure']
fingerprint: ['ai', 'generation', 'failure']
fingerprint: ['payment', 'processing', 'failure']
```

### Dynamic Fingerprints

For uncategorized errors, we generate fingerprints from:
1. **Error type**: `TypeError`, `NetworkError`, etc.
2. **Operation**: From tags like `operation: "api:characters"`
3. **HTTP status**: `status-500`, `status-429`, etc.
4. **Module/Component**: From stack trace

Example:
```typescript
// Error in AI generation returning 500
fingerprint: ['AIError', 'ai:generate', 'status-500', 'ai-service']
```

### Benefits

- **Better grouping**: Similar errors grouped together
- **Reduced noise**: 100 identical errors = 1 issue
- **Easier debugging**: See all instances of an issue
- **Trend analysis**: Track error frequency over time

## Setting Up Alerts in Sentry

### Prerequisites

1. **Sentry Account**: Create at https://sentry.io
2. **Environment Variables**: Set in Vercel or `.env.local`
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   SENTRY_ORG=your-org
   SENTRY_PROJECT=ottowrite
   SENTRY_AUTH_TOKEN=your-auth-token
   ```

### Step 1: Create Alert Rules

Navigate to **Alerts** → **Create Alert Rule**

#### CRITICAL Alerts

**Rule**: Database Connection Failures
- **Condition**: `event.tags.error_priority:critical AND event.tags.error_category:database`
- **Threshold**: 1 event in 1 minute
- **Actions**:
  - Send Slack notification to `#critical-alerts`
  - Page on-call engineer via PagerDuty
  - Email engineering team

**Rule**: Payment Processing Failures
- **Condition**: `event.tags.error_priority:critical AND event.tags.error_category:payment`
- **Threshold**: 1 event in 1 minute
- **Actions**:
  - Send Slack notification to `#critical-alerts`
  - Email finance team
  - Create Jira ticket (P0)

**Rule**: Authentication System Down
- **Condition**: `event.tags.error_priority:critical AND event.tags.error_category:authentication`
- **Threshold**: 1 event in 1 minute
- **Actions**:
  - Send Slack notification to `#critical-alerts`
  - Page on-call engineer
  - Email engineering team

#### HIGH Priority Alerts

**Rule**: AI Generation Failures
- **Condition**: `event.tags.error_priority:high AND event.tags.error_category:ai`
- **Threshold**: 5 events in 15 minutes
- **Actions**:
  - Send Slack notification to `#high-priority-alerts`
  - Email AI team
  - Create Linear ticket (High)

**Rule**: Autosave Failures
- **Condition**: `event.tags.error_priority:high AND event.tags.error_category:autosave`
- **Threshold**: 5 events in 15 minutes
- **Actions**:
  - Send Slack notification to `#high-priority-alerts`
  - Email engineering team

**Rule**: Rate Limit Abuse
- **Condition**: `event.tags.error_priority:high AND event.tags.error_category:security`
- **Threshold**: 5 events in 15 minutes
- **Actions**:
  - Send Slack notification to `#security-alerts`
  - Email security team
  - Create incident report

#### MEDIUM Priority Alerts

**Rule**: Daily Error Summary
- **Condition**: `event.tags.error_priority:medium`
- **Threshold**: 10 events in 24 hours
- **Actions**:
  - Email daily summary to engineering team
  - Post to `#dev-monitoring` Slack channel

#### LOW Priority Alerts

**Rule**: Weekly Error Summary
- **Condition**: `event.tags.error_priority:low`
- **Threshold**: 50 events in 7 days
- **Actions**:
  - Email weekly summary to engineering team

### Step 2: Configure Integrations

#### Slack Integration

1. Go to **Settings** → **Integrations** → **Slack**
2. Connect workspace
3. Create channels:
   - `#critical-alerts` (CRITICAL errors)
   - `#high-priority-alerts` (HIGH errors)
   - `#security-alerts` (Security issues)
   - `#dev-monitoring` (Daily summaries)
4. Configure notification format:
   ```
   🚨 [CRITICAL] {title}
   Category: {error_category}
   Rule: {alert_rule}
   Priority: {error_priority}
   Environment: {environment}
   Count: {count} occurrences
   Link: {url}
   ```

#### Email Integration

1. Go to **Settings** → **Integrations** → **Email**
2. Add recipients:
   - CRITICAL: `oncall@company.com`, `engineering@company.com`
   - HIGH: `engineering@company.com`, `ai-team@company.com`
   - MEDIUM: `engineering@company.com`
   - LOW: `engineering@company.com`
3. Configure digest frequency:
   - CRITICAL/HIGH: Immediate
   - MEDIUM: Daily digest
   - LOW: Weekly digest

#### PagerDuty Integration (Optional)

1. Go to **Settings** → **Integrations** → **PagerDuty**
2. Connect PagerDuty service
3. Configure escalation:
   - CRITICAL errors → Immediate page
   - Escalate after 5 minutes if not acknowledged

### Step 3: Configure Performance Monitoring

Create **Metric Alerts** for performance thresholds:

#### API Response Time

**Alert**: API Slow Response
- **Metric**: `transaction.duration`
- **Condition**: p95 > 2000ms for 5 minutes
- **Filter**: `transaction.op:http.server`
- **Action**: Slack notification to `#performance`

#### AI Request Duration

**Alert**: AI Requests Slow
- **Metric**: `transaction.duration`
- **Condition**: p95 > 10000ms for 10 minutes
- **Filter**: `transaction:ai.*`
- **Action**: Email AI team

#### Database Query Time

**Alert**: Database Slow Queries
- **Metric**: `transaction.duration`
- **Condition**: p95 > 500ms for 5 minutes
- **Filter**: `transaction.op:db.query`
- **Action**: Email database team

#### Error Rate

**Alert**: High Error Rate
- **Metric**: `error_rate`
- **Condition**: > 1% for 5 minutes
- **Action**: Page on-call, Slack `#critical-alerts`

## Privacy & Security

### Data Scrubbing

All sensitive data is automatically scrubbed before sending to Sentry:

#### Headers Removed
- `authorization`
- `cookie`
- `x-supabase-auth`

#### Query Parameters Scrubbed
- `token`
- `key`
- `secret`
- `password`
- `api_key`
- `apikey`

#### Session Replay Privacy
- `maskAllText: true` - All text masked
- `blockAllMedia: true` - No images/videos captured
- `maskAllInputs: true` - Form inputs masked

### PII Handling

- **User IDs**: Included for debugging (hashed in production)
- **Email addresses**: NOT sent to Sentry
- **Passwords**: NEVER logged
- **API keys**: Scrubbed from requests
- **Payment info**: Redacted (Stripe customer ID only)

## Session Replay

Session replay captures user interactions for debugging critical errors.

### Configuration

- **Normal sessions**: 1% sample rate
- **Error sessions**: 100% sample rate for CRITICAL/HIGH priority
- **Privacy**: All text, media, and inputs masked

### When Replays Are Captured

```typescript
CRITICAL errors:
  ✓ Database connection failures
  ✓ Payment processing failures
  ✓ Authentication failures

HIGH errors:
  ✓ AI generation failures
  ✓ Autosave failures
  ✓ Security incidents

MEDIUM/LOW errors:
  ✗ No replay (too many to be useful)
```

### Viewing Replays

1. Go to **Issues** in Sentry
2. Click on an error
3. Navigate to **Replays** tab
4. Click replay to watch session

**What You'll See**:
- User actions (clicks, navigation)
- Console logs
- Network requests
- DOM mutations
- **NOT visible**: Text content, images, form data (privacy)

## Performance Thresholds

Alerts trigger when operations exceed these thresholds:

### API Routes
- **p50**: 500ms
- **p95**: 2000ms
- **p99**: 5000ms

### AI Operations
- **p50**: 3000ms
- **p95**: 10000ms
- **p99**: 30000ms

### Database Queries
- **p50**: 100ms
- **p95**: 500ms
- **p99**: 1000ms

### Autosave
- **p50**: 500ms
- **p95**: 2000ms
- **p99**: 5000ms

## Error Rate Thresholds

Alerts based on error percentage:

- **1%**: CRITICAL - Immediate alert
- **0.5%**: HIGH - Alert within 15 minutes
- **0.1%**: MEDIUM - Daily summary

## Troubleshooting

### Errors Not Appearing in Sentry

**Check**:
1. `NEXT_PUBLIC_SENTRY_DSN` is set
2. `NODE_ENV=production` (Sentry disabled in development)
3. Error not in NOISE category
4. Browser console for Sentry SDK errors

**Debug**:
```typescript
// Add to error reporter
console.log('Sending to Sentry:', {
  error,
  context,
  classification: classifyError(event)
})
```

### Too Many Alerts

**Solutions**:
1. **Increase thresholds**: 5 errors → 10 errors
2. **Add to NOISE**: Update alert rules to filter out
3. **Improve fingerprinting**: Better error grouping
4. **Fix the bugs**: 🙂

**Example - Too Many 404s**:
```typescript
// 404s are already NOISE, but if you're getting alerts:
// 1. Check alert rules in Sentry UI
// 2. Verify beforeSend is filtering correctly
// 3. Add more specific 404 matching
```

### Missing Critical Errors

**Solutions**:
1. **Review alert rules**: Check matching logic
2. **Lower thresholds**: 5 errors → 1 error
3. **Add error category**: Update `ALERT_RULES`
4. **Check Sentry filters**: UI may be filtering

**Example - New Payment Provider**:
```typescript
// Add to ALERT_RULES in sentry-config.ts
{
  name: 'New Payment Provider Failure',
  category: ErrorCategory.PAYMENT,
  priority: ErrorPriority.CRITICAL,
  matcher: (event) => {
    return event.exception?.values?.[0]?.value?.includes('new-provider')
  },
  fingerprint: ['payment', 'new-provider', 'failure'],
  description: 'New payment provider failures',
}
```

### Session Replays Not Working

**Check**:
1. Error is CRITICAL or HIGH priority
2. User gave consent (if consent required)
3. Replay integration enabled
4. Not using ad blocker

**Debug**:
```typescript
// Check if replay should be captured
import { classifyError } from '@/lib/monitoring/sentry-config'

const classification = classifyError(event)
console.log('Replay?',
  classification.priority === ErrorPriority.CRITICAL ||
  classification.priority === ErrorPriority.HIGH
)
```

## Best Practices

### 1. Use Structured Error Reporting

```typescript
import { reportError } from '@/lib/monitoring/error-reporter'

// ✅ Good - Rich context
reportError(error, {
  userId: user.id,
  documentId: doc.id,
  operation: 'document:autosave',
  metadata: {
    wordCount: content.length,
    retryCount: 3,
  }
})

// ❌ Bad - No context
throw error
```

### 2. Add Breadcrumbs for Debugging

```typescript
import { addBreadcrumb } from '@/lib/monitoring/error-reporter'

addBreadcrumb(
  'Starting AI generation',
  'ai',
  'info',
  { model: 'claude-3', promptLength: 1500 }
)

// ... operation ...

addBreadcrumb(
  'AI generation failed',
  'ai',
  'error',
  { errorCode: 'quota_exceeded' }
)
```

### 3. Use Error Wrapping

```typescript
import { withErrorReporting } from '@/lib/monitoring/error-reporter'

const saveDocument = withErrorReporting(
  async (docId: string, content: string) => {
    // Function logic
  },
  'document:save',
  (docId) => ({ documentId: docId })
)
```

### 4. Monitor Performance

```typescript
import { logger } from '@/lib/monitoring/structured-logger'

const startTime = Date.now()
// ... operation ...
const duration = Date.now() - startTime

logger.api({
  method: 'POST',
  path: '/api/documents',
  statusCode: 200,
  duration,
  userId: user.id,
})

// Sentry will track p50/p95/p99 automatically
```

### 5. Regular Alert Review

**Weekly**:
- Review LOW priority errors
- Identify patterns
- Update fingerprints if needed

**Monthly**:
- Review alert thresholds
- Check false positive rate
- Update alert rules

**Quarterly**:
- Performance baseline review
- Update thresholds
- Team postmortem review

## Testing Alerts

### Local Testing (Development)

Alerts are disabled in development, but you can test classification:

```typescript
import { classifyError } from '@/lib/monitoring/sentry-config'

const mockEvent = {
  exception: {
    values: [{
      type: 'Error',
      value: 'ECONNREFUSED: database connection failed'
    }]
  },
  tags: {},
  contexts: {}
}

const classification = classifyError(mockEvent)
console.log(classification)
// {
//   priority: 'critical',
//   category: 'database',
//   ruleName: 'Database Connection Failure',
//   description: 'Database connection failures - app likely down'
// }
```

### Staging Testing

Deploy to staging with Sentry enabled:

```bash
# Set in Vercel staging environment
SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_DSN=your-dsn
```

Trigger test errors:

```typescript
// Test CRITICAL alert
throw new Error('ECONNREFUSED: database connection refused')

// Test HIGH alert
import { reportError } from '@/lib/monitoring/error-reporter'
reportError(new Error('AI generation failed'), {
  operation: 'ai:generate',
  metadata: { model: 'gpt-4' }
})

// Test session replay
throw new Error('CRITICAL: Payment processing failed')
// Check Sentry for replay capture
```

### Production Monitoring

**Initial Deployment**:
1. Deploy to production
2. Monitor Sentry for 24 hours
3. Adjust thresholds if too noisy
4. Verify critical alerts working

**Ongoing**:
- Check Sentry dashboard daily
- Review weekly summaries
- Tune alert rules monthly

## Dashboard & Reporting

### Key Metrics to Track

1. **Error Rate**: Overall error percentage
2. **CRITICAL Alerts**: Count per day
3. **Mean Time to Resolution (MTTR)**: Time from alert to fix
4. **Top Error Categories**: Which areas have most errors
5. **Performance Trends**: p95 response time over time

### Custom Dashboards

Create in Sentry **Dashboards**:

#### Engineering Health Dashboard
- Error rate (last 24h)
- CRITICAL alerts (last 7d)
- TOP 10 errors by volume
- Performance by endpoint (p95)

#### Product Health Dashboard
- AI generation success rate
- Autosave failure rate
- Export success rate
- User-impacting errors

#### Security Dashboard
- Rate limit violations
- Authentication failures
- Suspicious activity patterns
- API abuse attempts

## FAQ

**Q: Why are 404 errors not sent to Sentry?**
A: 404s are expected user behavior (clicking old links, typos in URLs). They're classified as NOISE and filtered out to reduce costs and noise.

**Q: Can I override the priority for a specific error?**
A: Yes! Update `ALERT_RULES` in `lib/monitoring/sentry-config.ts` to add a more specific matcher that runs first.

**Q: Why don't I see all errors in Sentry?**
A: We use sampling (5-10% of transactions) to reduce costs. Errors are always captured, but performance traces are sampled.

**Q: How much does Sentry cost?**
A: Sentry has a free tier (5k errors/month). We're optimized to stay within this by filtering NOISE errors. Production apps typically need paid tier ($26+/month).

**Q: Can I test alerts without deploying to production?**
A: Yes! Use staging environment with `SENTRY_ENVIRONMENT=staging` and create separate alert rules for staging.

**Q: What if I need a custom alert that's not covered?**
A: Add a new rule to `ALERT_RULES` in `lib/monitoring/sentry-config.ts` and redeploy. The new rule will take effect immediately.

## Related Documentation

- [Request/Response Logging](./REQUEST_RESPONSE_LOGGING.md)
- [API Rate Limiting](./RATE_LIMITING.md)
- [Error Handling Best Practices](./ERROR_HANDLING.md)
- [Monitoring & Observability](./MONITORING.md)

## Support

**Sentry Documentation**: https://docs.sentry.io
**Status Page**: https://status.sentry.io
**Support**: support@sentry.io
