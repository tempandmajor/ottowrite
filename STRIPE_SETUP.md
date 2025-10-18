# Stripe Integration Setup

**Status**: ✅ Products and Prices configured
**Account**: Ottowrite sandbox (acct_1SBzyxA2PfDiF2t5)
**Last Updated**: October 17, 2025

---

## Already Configured

### Products Created in Stripe
All three subscription tiers are already set up in your Stripe account:

| Product | Price ID | Monthly Price | Features |
|---------|----------|---------------|----------|
| **Hobbyist** | `price_1SImHmA2PfDiF2t51g2eMfQF` | $12.00/month | 100K AI words, unlimited docs, all models |
| **Professional** | `price_1SImHzA2PfDiF2t5WLRx7tN0` | $24.00/month | 500K AI words, screenplay tools, API access |
| **Studio** | `price_1SImIBA2PfDiF2t5L1x0YMwt` | $49.00/month | 2M AI words, 5 team seats, collaboration |

### Code Configuration
The price IDs have been added to:
- ✅ `.env.production.example` - Template with actual price IDs
- ✅ `lib/stripe/config.ts` - Uses environment variables correctly
- ✅ `app/api/checkout/create-session/route.ts` - Full checkout flow implemented
- ✅ `app/api/webhooks/stripe/route.ts` - Webhook handler for subscription events

---

## Required Actions

### 1. Get Stripe API Keys

Visit your Stripe Dashboard to get the required keys:

**For Test Mode (Recommended to start):**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy the **Publishable key** (starts with `pk_test_...`)
3. Reveal and copy the **Secret key** (starts with `sk_test_...`)

**For Production Mode (When ready to go live):**
1. Go to: https://dashboard.stripe.com/apikeys
2. Copy the **Publishable key** (starts with `pk_live_...`)
3. Reveal and copy the **Secret key** (starts with `sk_live_...`)

### 2. Create Webhook Endpoint

You need to set up a webhook to receive subscription events:

1. **Go to Webhooks**: https://dashboard.stripe.com/test/webhooks
2. **Click "Add endpoint"**
3. **Endpoint URL**:
   ```
   https://your-production-domain.vercel.app/api/webhooks/stripe
   ```
   Replace `your-production-domain` with your actual Vercel domain

4. **Select events to listen to**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. **Click "Add endpoint"**
6. **Reveal and copy the "Signing secret"** (starts with `whsec_...`)

### 3. Add Environment Variables to Vercel

You can add these via the Vercel Dashboard or CLI:

#### Option A: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite/settings/environment-variables
2. Add the following variables (Production, Preview, Development):

| Variable Name | Value | Where to get it |
|---------------|-------|-----------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe Dashboard → API keys |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → Your endpoint |
| `STRIPE_PRICE_HOBBYIST` | `price_1SImHmA2PfDiF2t51g2eMfQF` | ✅ Already provided |
| `STRIPE_PRICE_PROFESSIONAL` | `price_1SImHzA2PfDiF2t5WLRx7tN0` | ✅ Already provided |
| `STRIPE_PRICE_STUDIO` | `price_1SImIBA2PfDiF2t5L1x0YMwt` | ✅ Already provided |

3. Click "Save" for each variable
4. Trigger a new deployment

#### Option B: Vercel CLI

```bash
# Publishable key (public - safe for browser)
echo "pk_test_YOUR_KEY_HERE" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
echo "pk_test_YOUR_KEY_HERE" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
echo "pk_test_YOUR_KEY_HERE" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY development

# Secret key (server-side only)
echo "sk_test_YOUR_KEY_HERE" | vercel env add STRIPE_SECRET_KEY production
echo "sk_test_YOUR_KEY_HERE" | vercel env add STRIPE_SECRET_KEY preview
echo "sk_test_YOUR_KEY_HERE" | vercel env add STRIPE_SECRET_KEY development

# Webhook secret
echo "whsec_YOUR_SECRET_HERE" | vercel env add STRIPE_WEBHOOK_SECRET production
echo "whsec_YOUR_SECRET_HERE" | vercel env add STRIPE_WEBHOOK_SECRET preview
echo "whsec_YOUR_SECRET_HERE" | vercel env add STRIPE_WEBHOOK_SECRET development

# Price IDs (already configured)
echo "price_1SImHmA2PfDiF2t51g2eMfQF" | vercel env add STRIPE_PRICE_HOBBYIST production preview development
echo "price_1SImHzA2PfDiF2t5WLRx7tN0" | vercel env add STRIPE_PRICE_PROFESSIONAL production preview development
echo "price_1SImIBA2PfDiF2t5L1x0YMwt" | vercel env add STRIPE_PRICE_STUDIO production preview development
```

### 4. Update Local Environment

Create or update `.env.local`:

```bash
# Copy the example file
cp .env.production.example .env.local

# Then edit .env.local and fill in:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# These are already filled in from the example:
STRIPE_PRICE_HOBBYIST=price_1SImHmA2PfDiF2t51g2eMfQF
STRIPE_PRICE_PROFESSIONAL=price_1SImHzA2PfDiF2t5WLRx7tN0
STRIPE_PRICE_STUDIO=price_1SImIBA2PfDiF2t5L1x0YMwt
```

---

## Testing the Integration

### Local Testing with Stripe CLI

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local dev server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   This will give you a webhook secret (whsec_...) - use this in your `.env.local`

4. **Run your dev server**:
   ```bash
   npm run dev
   ```

5. **Test checkout flow**:
   - Go to: http://localhost:3000/pricing
   - Click "Subscribe" on any tier
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

6. **Verify webhook events**:
   The Stripe CLI will show you webhook events in real-time

### Production Testing

1. **After deploying to Vercel**, test the checkout flow on your production domain
2. Use Stripe test cards: https://stripe.com/docs/testing#cards
3. Monitor webhook events in: https://dashboard.stripe.com/test/webhooks
4. Check Vercel logs for any errors: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite/logs

---

## Verification Checklist

- [ ] Stripe API keys added to Vercel (publishable + secret)
- [ ] Webhook endpoint created in Stripe dashboard
- [ ] Webhook secret added to Vercel
- [ ] Price IDs added to Vercel (already configured)
- [ ] Local `.env.local` configured with all Stripe variables
- [ ] Test checkout flow works locally
- [ ] Test checkout flow works in production
- [ ] Webhooks are being received (check Stripe dashboard)
- [ ] Subscription status updates in database after checkout
- [ ] Test cancellation flow works

---

## Security Notes

### Public vs Private Keys

✅ **Safe to expose in browser** (NEXT_PUBLIC_* prefix):
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Publishable key is safe

⚠️ **MUST keep secret** (server-side only):
- `STRIPE_SECRET_KEY` - Never expose to browser
- `STRIPE_WEBHOOK_SECRET` - Never expose to browser

### Key Rotation

If you need to rotate keys (e.g., if accidentally exposed):

1. **In Stripe Dashboard**: https://dashboard.stripe.com/test/apikeys
   - Click "Roll key" next to Secret key
   - Get new secret key

2. **Update Vercel**:
   ```bash
   vercel env rm STRIPE_SECRET_KEY production
   echo "sk_test_NEW_KEY" | vercel env add STRIPE_SECRET_KEY production
   ```

3. **Update local `.env.local`**

4. **Redeploy**:
   ```bash
   vercel --prod
   ```

---

## Troubleshooting

### "STRIPE_SECRET_KEY is not set" error

- Check environment variables are set in Vercel
- Make sure you redeployed after adding variables
- Verify variable names match exactly (case-sensitive)

### Checkout session fails to create

- Check Stripe dashboard for API errors
- Verify price IDs are correct
- Check Vercel logs for detailed error messages

### Webhooks not being received

- Verify webhook endpoint URL is correct
- Check webhook signing secret matches
- Use Stripe CLI to test locally first
- Check Vercel function logs for errors

### Test mode vs Live mode

- Make sure you're using test keys (`pk_test_`, `sk_test_`) initially
- Verify you're on the "Test" tab in Stripe dashboard
- Test cards won't work in live mode and vice versa

---

## Next Steps

Once Stripe is fully configured:

1. **Test the full subscription flow**:
   - Sign up → Choose plan → Checkout → Success
   - Verify subscription status in database
   - Test subscription updates/cancellations

2. **Monitor for errors**:
   - Check Vercel logs
   - Check Stripe dashboard logs
   - Set up error alerts

3. **Document for team**:
   - Add Stripe keys to password manager
   - Document webhook endpoint
   - Create runbook for common issues

4. **When ready for production**:
   - Switch to live mode keys
   - Update webhook endpoint to production domain
   - Test with real (small) payment first
   - Monitor closely for 24 hours

---

## Resources

- Stripe API Documentation: https://stripe.com/docs/api
- Stripe Testing Guide: https://stripe.com/docs/testing
- Stripe Webhooks Guide: https://stripe.com/docs/webhooks
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables

---

**Status**: Ready for API key configuration
**Blocker**: Need to retrieve publishable/secret keys from Stripe dashboard
**Time Required**: ~10 minutes to configure
