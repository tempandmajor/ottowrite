# Domain & SSL Setup Guide

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Owner:** DevOps Team
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Domain Purchase](#domain-purchase)
4. [DNS Configuration](#dns-configuration)
5. [Vercel Domain Setup](#vercel-domain-setup)
6. [SSL Certificate Configuration](#ssl-certificate-configuration)
7. [Environment Variable Updates](#environment-variable-updates)
8. [Third-Party Service Updates](#third-party-service-updates)
9. [Testing & Verification](#testing--verification)
10. [Troubleshooting](#troubleshooting)
11. [Post-Launch Checklist](#post-launch-checklist)

---

## Overview

### Purpose

This guide provides step-by-step instructions for configuring a custom domain with SSL certificates for the Ottowrite production deployment on Vercel.

### Architecture

```
User Request Flow:
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  User → DNS Provider → Vercel Edge Network → Next.js App │
│                            ↓                              │
│                      SSL Certificate                      │
│                     (Auto-renewed)                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Provider | Purpose |
|-----------|----------|---------|
| **Domain** | Namecheap/GoDaddy/etc. | Primary domain (e.g., ottowrite.app) |
| **DNS** | Vercel or Domain Registrar | DNS record management |
| **SSL/TLS** | Vercel (Let's Encrypt) | Automatic HTTPS certificates |
| **CDN** | Vercel Edge Network | Global content delivery |
| **Hosting** | Vercel | Next.js application hosting |

---

## Prerequisites

### Required Access

- [ ] Domain registrar account (Namecheap, GoDaddy, etc.)
- [ ] Vercel account with project access
- [ ] GitHub repository access
- [ ] Supabase project dashboard access
- [ ] Stripe dashboard access

### Estimated Timeline

| Task | Duration |
|------|----------|
| Domain purchase | 10 minutes |
| DNS configuration | 15 minutes |
| Vercel setup | 10 minutes |
| SSL issuance (automatic) | 5-30 minutes |
| Environment updates | 15 minutes |
| Testing & verification | 15 minutes |
| **Total** | **1-1.5 hours** |

---

## Domain Purchase

### Recommended Domain Registrars

| Registrar | Price Range | Pros | Cons |
|-----------|-------------|------|------|
| **Namecheap** | $8-15/year | Free WHOIS privacy, good UI | - |
| **Google Domains** | $12/year | Simple, Google integration | Limited TLDs |
| **Cloudflare** | At-cost | Best prices, free SSL | Requires Cloudflare account |
| **GoDaddy** | $12-20/year | Popular, many TLDs | Upsells, higher renewal |

### Domain Selection Criteria

**Recommended TLDs:**
- `.app` - Perfect for applications (requires HTTPS)
- `.io` - Tech-friendly, popular with startups
- `.com` - Most recognized, best for business
- `.ai` - Great for AI-focused products

**Example Domains:**
```
✅ Good:
- ottowrite.app
- ottowrite.io
- getotto.com
- ott.ai

❌ Avoid:
- otto-write-app.com (too many hyphens)
- otttowrite.net (typo-prone)
- ottowrite.info (not professional)
```

### Purchase Steps

1. **Search for Domain:**
   ```
   Visit: namecheap.com or your preferred registrar
   Search: ottowrite.app
   Check availability
   ```

2. **Add to Cart:**
   - Select domain
   - Add 1-2 years registration
   - Add WHOIS privacy protection (recommended)
   - Skip extra services (SEO, email, etc.)

3. **Complete Purchase:**
   - Enter payment information
   - Complete checkout
   - Save confirmation email

4. **Verify Ownership:**
   - Check email for domain confirmation
   - Verify domain appears in registrar dashboard

---

## DNS Configuration

### Option 1: Using Vercel DNS (Recommended)

**Advantages:**
- Simplest setup
- Integrated with Vercel
- Automatic SSL
- Global edge network
- No propagation delays

**Setup Steps:**

1. **Add Domain to Vercel:**
   ```bash
   # Via Vercel dashboard:
   Project → Settings → Domains → Add Domain
   Enter: ottowrite.app
   ```

2. **Get Nameservers:**
   ```
   Vercel will provide nameservers:
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

3. **Update Registrar:**
   ```
   Log in to domain registrar
   Navigate to: Domain Management → Nameservers
   Change to: Custom Nameservers
   Add:
     ns1.vercel-dns.com
     ns2.vercel-dns.com
   Save changes
   ```

4. **Wait for Propagation:**
   ```
   Typical time: 5-30 minutes
   Max time: 24-48 hours
   Check: dig ottowrite.app NS
   ```

---

### Option 2: Using External DNS Provider

**Use when:**
- You need to keep existing DNS provider
- You use other services on the same domain
- You prefer Cloudflare/Route53/etc.

**DNS Records Required:**

```bash
# Production domain
Type    Name    Value                       TTL
A       @       76.76.21.21                 3600
CNAME   www     cname.vercel-dns.com        3600

# Optional: Staging subdomain
CNAME   staging cname.vercel-dns.com        3600

# Optional: API subdomain
CNAME   api     cname.vercel-dns.com        3600
```

**Setup Steps:**

1. **Log in to DNS Provider:**
   ```
   Example: Cloudflare, Route53, Namecheap DNS
   ```

2. **Add A Record:**
   ```
   Type: A
   Name: @ (root domain)
   Value: 76.76.21.21
   TTL: 3600 (or Auto)
   ```

3. **Add CNAME Record:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600 (or Auto)
   ```

4. **Verify DNS:**
   ```bash
   # Check A record
   dig ottowrite.app A

   # Check CNAME record
   dig www.ottowrite.app CNAME

   # Check from multiple locations
   https://www.whatsmydns.net/#A/ottowrite.app
   ```

---

## Vercel Domain Setup

### Step 1: Add Domain to Project

```bash
# Via Vercel CLI
vercel domains add ottowrite.app

# Via Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Select project: ottowrite
3. Settings → Domains → Add
4. Enter: ottowrite.app
5. Click: Add
```

### Step 2: Configure Domain Settings

**Production Domain:**
```
Primary: ottowrite.app
Redirect: www.ottowrite.app → ottowrite.app
Git Branch: main
```

**Domain Configuration:**
```javascript
// vercel.json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.ottowrite.app"
        }
      ],
      "destination": "https://ottowrite.app/:path*",
      "permanent": true
    }
  ]
}
```

### Step 3: Verify Domain Status

**Via Dashboard:**
```
Vercel Project → Domains

Expected Status:
✅ ottowrite.app (Production)
   - DNS: Valid
   - SSL: Issued
   - Status: Ready

✅ www.ottowrite.app (Redirect)
   - Redirects to: ottowrite.app
   - Status: Active
```

**Via CLI:**
```bash
# List all domains
vercel domains ls

# Check specific domain
vercel domains inspect ottowrite.app
```

---

## SSL Certificate Configuration

### Automatic SSL (Vercel)

Vercel automatically provisions SSL certificates using **Let's Encrypt**.

**Features:**
- ✅ Free, automatic issuance
- ✅ Auto-renewal (every 90 days)
- ✅ Wildcard support (*.ottowrite.app)
- ✅ A+ SSL Labs rating
- ✅ TLS 1.2 and 1.3 support

### Certificate Issuance Process

```
Timeline:
1. Domain verified (DNS propagation)        → 5-30 min
2. SSL certificate requested (Let's Encrypt) → 1-2 min
3. Certificate issued and deployed          → 1-2 min
4. HTTPS ready                              → Immediate

Total: 10-35 minutes (typical: 10 minutes)
```

### Verify SSL Certificate

**Via Browser:**
```
1. Visit: https://ottowrite.app
2. Click padlock icon in address bar
3. View certificate details
4. Verify:
   ✅ Issued to: ottowrite.app
   ✅ Issued by: Let's Encrypt
   ✅ Valid for: 90 days
   ✅ Secure connection (TLS 1.2+)
```

**Via SSL Labs:**
```
1. Visit: https://www.ssllabs.com/ssltest/
2. Enter: ottowrite.app
3. Wait for scan (2-3 minutes)
4. Target rating: A or A+
```

**Via CLI:**
```bash
# Check SSL certificate
openssl s_client -connect ottowrite.app:443 -servername ottowrite.app < /dev/null

# Check certificate expiry
echo | openssl s_client -connect ottowrite.app:443 -servername ottowrite.app 2>/dev/null | \
  openssl x509 -noout -dates

# Verify HTTPS redirect
curl -I http://ottowrite.app
# Expected: HTTP/1.1 308 Permanent Redirect
# Location: https://ottowrite.app/
```

### SSL Best Practices

**Enforced Settings:**
- ✅ HTTPS only (HTTP→HTTPS redirect)
- ✅ TLS 1.2 minimum
- ✅ HSTS enabled (Strict-Transport-Security)
- ✅ Perfect Forward Secrecy
- ✅ Secure cipher suites

**HSTS Header (Automatic):**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## Environment Variable Updates

### Step 1: Update Vercel Environment Variables

**Via Vercel Dashboard:**

```
1. Go to: Vercel Project → Settings → Environment Variables

2. Update the following:
```

| Variable | Environment | Value |
|----------|-------------|-------|
| `NEXT_PUBLIC_APP_URL` | Production | `https://ottowrite.app` |
| `NEXT_PUBLIC_APP_URL` | Preview | `https://$VERCEL_URL` |
| `NEXT_PUBLIC_APP_URL` | Development | `http://localhost:3000` |

**Via Vercel CLI:**

```bash
# Update production
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://ottowrite.app

# Verify
vercel env ls
```

### Step 2: Update Application Code

**Check all references to APP_URL:**

```bash
# Search for hardcoded URLs
grep -r "localhost:3000" --exclude-dir=node_modules --exclude-dir=.next
grep -r "vercel.app" --exclude-dir=node_modules --exclude-dir=.next

# Common files to check:
# - next.config.js
# - lib/stripe/config.ts
# - lib/supabase/client.ts
# - app/layout.tsx
```

**Update redirect URLs:**

```typescript
// lib/stripe/config.ts
export const STRIPE_SUCCESS_URL = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
export const STRIPE_CANCEL_URL = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`;

// lib/auth/config.ts
export const AUTH_REDIRECT_URL = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
```

### Step 3: Update Next.js Configuration

```javascript
// next.config.js
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://ottowrite.app',
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.ottowrite.app' }],
        destination: 'https://ottowrite.app/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
```

---

## Third-Party Service Updates

### Supabase Configuration

**Update Redirect URLs:**

```
1. Go to: Supabase Dashboard → Authentication → URL Configuration

2. Add to "Redirect URLs":
   https://ottowrite.app/auth/callback
   https://ottowrite.app/auth/reset-password
   https://ottowrite.app/auth/verify

3. Update "Site URL":
   https://ottowrite.app
```

**Via SQL:**
```sql
-- Verify redirect URLs in auth.config
SELECT * FROM auth.config WHERE key = 'redirect_urls';
```

---

### Stripe Configuration

**Update Webhook URLs:**

```
1. Go to: Stripe Dashboard → Developers → Webhooks

2. Update endpoint URL:
   Old: https://[project]-[hash].vercel.app/api/webhooks/stripe
   New: https://ottowrite.app/api/webhooks/stripe

3. Test webhook:
   Send test event → Verify 200 response
```

**Update Business Information:**
```
1. Go to: Stripe Dashboard → Settings → Business Settings

2. Update:
   Website: https://ottowrite.app
   Support URL: https://ottowrite.app/support
   Terms of Service: https://ottowrite.app/terms
   Privacy Policy: https://ottowrite.app/privacy
```

---

### OpenAI Configuration (if applicable)

**Update Callback URLs:**
```
If using OpenAI OAuth or callbacks:
1. Go to: OpenAI API Dashboard
2. Update redirect URIs to use new domain
```

---

### Google Search Console (SEO)

**Add New Property:**
```
1. Go to: Google Search Console
2. Add property: ottowrite.app
3. Verify ownership:
   - HTML file upload (via Vercel public/ folder)
   - DNS TXT record
   - HTML meta tag
```

---

## Testing & Verification

### Pre-Launch Checklist

**DNS Verification:**
- [ ] A record resolves correctly
  ```bash
  dig ottowrite.app A
  # Expected: 76.76.21.21
  ```

- [ ] CNAME record resolves correctly
  ```bash
  dig www.ottowrite.app CNAME
  # Expected: cname.vercel-dns.com
  ```

- [ ] DNS propagation complete
  ```bash
  https://www.whatsmydns.net/#A/ottowrite.app
  # Expected: Green checkmarks worldwide
  ```

**SSL Verification:**
- [ ] HTTPS loads correctly
  ```bash
  curl -I https://ottowrite.app
  # Expected: HTTP/2 200
  ```

- [ ] HTTP redirects to HTTPS
  ```bash
  curl -I http://ottowrite.app
  # Expected: 308 Permanent Redirect → https://
  ```

- [ ] SSL certificate valid
  ```bash
  echo | openssl s_client -connect ottowrite.app:443 -servername ottowrite.app 2>/dev/null | \
    openssl x509 -noout -dates
  # Check expiry date (should be ~90 days from now)
  ```

- [ ] SSL Labs grade A+
  ```
  https://www.ssllabs.com/ssltest/analyze.html?d=ottowrite.app
  ```

**Application Verification:**
- [ ] Homepage loads (`https://ottowrite.app`)
- [ ] Assets load correctly (images, CSS, JS)
- [ ] Authentication works
  - [ ] Sign up
  - [ ] Log in
  - [ ] Password reset
  - [ ] OAuth (if configured)
- [ ] Supabase connection works
- [ ] Stripe checkout works
- [ ] API endpoints respond correctly
- [ ] No mixed content warnings (HTTP resources on HTTPS)

**Redirect Verification:**
- [ ] www → non-www redirect works
  ```bash
  curl -I https://www.ottowrite.app
  # Expected: 308 → https://ottowrite.app
  ```

- [ ] Trailing slash behavior consistent
- [ ] Old Vercel URLs redirect (optional)

**Performance Verification:**
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score:
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+

### Automated Verification Script

Run the automated verification script:

```bash
# Create and run verification
./scripts/verify-domain-ssl.sh ottowrite.app

# Expected output:
# ✅ DNS A record: Valid
# ✅ DNS CNAME record: Valid
# ✅ HTTPS accessible: Valid
# ✅ HTTP→HTTPS redirect: Valid
# ✅ SSL certificate: Valid (expires 2026-01-22)
# ✅ www redirect: Valid
# ✅ All checks passed!
```

---

## Troubleshooting

### Issue: DNS Not Propagating

**Symptoms:**
- Domain doesn't resolve
- `dig` shows no results
- Browser shows "Site not found"

**Solutions:**

1. **Check DNS provider:**
   ```bash
   # Verify nameservers set correctly
   dig ottowrite.app NS

   # Check from different locations
   https://www.whatsmydns.net/#NS/ottowrite.app
   ```

2. **Clear DNS cache:**
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Windows
   ipconfig /flushdns

   # Linux
   sudo systemd-resolve --flush-caches
   ```

3. **Wait longer:**
   - Typical: 5-30 minutes
   - Maximum: 24-48 hours
   - Check status: `dig +trace ottowrite.app`

---

### Issue: SSL Certificate Not Issued

**Symptoms:**
- "Your connection is not private" error
- Certificate shows "Vercel" instead of "Let's Encrypt"
- Certificate missing or invalid

**Solutions:**

1. **Verify DNS is correct:**
   ```bash
   dig ottowrite.app
   # Must resolve to Vercel IP: 76.76.21.21
   ```

2. **Wait for issuance:**
   - DNS must propagate first
   - Then certificate is issued
   - Total time: 10-35 minutes

3. **Check Vercel dashboard:**
   ```
   Project → Domains → [your-domain]
   Status should show: "Valid" and "SSL: Active"
   ```

4. **Force renewal:**
   ```
   Vercel Dashboard → Domains → Remove domain
   Wait 5 minutes
   Re-add domain
   ```

---

### Issue: Mixed Content Warnings

**Symptoms:**
- Browser shows "Not Secure" even though using HTTPS
- Console shows "Mixed Content" errors
- Some resources don't load

**Solutions:**

1. **Find HTTP resources:**
   ```bash
   # Check for http:// in code
   grep -r "http://" app/ lib/ --exclude-dir=node_modules
   ```

2. **Update to HTTPS or protocol-relative:**
   ```typescript
   // ❌ Bad
   const imageUrl = 'http://example.com/image.jpg';

   // ✅ Good
   const imageUrl = 'https://example.com/image.jpg';

   // ✅ Better (protocol-relative)
   const imageUrl = '//example.com/image.jpg';
   ```

3. **Check third-party scripts:**
   - Ensure all CDN links use HTTPS
   - Update analytics, fonts, etc.

---

### Issue: Redirect Loop

**Symptoms:**
- Page keeps redirecting
- "Too many redirects" error
- Cannot access site

**Solutions:**

1. **Check redirect configuration:**
   ```javascript
   // next.config.js - ensure no conflicting redirects
   async redirects() {
     return [
       {
         source: '/:path*',
         has: [{ type: 'host', value: 'www.ottowrite.app' }],
         destination: 'https://ottowrite.app/:path*',
         permanent: true,
       },
     ];
   }
   ```

2. **Check middleware:**
   ```typescript
   // middleware.ts - ensure no redirect loops
   export function middleware(request: NextRequest) {
     // Check for redirect conditions
   }
   ```

3. **Verify DNS:**
   ```bash
   # Ensure both domains point correctly
   dig ottowrite.app
   dig www.ottowrite.app
   ```

---

## Post-Launch Checklist

### Immediate (Within 24 Hours)

- [ ] Monitor error rates in Sentry
- [ ] Check Vercel analytics for traffic
- [ ] Verify all critical user flows
- [ ] Test on multiple devices/browsers
- [ ] Monitor DNS resolution globally
- [ ] Check SSL Labs rating
- [ ] Verify webhook delivery (Stripe, etc.)

### Week 1

- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics (if not already done)
- [ ] Monitor page load performance
- [ ] Check for 404 errors
- [ ] Review user feedback/support tickets
- [ ] Monitor Supabase connection stability

### Week 2-4

- [ ] Monitor SSL certificate auto-renewal
- [ ] Review Core Web Vitals
- [ ] Check SEO indexing progress
- [ ] Optimize any slow pages
- [ ] Update marketing materials with new domain
- [ ] Update social media links

### Ongoing

- [ ] Monitor SSL expiration (auto-renews every 90 days)
- [ ] Keep DNS records documented
- [ ] Review domain ownership/renewal annually
- [ ] Monitor for phishing domains (typosquatting)
- [ ] Keep environment variables in sync

---

## Appendix

### DNS Record Reference

```
# Production setup
Type    Name        Value                       TTL     Priority
A       @           76.76.21.21                 3600    -
CNAME   www         cname.vercel-dns.com        3600    -

# Email (if using separate email provider)
MX      @           mail.provider.com           3600    10
TXT     @           "v=spf1 include:_spf.provider.com ~all"  3600  -

# DKIM (if using email)
TXT     dkim._domainkey  "v=DKIM1; k=rsa; p=..."  3600  -

# Optional subdomains
CNAME   api         cname.vercel-dns.com        3600    -
CNAME   staging     cname.vercel-dns.com        3600    -
CNAME   docs        cname.vercel-dns.com        3600    -
```

### Useful Commands

```bash
# DNS Queries
dig ottowrite.app                    # Query A record
dig ottowrite.app NS                 # Query nameservers
dig ottowrite.app +trace             # Trace DNS resolution
nslookup ottowrite.app               # Alternative DNS lookup

# SSL Verification
curl -vI https://ottowrite.app       # Verbose HTTPS check
openssl s_client -connect ottowrite.app:443  # SSL handshake test

# HTTP Headers
curl -I https://ottowrite.app        # Check response headers
curl -I http://ottowrite.app         # Check redirect

# Performance Testing
curl -w "@curl-format.txt" -o /dev/null -s https://ottowrite.app
# curl-format.txt:
#   time_namelookup:  %{time_namelookup}\n
#   time_connect:     %{time_connect}\n
#   time_starttransfer: %{time_starttransfer}\n
#   time_total:       %{time_total}\n
```

### External Tools

```
DNS Propagation Check:
https://www.whatsmydns.net/

SSL Labs Test:
https://www.ssllabs.com/ssltest/

Security Headers Check:
https://securityheaders.com/

Lighthouse Audit:
https://web.dev/measure/

Page Speed Insights:
https://pagespeed.web.dev/
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | DevOps Team | Initial documentation |

---

**Last Review:** 2025-10-24
**Next Review:** 2026-01-24 (Quarterly)
**Document Owner:** DevOps Team
