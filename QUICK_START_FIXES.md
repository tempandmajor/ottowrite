# Quick-Start Production Fixes (Start Here!)

## Priority 1: DO THIS TODAY (30 minutes)

### 1. Remove `.env.local` from Git Tracking
```bash
# Add to .gitignore if not already there
echo ".env.local" >> .gitignore
echo ".env.local.backup.*" >> .gitignore

# Remove from git history
git rm --cached .env.local .env.local.backup.*
git commit -m "Remove secrets from version control"
```

### 2. Create Environment Validation (10 minutes)
Create `lib/config/env.ts`:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Public variables
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Private variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  
  // Optional
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

// Validate at module load time
const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Environment validation failed:')
  result.error.errors.forEach(error => {
    console.error(`   ${error.path.join('.')}: ${error.message}`)
  })
  process.exit(1)
}

export const env = result.data
```

### 3. Validate on Startup (5 minutes)
Update `app/layout.tsx` or create `lib/config/validate.ts`:
```typescript
// This runs once at module import
import { env } from '@/lib/config/env'

// If we get here, all required env vars are present
console.log('✅ Environment validation passed')
```

---

## Priority 2: THIS WEEK (2-3 hours)

### 4. Add Request ID Tracking to All API Routes

Create `lib/api/request-context.ts`:
```typescript
import { v4 as uuid } from 'uuid'
import { NextRequest } from 'next/server'

export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || uuid()
}

export function createErrorResponse(
  message: string,
  status: number,
  requestId: string
) {
  return {
    error: {
      message,
      code: getErrorCode(status),
      requestId,
    }
  }
}

function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  }
  return codes[status] || 'ERROR'
}
```

Update one API route as example (`app/api/characters/route.ts`):
```typescript
import { getRequestId, createErrorResponse } from '@/lib/api/request-context'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    // ... existing logic
    return NextResponse.json({ characters })
  } catch (error) {
    logger.error('Failed to fetch characters', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    return NextResponse.json(
      createErrorResponse('Failed to fetch characters', 500, requestId),
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
```

### 5. Create Input Validation Helper (45 min)

Create `lib/api/validation.ts`:
```typescript
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

export async function parseAndValidate<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  requestId: string
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: NextResponse.json(
          {
            error: {
              message: 'Validation error',
              code: 'VALIDATION_ERROR',
              details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
              })),
              requestId,
            }
          },
          { status: 400, headers: { 'X-Request-ID': requestId } }
        )
      }
    }
    throw error
  }
}
```

Create validation schemas for each endpoint:
```typescript
// lib/api/schemas/character.ts
import { z } from 'zod'

export const createCharacterSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  name: z.string().min(1).max(255),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  importance: z.number().int().min(1).max(10).optional(),
  personality_traits: z.array(z.string()).optional(),
  backstory: z.string().optional(),
  // ... other fields
})
```

### 6. Add Health Check Endpoint (10 min)

Create `app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Quick DB connectivity check
    const { error } = await supabase
      .from('user_profiles')
      .select('count()', { count: 'exact' })
      .limit(1)
    
    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
```

---

## Priority 3: THIS MONTH (8-12 hours)

### 7. Add Critical API Tests

Create `__tests__/api/characters/route.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@/lib/supabase/server'

describe('POST /api/characters', () => {
  it('creates character with valid input', async () => {
    const res = await POST(mockRequest({
      project_id: 'valid-uuid',
      name: 'Protagonist',
      role: 'protagonist',
    }))
    expect(res.status).toBe(201)
  })

  it('rejects invalid project_id format', async () => {
    const res = await POST(mockRequest({
      project_id: 'not-a-uuid',
      name: 'Character',
      role: 'protagonist',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('enforces user_id from auth (RLS)', async () => {
    // Only authenticated users can create
    const unauthRes = await POST(mockRequest({}, null)) // null auth
    expect(unauthRes.status).toBe(401)
  })
})
```

### 8. HTML Sanitization

Install: `npm install isomorphic-dompurify`

Update document autosave:
```typescript
import DOMPurify from 'isomorphic-dompurify'

export async function POST(request: NextRequest) {
  const { html, ...rest } = await request.json()
  
  // Sanitize HTML content
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span', 'div'],
    ALLOWED_ATTR: [],
  })
  
  // ... rest of logic
}
```

### 9. Stripe Webhook Tests

Create `__tests__/api/webhooks/stripe.test.ts`:
```typescript
describe('POST /api/webhooks/stripe', () => {
  it('validates webhook signature', async () => {
    const event = {
      type: 'checkout.session.completed',
      id: 'evt_test',
      data: { object: { id: 'cs_test' } }
    }
    
    const signature = createWebhookSignature(event)
    const res = await POST(mockRequest(event), {
      headers: { 'stripe-signature': signature }
    })
    expect(res.status).toBe(200)
  })

  it('rejects invalid signature', async () => {
    const res = await POST(mockRequest({}), {
      headers: { 'stripe-signature': 'invalid' }
    })
    expect(res.status).toBe(400)
  })

  it('handles checkout.session.completed', async () => {
    // Test subscription creation
  })

  it('handles customer.subscription.deleted', async () => {
    // Test subscription cancellation
  })
})
```

### 10. Monitoring Setup

Add to Sentry (already in next.config.ts):
```typescript
// lib/monitoring/init.ts
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.headers?.authorization) {
        delete event.request.headers.authorization
      }
      return event
    },
  })
}
```

---

## Testing Your Changes

```bash
# Run tests
npm test -- --run

# Run linter
npm run lint

# Build locally
npm run build

# Check health endpoint
curl http://localhost:3000/api/health

# Verify env validation
NODE_ENV=production npm run build  # Should fail if vars missing
```

---

## Deployment Verification

Before deploying to production:

```bash
# 1. Verify no secrets in git
git log -S "sk_test" --all  # Should be empty
git log -S "SUPABASE_URL" --all  # Should only be in .env examples

# 2. Run full test suite
npm test -- --run --coverage  # Aim for >50%

# 3. Build production bundle
npm run build

# 4. Check bundle size
npm run analyze

# 5. Verify health endpoint works
npm start &
curl http://localhost:3000/api/health
```

---

## Files Modified

Priority order for updates:
1. `.gitignore` - Add `.env.local`
2. `lib/config/env.ts` - NEW - Environment validation
3. `lib/api/request-context.ts` - NEW - Request ID tracking
4. `lib/api/validation.ts` - NEW - Input validation helper
5. `app/api/health/route.ts` - NEW - Health check
6. `app/layout.tsx` or new `lib/config/validate.ts` - Import env to validate on startup
7. `package.json` - Add `isomorphic-dompurify` dependency
8. Update sample API routes (characters, autosave, webhooks)
9. Create test files for critical paths

---

## Success Criteria

After implementing these fixes, you should be able to:

- [ ] Start app and see "Environment validation passed"
- [ ] Health endpoint returns 200 with healthy status
- [ ] All API errors include requestId
- [ ] Missing env vars cause startup failure (not runtime)
- [ ] Invalid request bodies return 400 with validation details
- [ ] HTML content is sanitized in document storage
- [ ] Unit tests pass with >50% coverage
- [ ] Webhook requests validate signature
- [ ] Error tracking works in Sentry

---

## Next Steps After These Fixes

1. **Week 2**: Rate limiting on all endpoints, pagination
2. **Week 3**: API documentation, deployment runbook
3. **Week 4**: Load testing, performance optimization
4. **Week 5**: Ready for production launch

Total remaining effort: ~80-100 hours

