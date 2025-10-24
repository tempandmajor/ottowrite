# API Security Best Practices

Comprehensive security guidelines for Ottowrite API development.

## 📋 Table of Contents

- [Quick Security Checklist](#quick-security-checklist)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [CSRF Protection](#csrf-protection)
- [Security Headers](#security-headers)
- [Common Vulnerabilities](#common-vulnerabilities)

---

## 🔒 Quick Security Checklist

Use this checklist when creating or reviewing API routes:

### For Every API Route:

- [ ] **Authentication**: Does this route need authentication?
  - If yes: Add `supabase.auth.getUser()` check
  - If no: Is it truly public? (health checks, webhooks only)

- [ ] **Auth Error Handling**: Check for auth errors
  ```typescript
  if (error || !user) {
    return errorResponses.unauthorized()
  }
  ```

- [ ] **Authorization**: Can users only access their own data?
  - Add `.eq('user_id', user.id)` to queries
  - Or verify RLS policies handle this

- [ ] **Input Validation**: Validate all request data
  - Use Zod schemas: `schema.safeParse(body)`
  - Return 400/422 for invalid input

- [ ] **SQL Injection**: Use parameterized queries only
  - ✅ `.eq('id', userId)` - Good
  - ❌ `.eq('id', `${userId}`)` - Never!

- [ ] **Rate Limiting**: Expensive endpoints need limits
  - AI endpoints: Required
  - File operations: Required
  - Mutations: Recommended

- [ ] **Error Handling**: No sensitive data in errors
  - Use `errorResponses.*` helpers
  - Wrap in try-catch blocks
  - Don't leak stack traces or SQL

- [ ] **Security Headers**: Set appropriate headers
  - Content-Type: application/json
  - No-cache for sensitive data
  - CORS restrictions

---

## 🔐 Authentication

### Required Authentication

```typescript
// app/api/protected-route/route.ts
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'

export async function GET(request: Request) {
  // 1. Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // 2. Check authentication
  if (error || !user) {
    return errorResponses.unauthorized()
  }

  // 3. Proceed with authenticated logic
  // User can safely access their data
}
```

### Public Endpoints

Only these routes should be public:

```typescript
// Allowed public routes:
/api/health
/api/health/ready
/api/webhooks/*  // Signature-verified
/api/contact     // Public contact form
```

All other routes MUST require authentication.

### API Key Authentication

For `/api/v1/*` routes:

```typescript
// app/api/v1/projects/route.ts
import { validateApiKey } from '@/lib/auth/api-keys'

export async function GET(request: Request) {
  const apiKey = request.headers.get('X-API-Key')

  if (!apiKey) {
    return errorResponses.unauthorized('API key required')
  }

  const userId = await validateApiKey(apiKey)

  if (!userId) {
    return errorResponses.unauthorized('Invalid API key')
  }

  // Proceed with userId
}
```

---

## 🛡️ Authorization

### Prevent IDOR (Insecure Direct Object Reference)

**Bad - User can access ANY project:**
```typescript
const { data: project } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)  // ❌ No user check!
  .single()
```

**Good - User can only access their own projects:**
```typescript
const { data: project } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .eq('user_id', user.id)  // ✅ Ownership check
  .single()

if (!project) {
  return errorResponses.forbidden()  // Not found OR not owner
}
```

### Two-Layer Defense

1. **Application-level checks** (as shown above)
2. **Database RLS policies** (backup defense)

Always use both! RLS policies protect against:
- Developer mistakes
- Direct database access
- Bypassing application layer

### Complex Authorization

For routes like `/api/submissions/*` with multiple roles:

```typescript
// Submissions can be accessed by:
// 1. Author (owner)
// 2. Partners who received submission
// 3. Admins

const { data: submission } = await supabase
  .from('manuscript_submissions')
  .select(`
    *,
    submission_partners!inner(partner_id)
  `)
  .eq('id', submissionId)
  .or(`author_id.eq.${user.id},submission_partners.partner_id.eq.${user.id}`)
  .single()

if (!submission) {
  return errorResponses.forbidden()
}
```

---

## ✅ Input Validation

### Use Zod for All Inputs

```typescript
import { z } from 'zod'
import { validationErrorResponse } from '@/lib/validation/middleware'

const projectCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['novel', 'short_story', 'screenplay', 'poem']),
  genre: z.string().min(1).max(50),
  target_word_count: z.number().int().min(1).max(1000000).optional(),
})

export async function POST(request: Request) {
  const body = await request.json()

  // Validate input
  const validation = projectCreateSchema.safeParse(body)

  if (!validation.success) {
    return validationErrorResponse(
      'Invalid input',
      { details: validation.error }
    )
  }

  // Use validated data
  const { title, description, type, genre } = validation.data

  // Proceed safely
}
```

### Validation Schema Patterns

**String fields:**
```typescript
// Required string
title: z.string().min(1).max(200)

// Optional string
description: z.string().max(1000).optional()

// Email
email: z.string().email()

// URL
website: z.string().url()

// UUID
id: z.string().uuid()
```

**Number fields:**
```typescript
// Integer
count: z.number().int()

// Positive integer
count: z.number().int().min(1)

// Range
percentage: z.number().min(0).max(100)
```

**Enum fields:**
```typescript
status: z.enum(['draft', 'published', 'archived'])
```

**Nested objects:**
```typescript
settings: z.object({
  theme: z.enum(['light', 'dark']),
  fontSize: z.number().int().min(12).max(24),
})
```

**Arrays:**
```typescript
tags: z.array(z.string()).min(1).max(10)
```

---

## 🚫 SQL Injection Prevention

### Always Use Parameterized Queries

Supabase automatically parameterizes queries, but you can still make mistakes:

**✅ SAFE - Parameterized:**
```typescript
// Good
.eq('user_id', userId)
.ilike('title', searchTerm)
.in('status', statusList)

// All values are automatically escaped
```

**❌ DANGEROUS - String Interpolation:**
```typescript
// NEVER do this!
.eq('user_id', `${userId}`)  // ❌
.ilike('title', `%${searchTerm}%`)  // ❌

// Also dangerous:
const query = `SELECT * FROM projects WHERE id = ${projectId}`  // ❌
```

### Safe Search Queries

```typescript
// User input
const searchTerm = request.url.searchParams.get('search')

// Validate first
if (searchTerm && searchTerm.length > 100) {
  return errorResponses.badRequest('Search term too long')
}

// Use safely with parameterized query
const { data } = await supabase
  .from('projects')
  .select('*')
  .ilike('title', `%${searchTerm}%`)  // ✅ Safe - Supabase handles escaping
```

### RPC/Function Calls

```typescript
// Safe - parameters are escaped
const { data, error } = await supabase
  .rpc('search_projects', {
    search_term: userInput,
    user_id: user.id,
  })
```

---

## ⏱️ Rate Limiting

### When to Apply Rate Limiting

**Required for:**
- AI generation endpoints (`/api/ai/*`)
- File upload endpoints
- Resource-intensive operations
- Authentication endpoints

**Recommended for:**
- All POST/PUT/PATCH/DELETE operations
- Search endpoints
- Report generation

**Not needed for:**
- GET requests for simple data
- Health checks
- Static data endpoints

### Implementation

```typescript
import { applyRateLimit } from '@/lib/security/api-rate-limiter'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Apply rate limiting (returns early if limit exceeded)
  const rateLimitResult = await applyRateLimit(request, user?.id, {
    tier: 'ai',  // 'default', 'ai', or 'expensive'
    identifier: user?.id || getClientIP(request),
  })

  if (!rateLimitResult.context) {
    return rateLimitResult.response  // 429 Too Many Requests
  }

  // Proceed with request
}
```

### Rate Limit Tiers

```typescript
// Default tier (most endpoints)
tier: 'default'
// 100 requests per minute

// AI tier (expensive operations)
tier: 'ai'
// 10 requests per minute

// Expensive tier (very heavy operations)
tier: 'expensive'
// 5 requests per minute
```

---

## 🚨 Error Handling

### Secure Error Responses

**❌ BAD - Leaks sensitive information:**
```typescript
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
  // Might leak:
  // - SQL errors
  // - Database structure
  // - Internal paths
  // - Stack traces
}
```

**✅ GOOD - Safe error handling:**
```typescript
import { errorResponses } from '@/lib/api/error-response'

try {
  // Operation
} catch (error) {
  console.error('Project creation failed:', error)  // Log internally

  // Return generic error to user
  return errorResponses.internalServerError()
}
```

### Error Response Helpers

```typescript
import { errorResponses } from '@/lib/api/error-response'

// 400 Bad Request
return errorResponses.badRequest('Invalid project type')

// 401 Unauthorized
return errorResponses.unauthorized()

// 403 Forbidden
return errorResponses.forbidden()

// 404 Not Found
return errorResponses.notFound('Project not found')

// 422 Validation Error
return errorResponses.validationError('Invalid input', { details: validationError })

// 429 Too Many Requests
return errorResponses.tooManyRequests()

// 500 Internal Server Error
return errorResponses.internalServerError()
```

### Logging vs. User Response

```typescript
try {
  await complexOperation()
} catch (error) {
  // Log detailed error for debugging
  console.error('Operation failed:', {
    operation: 'create_project',
    userId: user.id,
    error: error.message,
    stack: error.stack,  // OK in logs
  })

  // Return generic error to user
  return errorResponses.internalServerError()  // Generic message
}
```

---

## 🛡️ CSRF Protection

### For State-Changing Operations

```typescript
import { verifyCSRFToken } from '@/lib/security/csrf-protection'

export async function POST(request: Request) {
  // Verify CSRF token for mutations
  const csrfValid = await verifyCSRFToken(request)

  if (!csrfValid) {
    return errorResponses.forbidden('Invalid CSRF token')
  }

  // Proceed with operation
}
```

### Middleware Handles CSRF

The middleware (`middleware.ts`) automatically:
1. Generates CSRF tokens for authenticated users
2. Sets CSRF cookie and header
3. Validates tokens on state-changing requests

You only need to verify manually for critical operations.

---

## 🔒 Security Headers

### Set Security Headers

```typescript
export async function GET(request: Request) {
  const data = await getData()

  return NextResponse.json(data, {
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Cache-Control': 'no-store, no-cache, must-revalidate',  // For sensitive data
    },
  })
}
```

### CORS Configuration

```typescript
// Only for public API endpoints (/api/v1/*)
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://yourdomain.com',
]

export async function GET(request: Request) {
  const origin = request.headers.get('Origin')

  if (origin && allowedOrigins.includes(origin)) {
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  return NextResponse.json(data)
}
```

---

## ⚠️ Common Vulnerabilities

### 1. IDOR (Insecure Direct Object Reference)

**Vulnerability:**
```typescript
// User can access ANY document by guessing IDs
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('id', documentId)  // ❌ No ownership check
```

**Fix:**
```typescript
// User can only access their own documents
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('id', documentId)
  .eq('user_id', user.id)  // ✅ Ownership check
```

### 2. Mass Assignment

**Vulnerability:**
```typescript
// User can set any field, including admin flags!
const body = await request.json()
const { data } = await supabase
  .from('users')
  .update(body)  // ❌ Dangerous!
  .eq('id', user.id)
```

**Fix:**
```typescript
// Only allow specific fields
const { name, email } = validation.data  // Validated with Zod
const { data } = await supabase
  .from('users')
  .update({ name, email })  // ✅ Safe - explicit fields only
  .eq('id', user.id)
```

### 3. Information Disclosure

**Vulnerability:**
```typescript
// Leaks whether resource exists for other users
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single()

if (!data) {
  return errorResponses.notFound()  // ❌ "Not found" = doesn't exist
}

if (data.user_id !== user.id) {
  return errorResponses.forbidden()  // ❌ "Forbidden" = exists but not yours
}
```

**Fix:**
```typescript
// Same error for both cases
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .eq('user_id', user.id)  // Filter by ownership
  .single()

if (!data) {
  return errorResponses.notFound()  // ✅ Could be either reason
}
```

### 4. Broken Access Control

**Vulnerability:**
```typescript
// Delete endpoint doesn't check ownership
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await supabase
    .from('projects')
    .delete()
    .eq('id', params.id)  // ❌ Anyone can delete!

  return NextResponse.json({ success: true })
}
```

**Fix:**
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return errorResponses.unauthorized()
  }

  // Delete only if owned by user
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)  // ✅ Ownership check

  if (deleteError) {
    return errorResponses.notFound()  // Not found OR not owned
  }

  return NextResponse.json({ success: true })
}
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

---

## 🔄 Security Review Process

1. **Before Code Review:**
   - Run `npm run security:audit-api`
   - Fix all CRITICAL and HIGH issues

2. **During Code Review:**
   - Check against security checklist
   - Verify RLS policies exist
   - Test authorization manually

3. **Before Deployment:**
   - Run full security test suite
   - Review security audit report
   - Verify no sensitive data in logs

4. **Post-Deployment:**
   - Monitor for unusual activity
   - Review error logs for injection attempts
   - Track rate limit violations

---

**Remember:** Security is everyone's responsibility. When in doubt, ask for a security review!
