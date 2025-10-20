# Database Connection Pooling

This document explains the database connection pooling strategy implemented for Ottowrite.

## Overview

Proper connection pooling is critical for serverless applications to prevent exhausting database connections under load. This implementation provides:

- **Configurable pool sizes** for different client types
- **Connection timeout handling** to fail fast
- **Singleton pattern** for service role clients
- **Monitoring capabilities** via health check endpoint

## Architecture

### Client Types

We use three types of Supabase clients, each with different pooling strategies:

1. **Server Client** (`lib/supabase/server.ts`)
   - Used in API routes and server components
   - Creates new instance per request (Next.js pattern)
   - Small pool size (5 connections default)
   - Short-lived connections

2. **Service Role Client** (`lib/supabase/service-role.ts`)
   - Used for admin operations, webhooks, background jobs
   - **Singleton pattern** - reuses same instance
   - Larger pool size (10 connections default)
   - Long-lived connections

3. **Browser Client** (`lib/supabase/client.ts`)
   - Used in client components
   - Relies on browser HTTP/2 connection reuse
   - No explicit pooling needed

## Configuration

### Environment Variables

All connection pool settings are configurable via environment variables:

#### Server Client
```bash
# Pool size per serverless function instance (default: 5)
DB_POOL_SIZE=5

# Connection timeout in milliseconds (default: 10000 = 10s)
DB_CONNECT_TIMEOUT=10000

# Idle connection timeout in milliseconds (default: 60000 = 1min)
DB_IDLE_TIMEOUT=60000

# Maximum connection lifetime in milliseconds (default: 300000 = 5min)
DB_MAX_LIFETIME=300000
```

#### Service Role Client
```bash
# Larger pool for high-throughput operations (default: 10)
SERVICE_ROLE_POOL_SIZE=10

# Longer timeout for complex operations (default: 15000 = 15s)
SERVICE_ROLE_CONNECT_TIMEOUT=15000

# Idle timeout (default: 60000 = 1min)
SERVICE_ROLE_IDLE_TIMEOUT=60000

# Max lifetime (default: 300000 = 5min)
SERVICE_ROLE_MAX_LIFETIME=300000
```

#### Browser Client
```bash
# Connection timeout for browser requests (default: 10000 = 10s)
NEXT_PUBLIC_DB_CONNECT_TIMEOUT=10000
```

### Default Configuration

The defaults are optimized for serverless environments (Vercel):

| Setting | Server Client | Service Role | Browser |
|---------|--------------|--------------|---------|
| Pool Size | 5 | 10 | N/A |
| Connect Timeout | 10s | 15s | 10s |
| Idle Timeout | 1min | 1min | N/A |
| Max Lifetime | 5min | 5min | N/A |

## Connection Limits

### Supabase Tiers

- **Free Tier**: 60 concurrent connections
- **Pro Tier**: 200 concurrent connections
- **Enterprise**: Custom limits

### Capacity Planning

With default settings:
- ~10 concurrent serverless functions
- 5 connections per server client × 10 functions = 50 connections
- 1 shared service role client = 10 connections
- **Total: ~60 connections max**

This fits within the Free tier limit with headroom for client connections.

### Scaling Recommendations

For higher traffic:

1. **Pro Tier** (200 connections)
   - Increase `DB_POOL_SIZE` to 10
   - Increase `SERVICE_ROLE_POOL_SIZE` to 20
   - Support for ~15-20 concurrent functions

2. **Enterprise Tier** (Custom)
   - Custom pool sizes based on traffic patterns
   - Consider dedicated connection pooler (PgBouncer)

## Monitoring

### Health Check Endpoint

Connection pool configuration is exposed via `/api/health`:

```bash
curl https://your-app.vercel.app/api/health
```

Response includes pool config:
```json
{
  "status": "healthy",
  "poolConfig": {
    "server": {
      "pool_size": 5,
      "connect_timeout": 10000,
      "idle_timeout": 60000,
      "max_lifetime": 300000
    },
    "serviceRole": {
      "db": {
        "pool_size": 10,
        "connect_timeout": 15000,
        "idle_timeout": 60000,
        "max_lifetime": 300000
      }
    }
  }
}
```

### Monitoring Connection Usage

From your Supabase dashboard:
1. Go to Database → Settings
2. View "Connection Pooling" section
3. Monitor active connections vs. limits

Set up alerts for:
- Connection count approaching limit (>80%)
- Connection timeouts increasing
- Query duration spikes

## Best Practices

### 1. Use Appropriate Client

```typescript
// ✅ Good: Server component/API route
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// ✅ Good: Admin operation
import { createServiceRoleClient } from '@/lib/supabase/service-role'
const supabase = createServiceRoleClient()

// ✅ Good: Client component
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### 2. Don't Create Multiple Clients

```typescript
// ❌ Bad: Creates new pool per request
app.get('/api/route', async () => {
  const client1 = createServiceRoleClient()
  const client2 = createServiceRoleClient() // Unnecessary!
  // ...
})

// ✅ Good: Reuse single instance
const supabase = createServiceRoleClient()
app.get('/api/route', async () => {
  // Use shared supabase instance
})
```

### 3. Handle Connection Errors

```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select()

  if (error) {
    // Check for connection-related errors
    if (error.message.includes('timeout') ||
        error.message.includes('connection')) {
      logger.error('Database connection issue', { error })
      return errorResponses.serviceUnavailable()
    }
  }
} catch (err) {
  // Handle unexpected errors
  logger.error('Query failed', err)
}
```

### 4. Tune for Your Workload

Monitor your production metrics and adjust:

- **High read traffic**: Increase `DB_POOL_SIZE`
- **Long-running queries**: Increase `DB_CONNECT_TIMEOUT`
- **Memory pressure**: Decrease pool sizes
- **Connection limit errors**: Upgrade tier or reduce pool sizes

## Troubleshooting

### "Too many connections" Error

**Symptom**: Database rejects connections with "too many clients"

**Solutions**:
1. Check current usage in Supabase dashboard
2. Reduce `DB_POOL_SIZE` and `SERVICE_ROLE_POOL_SIZE`
3. Upgrade to Pro tier for more connections
4. Implement connection retry logic

### Connection Timeouts

**Symptom**: Queries fail with timeout errors

**Solutions**:
1. Increase `DB_CONNECT_TIMEOUT`
2. Optimize slow queries (add indexes)
3. Check database CPU/memory usage
4. Consider read replicas for heavy read traffic

### Memory Issues in Serverless

**Symptom**: Function runs out of memory

**Solutions**:
1. Reduce `DB_POOL_SIZE` (fewer connections = less memory)
2. Increase serverless function memory limit
3. Paginate large result sets
4. Use cursor-based queries

## Testing

### Local Development

The connection pool configuration works identically in local development:

```bash
# Test with different pool sizes
DB_POOL_SIZE=3 npm run dev

# Monitor connection usage
curl http://localhost:3000/api/health | jq '.poolConfig'
```

### Load Testing

Test connection pooling under load:

```bash
# Simulate 50 concurrent requests
ab -n 1000 -c 50 https://your-app.vercel.app/api/health

# Monitor connection count in Supabase dashboard
# Should stay below pool_size × concurrent_functions
```

## Migration Guide

If you have existing Supabase client code:

1. **No code changes needed** - The API is unchanged
2. **Set environment variables** for custom pool sizes
3. **Monitor `/api/health`** to verify configuration
4. **Watch for connection errors** in logs for first few days
5. **Tune settings** based on production metrics

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Next.js and Database Connections](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#databases)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
