# Request ID Tracking - Usage Guide

Request IDs help correlate user error reports with server logs. Every request gets a unique ID that flows through the entire request lifecycle.

## ✅ Completed (TICKET-003)

Request ID tracking is now implemented throughout the application:

### 1. Automatic Generation
- Request IDs are automatically generated in middleware
- Existing request IDs are preserved if sent by client
- Format: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### 2. Propagation
- Request ID is added to all response headers as `x-request-id`
- Request ID is available in all route handlers via headers
- Request ID is included in all log entries
- Request ID is sent to Sentry for error tracking

### 3. Error Responses
- All errors include request ID in response body
- Request ID is logged for all 500+ errors
- Request ID is sent to Sentry for investigation

## Usage Examples

### In API Route Handlers

```typescript
import { errorResponse, successResponse } from '@/lib/api/error-response'
import { getRequestId } from '@/lib/request-id'
import { withRequestId } from '@/lib/monitoring/structured-logger'

export async function GET(request: Request) {
  // Get request ID for logging
  const requestId = await getRequestId()
  const log = withRequestId(requestId)

  try {
    // Your logic here
    log.info('Processing request')

    const data = { message: 'Success' }
    return successResponse(data)

  } catch (error) {
    // Error automatically includes request ID
    log.error('Request failed', { error })
    return errorResponse('Failed to process request', {
      status: 500,
      details: error,
    })
  }
}
```

### Using Quick Error Helpers

```typescript
import { errorResponses } from '@/lib/api/error-response'

export async function POST(request: Request) {
  const body = await request.json()

  // Validation error
  if (!body.email) {
    return errorResponses.badRequest('Email is required')
  }

  // Authentication error
  if (!user) {
    return errorResponses.unauthorized()
  }

  // Not found
  if (!record) {
    return errorResponses.notFound('Resource not found')
  }

  // Rate limiting
  if (rateLimitExceeded) {
    return errorResponses.tooManyRequests('Too many requests', 60)
  }

  // Internal error
  try {
    // ... operation
  } catch (error) {
    return errorResponses.internalError('Operation failed', {
      details: error,
      userId: user.id,
    })
  }
}
```

### Logging with Request ID

```typescript
import { getRequestId } from '@/lib/request-id'
import { withRequestId } from '@/lib/monitoring/structured-logger'

export async function POST(request: Request) {
  const requestId = await getRequestId()
  const log = withRequestId(requestId)

  log.info('Request received', { path: '/api/example' })

  try {
    // ... your logic

    log.info('Request completed', { duration: 150 })
  } catch (error) {
    log.error('Request failed', { error })
    throw error
  }
}
```

### Sentry Error Tracking

```typescript
import { captureExceptionWithRequestId } from '@/lib/monitoring/sentry-context'

try {
  // ... operation
} catch (error) {
  // Automatically includes request ID in Sentry
  await captureExceptionWithRequestId(error, {
    userId: user.id,
    operation: 'data_sync',
  })
  throw error
}
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "headers": {
    "x-request-id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Failed to process request",
    "code": "INTERNAL_ERROR",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "headers": {
    "x-request-id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Debugging User Issues

When a user reports an error:

1. **Ask for Request ID**: User can find it in browser DevTools → Network → Response Headers → `x-request-id`
2. **Search Logs**: Use request ID to find exact log entries
   ```bash
   # In Vercel logs
   x-request-id:550e8400-e29b-41d4-a716-446655440000
   ```
3. **Check Sentry**: Request ID is tagged in all Sentry errors
4. **Trace Flow**: Follow request ID through all log entries to see complete flow

## Error Response Format (Preview of TICKET-004)

The error response helper provides a consistent format across all API routes:

```typescript
{
  error: {
    message: string      // User-friendly message
    code: string        // Machine-readable error code
    requestId: string   // For support/debugging
    details?: any       // Only in development
  }
}
```

## Benefits

✅ **Easier Debugging**: Quickly find exact log entries for user issues
✅ **Better Support**: Users can provide request ID when reporting errors
✅ **Error Correlation**: Link user reports to Sentry errors and logs
✅ **Request Tracing**: Follow request flow through entire system
✅ **Production Ready**: Works automatically with no code changes needed

## Next Steps

This implementation sets up the foundation for:
- **TICKET-004**: Standard error responses (already partially implemented)
- **TICKET-011**: Request/response logging (can use request ID)
- Better observability and debugging in production

---

**Implemented**: 2025-01-20 (TICKET-003)
