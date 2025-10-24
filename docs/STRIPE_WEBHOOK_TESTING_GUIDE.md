# Stripe Webhook Testing Guide

**PROD-003: Test Stripe Production Webhooks**
**Estimated Time:** 30-45 minutes
**Last Updated:** 2025-10-23

---

## Overview

This guide provides step-by-step instructions for testing your Stripe webhook implementation to ensure all subscription events are properly handled.

## Prerequisites

- ✅ Webhook handler implemented (`app/api/webhooks/stripe/route.ts`)
- ✅ Application deployed to production (`www.ottowrite.app`)
- ⏳ Webhook endpoint registered in Stripe (we'll do this now)
- ⏳ `STRIPE_WEBHOOK_SECRET` added to Vercel

---

## Part 1: Register Webhook Endpoint (10 minutes)

### Step 1: Access Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**

### Step 2: Configure Endpoint

**Endpoint URL:**
```
https://www.ottowrite.app/api/webhooks/stripe
```

**Description:**
```
Ottowrite Production - Subscription & Payment Events
```

**API Version:**
- Select: **Latest** or `2024-12-18.acacia`

### Step 3: Select Events

Click **"Select events"** and choose:

**Checkout Events (1):**
- ✅ `checkout.session.completed`

**Customer Subscription Events (3):**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**Invoice Events (2):**
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

**Total: 6 events**

### Step 4: Save and Copy Secret

1. Click **"Add endpoint"**
2. Copy the **Signing secret** (starts with `whsec_`)
3. Keep this window open - you'll need it in a moment

---

## Part 2: Add Webhook Secret to Vercel (5 minutes)

### Method 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite/settings/environment-variables
2. Click **"Add New"**
3. Enter:
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (paste the secret from Stripe)
   - **Environment:** `Production` ✅ (uncheck Preview and Development)
   - **Type:** `Encrypted` ✅
4. Click **"Save"**

### Method 2: Vercel CLI (If fair use limit allows)

```bash
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste the whsec_... secret when prompted
```

### Step 5: Redeploy

```bash
# Go to Vercel dashboard → Deployments
# Click ••• on latest deployment → Redeploy
# Wait 2-3 minutes for deployment to complete
```

---

## Part 3: Test Webhook Signature Validation (10 minutes)

### Test 1: Missing Signature (Should Fail)

```bash
curl -X POST https://www.ottowrite.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'

# Expected: 400 Bad Request
# Response: {"error":"No signature provided"}
```

✅ **Pass Criteria:** Returns 400 with "No signature provided"

### Test 2: Invalid Signature (Should Fail)

```bash
curl -X POST https://www.ottowrite.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"type":"test"}'

# Expected: 400 Bad Request
# Response: {"error":"Invalid signature"}
```

✅ **Pass Criteria:** Returns 400 with "Invalid signature"

### Test 3: Valid Signature from Stripe Dashboard (Should Pass)

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select: `customer.subscription.created`
5. Click **"Send test webhook"**

✅ **Pass Criteria:**
- Response code: `200 OK`
- Response body: `{"received":true}`

---

## Part 4: Test Subscription Lifecycle Events (15 minutes)

### Automated Testing Script

Run the verification script:

```bash
# Set environment variables (if testing locally)
export STRIPE_SECRET_KEY="sk_live_..." # or sk_test_...
export STRIPE_WEBHOOK_SECRET="whsec_..."
export NEXT_PUBLIC_SUPABASE_URL="https://jtngociduoicfnieidxf.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run verification
npx ts-node scripts/verify-stripe-webhooks.ts
```

Expected output:
```
╔════════════════════════════════════════╗
║   Stripe Webhook Verification Tool    ║
╚════════════════════════════════════════╝

Running verification tests...

1. Testing webhook endpoint: https://www.ottowrite.app/api/webhooks/stripe
   ✓ Endpoint is accessible (HTTP 400)

2. Checking Stripe webhook registration
   ✓ Webhook registered correctly: https://www.ottowrite.app/api/webhooks/stripe

3. Checking recent webhook deliveries
   ✓ Found 10 recent events

4. Verifying database integration
   ✓ Found 5 users with Stripe data

╔════════════════════════════════════════╗
║          Verification Summary          ║
╚════════════════════════════════════════╝

Total Tests: 4
Passed: 4
Failed: 0

✓ All tests passed! Webhooks are configured correctly.
```

### Manual Testing with Stripe CLI

If you have Stripe CLI installed:

```bash
# Install (if needed)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Test each event type
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

---

## Part 5: Test Event Handlers (Database Updates)

### Test Event: checkout.session.completed

**What it should do:**
1. Create/update user in `user_profiles`
2. Set `stripe_customer_id`
3. Set `subscription_tier` based on price
4. Set `subscription_status = 'active'`

**How to test:**

1. Create a test checkout session in Stripe dashboard
2. Check webhook delivery in Stripe dashboard
3. Verify database update:

```sql
-- In Supabase SQL Editor
SELECT
  id,
  email,
  subscription_tier,
  stripe_customer_id,
  subscription_status,
  updated_at
FROM user_profiles
WHERE stripe_customer_id = 'cus_test_...'
ORDER BY updated_at DESC
LIMIT 1;
```

✅ **Pass Criteria:**
- Row exists
- `subscription_tier` matches purchased plan
- `subscription_status = 'active'`
- `stripe_customer_id` is set

### Test Event: customer.subscription.updated

**What it should do:**
1. Update `subscription_tier` if plan changed
2. Update `subscription_status` if status changed
3. Update `subscription_current_period_end`

**How to test:**

1. In Stripe dashboard, upgrade/downgrade a test subscription
2. Check webhook delivery
3. Verify database update:

```sql
SELECT
  subscription_tier,
  subscription_status,
  subscription_current_period_end,
  updated_at
FROM user_profiles
WHERE stripe_subscription_id = 'sub_...'
ORDER BY updated_at DESC;
```

✅ **Pass Criteria:**
- `subscription_tier` updated to new plan
- Timestamps updated

### Test Event: customer.subscription.deleted

**What it should do:**
1. Set `subscription_status = 'canceled'`
2. Retain `subscription_tier` for grace period
3. Set `subscription_cancel_at`

**How to test:**

1. Cancel a test subscription in Stripe dashboard
2. Check webhook delivery
3. Verify database update:

```sql
SELECT
  subscription_status,
  subscription_cancel_at,
  updated_at
FROM user_profiles
WHERE stripe_subscription_id = 'sub_...'
ORDER BY updated_at DESC;
```

✅ **Pass Criteria:**
- `subscription_status = 'canceled'`
- `subscription_cancel_at` is set

### Test Event: invoice.payment_succeeded

**What it should do:**
1. Set `subscription_status = 'active'`
2. Update `subscription_current_period_end`
3. Clear any `past_due` status

**How to test:**

```bash
stripe trigger invoice.payment_succeeded
```

✅ **Pass Criteria:**
- Database updated with new period end date
- Status is `active`

### Test Event: invoice.payment_failed

**What it should do:**
1. Set `subscription_status = 'past_due'`
2. Log the failure
3. Trigger user notification (if implemented)

**How to test:**

```bash
stripe trigger invoice.payment_failed
```

✅ **Pass Criteria:**
- `subscription_status = 'past_due'`
- Event logged in Sentry

---

## Part 6: Verify Error Handling (5 minutes)

### Test 1: Replay Attack Prevention

Try sending the same webhook twice:

1. In Stripe dashboard, send a test webhook
2. Note the event ID
3. Try to replay the same event (will be rejected if > 5 minutes old)

✅ **Pass Criteria:**
- Second attempt rejected with "Event too old" (if > 5 min)
- Or handled idempotently (same database state)

### Test 2: Invalid Event Type

The handler should gracefully ignore unknown events:

```typescript
// This is handled in the code with a 200 response
// Unknown events are logged but don't cause errors
```

✅ **Pass Criteria:** Returns 200 even for unknown events

### Test 3: Database Error Handling

Temporarily break database connection (in test env only):

✅ **Pass Criteria:**
- Returns 500 error
- Error logged to Sentry
- Stripe will retry webhook

---

## Part 7: Monitor Webhook Health

### Stripe Dashboard Monitoring

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your endpoint
3. Check the **"Events"** tab

✅ **Healthy indicators:**
- Response times < 2 seconds
- 99%+ success rate (200 responses)
- No timeout errors

⚠️ **Warning signs:**
- Multiple 500 errors
- Timeouts (> 30 seconds)
- Increasing failure rate

### Vercel Logs

```bash
# View webhook logs from last hour
vercel logs production --since 1h | grep "webhook:stripe"

# Check for errors
vercel logs production --since 1h | grep "webhook:stripe" | grep "error"
```

### Sentry Monitoring

1. Go to: https://sentry.io/organizations/ottowrite/issues/
2. Filter by: `operation:webhook:stripe`
3. Check for:
   - Error rate < 1%
   - No critical errors
   - Average response time < 1 second

---

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Setup
- [ ] Webhook endpoint registered in Stripe
- [ ] STRIPE_WEBHOOK_SECRET added to Vercel
- [ ] Application redeployed

### Signature Validation
- [ ] Missing signature → 400 error
- [ ] Invalid signature → 400 error
- [ ] Valid signature from Stripe → 200 success

### Event Processing
- [ ] `checkout.session.completed` → User created/updated
- [ ] `customer.subscription.created` → Subscription recorded
- [ ] `customer.subscription.updated` → Plan change reflected
- [ ] `customer.subscription.deleted` → Status = canceled
- [ ] `invoice.payment_succeeded` → Period end updated
- [ ] `invoice.payment_failed` → Status = past_due

### Error Handling
- [ ] Old events rejected (replay attack prevention)
- [ ] Unknown events handled gracefully
- [ ] Database errors logged to Sentry
- [ ] Stripe receives proper error codes for retries

### Monitoring
- [ ] Stripe webhook dashboard shows 99%+ success
- [ ] Vercel logs show successful processing
- [ ] Sentry shows no critical errors
- [ ] Database updates confirmed

---

## Troubleshooting

### Problem: Webhook returns 400 "No signature provided"

**Solution:**
- Ensure request is coming from Stripe
- Check that `stripe-signature` header is present
- Verify endpoint URL is correct in Stripe dashboard

### Problem: Webhook returns 400 "Invalid signature"

**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Ensure secret is for the correct endpoint
- Check application was redeployed after adding secret

### Problem: Webhook returns 500 error

**Solution:**
- Check Vercel logs for error details
- Verify database connection is working
- Check Sentry for detailed error stack trace
- Ensure all environment variables are set

### Problem: Database not updating

**Solution:**
- Verify webhook is returning 200 (not 400/500)
- Check Supabase service role key is correct
- Verify RLS policies allow service role updates
- Check database logs in Supabase dashboard

### Problem: Events not appearing in Stripe

**Solution:**
- Verify webhook endpoint status is "Enabled"
- Check endpoint URL matches deployment
- Ensure selected events include required types
- Test with manual "Send test webhook" in dashboard

---

## Success Criteria

PROD-003 is complete when:

1. ✅ Webhook endpoint registered and enabled in Stripe
2. ✅ All 6 required events configured
3. ✅ Signature validation working (400 on invalid, 200 on valid)
4. ✅ All event handlers updating database correctly
5. ✅ Error handling working (old events rejected, errors logged)
6. ✅ Monitoring shows 99%+ success rate
7. ✅ Documentation complete and tested

---

## Next Steps

After completing this testing:

1. **PROD-004:** Verify Database RLS Policies
2. **PROD-005:** Test AI Features in Production
3. **PROD-006:** Performance Optimization

---

## Reference Documentation

- **Implementation:** `app/api/webhooks/stripe/route.ts`
- **Test Suite:** `__tests__/api/webhooks-stripe.test.ts`
- **Runbook:** `docs/runbooks/stripe-webhook-replay.md`
- **Events Reference:** `docs/STRIPE_WEBHOOK_EVENTS_REFERENCE.md`
- **Production Setup:** `docs/STRIPE_WEBHOOK_PRODUCTION_SETUP.md`
- **Verification Script:** `scripts/verify-stripe-webhooks.ts`
- **Test Script:** `scripts/test-stripe-webhooks.sh`
