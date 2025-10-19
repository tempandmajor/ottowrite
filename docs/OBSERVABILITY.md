# Observability & Monitoring Dashboard

This document describes the observability infrastructure for Ottowrite, including structured logging, performance monitoring, and SLO tracking.

## Table of Contents

- [Overview](#overview)
- [Structured Logging](#structured-logging)
- [Performance Monitoring](#performance-monitoring)
- [Service Level Objectives (SLOs)](#service-level-objectives-slos)
- [Monitoring Dashboards](#monitoring-dashboards)
- [Alerts](#alerts)
- [Querying Logs](#querying-logs)
- [Best Practices](#best-practices)

## Overview

Our observability stack consists of three layers:

1. **Structured Logging** - JSON-formatted logs for all operations
2. **Performance Monitoring** - Latency tracking and SLO compliance
3. **Error Tracking** - Sentry integration for error reporting

All logs are output in JSON format in production for easy ingestion by log aggregators (Datadog, Logtail, Better Stack, etc.).

## Structured Logging

### Log Levels

- `debug` - Detailed information for debugging
- `info` - General informational messages
- `warn` - Warning messages (degraded performance, non-critical errors)
- `error` - Error conditions
- `fatal` - Critical failures requiring immediate attention

### Log Format

All logs follow this structure:

```json
{
  "timestamp": "2025-01-19T12:34:56.789Z",
  "level": "info",
  "message": "AI request completed: generate",
  "context": {
    "operation": "ai:generate",
    "component": "ai_service",
    "model": "claude-sonnet-4.5",
    "promptLength": 150,
    "completionLength": 500,
    "duration": 2500,
    "tokensUsed": 1200,
    "cost": 0.015,
    "userId": "user-uuid",
    "documentId": "doc-uuid"
  }
}
```

### Using the Logger

```typescript
import { logger } from '@/lib/monitoring/structured-logger'

// Basic logging
logger.info('User logged in', { userId: user.id, method: 'email' })
logger.warn('Slow query detected', { table: 'documents', duration: 1500 })
logger.error('Database connection failed', { host: 'db.example.com' }, error)

// Specialized loggers
logger.aiRequest({
  operation: 'text_generation',
  model: 'gpt-5',
  promptLength: 200,
  duration: 3000,
  success: true,
})

logger.autosave({
  documentId: 'doc-123',
  userId: 'user-456',
  operation: 'complete',
  duration: 150,
  wordCount: 1500,
})

logger.analytics({
  event: 'document_created',
  userId: user.id,
  projectId: project.id,
  value: 1,
})
```

### Child Loggers

Create loggers with default context:

```typescript
const requestLogger = logger.child({
  requestId: crypto.randomUUID(),
  userId: user.id,
})

requestLogger.info('Processing request') // Includes requestId and userId
```

## Performance Monitoring

### Performance Timers

Track operation duration and check against SLOs:

```typescript
import { PerformanceTimer } from '@/lib/monitoring/performance'

const timer = new PerformanceTimer('save_document', 'database')

try {
  await saveDocument()
  timer.end(true) // Record success
} catch (error) {
  timer.end(false) // Record failure
  throw error
}
```

### SLO Tracking

Check SLO compliance:

```typescript
import { performanceMonitor, SLO_TARGETS } from '@/lib/monitoring/performance'

// Get SLO status for a service
const status = performanceMonitor.getSLOStatus('api')
console.log(status)
// {
//   compliant: true,
//   p95_latency: 450,
//   p95_target: 1000,
//   p99_latency: 1200,
//   p99_target: 3000,
//   error_rate: 0.5,
//   error_budget: 1.0,
//   sample_size: 1000
// }

// Get health summary for all services
const health = performanceMonitor.getHealthSummary()
// {
//   api: { status: 'healthy', p95_latency: 450, error_rate: 0.5, sample_size: 1000 },
//   ai_generation: { status: 'degraded', p95_latency: 12000, error_rate: 3.2, sample_size: 500 },
//   ...
// }
```

## Service Level Objectives (SLOs)

### API Endpoints

- **P95 Latency**: < 1000ms
- **P99 Latency**: < 3000ms
- **Error Budget**: 1% (99% success rate)

### AI Generation

- **P95 Latency**: < 10 seconds
- **P99 Latency**: < 30 seconds
- **Error Budget**: 5% (95% success rate)

### Autosave Operations

- **P95 Latency**: < 500ms
- **P99 Latency**: < 2 seconds
- **Error Budget**: 0.5% (99.5% success rate)

### Database Queries

- **P95 Latency**: < 200ms
- **P99 Latency**: < 1 second
- **Error Budget**: 0.1% (99.9% success rate)

### Background Tasks

- **P95 Latency**: < 1 minute
- **P99 Latency**: < 5 minutes
- **Error Budget**: 2% (98% success rate)

## Monitoring Dashboards

### Vercel Log Drains

Set up a log drain to send structured logs to your monitoring platform:

1. Go to Vercel project settings → Integrations → Log Drains
2. Add a drain for your platform (Datadog, Logtail, Better Stack, etc.)
3. Configure the drain with your API key

Logs will be automatically forwarded in JSON format.

### Recommended Dashboards

#### 1. AI Operations Dashboard

**Metrics:**
- AI requests per minute (by model)
- P95/P99 latency by model
- Token usage rate
- Cost per request
- Error rate by model
- Top users by usage

**Query Examples:**

```
// Average latency by model (Logtail/Datadog query)
context.operation:ai:*
| stats avg(context.duration) by context.model

// Error rate by model
context.operation:ai:* level:error
| stats count() by context.model

// Cost tracking
context.operation:ai:*
| stats sum(context.cost) by context.model
```

#### 2. Autosave Health Dashboard

**Metrics:**
- Autosave success rate
- P95/P99 latency
- Conflict rate
- Conflicts by resolution type
- Failed autosaves by user

**Query Examples:**

```
// Autosave success rate
context.operation:autosave:*
| stats count() by context.operation

// Average autosave latency
context.operation:autosave:complete
| stats avg(context.duration)

// Conflict resolution breakdown
context.operation:autosave:conflict
| stats count() by context.conflictResolution
```

#### 3. Performance SLO Dashboard

**Metrics:**
- SLO compliance by service type
- P95/P99 latency trends
- Error budget consumption
- Slow requests (> SLO threshold)

**Query Examples:**

```
// Slow API requests (> 1 second)
context.component:api context.duration:>1000
| stats count(), p95(context.duration) by context.path

// SLO violations
level:warn message:"SLO violation"
| stats count() by context.serviceType

// Error budget consumption
context.component:*
| stats (count(level:error) / count()) * 100 as error_rate by context.component
```

#### 4. Error Budget Dashboard

**Metrics:**
- Error budget remaining (by service)
- Error rate trends
- Top error types
- Mean time to recovery (MTTR)

**Query Examples:**

```
// Error rate by service
level:error
| stats count() by context.component

// Top errors
level:error
| stats count() by message

// Error trends over time
level:error
| timeseries count() by context.component
```

#### 5. User Analytics Dashboard

**Metrics:**
- Active users
- Session duration
- Words written per session
- Feature usage by tier
- Autosave conflicts per user

**Query Examples:**

```
// Active users by plan
context.operation:analytics:*
| stats uniqueCount(context.userId) by context.subscriptionTier

// Average session duration
context.operation:analytics:session_end
| stats avg(context.value)

// Feature usage
context.operation:analytics:*
| stats count() by context.event
```

### Dashboard Tools

**Recommended Platforms:**
- **Logtail** - Easy setup, good for startups ($25/mo)
- **Better Stack** - Great UI, affordable ($20/mo)
- **Datadog** - Enterprise-grade, expensive ($15-31/host/mo)
- **New Relic** - Comprehensive, moderate cost ($99/mo)
- **Grafana Cloud** - Free tier available

## Alerts

### Critical Alerts

Set up alerts for these conditions:

#### High Error Rate
```
Alert: Error rate > 5% for 5 minutes
Query: level:error | stats (count() / total()) * 100 as error_rate
Threshold: error_rate > 5
Notification: Slack, Email, PagerDuty
```

#### SLO Violation
```
Alert: P95 latency exceeds SLO target
Query: context.duration > slo_target | stats count()
Threshold: count > 10 in 5 minutes
Notification: Slack
```

#### AI Generation Failures
```
Alert: AI generation error rate > 10%
Query: context.operation:ai:* level:error
Threshold: error_rate > 10% for 10 minutes
Notification: Email
```

#### Autosave Conflicts Spike
```
Alert: Autosave conflicts > 50/hour
Query: context.operation:autosave:conflict
Threshold: count > 50 per hour
Notification: Slack
```

#### Database Slow Queries
```
Alert: Database query P95 > 500ms
Query: context.component:database | stats p95(context.duration)
Threshold: p95 > 500
Notification: Slack
```

## Querying Logs

### Vercel Logs

View logs in real-time:
```bash
vercel logs --follow
```

Filter by error level:
```bash
vercel logs | grep '"level":"error"'
```

### Log Aggregator Queries

Example queries for different platforms:

#### Logtail
```
// Find slow AI requests
context.operation:ai:* context.duration:>10000

// Find failed autosaves by user
context.operation:autosave:error context.userId:"user-123"

// Find all errors in the last hour
level:error @timestamp:>now-1h
```

#### Datadog
```
// AI request cost over time
service:ottowrite @context.operation:ai:*
| timeseries sum(@context.cost) as total_cost

// P95 latency by endpoint
service:ottowrite @context.component:api
| stats p95(@context.duration) by @context.path
```

#### Better Stack
```
// High latency operations
duration:>3000 | sort duration desc | limit 100

// Error distribution
level:error | count by context.operation
```

## Best Practices

### Logging

✅ **Do:**
- Log all AI requests with cost and duration
- Log autosave operations with conflict details
- Include user IDs for debugging (anonymized)
- Use structured fields consistently
- Log slow operations (> SLO threshold)

❌ **Don't:**
- Log sensitive user data (passwords, content)
- Log high-frequency operations at info level
- Use console.log directly (use logger)
- Log full error stacks in production
- Include PII in logs

### Performance Monitoring

✅ **Do:**
- Use PerformanceTimer for all critical operations
- Check SLO compliance regularly
- Monitor error budgets
- Track latency percentiles (P95, P99)
- Alert on SLO violations

❌ **Don't:**
- Only monitor averages (use percentiles)
- Ignore slow outliers
- Skip performance tracking in background jobs
- Set unrealistic SLO targets

### Dashboard Design

✅ **Do:**
- Group related metrics together
- Show both current and historical data
- Include error rates with latency
- Use percentiles for latency (not averages)
- Set up alerts for critical metrics

❌ **Don't:**
- Create dashboards without clear purpose
- Show too many metrics on one page
- Use vanity metrics
- Forget to document queries

## Cost Optimization

### Log Volume Reduction

- Filter debug logs in production
- Sample high-volume operations
- Use log levels appropriately
- Archive old logs to cheaper storage

### Monitoring Costs

| Platform | Free Tier | Paid Plan | Best For |
|----------|-----------|-----------|----------|
| Logtail | 1 GB/mo | $25/mo (10 GB) | Startups |
| Better Stack | 1 GB/mo | $20/mo (5 GB) | Small teams |
| Datadog | 14-day trial | $15-31/host/mo | Enterprise |
| Grafana Cloud | 10k series | $49/mo | Custom dashboards |

**Recommendation**: Start with Logtail or Better Stack free tier, upgrade as needed.

## Resources

- [Structured Logger Source](../lib/monitoring/structured-logger.ts)
- [Performance Monitor Source](../lib/monitoring/performance.ts)
- [Error Reporter Source](../lib/monitoring/error-reporter.ts)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
- [Logtail Docs](https://betterstack.com/docs/logs/)
- [Datadog Logs](https://docs.datadoghq.com/logs/)

## Support

For issues with observability:

1. Check Vercel logs: `vercel logs`
2. Review log drain status in Vercel settings
3. Verify log format is valid JSON
4. Check dashboard queries in your platform
5. Contact team for dashboard access
