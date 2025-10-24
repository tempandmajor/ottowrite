#!/bin/bash

# Domain Configuration Update Script
# Updates all configuration files and environment variables for new domain
#
# Usage:
#   ./scripts/update-domain-config.sh <new-domain>
#   ./scripts/update-domain-config.sh ottowrite.app
#
# This script will:
#   1. Create a checklist of manual updates needed
#   2. Generate environment variable commands
#   3. Create a summary of changes needed

set -euo pipefail

# New domain (passed as argument)
NEW_DOMAIN="${1:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}📋 $1${NC}"
}

log_action() {
  echo -e "${YELLOW}→ $1${NC}"
}

# ============================================================================
# VALIDATION
# ============================================================================

validate_domain() {
  if [ -z "$NEW_DOMAIN" ]; then
    echo "Usage: $0 <new-domain>"
    echo "Example: $0 ottowrite.app"
    exit 1
  fi

  log_info "New Domain: $NEW_DOMAIN"
  echo ""
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

main() {
  echo ""
  log_info "===== Domain Configuration Update Guide ====="
  echo ""

  validate_domain

  # Create output file
  local OUTPUT_FILE="domain-migration-checklist-$(date +%Y%m%d_%H%M%S).md"

  cat > "$OUTPUT_FILE" <<EOF
# Domain Migration Checklist

**New Domain:** $NEW_DOMAIN
**Generated:** $(date)

---

## 1. Vercel Configuration

### Add Domain to Vercel

\`\`\`bash
# Via Vercel Dashboard:
# 1. Go to: https://vercel.com/dashboard
# 2. Select project: ottowrite
# 3. Settings → Domains → Add
# 4. Enter: $NEW_DOMAIN
# 5. Click: Add
\`\`\`

### Update Environment Variables

\`\`\`bash
# Via Vercel CLI:
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://$NEW_DOMAIN

# Or via Dashboard:
# Settings → Environment Variables → Edit NEXT_PUBLIC_APP_URL
# Production: https://$NEW_DOMAIN
# Preview: https://\$VERCEL_URL
# Development: http://localhost:3000
\`\`\`

**Checklist:**
- [ ] Domain added to Vercel project
- [ ] DNS records configured
- [ ] NEXT_PUBLIC_APP_URL updated for production
- [ ] SSL certificate issued (wait 5-30 minutes)
- [ ] Domain status shows "Valid"

---

## 2. DNS Configuration

### Option A: Using Vercel DNS (Recommended)

**Nameservers to set at your registrar:**
\`\`\`
ns1.vercel-dns.com
ns2.vercel-dns.com
\`\`\`

**Steps:**
1. Log in to domain registrar
2. Go to: Domain Management → Nameservers
3. Change to: Custom Nameservers
4. Add nameservers above
5. Save changes
6. Wait 5-30 minutes for propagation

### Option B: Using External DNS Provider

**DNS Records to add:**
\`\`\`
Type    Name    Value                       TTL
A       @       76.76.21.21                 3600
CNAME   www     cname.vercel-dns.com        3600
\`\`\`

**Checklist:**
- [ ] DNS records configured
- [ ] DNS propagation verified: \`dig $NEW_DOMAIN\`
- [ ] Both @ and www resolve correctly

---

## 3. Supabase Configuration

### Update Redirect URLs

**Dashboard Steps:**
1. Go to: https://supabase.com/dashboard
2. Select project: Ottowrite
3. Go to: Authentication → URL Configuration
4. Update:

**Site URL:**
\`\`\`
https://$NEW_DOMAIN
\`\`\`

**Redirect URLs (add these):**
\`\`\`
https://$NEW_DOMAIN/auth/callback
https://$NEW_DOMAIN/auth/reset-password
https://$NEW_DOMAIN/auth/verify
https://$NEW_DOMAIN/auth/confirm
\`\`\`

**Checklist:**
- [ ] Site URL updated
- [ ] All redirect URLs added
- [ ] Test authentication flow
- [ ] Test password reset
- [ ] Test magic link login (if applicable)

---

## 4. Stripe Configuration

### Update Webhook Endpoint

**Dashboard Steps:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Find webhook endpoint or create new one
3. Update endpoint URL:

**New URL:**
\`\`\`
https://$NEW_DOMAIN/api/webhooks/stripe
\`\`\`

**Events to listen for:**
\`\`\`
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
\`\`\`

**Get new webhook secret:**
\`\`\`bash
# After creating/updating webhook, copy the signing secret
# Add to Vercel environment variables:
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

### Update Business Settings

**Go to: Settings → Account Details**

Update:
- Website: https://$NEW_DOMAIN
- Support URL: https://$NEW_DOMAIN/support
- Terms of Service: https://$NEW_DOMAIN/terms
- Privacy Policy: https://$NEW_DOMAIN/privacy

**Checklist:**
- [ ] Webhook endpoint updated/created
- [ ] Webhook secret added to Vercel
- [ ] Test webhook delivery (send test event)
- [ ] Business information updated
- [ ] Success/Cancel URLs work in checkout

---

## 5. Environment Variables Update

### Vercel Environment Variables

**Update these in Vercel dashboard:**

| Variable | Value |
|----------|-------|
| \`NEXT_PUBLIC_APP_URL\` | \`https://$NEW_DOMAIN\` |

**Verify these variables are set:**
\`\`\`bash
# Production
NEXT_PUBLIC_APP_URL=https://$NEW_DOMAIN

# Preview
NEXT_PUBLIC_APP_URL=https://\$VERCEL_URL

# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

**Checklist:**
- [ ] NEXT_PUBLIC_APP_URL updated for production
- [ ] Environment variables synced
- [ ] Redeploy triggered after updating env vars

---

## 6. Code Updates

### Files to Check

**Check these files for hardcoded URLs:**

\`\`\`bash
# Search for hardcoded URLs
grep -r "localhost:3000" --exclude-dir=node_modules --exclude-dir=.next
grep -r "vercel.app" --exclude-dir=node_modules --exclude-dir=.next

# Common files that may need updates:
# - next.config.js (redirects, headers)
# - lib/stripe/config.ts (success/cancel URLs)
# - lib/supabase/client.ts (redirect URLs)
# - app/layout.tsx (metadata)
# - package.json (homepage field)
\`\`\`

### Update next.config.js

**Add/update redirects:**
\`\`\`javascript
// next.config.js
async redirects() {
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.$NEW_DOMAIN' }],
      destination: 'https://$NEW_DOMAIN/:path*',
      permanent: true,
    },
  ];
}
\`\`\`

**Checklist:**
- [ ] Search for hardcoded URLs completed
- [ ] Updated all references to use \`process.env.NEXT_PUBLIC_APP_URL\`
- [ ] Verified redirect configuration
- [ ] Tested all user flows

---

## 7. Third-Party Services

### Google Search Console

1. Add new property: $NEW_DOMAIN
2. Verify ownership (DNS TXT record or HTML file)
3. Submit sitemap: https://$NEW_DOMAIN/sitemap.xml

### Google Analytics (if configured)

1. Update property settings
2. Verify tracking on new domain
3. Set up domain forwarding if applicable

### Social Media Links

Update links on:
- [ ] Twitter/X profile
- [ ] LinkedIn company page
- [ ] Facebook page
- [ ] Instagram bio
- [ ] GitHub repository
- [ ] Other platforms

### Email Service (if configured)

If using Resend/SendGrid:
- [ ] Update domain in email service
- [ ] Verify DNS records for email
- [ ] Test email delivery from new domain

**Checklist:**
- [ ] Search Console property added
- [ ] Analytics updated
- [ ] Social media links updated
- [ ] Email service configured (if applicable)

---

## 8. Testing Checklist

### Pre-Launch Verification

**DNS & SSL:**
- [ ] DNS A record resolves: \`dig $NEW_DOMAIN A\`
- [ ] DNS CNAME resolves: \`dig www.$NEW_DOMAIN CNAME\`
- [ ] HTTPS loads: \`curl -I https://$NEW_DOMAIN\`
- [ ] HTTP → HTTPS redirect works
- [ ] SSL certificate valid: \`./scripts/verify-domain-ssl.sh $NEW_DOMAIN\`

**Application:**
- [ ] Homepage loads
- [ ] Sign up works
- [ ] Log in works
- [ ] Password reset works
- [ ] OAuth works (if configured)
- [ ] Stripe checkout works
- [ ] Webhooks deliver correctly
- [ ] All API endpoints respond

**SEO:**
- [ ] robots.txt accessible: https://$NEW_DOMAIN/robots.txt
- [ ] sitemap.xml accessible: https://$NEW_DOMAIN/sitemap.xml
- [ ] Metadata correct (check page source)

**Performance:**
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] No mixed content warnings
- [ ] Lighthouse score > 90

---

## 9. Post-Launch Monitoring

### Week 1

- [ ] Monitor error rates in Sentry
- [ ] Check Vercel analytics
- [ ] Verify webhook delivery in Stripe
- [ ] Monitor DNS resolution globally
- [ ] Check SSL Labs rating: https://www.ssllabs.com/ssltest/analyze.html?d=$NEW_DOMAIN
- [ ] Review user feedback

### Ongoing

- [ ] Monitor SSL certificate auto-renewal (every 90 days)
- [ ] Keep DNS records documented
- [ ] Review domain ownership annually
- [ ] Monitor for phishing/typosquatting domains

---

## 10. Rollback Plan

### If Issues Occur

**Immediate Rollback:**
1. Remove domain from Vercel
2. Revert environment variables
3. Use previous Vercel URL as temporary solution

**Communication:**
1. Update status page (if you have one)
2. Notify active users if authentication affected
3. Post on social media about temporary issues

**DNS Rollback:**
1. Change DNS back to previous configuration
2. Wait for propagation
3. Investigate issues before retry

---

## Commands Reference

### Verification Commands

\`\`\`bash
# Verify DNS
dig $NEW_DOMAIN
dig $NEW_DOMAIN NS
dig www.$NEW_DOMAIN

# Verify HTTPS
curl -I https://$NEW_DOMAIN
curl -I http://$NEW_DOMAIN  # Should redirect to HTTPS

# Verify SSL
echo | openssl s_client -connect $NEW_DOMAIN:443 -servername $NEW_DOMAIN 2>/dev/null | \
  openssl x509 -noout -dates

# Run full verification
./scripts/verify-domain-ssl.sh $NEW_DOMAIN
\`\`\`

### Deployment Commands

\`\`\`bash
# Update environment variable via CLI
vercel env add NEXT_PUBLIC_APP_URL production

# Trigger new deployment
vercel --prod

# Check deployment logs
vercel logs production --since 1h
\`\`\`

---

## Timeline

| Task | Duration | When |
|------|----------|------|
| DNS Configuration | 15 min | Day 0 |
| DNS Propagation | 5-30 min | Day 0 |
| SSL Issuance | 5-10 min | Day 0 |
| Environment Updates | 15 min | Day 0 |
| Testing | 30 min | Day 0 |
| **Total Setup** | **~1.5 hours** | **Day 0** |
| Monitoring | Ongoing | Week 1+ |

---

## Support Resources

- Vercel Documentation: https://vercel.com/docs/concepts/projects/custom-domains
- Supabase Auth: https://supabase.com/docs/guides/auth
- Stripe Webhooks: https://stripe.com/docs/webhooks
- SSL Labs Test: https://www.ssllabs.com/ssltest/
- DNS Checker: https://www.whatsmydns.net/

---

**Generated:** $(date)
**Domain:** $NEW_DOMAIN
**Status:** 📋 Ready for implementation
EOF

  log_success "Checklist created: $OUTPUT_FILE"
  echo ""
  log_info "Next steps:"
  echo "  1. Review checklist: cat $OUTPUT_FILE"
  echo "  2. Start with DNS configuration"
  echo "  3. Update Vercel domain settings"
  echo "  4. Update environment variables"
  echo "  5. Run verification: ./scripts/verify-domain-ssl.sh $NEW_DOMAIN"
  echo ""
  log_warn "Important: Keep this checklist as a record of migration"
  echo ""
}

# Run main function
main "$@"
