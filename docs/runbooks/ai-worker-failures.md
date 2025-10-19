# AI Worker Failures Runbook

**Priority:** 🟡 **HIGH** - User experience impacted
**Response Time:** <1 hour
**Last Updated:** January 19, 2025

## Table of Contents

- [Overview](#overview)
- [Symptoms](#symptoms)
- [Impact Assessment](#impact-assessment)
- [Common Failure Modes](#common-failure-modes)
- [Diagnosis](#diagnosis)
- [Resolution Steps](#resolution-steps)
- [API Provider Specific](#api-provider-specific)
- [Background Task Recovery](#background-task-recovery)
- [Prevention](#prevention)
- [Monitoring](#monitoring)

## Overview

AI generation is a core feature powering content generation, plot analysis, character development, and ensemble suggestions. Failures can significantly impact user experience.

**Architecture:**
- Frontend: Streaming responses via Server-Sent Events (SSE)
- API Routes: `/api/ai/generate`, `/api/ai/ensemble`, `/api/ai/background-task`
- AI Providers: OpenAI (GPT-5), Anthropic (Claude Sonnet 4.5), DeepSeek (v3)
- Background Processing: Long-running tasks via `/api/ai/background-task`
- Rate Limiting: 10 requests/minute (standard), 5 requests/minute (expensive)

## Symptoms

### User-Reported

- ❌ "AI generation is stuck/loading forever"
- ❌ "I got an error: 'AI service unavailable'"
- ❌ "The AI response was cut off mid-sentence"
- ❌ "My request timed out"

### System Indicators

1. **Sentry Alerts**
   - Search: `"AI generation" OR "OpenAI" OR "Anthropic" OR "DeepSeek"`
   - Common errors:
     - `OpenAIError: timeout`
     - `AnthropicError: rate_limit_exceeded`
     - `AIServiceError: max_tokens_exceeded`

2. **Vercel Logs**
   ```bash
   vercel logs production --since 1h | grep -i "ai\|openai\|anthropic"
   ```

3. **Database Telemetry**
   ```sql
   -- Check AI request failures
   SELECT
     status,
     error_code,
     COUNT(*) as count,
     AVG(duration_ms) as avg_duration
   FROM ai_requests
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY status, error_code
   ORDER BY count DESC;
   ```

4. **Performance Metrics**
   - P95 latency >30 seconds
   - Error rate >5%
   - Timeout rate >2%

## Impact Assessment

### Severity Levels

| Severity | Indicators | Impact | Response |
|----------|-----------|---------|----------|
| **P0 - Critical** | All AI features down, >50 errors/min | No AI generation possible | Immediate, all hands |
| **P1 - High** | One provider down, 10-50 errors/min | Degraded experience | <1 hour response |
| **P2 - Medium** | Slow responses, 5-10 errors/min | Users experiencing delays | <4 hour response |
| **P3 - Low** | Occasional timeouts, <5 errors/min | Minimal impact | <24 hour response |

### Business Impact

```sql
-- Calculate lost AI generation value (last hour)
SELECT
  COUNT(*) as failed_requests,
  COUNT(*) * 0.10 as estimated_lost_revenue_usd,
  COUNT(DISTINCT user_id) as affected_users
FROM ai_requests
WHERE
  created_at > NOW() - INTERVAL '1 hour'
  AND status = 'failed';
```

## Common Failure Modes

### 1. Provider API Outage

**Symptoms:**
- All requests to specific provider failing
- 503 Service Unavailable errors
- Connection timeout errors

**Providers:**
- OpenAI: https://status.openai.com/
- Anthropic: https://status.anthropic.com/
- DeepSeek: Check their status page

**Quick Check:**
```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4.5","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}'
```

### 2. Rate Limit Exceeded

**Symptoms:**
- 429 Too Many Requests
- `rate_limit_exceeded` error code
- Errors during high traffic periods

**Check Current Usage:**
```typescript
// OpenAI Dashboard
// https://platform.openai.com/account/usage

// Anthropic Console
// https://console.anthropic.com/settings/limits
```

**Application Rate Limits:**
```typescript
// lib/security/rate-limiter.ts
RateLimits.AI_GENERATE: 10 req/min
RateLimits.AI_EXPENSIVE: 5 req/min
```

### 3. Token Limit Exceeded

**Symptoms:**
- `max_tokens_exceeded` error
- Responses cut off mid-sentence
- Context length errors

**Token Limits:**
- GPT-5: 128,000 tokens
- Claude Sonnet 4.5: 200,000 tokens
- DeepSeek v3: 64,000 tokens

**Check Request Size:**
```sql
SELECT
  id,
  model,
  LENGTH(prompt) as prompt_length,
  LENGTH(response) as response_length,
  tokens_used,
  created_at
FROM ai_requests
WHERE
  status = 'failed'
  AND error_code LIKE '%token%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Timeout Errors

**Symptoms:**
- Function timeout after 60 seconds
- Partial responses
- `ETIMEDOUT` errors

**Causes:**
- Complex prompts requiring long processing
- Model slowdown during high load
- Network latency issues

**Current Timeouts:**
```typescript
// app/api/ai/generate/route.ts
export const maxDuration = 60; // 60 seconds

// app/api/ai/ensemble/route.ts
export const maxDuration = 60;

// app/api/ai/background-task/route.ts
export const maxDuration = 300; // 5 minutes
```

### 5. Invalid API Keys

**Symptoms:**
- 401 Unauthorized errors
- `invalid_api_key` error code
- Sudden failures across all requests

**Verify Keys:**
```bash
# Check environment variables
vercel env pull .env.local

# Verify keys are set
grep -i "api_key" .env.local | head -n 5

# Test keys (don't log output!)
node -e "
const openai = process.env.OPENAI_API_KEY;
const anthropic = process.env.ANTHROPIC_API_KEY;
console.log('OpenAI key:', openai ? 'SET (length: ' + openai.length + ')' : 'MISSING');
console.log('Anthropic key:', anthropic ? 'SET (length: ' + anthropic.length + ')' : 'MISSING');
"
```

## Diagnosis

### Step 1: Identify Failure Pattern

```bash
# Check error distribution by provider
supabase db remote execute --sql "
  SELECT
    model,
    status,
    error_code,
    COUNT(*) as count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
  FROM ai_requests
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY model, status, error_code
  ORDER BY count DESC;
"

# Check Sentry for patterns
# Navigate to: Issues > filter by "ai"
# Look for: spike in errors, new error types, geographic patterns
```

### Step 2: Check Provider Status

```bash
# OpenAI status
curl -s https://status.openai.com/api/v2/status.json | jq .

# Anthropic status
curl -s https://status.anthropic.com/api/v2/status.json | jq .

# Check our own health endpoint
curl https://your-app.vercel.app/api/health
```

### Step 3: Reproduce Locally

```bash
# 1. Start dev server
npm run dev

# 2. Open editor
# Navigate to: http://localhost:3000/dashboard/editor/[test-id]

# 3. Trigger AI generation
# Select text and click "AI Assistant" > "Continue writing"

# 4. Monitor network tab
# Check: Request payload, response, timing

# 5. Check server logs
# Terminal should show: AI request logs, errors if any
```

### Step 4: Check Resource Usage

```bash
# Vercel function invocations
# Dashboard > Analytics > Function Invocations

# Database connections
supabase db remote execute --sql "
  SELECT
    COUNT(*) as active_connections,
    MAX(state) as state
  FROM pg_stat_activity
  WHERE application_name LIKE '%supabase%';
"

# Memory usage (Vercel dashboard)
# Check for: OOM errors, high memory spikes
```

## Resolution Steps

### Scenario 1: Provider Outage (OpenAI Down)

**Diagnosis:** All OpenAI requests failing, status page shows incident

**Resolution:**

1. **Switch to fallback provider**
   ```typescript
   // lib/ai/service.ts
   // Temporarily override model selection
   if (selectedModel === 'gpt-5') {
     selectedModel = 'claude-sonnet-4.5'; // Fallback to Anthropic
   }
   ```

2. **Deploy hotfix**
   ```bash
   git add lib/ai/service.ts
   git commit -m "hotfix: fallback to Claude due to OpenAI outage"
   git push origin main
   ```

3. **Notify users**
   - Post status update: "We're experiencing issues with our AI provider. We've switched to a backup system and service should be restored."

4. **Monitor resolution**
   ```bash
   # Watch error rate
   vercel logs production --since 5m | grep "AI generation" | grep "error"
   ```

5. **Revert when provider recovers**
   ```bash
   git revert HEAD
   git push origin main
   ```

### Scenario 2: Rate Limit Exceeded

**Diagnosis:** 429 errors from provider, usage dashboard shows limits hit

**Resolution:**

1. **Immediate: Implement queue**
   ```typescript
   // lib/ai/queue.ts (create new file)
   const queue: Array<() => Promise<void>> = [];
   const CONCURRENT_LIMIT = 5;

   export async function enqueueAIRequest<T>(
     fn: () => Promise<T>
   ): Promise<T> {
     return new Promise((resolve, reject) => {
       queue.push(async () => {
         try {
           const result = await fn();
           resolve(result);
         } catch (error) {
           reject(error);
         }
       });
       processQueue();
     });
   }
   ```

2. **Short-term: Increase rate limits**
   - Contact provider to request limit increase
   - OpenAI: https://platform.openai.com/account/limits
   - Anthropic: Contact support

3. **Long-term: Optimize usage**
   ```typescript
   // Reduce token usage
   const optimizedPrompt = truncatePrompt(prompt, MAX_SAFE_TOKENS);

   // Cache common responses
   const cacheKey = hashPrompt(prompt);
   const cached = await getFromCache(cacheKey);
   if (cached) return cached;
   ```

### Scenario 3: Timeout Issues

**Diagnosis:** Requests timing out after 60 seconds

**Resolution:**

1. **Increase timeout for specific routes**
   ```typescript
   // app/api/ai/generate/route.ts
   export const maxDuration = 90; // Increase to 90 seconds
   ```

2. **Implement streaming for long responses**
   ```typescript
   // Already implemented via SSE
   // Verify streaming is working:
   const stream = await openai.chat.completions.create({
     model: 'gpt-5',
     messages: [...],
     stream: true, // IMPORTANT
   });
   ```

3. **Move to background task if very long**
   ```typescript
   // For operations >60 seconds
   const taskId = await createBackgroundTask({
     type: 'ai_generation',
     prompt,
     model,
   });

   return NextResponse.json({ taskId });
   ```

4. **Optimize prompt to reduce processing time**
   ```typescript
   // Reduce context size
   const context = truncateContext(fullContext, 4000); // Limit tokens

   // Simplify prompt
   const prompt = simplifyPrompt(userPrompt);
   ```

### Scenario 4: Invalid API Keys

**Diagnosis:** 401 errors, all requests failing with auth errors

**Resolution:**

1. **Verify keys in Vercel environment**
   ```bash
   # Production
   vercel env ls production

   # Check if keys are set
   vercel env pull .env.production
   cat .env.production | grep API_KEY
   ```

2. **Rotate compromised keys**
   ```bash
   # Generate new keys from provider dashboard
   # OpenAI: https://platform.openai.com/api-keys
   # Anthropic: https://console.anthropic.com/settings/keys

   # Update in Vercel
   vercel env add OPENAI_API_KEY production
   # Paste new key when prompted

   vercel env add ANTHROPIC_API_KEY production
   # Paste new key when prompted
   ```

3. **Redeploy to pick up new keys**
   ```bash
   vercel --prod
   ```

4. **Revoke old keys immediately**
   - Prevents continued unauthorized use

## API Provider Specific

### OpenAI

**Common Issues:**
- Model deprecation warnings
- Context window exceeded
- Safety filter rejections

**Debugging:**
```bash
# Test API directly
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

**Error Codes:**
- `rate_limit_exceeded`: Slow down requests
- `context_length_exceeded`: Reduce prompt size
- `invalid_api_key`: Rotate key
- `model_not_found`: Check model name

### Anthropic (Claude)

**Common Issues:**
- API version mismatches
- Token counting differences
- System message formatting

**Debugging:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4.5",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Error Codes:**
- `rate_limit_error`: Implement backoff
- `overloaded_error`: Retry with exponential backoff
- `invalid_request_error`: Check request format

### DeepSeek

**Common Issues:**
- Regional availability
- Model capabilities

**Debugging:**
```bash
# Check DeepSeek API status
# Documentation: https://api-docs.deepseek.com/
```

## Background Task Recovery

For long-running AI tasks that failed:

### Check Background Task Status

```sql
SELECT
  id,
  type,
  status,
  error_message,
  created_at,
  completed_at
FROM background_tasks
WHERE
  type LIKE '%ai%'
  AND status IN ('failed', 'timeout')
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Retry Failed Task

```bash
# Manual retry via API
curl -X POST https://your-app.vercel.app/api/ai/background-task/retry \
  -H "Content-Type: application/json" \
  -d '{"taskId": "[task-id]"}'
```

### Bulk Retry

```sql
-- Mark failed tasks for retry
UPDATE background_tasks
SET
  status = 'pending',
  retry_count = retry_count + 1,
  error_message = NULL
WHERE
  status = 'failed'
  AND retry_count < 3
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Prevention

### 1. Implement Circuit Breaker

```typescript
// lib/ai/circuit-breaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= 5) {
      this.state = 'open';
    }
  }
}
```

### 2. Implement Exponential Backoff

```typescript
// lib/ai/retry.ts
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Add Request Timeouts

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}
```

### 4. Monitor Token Usage

```sql
-- Create alert for high token usage
CREATE OR REPLACE FUNCTION check_token_usage()
RETURNS void AS $$
DECLARE
  daily_usage INTEGER;
BEGIN
  SELECT SUM(tokens_used)
  INTO daily_usage
  FROM ai_requests
  WHERE created_at > NOW() - INTERVAL '1 day';

  IF daily_usage > 1000000 THEN
    -- Notify via webhook
    PERFORM pg_notify('high_token_usage', daily_usage::text);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring

### Key Metrics

```sql
-- AI request success rate (last 24 hours)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms
FROM ai_requests
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Sentry Alerts

Configure alerts in Sentry for:
- Error rate >5% over 5 minutes
- P95 latency >30 seconds
- Specific error: `rate_limit_exceeded`
- Specific error: `timeout`

### Vercel Analytics

Monitor in Vercel dashboard:
- Function duration
- Function invocation count
- Error rate by function
- Cold start frequency

## Escalation

1. **First hour:** On-call engineer responds
2. **After 2 hours:** Page engineering lead
3. **If provider outage:** Switch to fallback provider
4. **If widespread:** Notify all users via status page

## Related Documents

- [AI Service Implementation](../../lib/ai/service.ts)
- [Rate Limiting](../../lib/security/rate-limiter.ts)
- [Error Reporting](../ERROR_REPORTING.md)
- [API Documentation](../API.md)

---

**Last Reviewed:** January 19, 2025
**Next Review:** February 19, 2025
