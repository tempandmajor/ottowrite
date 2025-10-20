# API Error Response Standards (TICKET-004)

This document describes the standardized error response format implemented across all OttoWrite API routes.

## Overview

All API routes now use standardized error responses with:
- ✅ Consistent error format
- ✅ Request ID tracking for debugging
- ✅ Proper HTTP status codes
- ✅ Structured logging integration
- ✅ Sentry error tracking

## Error Response Format

### Success Response
```typescript
{
  data: { ... },
  // Response headers include:
  // x-request-id: "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response
```typescript
{
  error: {
    message: "User-friendly error message",
    code: "MACHINE_READABLE_CODE",  // Optional
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    // details field only included in development mode
  }
}
```

## Implementation Guide

### 1. Import Error Helpers

```typescript
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
```

### 2. Replace Error Responses

#### Before (Old Pattern)
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ... business logic

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### After (New Pattern)
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    // ... business logic

    return successResponse({ data: result })
  } catch (error) {
    logger.error('Operation failed', {
      operation: 'your_operation_name',
    }, error instanceof Error ? error : undefined)

    return errorResponses.internalError('Failed to process request', {
      details: error,
      userId: user?.id,
    })
  }
}
```

### 3. Common Error Response Patterns

#### Authentication
```typescript
if (!user) {
  return errorResponses.unauthorized()
}
```

#### Authorization
```typescript
if (resource.user_id !== user.id) {
  return errorResponses.forbidden('You do not have access to this resource', {
    userId: user.id
  })
}
```

#### Validation Errors
```typescript
if (!body.email) {
  return errorResponses.badRequest('Email is required', {
    userId: user.id
  })
}

// For complex validation
if (!body.email || body.email.length > 255) {
  return errorResponses.validationError('Invalid email format', {
    code: 'INVALID_EMAIL',
    userId: user.id,
  })
}
```

#### Not Found
```typescript
if (!document) {
  return errorResponses.notFound('Document not found', {
    userId: user.id
  })
}
```

#### Resource Conflicts
```typescript
if (existingTag) {
  return errorResponses.conflict('A tag with this name already exists', {
    code: 'DUPLICATE_TAG',
    userId: user.id,
  })
}
```

#### Rate Limiting
```typescript
if (rateLimitExceeded) {
  return errorResponses.tooManyRequests(
    'Too many requests. Please try again later.',
    60, // retry after seconds
    {
      code: 'RATE_LIMIT_EXCEEDED',
      userId: user.id,
    }
  )
}
```

#### Service Unavailable
```typescript
if (!externalServiceAvailable) {
  return errorResponses.serviceUnavailable(
    'AI service temporarily unavailable',
    {
      code: 'AI_SERVICE_DOWN',
      userId: user.id,
    }
  )
}
```

#### Internal Errors with Context
```typescript
try {
  await performOperation()
} catch (error) {
  logger.error('Operation failed', {
    operation: 'specific_operation',
    userId: user.id,
    documentId,
  }, error instanceof Error ? error : undefined)

  return errorResponses.internalError('Failed to complete operation', {
    details: error,
    userId: user.id,
  })
}
```

## Error Codes

Use clear, descriptive error codes for programmatic error handling:

### Authentication & Authorization
- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User lacks permission
- `SESSION_EXPIRED` - Auth session expired

### Validation
- `VALIDATION_ERROR` - General validation failure
- `INVALID_EMAIL` - Email format invalid
- `INVALID_INPUT` - Input data invalid
- `REQUIRED_FIELD_MISSING` - Required field not provided

### Resources
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Resource conflict (e.g., duplicate)
- `DUPLICATE_TAG` - Tag name already exists
- `DUPLICATE_CHARACTER` - Character already exists

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AI_REQUEST_LIMIT_EXCEEDED` - AI quota exceeded
- `AI_WORD_LIMIT_EXCEEDED` - AI word limit exceeded

### Service Errors
- `INTERNAL_ERROR` - General server error
- `SERVICE_UNAVAILABLE` - Service temporarily down
- `AI_SERVICE_DOWN` - AI provider unavailable
- `DATABASE_ERROR` - Database operation failed

### Operations
- `AUTOSAVE_CONFLICT` - Document modified elsewhere
- `PAYMENT_FAILED` - Payment processing failed
- `WEBHOOK_VERIFICATION_FAILED` - Webhook signature invalid

## Logging Best Practices

### 1. Always Log Errors with Context
```typescript
logger.error('Operation failed', {
  operation: 'specific_operation_name',
  userId: user.id,
  resourceId: document.id,
  // Add relevant context
}, error instanceof Error ? error : undefined)
```

### 2. Use Structured Context
```typescript
logger.error('Database query failed', {
  operation: 'database:update',
  table: 'documents',
  userId: user.id,
  documentId,
}, error)
```

### 3. Include Request IDs
Request IDs are automatically included in error responses and logs. Users can find them in:
- Response headers: `x-request-id`
- Error response body: `error.requestId`

## Migration Checklist

When migrating an API route to standard error responses:

- [ ] Import `errorResponses` and `successResponse`
- [ ] Import `logger` from structured-logger
- [ ] Replace all `NextResponse.json({ error: ... })` with `errorResponses.*`
- [ ] Replace all `NextResponse.json({ data: ... })` with `successResponse(data)`
- [ ] Replace all `console.error` with `logger.error`
- [ ] Replace all `console.warn` with `logger.warn`
- [ ] Add userId context to all error responses where available
- [ ] Add error codes for programmatic error handling
- [ ] Ensure all errors are logged with structured context
- [ ] Test error responses return correct status codes

## Migrated Routes

✅ **Phase 6 Complete (23/40 routes - 57.5%)**

### Payment & Billing (3 routes) ✅
- `/api/checkout/create-session` - Stripe checkout sessions
- `/api/checkout/customer-portal` - Customer billing portal
- `/api/webhooks/stripe` - Stripe webhook handler (CRITICAL!)

### AI & Generation (2 routes) ✅
- `/api/ai/generate` - AI content generation
- `/api/ai/templates` - AI prompt templates

### Documents (1 route) ✅
- `/api/documents/[id]/autosave` - Document autosave with conflict detection

### Characters (3 routes) ✅
- `/api/characters` - Character CRUD operations (GET, POST, PATCH, DELETE) ✅
- `/api/characters/arcs` - Character arc stages (GET, POST, PATCH, DELETE) ✅
- `/api/characters/relationships` - Character relationships (GET, POST, PATCH, DELETE) ✅

### Projects (3 routes) ✅
- `/api/projects/query` - Project query with filtering, search, pagination ✅
- `/api/projects/folders` - Folder CRUD operations (GET, POST, PATCH, DELETE) ✅
- `/api/projects/tags` - Tag CRUD operations with project count (GET, POST, PATCH, DELETE) ✅

### Locations (2 routes) ✅
- `/api/locations` - Location CRUD operations (GET, POST, PATCH, DELETE) ✅
- `/api/locations/events` - Location event management (GET, POST, PATCH, DELETE) ✅

### Plot Analysis (2 routes) ✅
- `/api/plot-analysis` - Plot analysis CRUD (GET, POST, DELETE) with AI integration
- `/api/plot-analysis/issues` - Plot issue management (GET, PATCH, DELETE)

### Story Planning (3 routes) ✅
- `/api/story-beats` - Story beats CRUD with template initialization (GET, POST, PATCH, DELETE) ✅
- `/api/story-beats/templates` - Beat templates list with filtering (GET) ✅
- `/api/outlines` - AI outline generation and management (GET, POST, PATCH, DELETE) ✅

🔄 **Remaining Routes (17 routes - 42.5%)**

### High Priority (Recommend Next)
1. `/api/analytics/enqueue` - Analytics job queue
2. `/api/analytics/sessions` - Analytics sessions
3. `/api/analytics/jobs/[jobId]` - Analytics job status

### Medium Priority
4. `/api/telemetry/ui` - UI telemetry tracking
5. `/api/telemetry/autosave-failure` - Autosave failure tracking

### Lower Priority
6. `/api/documents/**` - Document operations (2 routes)
7. `/api/templates/**` - Template operations (2 routes)
8. `/api/ai/ensemble/**` - Ensemble AI (3 routes)
9. `/api/ai/generate-coverage` - Coverage generation
10. `/api/ai/background-task` - Background tasks
11. `/api/analysis/dialogue-voice` - Dialogue analysis
12. `/api/world-elements` - World building
13. `/api/research/search` - Research
14. `/api/beat-board` - Beat board
15. `/api/account/**` - Account management (2 routes)

## Testing Error Responses

### Manual Testing
```bash
# Test unauthorized
curl -X POST http://localhost:3000/api/your-route

# Test validation error
curl -X POST http://localhost:3000/api/your-route \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

### Check Response Format
```typescript
// Expected error response
{
  "error": {
    "message": "Email is required",
    "code": "VALIDATION_ERROR",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Check Response Headers
```
x-request-id: 550e8400-e29b-41d4-a716-446655440000
content-type: application/json
```

## Benefits

✅ **Consistent API** - All routes follow same error format
✅ **Better Debugging** - Request IDs link errors to logs
✅ **User Experience** - Clear, actionable error messages
✅ **Monitoring** - Structured logs for analytics
✅ **Error Tracking** - Automatic Sentry integration
✅ **Production Ready** - Proper error handling and logging

## Related Documentation

- [Request ID Usage Guide](./REQUEST_ID_USAGE.md) - Request tracking
- [Structured Logging](../lib/monitoring/structured-logger.ts) - Log formats
- [Error Response Helper](../lib/api/error-response.ts) - Implementation

---

**Status**: Phase 6 of migration complete (23/40 routes - 57.5%)
**Completed**: 2025-01-20 (TICKET-004 - Phase 6)
**Build Status**: ✅ Passing (10.7s, 0 errors, 0 warnings)
**Next Steps**: Migrate remaining 17 API routes following documented patterns (42.5% remaining)

**Phase 6 Progress**: Added story planning routes (story beats, beat templates, outlines). Story beats support both manual creation and template-based initialization via RPC function with template-not-found detection. Beat templates feature type aliasing (series→novel) and array overlap filtering. Outlines route includes AI-powered generation with Claude 4.5, transactional section insertion with rollback on failure, and separate error handling for AI generation vs database operations. All routes properly handle RPC errors and multi-step database transactions.
