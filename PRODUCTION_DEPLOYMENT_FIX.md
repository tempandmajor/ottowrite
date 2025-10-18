# Production Deployment Fix - Supabase Environment Variables

**Issue**: 500 errors on `/dashboard` and signup not sending confirmation emails
**Root Cause**: Missing Supabase environment variables in production deployment
**Status**: ⚠️ REQUIRES IMMEDIATE ACTION

---

## Problem Diagnosis

### Error Flow

1. **Server-Side Error** (`lib/supabase/server.ts:11`)
   ```typescript
   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Supabase environment variables are not fully configured')
   }
   ```
   - Server component tries to create Supabase client
   - Environment variables are missing
   - Exception thrown before page can render

2. **Dashboard Layout Fails** (`app/dashboard/layout.tsx`)
   - Layout is a server component that checks authentication
   - Calls `createClient()` from `lib/supabase/server.ts`
   - Exception bubbles up → 500 error
   - User sees error instead of being redirected

3. **Client-Side Signup Fails** (`lib/supabase/client.ts:7`)
   ```typescript
   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing public Supabase environment variables')
   }
   ```
   - Browser can't create Supabase client
   - Signup form can't communicate with Supabase
   - No confirmation email sent
   - Signup appears to succeed but user is never created

### Why This Happens

**Local Development** (✅ Works):
- Variables loaded from `.env.local`
- All Supabase operations function correctly

**Production Deployment** (❌ Fails):
- `.env.local` is gitignored (correctly)
- Environment variables must be set in deployment platform (Vercel)
- Missing variables → runtime errors

---

## Required Environment Variables

### Critical (Required for Basic Function)

```bash
# Public variables (accessible in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side fallbacks (optional but recommended)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Recommended (For Full Functionality)

```bash
# Service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to Find These Values

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: "Ottowrite" (ID: `jtngociduoicfnieidxf`)

2. **Get Project URL**
   - Settings → API
   - Copy "Project URL"
   - Example: `https://jtngociduoicfnieidxf.supabase.co`

3. **Get Anon Key**
   - Settings → API
   - Copy "anon public" key
   - This is safe to expose in browser

4. **Get Service Role Key** (Optional)
   - Settings → API
   - Copy "service_role secret" key
   - ⚠️ Keep this secret! Never expose in browser

---

## Fix Instructions

### Option A: Vercel Dashboard (Recommended)

1. **Navigate to Vercel Project**
   - Go to: https://vercel.com
   - Select your OttoWrite project

2. **Add Environment Variables**
   - Settings → Environment Variables
   - Add each variable below:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://jtngociduoicfnieidxf.supabase.co` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[your-anon-key]` | Production, Preview, Development |
   | `SUPABASE_URL` | `https://jtngociduoicfnieidxf.supabase.co` | Production, Preview, Development |
   | `SUPABASE_ANON_KEY` | `[your-anon-key]` | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | `[your-service-role-key]` | Production, Preview, Development |

3. **Redeploy**
   - Deployments → Click on latest deployment
   - Click "Redeploy" button
   - OR: Push a new commit to trigger automatic deployment

4. **Verify Fix**
   - Wait for deployment to complete (~1-2 minutes)
   - Visit: `https://your-domain.com/dashboard`
   - Should no longer see 500 error

### Option B: Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Link to project (if not already linked)
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: https://jtngociduoicfnieidxf.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste: [your-anon-key]

vercel env add SUPABASE_URL
# Paste: https://jtngociduoicfnieidxf.supabase.co

vercel env add SUPABASE_ANON_KEY
# Paste: [your-anon-key]

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste: [your-service-role-key]

# Pull environment variables to local (optional)
vercel env pull .env.production

# Redeploy
vercel --prod
```

### Option C: Environment Variables File (For Reference)

Create `.env.production` locally (DO NOT COMMIT):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://jtngociduoicfnieidxf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://jtngociduoicfnieidxf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Then use Vercel CLI or dashboard to upload these values.

---

## Verification Steps

### After Applying Fix

1. **Test Dashboard Access**
   ```
   Visit: https://your-domain.com/dashboard
   Expected: Redirect to /auth/login (if not logged in)
   NOT Expected: 500 error page
   ```

2. **Test Signup Flow**
   ```
   1. Visit: https://your-domain.com/auth/signup
   2. Fill in email and password
   3. Click "Sign Up"
   4. Check email for confirmation link
   Expected: Email received within 1-2 minutes
   ```

3. **Test Login After Confirmation**
   ```
   1. Click confirmation link in email
   2. Redirected to login page
   3. Enter credentials
   4. Should access /dashboard successfully
   ```

4. **Check Server Logs** (Vercel Dashboard)
   ```
   Deployments → [Latest] → Runtime Logs
   Should NOT see: "Supabase environment variables are not fully configured"
   Should see: Successful database queries
   ```

---

## Additional Recommendations

### 1. Add to `.gitignore` (Already Done ✅)

```bash
# Environment files
.env.local
.env.production
.env*.local
```

### 2. Update README with Deployment Instructions

Add to `README.md`:

```markdown
## Deployment

### Environment Variables Required

Set these in your Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (optional)

Get these from: Supabase Dashboard → Settings → API
```

### 3. Add Environment Variable Validation

Consider adding a build-time check:

```typescript
// lib/env-check.ts
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file or deployment settings.`
    )
  }
}

// Call in next.config.js or root layout
```

### 4. Better Error Handling

Update `lib/supabase/server.ts` to provide clearer error:

```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY')

  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}\n` +
    `Please add these to your Vercel project settings or .env.local file.\n` +
    `See: https://supabase.com/dashboard/project/jtngociduoicfnieidxf/settings/api`
  )
}
```

### 5. Add Health Check Endpoint

Create a health check to verify environment:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    timestamp: new Date().toISOString(),
  }

  const healthy = checks.supabase_url && checks.supabase_anon

  return NextResponse.json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
  }, {
    status: healthy ? 200 : 503
  })
}
```

Test with: `curl https://your-domain.com/api/health`

---

## Security Checklist

Before deploying:

- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Verify `.env.production` is NOT committed to git
- [ ] Confirm anon key is set (safe for browser)
- [ ] Confirm service role key is set (server-side only)
- [ ] Enable RLS on all Supabase tables
- [ ] Test authentication flow end-to-end
- [ ] Verify emails are being sent
- [ ] Check CORS settings in Supabase
- [ ] Review Supabase Auth settings (email confirmation, etc.)

---

## Rollback Plan

If issues persist after adding environment variables:

1. **Check Supabase Status**
   - Visit: https://status.supabase.com
   - Verify no ongoing incidents

2. **Verify Project URL**
   - Ensure URL format: `https://[project-id].supabase.co`
   - No trailing slashes
   - HTTPS (not HTTP)

3. **Test Keys Locally**
   ```bash
   # In .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://jtngociduoicfnieidxf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-key]

   # Run locally
   npm run dev

   # Test at http://localhost:3000/dashboard
   ```

4. **Check Vercel Build Logs**
   - Deployments → [Latest] → Build Logs
   - Look for environment variable warnings

5. **Contact Support**
   - Vercel: https://vercel.com/support
   - Supabase: https://supabase.com/support

---

## Common Mistakes to Avoid

❌ **DON'T**: Commit `.env.production` to git
✅ **DO**: Add environment variables in Vercel dashboard

❌ **DON'T**: Use development Supabase project in production
✅ **DO**: Use production Supabase project for production deployments

❌ **DON'T**: Expose service role key in browser code
✅ **DO**: Only use service role key in server-side code

❌ **DON'T**: Hardcode API keys in source code
✅ **DO**: Always use environment variables

❌ **DON'T**: Use same keys for all environments
✅ **DO**: Use separate Supabase projects for dev/staging/prod

---

## Post-Fix Checklist

Once environment variables are set:

- [ ] Production deployment succeeds
- [ ] `/dashboard` loads without 500 error
- [ ] Signup sends confirmation email
- [ ] Email confirmation link works
- [ ] Login successfully redirects to dashboard
- [ ] Database queries work (check Supabase logs)
- [ ] No environment variable errors in logs
- [ ] Health check endpoint returns 200
- [ ] All features function normally

---

## Summary

**Problem**: Missing Supabase environment variables in production
**Impact**: 500 errors, broken signup, broken authentication
**Solution**: Add variables to Vercel project settings
**Time to Fix**: 5-10 minutes
**Priority**: CRITICAL - Blocks all user functionality

**Next Steps**:
1. Get Supabase credentials from dashboard
2. Add to Vercel project settings
3. Redeploy
4. Test signup and login
5. Monitor for 24 hours

---

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Verified By**: Claude Code
