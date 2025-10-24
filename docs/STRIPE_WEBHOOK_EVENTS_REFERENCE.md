# Stripe Webhook Events Quick Reference

**Last Updated:** 2025-10-23
**Handler:** `app/api/webhooks/stripe/route.ts`

---

## Event Summary

| Event | Priority | Database Impact | User Impact |
|-------|----------|----------------|-------------|
| `checkout.session.completed` | 🔴 Critical | Creates subscription | User gets access |
| `customer.subscription.updated` | 🔴 Critical | Updates tier/status | Feature access changes |
| `customer.subscription.deleted` | 🔴 Critical | Downgrades to free | User loses access |
| `invoice.payment_succeeded` | 🟡 High | Resets word count | Monthly renewal |
| `invoice.payment_failed` | 🟡 High | Marks past_due | Payment reminder sent |

---

## Event Details

### 1. checkout.session.completed

**Triggered when:** User completes checkout and payment is successful

**Handler:** `route.ts:106-168`

**What it does:**
1. Retrieves subscription from Stripe
2. Extracts price ID and tier
3. Gets Supabase user ID from metadata
4. Updates user profile with:
   - `stripe_customer_id`
   - `stripe_subscription_id`
   - `stripe_price_id`
   - `subscription_status: 'active'`
   - `subscription_tier` (hobbyist/professional/studio)
   - `subscription_current_period_start`
   - `subscription_current_period_end`
   - `ai_words_used_this_month: 0`
   - `ai_words_reset_date`

**Required metadata:**
```typescript
{
  supabase_user_id: string  // Set during checkout
  subscription_tier?: string  // Optional fallback
}
```

**Example payload:**
```json
{
  "id": "evt_...",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_...",
      "mode": "subscription",
      "customer": "cus_...",
      "subscription": "sub_...",
      "metadata": {
        "supabase_user_id": "uuid",
        "subscription_tier": "professional"
      }
    }
  }
}
```

**Failure scenarios:**
- ❌ Missing `supabase_user_id` in metadata
  - **Impact:** Subscription not activated
  - **Resolution:** Add metadata in checkout session

- ❌ User profile not found
  - **Impact:** Database update fails
  - **Resolution:** Create user profile first

**Testing:**
```bash
stripe trigger checkout.session.completed
```

---

### 2. customer.subscription.updated

**Triggered when:** Subscription changes (upgrade, downgrade, renewal)

**Handler:** `route.ts:170-209`

**What it does:**
1. Extracts subscription data from event
2. Determines new tier from price ID
3. Updates user profile with:
   - `stripe_price_id`
   - `subscription_status` (active, trialing, past_due, etc.)
   - `subscription_tier`
   - `subscription_current_period_start`
   - `subscription_current_period_end`

**Use cases:**
- User upgrades from Hobbyist to Professional
- User downgrades from Professional to Hobbyist
- Subscription renews automatically
- Trial period ends

**Example payload:**
```json
{
  "id": "evt_...",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_...",
      "customer": "cus_...",
      "status": "active",
      "items": {
        "data": [{
          "price": {
            "id": "price_..."
          }
        }]
      },
      "metadata": {
        "supabase_user_id": "uuid"
      },
      "current_period_start": 1234567890,
      "current_period_end": 1237159890
    }
  }
}
```

**Important notes:**
- This event fires FREQUENTLY
- Can fire multiple times for a single change
- Idempotency is crucial
- Always use latest status

**Testing:**
```bash
# Upgrade test
stripe subscriptions update sub_... --price price_professional

# Status change test
stripe subscriptions update sub_... --trial-end now
```

---

### 3. customer.subscription.deleted

**Triggered when:** User cancels subscription or it expires

**Handler:** `route.ts:211-241`

**What it does:**
1. Extracts subscription ID
2. Updates user profile with:
   - `subscription_status: 'canceled'`
   - `subscription_tier: 'free'`
   - `stripe_subscription_id: null`
   - `stripe_price_id: null`

**Use cases:**
- User clicks "Cancel subscription"
- Subscription expires after failed payments
- Admin cancels subscription in Stripe

**Example payload:**
```json
{
  "id": "evt_...",
  "type": "customer.subscription.deleted",
  "data": {
    "object": {
      "id": "sub_...",
      "customer": "cus_...",
      "status": "canceled",
      "metadata": {
        "supabase_user_id": "uuid"
      }
    }
  }
}
```

**Important notes:**
- User immediately loses access to premium features
- AI word count remains (doesn't reset)
- Can resubscribe later with same customer ID

**Testing:**
```bash
stripe subscriptions cancel sub_...
```

---

### 4. invoice.payment_succeeded

**Triggered when:** Subscription payment is successful

**Handler:** `route.ts:243-292`

**What it does:**
1. Retrieves subscription from invoice
2. Resets monthly AI word usage:
   - `ai_words_used_this_month: 0`
   - `ai_words_reset_date: NOW()`
   - `subscription_status: 'active'`

**Use cases:**
- Monthly subscription renewal
- First payment after trial
- Payment retry succeeded

**Example payload:**
```json
{
  "id": "evt_...",
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "id": "in_...",
      "customer": "cus_...",
      "subscription": "sub_...",
      "status": "paid",
      "amount_paid": 2400,
      "paid": true
    }
  }
}
```

**Important notes:**
- This resets the AI word count
- Always fires after successful payment
- Can fire multiple times if invoice split

**Testing:**
```bash
stripe trigger invoice.payment_succeeded
```

---

### 5. invoice.payment_failed

**Triggered when:** Subscription payment fails

**Handler:** `route.ts:294-340`

**What it does:**
1. Retrieves subscription from invoice
2. Updates user profile:
   - `subscription_status: 'past_due'`

**Use cases:**
- Credit card declined
- Insufficient funds
- Expired card

**Example payload:**
```json
{
  "id": "evt_...",
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_...",
      "customer": "cus_...",
      "subscription": "sub_...",
      "status": "open",
      "amount_due": 2400,
      "paid": false,
      "attempt_count": 1
    }
  }
}
```

**Important notes:**
- Stripe will retry payment automatically
- User may still have access during retry period
- After 4 failed attempts, subscription cancels

**Follow-up actions:**
- Send email to user about failed payment
- Display banner in app
- Stripe sends automated emails

**Testing:**
```bash
stripe trigger invoice.payment_failed
```

---

## Event Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Stripe sends POST to /api/webhooks/stripe               │
│    Headers: stripe-signature                                │
│    Body: JSON event payload                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Verify signature (route.ts:36-48)                       │
│    - Construct event from body + signature                  │
│    - Throws error if invalid                                │
│    → Return 400 "Invalid signature"                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Check event age (route.ts:50-68)                        │
│    - Max age: 5 minutes                                     │
│    - Prevents replay attacks                                │
│    → Return 400 "Event too old"                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Log event (route.ts:71-75)                              │
│    - operation: webhook:stripe:process                      │
│    - eventType, eventId                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Route to event handler (route.ts:105)                   │
│    switch (event.type) {                                    │
│      case 'checkout.session.completed': ...                 │
│      case 'customer.subscription.updated': ...              │
│      case 'customer.subscription.deleted': ...              │
│      case 'invoice.payment_succeeded': ...                  │
│      case 'invoice.payment_failed': ...                     │
│      default: log unhandled                                 │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Update database (route.ts:88-102)                       │
│    - Find user by userId, subscriptionId, or customerId    │
│    - Update relevant fields                                 │
│    - Handle errors gracefully                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Return response (route.ts:349)                          │
│    → Return 200 { "received": true }                        │
│    → Or 500 if error (Stripe will retry)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Automatic Retry Logic

Stripe automatically retries failed webhooks:

| Attempt | Delay |
|---------|-------|
| 1st | Immediate |
| 2nd | 1 hour |
| 3rd | 3 hours |
| 4th | 6 hours |
| 5th | 12 hours |

**When to return 500:**
- Database connection failed
- Unexpected error
- Want Stripe to retry

**When to return 400:**
- Invalid signature
- Event too old
- Malformed data

**When to return 200:**
- Event processed successfully
- Event already processed (idempotency)
- Unhandled event type (not an error)

---

## Security Checklist

- [x] Signature verification enabled
- [x] Event age validation (5 min max)
- [x] HTTPS only
- [x] Webhook secret stored securely (Vercel encrypted)
- [x] Error logging to Sentry
- [x] Idempotency handled
- [x] No sensitive data in logs

---

## Monitoring

### Key Metrics

1. **Success Rate**
   - Target: > 99%
   - Check: Stripe Dashboard → Webhooks

2. **Average Response Time**
   - Target: < 2 seconds
   - Check: Vercel Analytics

3. **Failed Deliveries**
   - Target: 0 in last 24 hours
   - Check: Stripe Dashboard → Events

4. **Error Rate**
   - Target: < 1%
   - Check: Sentry → Errors

### Alerts to Set Up

```typescript
// Sentry alert rules
{
  name: "Webhook Failures",
  conditions: [
    { metric: "error.count", threshold: 5, window: "15m" },
    { tag: "operation", equals: "webhook:stripe:handler" }
  ],
  actions: ["slack", "email"]
}
```

---

## Common Issues & Solutions

### Issue: User not upgraded after payment

**Check:**
1. Webhook delivered? (Stripe Dashboard)
2. Webhook returned 200? (Vercel Logs)
3. Database updated? (Supabase SQL)

**Solution:** See `docs/runbooks/stripe-webhook-replay.md`

### Issue: Duplicate subscriptions

**Check:**
1. Idempotency working?
2. Multiple webhook endpoints?

**Solution:**
- Review updateProfile logic
- Ensure only one webhook endpoint registered

### Issue: Webhook timeouts

**Check:**
1. Database performance
2. External API calls

**Solution:**
- Optimize queries
- Move slow operations to background jobs

---

## Testing

### Local Development

```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

### Using Test Endpoint (Development Only)

```bash
# Simulate checkout completed
curl -X POST "http://localhost:3000/api/webhooks/stripe/test?event=checkout.session.completed&userId=test-user-123"

# Simulate subscription updated
curl -X POST "http://localhost:3000/api/webhooks/stripe/test?event=customer.subscription.updated&userId=test-user-123"
```

### Production Testing

```bash
# Use test script
./scripts/test-stripe-webhooks.sh

# Or manually in Stripe Dashboard
# Webhooks → Your endpoint → Send test webhook
```

---

## Quick Links

- **Stripe Dashboard:** https://dashboard.stripe.com/webhooks
- **Webhook Handler Code:** `app/api/webhooks/stripe/route.ts`
- **Webhook Tests:** `__tests__/api/webhooks-stripe.test.ts`
- **Setup Guide:** `docs/STRIPE_WEBHOOK_PRODUCTION_SETUP.md`
- **Replay Runbook:** `docs/runbooks/stripe-webhook-replay.md`

---

**Questions?** Check the setup guide or runbook for detailed procedures.
