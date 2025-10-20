# API Rate Limiting

Comprehensive rate limiting system to prevent API abuse and ensure fair resource allocation.

## Overview

All API endpoints are protected by automatic rate limiting enforced at the middleware level. Rate limits vary by operation type to balance security with usability.

## Rate Limit Tiers

### Write Operations (POST, PUT, PATCH, DELETE)
- **Limit**: 100 requests per hour
- **Why**: Write operations modify data and are more expensive
- **Applies to**: Creating, updating, deleting any resource

### Read Operations (GET)
- **Limit**: 1000 requests per hour
- **Why**: Read operations are cheaper but still need limiting
- **Applies to**: Fetching lists, getting individual resources

### AI Operations
- **Limit**: 50 requests per hour
- **Why**: AI operations consume significant compute and API credits
- **Applies to**: `/api/ai/*` endpoints

### Authentication
- **Limit**: 20 requests per hour
- **Why**: Prevent brute force and credential stuffing attacks
- **Applies to**: `/api/auth/*` and `/auth/*` routes

### Webhooks
- **Limit**: 1000 requests per hour
- **Why**: External services need higher limits for reliability
- **Applies to**: `/api/webhooks/*` endpoints

## How It Works

### 1. Token Bucket Algorithm

Each user/IP gets a "bucket" of tokens:
- Bucket starts full (max tokens = rate limit)
- Each request consumes 1 token
- Tokens refill after the time window expires
- No tokens = rate limit exceeded

### 2. Identifier Strategy

Rate limits are tracked per:
- **Authenticated users**: `user:{userId}`
- **Anonymous users**: `ip:{ipAddress}`

### 3. Middleware Enforcement

All requests pass through middleware which:
1. Checks if rate limit exceeded
2. Returns 429 if exceeded
3. Adds rate limit headers to response

## Response Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit: 100          # Maximum requests allowed
X-RateLimit-Remaining: 87       # Requests remaining in window
X-RateLimit-Reset: 1705420800   # Unix timestamp when limit resets
```

When rate limited:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600               # Seconds until you can retry
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705420800

{
  "error": {
    "message": "Write operation rate limit exceeded...",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "retryAfter": 3600,
      "resetAt": "2024-01-16T12:00:00Z"
    }
  }
}
```

## Exempt Endpoints

The following endpoints are NOT rate limited:
- `/api/health` - Health checks
- `/api/health/ready` - Readiness probes

These are needed for monitoring and load balancing.

## Implementation Details

### In-Memory vs Redis

**Current**: In-memory token bucket (LRU cache)
**Why not Redis?**
- Serverless environments (Vercel) don't maintain persistent connections
- Redis adds 50-100ms latency per request
- In-memory is sufficient for per-instance limiting
- Cost: Redis adds $15+/month

**Trade-off**: Each serverless instance has its own rate limit state. With 10 instances, effective limit is ~10x higher. This is acceptable because:
1. Traffic distributes across instances
2. Aggressive users hit same instance more often
3. Limits are conservative enough to handle this

### LRU Cache

- Max 10,000 entries per rate limit tier
- Automatic cleanup every 5 minutes
- Oldest entries evicted when cache is full
- Low memory footprint (~1MB per tier)

## Client Best Practices

### 1. Respect Rate Limit Headers

```typescript
const response = await fetch('/api/characters', {
  method: 'POST',
  body: JSON.stringify(data)
})

const remaining = response.headers.get('X-RateLimit-Remaining')
const resetAt = response.headers.get('X-RateLimit-Reset')

if (parseInt(remaining) < 10) {
  console.warn('Approaching rate limit!')
}
```

### 2. Implement Exponential Backoff

```typescript
async function apiCall(url, options, retries = 3) {
  try {
    const response = await fetch(url, options)

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')

      if (retries > 0) {
        await sleep(parseInt(retryAfter) * 1000)
        return apiCall(url, options, retries - 1)
      }
    }

    return response
  } catch (error) {
    throw error
  }
}
```

### 3. Batch Operations

Instead of:
```typescript
// ❌ Makes 100 requests
for (const char of characters) {
  await fetch('/api/characters', {
    method: 'POST',
    body: JSON.stringify(char)
  })
}
```

Do this:
```typescript
// ✅ Makes 1 request
await fetch('/api/characters/batch', {
  method: 'POST',
  body: JSON.stringify({ characters })
})
```

### 4. Use Pagination

```typescript
// ✅ Fetch in pages
let cursor = null
do {
  const response = await fetch(
    `/api/characters?project_id=${id}&limit=50&cursor=${cursor}`
  )
  const { characters, pagination } = await response.json()

  // Process characters...

  cursor = pagination.nextCursor
} while (pagination.hasMore)
```

## Monitoring

### View Rate Limit Status

Not currently exposed via API, but you can check headers on any request:

```bash
curl -i https://your-app.com/api/characters?project_id=xxx \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response headers show current status:
# X-RateLimit-Remaining: 87
```

### Logs

Rate limit events are logged:

```json
{
  "level": "warn",
  "operation": "rate_limit:exceeded",
  "identifier": "user:abc123...",
  "path": "/api/characters",
  "method": "POST",
  "retryAfter": 3600
}
```

View in your logging service (DataDog, Sentry, etc.)

## Troubleshooting

### "Rate limit exceeded" but I'm not making many requests

**Possible causes**:
1. **Shared IP**: Multiple users on same network share rate limit
2. **Browser tabs**: Each tab makes separate requests
3. **Auto-refresh**: Polling intervals too aggressive
4. **Webhooks**: External service retry storms

**Solutions**:
- Implement request coalescing (deduplicate concurrent requests)
- Increase polling intervals (min 30 seconds)
- Add exponential backoff to webhook retries
- Contact support for rate limit increase

### Rate limits reset unexpectedly

**Cause**: Serverless instance restarted (clears in-memory cache)

**Normal behavior**: In-memory rate limiting means limits reset when:
- New serverless instance starts
- Instance is idle and shut down
- Deployment happens

**Mitigation**: Conservative limits account for this behavior

### Need higher limits

**Options**:
1. **Optimize requests**: Use pagination, batching, caching
2. **Upgrade plan**: Higher tiers get higher limits (future feature)
3. **Contact support**: Custom limits for specific use cases

## Future Enhancements

### Planned Improvements

1. **User-tier rate limits**:
   - Free: Current limits
   - Pro: 2x limits
   - Enterprise: 5x limits or custom

2. **Burst allowance**:
   - Allow short bursts above limit
   - Smooth out spiky traffic patterns

3. **Per-endpoint limits**:
   - Different limits for heavy vs light operations
   - e.g., `GET /api/characters` vs `POST /api/ai/generate`

4. **Rate limit dashboard**:
   - Real-time usage monitoring
   - Historical trends
   - Alerts before hitting limits

### Not Planned

- **Redis-backed limiting**: Adds latency and cost without significant benefit in serverless
- **IP whitelisting**: Use API keys for automation instead
- **Disable rate limiting**: Security requirement for all production apps

## Testing

### Local Development

Rate limiting works identically in development:

```bash
# Test rate limiting
for i in {1..110}; do
  curl http://localhost:3000/api/characters \
    -H "Authorization: Bearer TOKEN" \
    -X POST \
    -d '{"project_id":"xxx","name":"Test"}'
done

# Request 101+ should return 429
```

### Load Testing

```bash
# Simulate 50 concurrent users
ab -n 1000 -c 50 \
  -H "Authorization: Bearer TOKEN" \
  -p char.json \
  -T application/json \
  https://your-app.com/api/characters

# Check how many got rate limited
grep "429" ab_results.txt | wc -l
```

## Security Considerations

### Why Rate Limiting Matters

1. **Prevents API abuse**: Malicious users can't overwhelm your API
2. **Fair resource allocation**: All users get equal access
3. **Cost control**: Prevents runaway AI/database usage
4. **DDoS mitigation**: Makes attacks more expensive
5. **Protects user data**: Limits data exfiltration speed

### Attack Scenarios Prevented

- **Brute force**: Can't try unlimited passwords
- **Credential stuffing**: Can't test stolen credentials rapidly
- **Data scraping**: Can't download entire database
- **Resource exhaustion**: Can't spawn unlimited AI requests
- **Account takeover**: Limited login attempts

### Bypassing Rate Limits (Don't Do This)

❌ **Rotating IPs**: Expensive and still limited per IP
❌ **Multiple accounts**: Violates ToS, accounts will be banned
❌ **Distributed attacks**: We log and block suspicious patterns
❌ **Cache poisoning**: Won't work, rate limiting is server-side

✅ **Legitimate workarounds**:
- Optimize your request patterns
- Use webhooks for async operations
- Implement client-side caching
- Contact support for custom limits

## References

- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [RFC 6585 - HTTP Status Code 429](https://tools.ietf.org/html/rfc6585)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
