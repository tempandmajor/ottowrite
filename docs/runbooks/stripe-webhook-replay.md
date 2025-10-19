# Stripe Webhook Replay Runbook

**Priority:** 🟡 **HIGH** - Revenue impact
**Response Time:** <1 hour
**Last Updated:** January 19, 2025

## Table of Contents

- [Overview](#overview)
- [When to Use This Runbook](#when-to-use-this-runbook)
- [Prerequisites](#prerequisites)
- [Common Scenarios](#common-scenarios)
- [Webhook Event Types](#webhook-event-types)
- [Diagnosis](#diagnosis)
- [Replay Procedures](#replay-procedures)
- [Verification](#verification)
- [Prevention](#prevention)
- [Troubleshooting](#troubleshooting)

## Overview

Stripe webhooks notify our application of payment events (subscriptions, payments, refunds). When webhooks fail to process, user subscriptions and billing can become out of sync.

**Architecture:**
- Webhook endpoint: `/api/webhooks/stripe`
- Signature verification: Required for all events
- Idempotency: Events processed once using `event.id`
- Retries: Stripe retries failed webhooks automatically
- Logging: All events logged to Supabase and Sentry

## When to Use This Runbook

Use this runbook when:

- ❌ User reports subscription not activated after payment
- ❌ Subscription shows as active in Stripe but not in app
- ❌ Payment succeeded but user still sees paywall
- ❌ Webhook failed due to application error (500, timeout)
- ❌ Webhook endpoint was down during event
- ❌ Subscription upgrade/downgrade not reflected in app

**Do NOT use for:**
- Failed payments (handle through Stripe Dashboard)
- Refund requests (process through Stripe)
- Subscription cancellations (user-initiated)

## Prerequisites

### Required Access

- [ ] Stripe Dashboard access (Admin role)
- [ ] Vercel deployment access
- [ ] Supabase database access
- [ ] Sentry error tracking access

### Required Tools

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Verify access
stripe config --list
```

### Environment Setup

```bash
# Set Stripe API key
export STRIPE_API_KEY="sk_live_..."

# Set webhook secret (get from Vercel env)
vercel env pull .env.local
source .env.local
```

## Common Scenarios

### 1. Subscription Created but Not Activated

**Symptoms:**
- User paid successfully in Stripe
- `subscription.created` or `checkout.session.completed` event fired
- User still sees paywall in app
- Database shows `subscription_tier = 'free'`

**Likely Cause:**
- Webhook failed to process
- Database update failed
- User profile not found

### 2. Subscription Upgraded but Not Reflected

**Symptoms:**
- User upgraded from Pro to Premium
- Stripe shows new subscription tier
- App still shows old tier features

**Likely Cause:**
- `customer.subscription.updated` event not processed
- Subscription tier mapping incorrect

### 3. Payment Succeeded but Subscription Pending

**Symptoms:**
- `payment_intent.succeeded` event received
- `invoice.payment_succeeded` event received
- Subscription status not updated

**Likely Cause:**
- Race condition in event processing
- Transaction rolled back due to error

## Webhook Event Types

### Critical Events (Must Process)

| Event | Description | Action Required |
|-------|-------------|----------------|
| `checkout.session.completed` | User completed checkout | Create/update subscription |
| `customer.subscription.created` | New subscription created | Activate user subscription |
| `customer.subscription.updated` | Subscription changed | Update user tier |
| `customer.subscription.deleted` | Subscription cancelled | Downgrade to free |
| `invoice.payment_succeeded` | Payment successful | Extend subscription |
| `invoice.payment_failed` | Payment failed | Mark subscription past due |

### Informational Events (Nice to Have)

| Event | Description | Action |
|-------|-------------|--------|
| `customer.created` | New customer | Log customer |
| `payment_intent.succeeded` | Payment succeeded | Log payment |
| `charge.succeeded` | Charge succeeded | Log charge |

## Diagnosis

### Step 1: Identify Missing Event

```bash
# List recent Stripe events
stripe events list --limit 20

# Search for specific event
stripe events list --type "customer.subscription.created" --limit 10

# Get event details
stripe events retrieve evt_xxx
```

### Step 2: Check Webhook Delivery

```bash
# List webhook endpoints
stripe webhook_endpoints list

# Get webhook endpoint deliveries
stripe events list --delivery-success false --limit 20
```

### Step 3: Check Application Logs

```bash
# Vercel logs for webhook endpoint
vercel logs production --since 24h | grep "/api/webhooks/stripe"

# Filter for errors
vercel logs production --since 24h | grep "/api/webhooks/stripe" | grep "error"

# Check specific event ID
vercel logs production --since 24h | grep "evt_xxx"
```

### Step 4: Check Database State

```sql
-- Check user subscription
SELECT
  id,
  email,
  subscription_tier,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_end_date
FROM user_profiles
WHERE stripe_customer_id = 'cus_xxx';

-- Check webhook events processed
SELECT *
FROM webhook_events
WHERE stripe_event_id = 'evt_xxx';
```

### Step 5: Verify in Stripe Dashboard

1. Navigate to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Find the event in the "Events" tab
4. Check "Response" - look for 200 vs 4xx/5xx
5. Note the event ID for replay

## Replay Procedures

### Method 1: Stripe CLI (Recommended)

**For Single Event:**

```bash
# 1. Find the event ID
stripe events list --type customer.subscription.created --limit 10

# 2. Retrieve event details
stripe events retrieve evt_xxx

# 3. Resend to webhook endpoint
stripe events resend evt_xxx

# 4. Verify delivery
stripe events retrieve evt_xxx --expand data.object
```

**For Multiple Events:**

```bash
# Resend all failed events from last 24 hours
stripe events list \
  --delivery-success false \
  --created-gte $(date -u -d '24 hours ago' +%s) \
  --limit 100 \
  | jq -r '.data[].id' \
  | while read event_id; do
      echo "Resending $event_id..."
      stripe events resend $event_id
      sleep 1
    done
```

### Method 2: Stripe Dashboard (Manual)

1. **Navigate to Event:**
   - Go to: https://dashboard.stripe.com/events
   - Search for event ID: `evt_xxx`
   - Click on the event

2. **Check Webhook Delivery:**
   - Scroll to "Webhook delivery" section
   - Look for your endpoint URL
   - Check response code and body

3. **Resend Event:**
   - Click "Resend webhook"
   - Select your endpoint
   - Confirm resend
   - Verify 200 response

### Method 3: Manual API Call (Advanced)

For events that cannot be replayed (e.g., very old):

```bash
# 1. Get event data
EVENT_DATA=$(stripe events retrieve evt_xxx -e json)

# 2. Extract relevant data
CUSTOMER_ID=$(echo $EVENT_DATA | jq -r '.data.object.customer')
SUBSCRIPTION_ID=$(echo $EVENT_DATA | jq -r '.data.object.id')

# 3. Manually trigger webhook handler (local testing)
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: $(stripe webhooks construct-event - --payload '$EVENT_DATA' --secret $STRIPE_WEBHOOK_SECRET)" \
  -d "$EVENT_DATA"
```

### Method 4: Database Direct Update (Last Resort)

**⚠️ USE WITH EXTREME CAUTION**

Only use when webhook replay is not possible:

```sql
-- Get subscription details from Stripe first
-- stripe customers retrieve cus_xxx
-- stripe subscriptions retrieve sub_xxx

-- Update user profile
UPDATE user_profiles
SET
  subscription_tier = 'pro', -- or 'premium', 'enterprise'
  stripe_subscription_id = 'sub_xxx',
  stripe_customer_id = 'cus_xxx',
  subscription_start_date = '2025-01-19 00:00:00',
  subscription_end_date = '2025-02-19 23:59:59',
  updated_at = NOW()
WHERE id = 'user_uuid';

-- Verify update
SELECT
  subscription_tier,
  stripe_subscription_id,
  subscription_start_date,
  subscription_end_date
FROM user_profiles
WHERE id = 'user_uuid';

-- Log manual intervention
INSERT INTO webhook_events (
  stripe_event_id,
  event_type,
  processed,
  notes
) VALUES (
  'manual_' || gen_random_uuid(),
  'manual_subscription_update',
  true,
  'Manual update for failed webhook evt_xxx'
);
```

## Verification

### After Webhook Replay

1. **Check Webhook Response**
   ```bash
   # In Stripe Dashboard
   # Navigate to: Events > [event_id] > Webhook delivery
   # Verify: Response = 200 OK
   ```

2. **Verify Database Update**
   ```sql
   SELECT
     id,
     email,
     subscription_tier,
     stripe_subscription_id,
     subscription_start_date,
     subscription_end_date,
     updated_at
   FROM user_profiles
   WHERE stripe_customer_id = 'cus_xxx';
   ```

3. **Check Application Logs**
   ```bash
   vercel logs production --since 5m | grep "evt_xxx"
   ```

4. **Test User Access**
   - Log in as user (or impersonate)
   - Verify subscription tier displays correctly
   - Check premium features are accessible
   - Verify usage limits match tier

5. **Check Sentry**
   - No new errors related to webhook processing
   - Event processed successfully

### Verification Checklist

- [ ] Webhook returned 200 OK
- [ ] Database subscription_tier updated
- [ ] stripe_subscription_id matches Stripe
- [ ] subscription_end_date is correct
- [ ] User can access premium features
- [ ] No errors in Sentry
- [ ] User notified (if needed)

## Prevention

### 1. Idempotency Implementation

Already implemented in webhook handler:

```typescript
// app/api/webhooks/stripe/route.ts
// Check if event already processed
const existingEvent = await supabase
  .from('webhook_events')
  .select('*')
  .eq('stripe_event_id', event.id)
  .single();

if (existingEvent.data) {
  return NextResponse.json({ received: true }); // Already processed
}
```

### 2. Error Handling

Ensure all errors are logged:

```typescript
try {
  await processWebhook(event);
} catch (error) {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: {
      event_id: event.id,
      event_type: event.type,
    }
  });

  // Log to database
  await logFailedWebhook(event.id, error);

  // Return 500 so Stripe retries
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
}
```

### 3. Monitoring

Set up alerts for:

```javascript
// Sentry alert rule
if (
  event.message.includes('webhook') &&
  event.level === 'error' &&
  event.count > 5
) {
  notify('pagerduty', { severity: 'high' });
}
```

### 4. Testing Webhooks Locally

```bash
# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

### 5. Webhook Event Logging

```sql
-- Create webhook events table (if not exists)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- Index for quick lookups
CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, created_at);
```

## Troubleshooting

### Error: "No signatures found matching the expected signature"

**Cause:** Webhook signature verification failed

**Solution:**
```bash
# 1. Verify webhook secret is correct
vercel env pull .env.local
grep STRIPE_WEBHOOK_SECRET .env.local

# 2. Get correct secret from Stripe Dashboard
# Navigate to: Webhooks > [your endpoint] > Signing secret

# 3. Update in Vercel
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste correct secret

# 4. Redeploy
vercel --prod
```

### Error: "Customer not found"

**Cause:** Customer doesn't exist in database

**Solution:**
```sql
-- Get customer details from Stripe
-- stripe customers retrieve cus_xxx

-- Create customer record
INSERT INTO user_profiles (
  id,
  email,
  stripe_customer_id,
  subscription_tier
) VALUES (
  gen_random_uuid(),
  'user@example.com',
  'cus_xxx',
  'free'
);
```

### Error: "Event already processed"

**Cause:** Duplicate event (expected behavior)

**Solution:**
- This is normal! Idempotency is working
- No action needed
- Log shows event was ignored

### Error: "Subscription not found in Stripe"

**Cause:** Subscription was deleted or doesn't exist

**Solution:**
```bash
# 1. Verify subscription exists
stripe subscriptions retrieve sub_xxx

# If not found:
# 2. Check if subscription was cancelled
stripe subscriptions list --customer cus_xxx --status canceled

# 3. If found, use that subscription ID
# 4. If not found, downgrade user to free tier
```

## Escalation

1. **First hour:** On-call engineer attempts replay
2. **After 2 hours:** Escalate to engineering lead
3. **Revenue >$1000:** Notify CFO
4. **Data integrity concern:** Notify CTO

## User Communication

### Template: Subscription Activated

```
Subject: Your OttoWrite subscription is now active

Hi [Name],

Good news! We've successfully activated your [Pro/Premium] subscription.

You now have access to:
- [Feature list based on tier]

If you have any questions, please don't hesitate to reach out.

Welcome to [Tier] tier!

Best regards,
OttoWrite Team
```

### Template: Issue Resolved

```
Subject: Your subscription issue has been resolved

Hi [Name],

We've resolved the subscription sync issue you reported. Your [Pro/Premium] subscription is now properly activated in your account.

What happened: [Brief explanation]
What we did: [Fix applied]

Your subscription benefits are now fully available. Please refresh your browser to see the changes.

We apologize for any inconvenience!

Best regards,
OttoWrite Support Team
```

## Related Documents

- [Stripe Integration](../../lib/stripe/config.ts)
- [Webhook Handler](../../app/api/webhooks/stripe/route.ts)
- [User Profile Schema](../../supabase/migrations/)
- [Stripe Documentation](https://stripe.com/docs/webhooks)

---

**Last Reviewed:** January 19, 2025
**Next Review:** February 19, 2025
