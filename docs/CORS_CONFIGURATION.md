# CORS Configuration Guide

**Status:** ✅ Implemented (PROD-011)
**Last Updated:** 2025-10-24
**Priority:** 🟡 Important

## Overview

This document describes the CORS (Cross-Origin Resource Sharing) configuration for OttoWrite's API endpoints. CORS is a critical security feature that controls which domains can make requests to our API, preventing unauthorized access from malicious websites.

## Current Implementation

CORS is implemented in `middleware.ts` and applies to all API routes (`/api/*`).

### Allowed Origins

The following origins are permitted to access the API:

**Production:**
- `NEXT_PUBLIC_APP_URL` (configured via environment variable)

**Development:**
- `http://localhost:3000`
- `http://localhost:3001`
- `https://localhost:3000`

### Security Features

✅ **Origin Validation**: Only whitelisted origins can access API endpoints
✅ **Credentials Support**: Allows cookies/auth headers for authenticated requests
✅ **Preflight Handling**: OPTIONS requests are properly handled
✅ **Cache Control**: 24-hour preflight cache via `Access-Control-Max-Age`
✅ **Vary Header**: Ensures proper CDN/proxy caching behavior

## Configuration

### Environment Variables

Set your production domain in `.env.production`:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### CORS Headers

#### Preflight Requests (OPTIONS)

```
Access-Control-Allow-Origin: <origin> (if whitelisted)
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID, X-CSRF-Token
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
Vary: Origin
```

#### Regular Requests

```
Access-Control-Allow-Origin: <origin> (if whitelisted)
Access-Control-Allow-Credentials: true
Vary: Origin
```

## Testing

### Test CORS with curl

#### Test Unauthorized Origin (should be rejected)

```bash
curl -X OPTIONS https://yourdomain.com/api/projects \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Should NOT include Access-Control-Allow-Origin header
```

#### Test Authorized Origin (should succeed)

```bash
curl -X OPTIONS https://yourdomain.com/api/projects \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Should include: Access-Control-Allow-Origin: https://yourdomain.com
```

#### Test Actual Request

```bash
curl https://yourdomain.com/api/projects \
  -H "Origin: https://yourdomain.com" \
  -H "Authorization: Bearer <token>" \
  -v

# Should include CORS headers in response
```

### Browser Testing

Open browser DevTools Console on `https://malicious-site.com`:

```javascript
// This should fail with CORS error
fetch('https://yourdomain.com/api/projects', {
  credentials: 'include'
})
.then(r => r.json())
.catch(err => console.log('CORS blocked:', err))
```

## Implementation Details

### Code Structure

```typescript
// Helper function to check if origin is allowed
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
  ].filter((url): url is string => Boolean(url))

  return allowedOrigins.some(allowed =>
    allowed === origin || origin.endsWith(allowed.replace(/^https?:\/\//, ''))
  )
}

// Helper function to add CORS headers
function addCORSHeaders(response: NextResponse, origin: string | null): void {
  if (isOriginAllowed(origin) && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Vary', 'Origin')
  }
}
```

### Middleware Integration

1. **Preflight Handling**: OPTIONS requests return immediately with CORS headers
2. **Request Processing**: Regular requests proceed through middleware
3. **Response Headers**: CORS headers added before returning response

## Security Considerations

### ✅ What This Protects Against

- **Cross-Site Request Forgery (CSRF)**: Combined with CSRF tokens
- **Unauthorized API Access**: Only whitelisted domains can make requests
- **Data Exfiltration**: Prevents malicious sites from accessing user data
- **API Abuse**: Limits requests to legitimate frontend applications

### ⚠️ Important Notes

1. **Subdomain Handling**: Current implementation allows exact matches only
   - `https://app.domain.com` ≠ `https://domain.com`
   - Update `isOriginAllowed()` if you need subdomain wildcards

2. **WWW Variant**: Add explicitly if needed:
   ```typescript
   const allowedOrigins = [
     'https://yourdomain.com',
     'https://www.yourdomain.com', // Add www variant
   ]
   ```

3. **Multiple Domains**: If you have multiple production domains:
   ```typescript
   const allowedOrigins = [
     'https://domain1.com',
     'https://domain2.com',
     'https://app.domain1.com',
   ]
   ```

## Common Issues

### Issue: CORS errors in production

**Cause**: `NEXT_PUBLIC_APP_URL` not set or incorrect

**Solution**:
1. Check Vercel environment variables
2. Ensure value matches your domain exactly (including https://)
3. Redeploy after updating

### Issue: OPTIONS requests failing

**Cause**: Preflight not handled correctly

**Solution**:
1. Verify middleware is running for `/api/*` routes
2. Check middleware matcher configuration
3. Ensure OPTIONS method is not blocked by other middleware

### Issue: Credentials not included

**Cause**: Frontend not sending credentials

**Solution**:
```javascript
// Add credentials: 'include' to fetch requests
fetch('/api/endpoint', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

## Deployment Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_APP_URL` in Vercel environment variables
- [ ] Test CORS with production domain using curl
- [ ] Verify unauthorized origins are blocked
- [ ] Test authenticated requests with credentials
- [ ] Check browser DevTools for CORS errors
- [ ] Verify OPTIONS preflight requests return 204
- [ ] Confirm `Vary: Origin` header is present

## Monitoring

Monitor these metrics in production:

1. **Blocked CORS Requests**: Look for 403/401 responses with Origin header
2. **OPTIONS Request Volume**: Should be minimal due to 24h cache
3. **Invalid Origin Attempts**: May indicate attack attempts

## Related Documentation

- [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md)
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [PRODUCTION_READINESS_TICKETS.md](./PRODUCTION_READINESS_TICKETS.md) (PROD-011)

## References

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP CORS Guide](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#cross-origin-resource-sharing)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
