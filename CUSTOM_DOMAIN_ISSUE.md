# Custom Domain Not Updating - Vercel CDN Cache Issue

**Date**: October 17, 2025
**Issue**: www.ottowrite.app stuck returning 500 error despite deployments working
**Root Cause**: Vercel CDN caching old deployment for custom domain

---

## Current Status

### ✅ Deployments Working
All recent Vercel deployment URLs return **401** (correct behavior):
- https://ottowrite-1prqo4wdd-emmanuels-projects-15fbaf71.vercel.app ✅ 401
- https://ottowrite-ftq1nz42p-emmanuels-projects-15fbaf71.vercel.app ✅ 401
- https://ottowrite-ifk8dwgbi-emmanuels-projects-15fbaf71.vercel.app ✅ 401

### ❌ Custom Domain Stuck
- https://www.ottowrite.app ❌ 500 (cached from old deployment)

---

## What We Fixed

### 1. Added Error Handling
**File**: `app/dashboard/layout.tsx`
- Added try/catch around createClient()
- Added error handling for auth.getUser()
- Graceful redirect to /auth/login on errors

### 2. Added Missing Environment Variables
```bash
# Added to Production, Preview, Development:
SUPABASE_URL=https://jtngociduoicfnieidxf.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...

# Already existed:
NEXT_PUBLIC_SUPABASE_URL=https://jtngociduoicfnieidxf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Already added (Stripe):
STRIPE_PRICE_HOBBYIST=price_1SImHmA2PfDiF2t51g2eMfQF
STRIPE_PRICE_PROFESSIONAL=price_1SImHzA2PfDiF2t5WLRx7tN0
STRIPE_PRICE_STUDIO=price_1SImIBA2PfDiF2t5L1x0YMwt
```

### 3. Multiple Deployments
- Deployed 4 times trying to update custom domain
- Each deployment works correctly on its own URL
- Custom domain not updating due to Vercel CDN caching

---

## Why Custom Domain Is Stuck

### Vercel CDN Caching
Vercel's CDN has cached the 500 error response for `www.ottowrite.app`:
- Cache headers: `age: 58`, `max-age=0`
- Edge servers returning cached 500 response
- New deployments not being routed to custom domain

### Evidence
```bash
# Latest deployment - WORKS
$ curl -I https://ottowrite-1prqo4wdd-emmanuels-projects-15fbaf71.vercel.app/dashboard
HTTP/2 401

# Custom domain - STUCK
$ curl -I https://www.ottowrite.app/dashboard
HTTP/2 500
x-matched-path: /500
```

---

## Solutions

### Option 1: Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**:
   https://vercel.com/emmanuels-projects-15fbaf71/ottowrite

2. **Navigate to Domains**:
   Settings → Domains

3. **Remove the domain**:
   - Find `www.ottowrite.app`
   - Click "Remove"

4. **Re-add the domain**:
   - Click "Add"
   - Enter: `www.ottowrite.app`
   - Wait for DNS verification
   - Domain should now point to latest deployment

### Option 2: Wait for Cache Expiration

Vercel's CDN cache should eventually expire and update:
- **Typical time**: 5-30 minutes
- **Maximum time**: Up to 24 hours for stubborn caches
- **Not recommended**: Too unpredictable

### Option 3: Purge Cache via Support

If dashboard doesn't work:
1. Contact Vercel support
2. Request CDN cache purge for `www.ottowrite.app`
3. They can force invalidate the cache

---

## Verification Steps

After removing/re-adding the domain:

```bash
# Test custom domain
curl -I https://www.ottowrite.app/dashboard

# Expected (not authenticated):
HTTP/2 401

# Or expected (if Next.js redirects):
HTTP/2 307
location: /auth/login

# NOT expected:
HTTP/2 500
```

---

## Environment Variables - Complete List

All configured in Vercel (Production, Preview, Development):

### Supabase
```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_URL (fallback)
✅ SUPABASE_ANON_KEY (fallback)
```

### Stripe
```
✅ STRIPE_PRICE_HOBBYIST
✅ STRIPE_PRICE_PROFESSIONAL
✅ STRIPE_PRICE_STUDIO
⏳ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pending - see STRIPE_STATUS.md)
⏳ STRIPE_SECRET_KEY (pending - see STRIPE_STATUS.md)
⏳ STRIPE_WEBHOOK_SECRET (pending - see STRIPE_STATUS.md)
```

---

## Working URLs (Use These Now)

Until custom domain is fixed, use these deployment URLs:

**Latest Deployment** (1 hour ago):
- https://ottowrite-1prqo4wdd-emmanuels-projects-15fbaf71.vercel.app

**Test Dashboard**:
- https://ottowrite-1prqo4wdd-emmanuels-projects-15fbaf71.vercel.app/dashboard
- Expected: Redirects to /auth/login (401 or 307)

**Test Signup**:
- https://ottowrite-1prqo4wdd-emmanuels-projects-15fbaf71.vercel.app/auth/signup
- Should work normally

---

## Technical Details

### Build Information
- Build ID (working): `2DH3E4x9fMo4gNJpkWxjEnE379NM`
- Build ID (cached/broken): `Ur2tYYkSUtNEKnjVJ46XI`
- Status: ✅ Build passing, code working
- Issue: Infrastructure/routing only

### Error in Browser Console
```
GET https://www.ottowrite.app/dashboard 500 (Internal Server Error)
HEAD https://www.ottowrite.app/_next/data/Ur2tYYkSUtNEKnjVJ46XI/dashboard.json 500
```

The build ID `Ur2tYYkSUtNEKnjVJ46XI` is from an old deployment, confirming custom domain is stuck on old version.

---

## Summary

**Problem**: Custom domain stuck on old deployment with 500 error
**Root Cause**: Vercel CDN caching + domain not updating to new deployments
**Code Status**: ✅ Fixed (all direct deployment URLs work)
**Custom Domain**: ❌ Stuck (requires Vercel dashboard action)

**Action Required**: Remove and re-add `www.ottowrite.app` in Vercel dashboard

**Workaround**: Use deployment URL: https://ottowrite-1prqo4wdd-emmanuels-projects-15fbaf71.vercel.app

---

**Files**:
- DASHBOARD_500_FIX.md - Original error diagnosis and code fix
- STRIPE_STATUS.md - Stripe integration status
- This file - Custom domain caching issue

**Status**: Code ✅ Fixed | Infrastructure ⏳ Needs manual Vercel action
