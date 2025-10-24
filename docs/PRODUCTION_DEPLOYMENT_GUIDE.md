# OttoWrite Production Deployment Guide

**Status:** Ready for Production
**Last Updated:** 2025-01-23
**Estimated Setup Time:** 2-4 hours

This guide walks you through deploying OttoWrite to production on Vercel with Supabase, Stripe, and all required services.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Production Setup](#supabase-production-setup)
3. [Stripe Production Setup](#stripe-production-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Environment Variables Configuration](#environment-variables-configuration)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Error Tracking](#monitoring--error-tracking)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Production Supabase account (Pro plan recommended)
- [ ] Stripe account with live mode access
- [ ] Vercel account (Pro plan recommended for production features)
- [ ] Custom domain name (registered and DNS accessible)
- [ ] Sentry account (for error tracking - optional but recommended)
- [ ] AI provider account (Anthropic/OpenAI/DeepSeek)

---

## Supabase Production Setup

### 1. Create Production Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. **Organization:** Select your production organization
4. **Name:** `ottowrite-production` (or your preferred name)
5. **Database Password:** Use a strong password (save it securely!)
6. **Region:** Choose closest to your users
7. **Pricing Plan:** Pro or Team (for production features)
8. Click "Create new project" (takes 2-3 minutes)

### 2. Run Database Migrations

```bash
# Set your production Supabase project reference
export SUPABASE_PROJECT_REF=your-production-project-id

# Link to production project
npx supabase link --project-ref $SUPABASE_PROJECT_REF

# Push all migrations to production
npx supabase db push

# Verify migrations
npx supabase migration list
```

### 3. Enable Database Backups

1. Go to Project Settings → Database
2. Enable "Point in Time Recovery" (requires Pro plan)
3. Set backup retention to 30 days minimum
4. Test backup restoration procedure

### 4. Configure RLS Policies

All RLS policies are included in migrations. Verify they're active:

```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Should return 384+ policies
```

### 5. Get Production Credentials

1. Go to Project Settings → API
2. Copy these values:
   - **Project URL:** `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key:** `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

---

## Stripe Production Setup

### 1. Switch to Live Mode

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Top right corner:** Switch from "Test mode" to "Live mode"
3. ⚠️ Ensure you're in LIVE mode for all following steps

### 2. Get Production API Keys

1. Go to Developers → API keys
2. Copy:
   - **Publishable key:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - **Secret key:** `STRIPE_SECRET_KEY` (starts with `sk_live_`) ⚠️ Keep secret!

### 3. Create Production Products & Prices

1. Go to Products → Add product
2. Create three products:

**Hobbyist Plan:**
- Name: Hobbyist
- Price: $12/month (or your preferred pricing)
- Billing period: Monthly recurring
- Copy the Price ID: `price_...` → `STRIPE_PRICE_HOBBYIST`

**Professional Plan:**
- Name: Professional
- Price: $29/month
- Billing period: Monthly recurring
- Copy the Price ID → `STRIPE_PRICE_PROFESSIONAL`

**Studio Plan:**
- Name: Studio
- Price: $99/month
- Billing period: Monthly recurring
- Copy the Price ID → `STRIPE_PRICE_STUDIO`

### 4. Configure Webhook Endpoint

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://your-production-domain.com/api/webhooks/stripe`
4. **Events to listen to:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Click "Reveal" next to "Signing secret"
7. Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

---

## Vercel Deployment

### 1. Import Repository

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Project"
3. Select your Git repository (GitHub/GitLab/Bitbucket)
4. Click "Import"

### 2. Configure Build Settings

Vercel should auto-detect Next.js. Verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Node Version:** 18.x or higher

### 3. Skip Initial Deployment

1. Click "Environment Variables" tab first (don't deploy yet)
2. Add all required variables (see next section)
3. Then click "Deploy"

---

## Environment Variables Configuration

### Add to Vercel

1. Go to Project Settings → Environment Variables
2. For **each** variable below, click "Add New":
   - Enter Key name
   - Enter Value
   - Select Environment: **Production** only
   - Click "Save"

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-prod-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-production-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-production-service-role-key]

# Stripe
STRIPE_SECRET_KEY=sk_live_[your-live-key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your-live-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-production-webhook-secret]
STRIPE_PRICE_HOBBYIST=price_[your-hobbyist-price-id]
STRIPE_PRICE_PROFESSIONAL=price_[your-professional-price-id]
STRIPE_PRICE_STUDIO=price_[your-studio-price-id]
NEXT_PUBLIC_STRIPE_PRICE_HOBBYIST=price_[your-hobbyist-price-id]
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=price_[your-professional-price-id]
NEXT_PUBLIC_STRIPE_PRICE_STUDIO=price_[your-studio-price-id]

# Application
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production

# AI Provider (at least one required)
ANTHROPIC_API_KEY=sk-ant-[your-production-key]
# OPENAI_API_KEY=sk-[your-production-key]
# DEEPSEEK_API_KEY=sk-[your-production-key]

# Monitoring (highly recommended)
NEXT_PUBLIC_SENTRY_DSN=https://[your-sentry-dsn]
SENTRY_ORG=[your-sentry-org]
SENTRY_PROJECT=[your-sentry-project]
SENTRY_AUTH_TOKEN=[your-sentry-auth-token]
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Database Connection Pooling (recommended values)
DB_POOL_SIZE=10
DB_CONNECT_TIMEOUT=10000
DB_IDLE_TIMEOUT=60000
DB_MAX_LIFETIME=300000
SERVICE_ROLE_POOL_SIZE=15
SERVICE_ROLE_CONNECT_TIMEOUT=15000
SERVICE_ROLE_IDLE_TIMEOUT=60000
SERVICE_ROLE_MAX_LIFETIME=300000
```

### Sensitive Keys

Mark these as **sensitive** (encrypted) in Vercel:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `SENTRY_AUTH_TOKEN`

---

## Domain & SSL Setup

### 1. Add Custom Domain

1. Go to Project Settings → Domains
2. Click "Add"
3. Enter your domain: `your-domain.com`
4. Click "Add"

### 2. Configure DNS Records

Add these DNS records at your domain registrar:

**For root domain (example.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### 3. Wait for SSL Certificate

- Vercel automatically provisions SSL via Let's Encrypt
- Usually takes 1-5 minutes
- Status: "Waiting for DNS" → "Valid"

### 4. Update Environment Variables

1. Go back to Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your actual domain
3. Redeploy to apply changes

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Test API health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Test Supabase connection
curl https://your-domain.com/api/health/ready

# Expected response:
# {"status":"ready","database":"connected"}
```

### 2. Test Authentication Flow

1. Open `https://your-domain.com`
2. Click "Sign Up"
3. Create a test account
4. Verify email confirmation works
5. Log in and access dashboard

### 3. Test Stripe Payment Flow

1. Go to Pricing page
2. Select a plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify subscription created in Stripe Dashboard
6. Check user tier updated in dashboard

### 4. Test AI Generation

1. Create a new project
2. Try AI-powered features:
   - Generate character description
   - Generate scene outline
   - Auto-tag content
3. Verify responses are generated

### 5. Verify Webhooks

1. In Stripe Dashboard → Developers → Webhooks
2. Click your production endpoint
3. View webhook attempts
4. Ensure all are "Successful" (200 OK)

---

## Monitoring & Error Tracking

### Sentry Setup (Recommended)

1. Go to [Sentry.io](https://sentry.io)
2. Create new project → Select "Next.js"
3. Copy DSN
4. Add to Vercel environment variables:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - `SENTRY_AUTH_TOKEN`

### Vercel Analytics

Automatically enabled. View at:
- Project Dashboard → Analytics
- Real-time visitors
- Page views
- Core Web Vitals

### Supabase Monitoring

1. Go to Supabase Dashboard → Reports
2. Monitor:
   - Database size
   - API requests
   - Query performance
   - Error rates

---

## Troubleshooting

### Issue: Stripe Webhooks Failing

**Symptoms:** Subscriptions not updating, payment status stuck

**Solution:**
1. Check webhook endpoint is accessible:
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"type":"ping"}'
   ```
2. Verify webhook secret is correct in environment variables
3. Check Stripe Dashboard → Webhooks → Logs for error details
4. Ensure `STRIPE_WEBHOOK_SECRET` matches the one in Stripe

### Issue: Supabase Connection Errors

**Symptoms:** 500 errors, "Failed to fetch" in console

**Solution:**
1. Verify environment variables are set:
   ```bash
   # In Vercel deployment logs, check:
   NEXT_PUBLIC_SUPABASE_URL: https://...supabase.co (should be visible)
   SUPABASE_SERVICE_ROLE_KEY: ••••••• (should be hidden)
   ```
2. Check Supabase project is active (not paused)
3. Verify RLS policies aren't blocking requests
4. Check database connection pooling settings

### Issue: AI Generation Not Working

**Symptoms:** "Failed to generate" errors

**Solution:**
1. Verify at least one AI provider API key is set
2. Check API key is valid (not expired/revoked)
3. Monitor usage limits in provider dashboard
4. Check Sentry for specific error messages

### Issue: SSL Certificate Not Provisioning

**Symptoms:** Domain shows "Not Secure" or certificate errors

**Solution:**
1. Verify DNS records are correct
2. Wait 24-48 hours for DNS propagation
3. Check domain ownership verification
4. Try removing and re-adding domain in Vercel

### Issue: Build Failures

**Symptoms:** Deployment fails during build step

**Solution:**
1. Check build logs in Vercel deployment
2. Verify all dependencies are in `package.json`
3. Ensure `NODE_VERSION` is 18.x or higher
4. Check for TypeScript errors
5. Run `npm run build` locally to reproduce

---

## Security Checklist

Before going live, verify:

- [ ] All service role keys stored as encrypted secrets
- [ ] RLS policies enabled on all tables
- [ ] CORS configured to allow only production domain
- [ ] Rate limiting configured on API routes
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced (no HTTP access)
- [ ] Sensitive data not logged or exposed
- [ ] Database backups enabled and tested
- [ ] Sentry error tracking configured
- [ ] Security headers configured (CSP, HSTS, etc.)

---

## Rollback Procedure

If critical issues arise after deployment:

1. **Immediate Rollback:**
   - Go to Vercel Dashboard → Deployments
   - Find last working deployment
   - Click "⋯" → "Promote to Production"

2. **Database Rollback:**
   - Go to Supabase → Database → Backups
   - Restore from Point-in-Time Recovery
   - Or restore from daily backup

3. **Environment Variables:**
   - Revert to previous values in Vercel settings
   - Redeploy to apply

---

## Maintenance Windows

Schedule regular maintenance:

**Weekly:**
- Review error logs in Sentry
- Check database performance metrics
- Monitor API usage and costs

**Monthly:**
- Review security logs
- Update dependencies
- Test backup restoration
- Review and optimize database queries

**Quarterly:**
- Rotate API keys and secrets
- Review and update RLS policies
- Load testing
- Security audit

---

## Support & Resources

- **Documentation:** [https://github.com/your-org/ottowrite/tree/main/docs](docs)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Stripe Docs:** [https://stripe.com/docs](https://stripe.com/docs)
- **Vercel Docs:** [https://vercel.com/docs](https://vercel.com/docs)
- **Sentry Docs:** [https://docs.sentry.io](https://docs.sentry.io)

---

**Status:** ✅ Production deployment configuration complete!

**Next Steps:**
- Deploy to production
- Test all critical paths
- Monitor error rates
- Gradual rollout to users
