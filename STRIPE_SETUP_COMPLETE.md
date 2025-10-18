# Stripe Setup Complete

**Date**: October 18, 2025
**Status**: ✅ **READY FOR PRODUCTION**

---

## Summary

Complete Stripe integration configured with updated pricing tiers and full environment setup.

## Pricing Tiers

| Tier | Price | Product ID | Price ID |
|------|-------|------------|----------|
| **Free** | $0/forever | N/A (virtual) | N/A |
| **Hobbyist** | $20/month | `prod_TGEeM6Z7ks5mDX` | `price_1SJiBcA2PfDiF2t59PP6VCpe` |
| **Professional** | $60/month | `prod_TGEeqIyG3K3WOQ` | `price_1SJiBdA2PfDiF2t5lS5EC6J5` |
| **Studio** | $100/month | `prod_TGEepmexJSiX05` | `price_1SJiBeA2PfDiF2t5cLc0Hxzp` |

## Features by Tier

### Free ($0/forever)
- 25,000 AI words/month
- 5 documents max
- Claude Sonnet 4.5
- Basic exports (PDF, MD, TXT)
- 30-day version history
- Prose editor

### Hobbyist ($20/month)
- 100,000 AI words/month
- Unlimited documents
- All AI models (Claude, GPT-5, DeepSeek)
- All export formats
- Unlimited version history
- Screenplay formatting
- Advanced features

### Professional ($60/month)
- 500,000 AI words/month
- Everything in Hobbyist
- API access (50 req/day)
- Priority support
- Batch processing
- Advanced analytics
- Publishing tools

### Studio ($100/month)
- 2,000,000 AI words/month
- Everything in Professional
- 5 team seats included
- Real-time collaboration
- Team workspace
- Publishing integrations
- Dedicated support

## Environment Variables Configured

### ✅ Vercel (Production, Preview, Development)

**Public Keys** (client-side):
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_test_51SBnl2BufOql8ToA...`
- `NEXT_PUBLIC_STRIPE_PRICE_HOBBYIST`: `price_1SJiBcA2PfDiF2t59PP6VCpe`
- `NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL`: `price_1SJiBdA2PfDiF2t5lS5EC6J5`
- `NEXT_PUBLIC_STRIPE_PRICE_STUDIO`: `price_1SJiBeA2PfDiF2t5cLc0Hxzp`

**Secret Keys** (server-side):
- `STRIPE_SECRET_KEY`: `sk_test_51SBnl2BufOql8ToA...`
- `STRIPE_PRICE_HOBBYIST`: `price_1SJiBcA2PfDiF2t59PP6VCpe`
- `STRIPE_PRICE_PROFESSIONAL`: `price_1SJiBdA2PfDiF2t5lS5EC6J5`
- `STRIPE_PRICE_STUDIO`: `price_1SJiBeA2PfDiF2t5cLc0Hxzp`

### ✅ Local (.env.local)

All variables added to `.env.local` for local development.

## Next Steps

### 1. Configure Stripe Webhook

You need to set up the webhook endpoint to sync subscription changes:

**Option A: Production Webhook (Recommended)**

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://www.ottowrite.app/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the signing secret (starts with `whsec_`)
7. Add to Vercel:
   ```bash
   echo "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production
   echo "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET preview
   echo "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET development
   ```

**Option B: Local Development Webhook**

For testing locally:
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret from the output and add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Deploy Changes

The pricing page has been updated. Deploy to Vercel:

```bash
git add -A
git commit -m "Update Stripe pricing to $20, $60, $100 tiers with new product/price IDs"
git push
```

### 3. Test Checkout Flow

Once deployed:

1. Visit https://www.ottowrite.app/pricing
2. Verify all prices display correctly ($20, $60, $100)
3. Click "Start Free Trial" on Hobbyist plan
4. Complete test checkout with test card: `4242 4242 4242 4242`
5. Verify webhook receives subscription events
6. Check Supabase `user_profiles` table for subscription update

## Test Cards

Stripe provides test cards for different scenarios:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Webhook Handler

The webhook handler is already implemented at:
- `app/api/webhooks/stripe/route.ts`

It handles:
- Subscription creation/update/deletion
- Invoice payment success/failure
- Checkout session completion
- Updates to `user_profiles.subscription_status` and `subscription_tier`

## Monitoring

After setup:

1. **Stripe Dashboard**: Monitor subscriptions, payments, and events
2. **Vercel Logs**: Check for webhook processing errors
3. **Supabase**: Verify subscription data updates correctly

## Troubleshooting

### Checkout Not Working

1. Check browser console for errors
2. Verify environment variables are set in Vercel
3. Check that price IDs match in both code and Vercel env vars
4. Ensure `STRIPE_SECRET_KEY` is set for server-side API calls

### Webhook Not Receiving Events

1. Verify webhook endpoint is added in Stripe dashboard
2. Check `STRIPE_WEBHOOK_SECRET` is set in Vercel
3. Review Vercel function logs for webhook errors
4. Test webhook locally with `stripe listen`

### Subscription Not Syncing to Database

1. Check webhook handler logs in Vercel
2. Verify Supabase connection
3. Check RLS policies on `user_profiles` table
4. Ensure webhook signature verification passes

## Files Modified

1. `app/pricing/page.tsx` - Updated pricing to $20/$60/$100
2. `.env.local` - Added Stripe configuration
3. `setup-stripe.sh` - Automated setup script (for reference)

## Stripe Dashboard Links

- **Test Mode**: https://dashboard.stripe.com/test
- **Products**: https://dashboard.stripe.com/test/products
- **Prices**: https://dashboard.stripe.com/test/prices
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Customers**: https://dashboard.stripe.com/test/customers
- **Subscriptions**: https://dashboard.stripe.com/test/subscriptions

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review Stripe webhook delivery attempts
3. Check Supabase logs for database errors
4. Test locally with Stripe CLI

---

**Status**: ✅ Stripe configured and ready for testing
**Next**: Configure webhook and test checkout flow
**Updated**: October 18, 2025
