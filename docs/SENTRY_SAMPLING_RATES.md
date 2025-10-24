# Sentry Sampling Rate Configuration

**Last Updated:** 2025-10-23
**Status:** Optimized for Free Tier

---

## Current Configuration

### Error Tracking (100% Capture)

All errors are captured, but NOISE errors are filtered:

```typescript
// All error events pass through enhancedBeforeSend filter
// NOISE priority errors are dropped (null return)
```

**Filtered error types:**
- ❌ 404 Not Found
- ❌ Browser extension errors
- ❌ User-cancelled actions (AbortError)

**Captured error types:**
- ✅ CRITICAL errors (database, payment, auth failures)
- ✅ HIGH priority errors (AI, autosave, rate limiting)
- ✅ MEDIUM priority errors (database queries, API, exports)
- ✅ LOW priority errors (timeouts, UI errors)

**Location:** `lib/monitoring/sentry-config.ts:358` (`enhancedBeforeSend`)

---

## Performance Monitoring (Sampled)

### Client-Side Traces

**Current Rate:** 10%

```typescript
// sentry.client.config.ts:9
tracesSampleRate: 0.1
```

**What this means:**
- 10 out of 100 page navigations tracked
- 100 out of 1,000 pageviews tracked
- 1,000 out of 10,000 pageviews tracked

**Estimated monthly usage:**
- 10,000 sessions/month → 1,000 transactions
- 100,000 sessions/month → 10,000 transactions ✅ Free tier limit

**Recommendation:** Keep at 10% unless you exceed 100K sessions/month

---

### Server-Side Traces

**Current Rate:** 5%

```typescript
// sentry.server.config.ts:8
tracesSampleRate: 0.05
```

**What this means:**
- 5 out of 100 API requests tracked
- 50 out of 1,000 API requests tracked
- 500 out of 10,000 API requests tracked

**Estimated monthly usage:**
- 100,000 API calls/month → 5,000 transactions
- 200,000 API calls/month → 10,000 transactions ✅ Free tier limit

**Recommendation:** Keep at 5% for production. Lower to 2% if traffic exceeds 200K requests/month

---

### Edge Runtime Traces

**Current Rate:** 10%

```typescript
// sentry.edge.config.ts:8
tracesSampleRate: 0.1
```

**What this means:**
- Edge middleware runs on every request
- 10% of middleware executions tracked

**Recommendation:** Keep at 10% unless edge traffic is very high

---

## Session Replay (Selective Capture)

### Normal Sessions

**Current Rate:** 1%

```typescript
// sentry.client.config.ts:12
replaysSessionSampleRate: 0.01
```

**What this means:**
- 1 out of 100 normal user sessions recorded
- 10 out of 1,000 sessions recorded
- 100 out of 10,000 sessions recorded

**Privacy settings:**
- ✅ All text masked
- ✅ All media blocked
- ✅ All inputs masked

**Estimated monthly usage:**
- 10,000 sessions/month → 100 replays
- 50,000 sessions/month → 500 replays ✅ Free tier limit

**Recommendation:** Keep at 1% to stay under 500 replay/month limit

---

### Error Sessions

**Current Rate:** 100%

```typescript
// sentry.client.config.ts:13
replaysOnErrorSampleRate: 1.0
```

**What this means:**
- EVERY session with an error is recorded
- Filtered by priority: only CRITICAL/HIGH priority errors trigger replay

```typescript
// lib/monitoring/sentry-config.ts:538
onError: (event) => {
  const classification = classifyError(event)
  return classification.priority === 'critical' || classification.priority === 'high'
}
```

**Estimated monthly usage:**
- Assuming 100 CRITICAL/HIGH errors/month → 100 replays
- Total replays: 100 (normal) + 100 (errors) = 200/month ✅ Well under limit

**Recommendation:** Keep at 100% for error sessions - critical for debugging

---

## Sampling Strategy Summary

| Metric | Current Rate | Monthly Estimate | Free Tier Limit | Status |
|--------|--------------|------------------|-----------------|--------|
| Errors (filtered) | ~70% | 700 errors | 5,000 | ✅ Safe |
| Client traces | 10% | 1,000 | 10,000 | ✅ Safe |
| Server traces | 5% | 5,000 | 10,000 | ✅ Safe |
| Edge traces | 10% | Low volume | Included | ✅ Safe |
| Normal replays | 1% | 100 | 500 | ✅ Safe |
| Error replays | 100% (filtered) | 100 | Included | ✅ Safe |

**Total monthly cost:** $0 (within free tier) 💰

---

## Adjustment Guidelines

### If You're Exceeding Limits

#### Errors (> 5,000/month)

1. Review and expand NOISE filtering in `lib/monitoring/sentry-config.ts:ALERT_RULES`
2. Add more error types to NOISE category
3. Consider ignoring LOW priority errors temporarily

#### Transactions (> 10,000/month)

**Option 1: Lower sample rates**
```typescript
// Client
tracesSampleRate: 0.05 // 5% instead of 10%

// Server
tracesSampleRate: 0.02 // 2% instead of 5%
```

**Option 2: Dynamic sampling**
```typescript
// Sample more during business hours, less at night
tracesSampleRate: () => {
  const hour = new Date().getHours()
  return hour >= 9 && hour <= 17 ? 0.1 : 0.02
}
```

**Option 3: Sample critical paths more**
```typescript
tracesSampler: (samplingContext) => {
  // Sample AI and payment routes at higher rate
  if (samplingContext.transactionContext.name?.includes('/api/ai/')) {
    return 0.5 // 50%
  }
  if (samplingContext.transactionContext.name?.includes('/api/stripe/')) {
    return 0.5 // 50%
  }
  // Lower rate for everything else
  return 0.02 // 2%
}
```

#### Session Replays (> 500/month)

```typescript
// Reduce normal session rate
replaysSessionSampleRate: 0.005 // 0.5% instead of 1%

// Keep error replays at 100% (they're most valuable)
replaysOnErrorSampleRate: 1.0
```

---

## Performance Impact

### Client Bundle Size

Current Sentry client bundle: ~50KB gzipped

**Optimizations applied:**
- ✅ Tree-shaking enabled (`disableLogger: true`)
- ✅ Source maps hidden from clients
- ✅ Lazy loading of integrations

### Server Overhead

**Negligible impact:**
- Error capture: < 1ms per error
- Trace sampling: < 0.1ms per request
- Only 5% of requests tracked

---

## Monitoring Sampling Effectiveness

### Check if sample size is sufficient:

1. Go to Sentry → Performance
2. Look at transaction volume over 30 days
3. Ensure you have at least:
   - 100+ samples per critical endpoint
   - 50+ samples for P95/P99 accuracy

### Signs you need to increase sampling:

- ❌ Insufficient data warnings in Sentry
- ❌ < 50 samples for key transactions
- ❌ Unable to detect performance regressions

### Signs you should decrease sampling:

- ⚠️ Approaching free tier limits
- ⚠️ > 10,000 transactions/month
- ⚠️ High Sentry costs

---

## Recommended Sampling by Traffic Volume

| Monthly Sessions | Client Traces | Server Traces | Session Replay |
|-----------------|---------------|---------------|----------------|
| < 10K | 20% | 10% | 2% |
| 10K - 50K | 10% | 5% | 1% |
| 50K - 100K | 5% | 2% | 0.5% |
| 100K - 500K | 2% | 1% | 0.2% |
| > 500K | Upgrade to Team plan or use dynamic sampling |

---

## Testing Your Configuration

### Verify sampling is working:

```bash
# In browser console (production site)
for (let i = 0; i < 100; i++) {
  fetch('/api/test')
}

# Check Sentry Performance dashboard
# You should see ~5 transactions (5% of 100)
```

### Verify error filtering:

```javascript
// Should be captured (HIGH priority)
fetch('/api/ai/generate', {
  method: 'POST',
  body: JSON.stringify({ invalid: 'data' })
})

// Should be filtered (NOISE - 404)
fetch('/this-does-not-exist')
```

---

## Configuration Files Reference

All sampling configuration is in these files:

1. **Client sampling:** `sentry.client.config.ts:9-13`
2. **Server sampling:** `sentry.server.config.ts:8`
3. **Edge sampling:** `sentry.edge.config.ts:8`
4. **Error filtering:** `lib/monitoring/sentry-config.ts:358` (`enhancedBeforeSend`)
5. **Replay config:** `lib/monitoring/sentry-config.ts:536` (`REPLAY_CONFIG`)
6. **Alert rules:** `lib/monitoring/sentry-config.ts:57` (`ALERT_RULES`)

---

## Next Steps

1. Deploy to production with current configuration
2. Monitor usage in Sentry → Settings → Usage & Billing
3. Adjust sampling rates after 1 week based on actual traffic
4. Set up alerts if usage approaches 80% of free tier limits

---

**Summary:** Current sampling rates are optimized for ~100K sessions/month within free tier limits. Adjust as traffic grows.
