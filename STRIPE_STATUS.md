# Stripe Integration Status

**Last Updated**: October 17, 2025
**Stripe Account**: Ottowrite sandbox (acct_1SBzyxA2PfDiF2t5)

---

## ✅ What's Already Done

### 1. Products Created in Stripe ✅
All three subscription tiers exist in your "Ottowrite sandbox" Stripe account:

| Tier | Product ID | Price ID | Monthly Cost |
|------|------------|----------|--------------|
| Hobbyist | `prod_TFGpVmpmzgjJ1D` | `price_1SImHmA2PfDiF2t51g2eMfQF` | $12.00 |
| Professional | `prod_TFGpwBWpimi5e7` | `price_1SImHzA2PfDiF2t5WLRx7tN0` | $24.00 |
| Studio | `prod_TFGpzGlIFdrSdi` | `price_1SImIBA2PfDiF2t5L1x0YMwt` | $49.00 |

### 2. Code Implementation ✅
- ✅ `lib/stripe/config.ts` - Stripe client & tier configuration
- ✅ `app/api/checkout/create-session/route.ts` - Checkout flow
- ✅ `app/api/webhooks/stripe/route.ts` - Webhook handler
- ✅ Build passing (11.2s, 0 TypeScript errors)

### 3. Environment Variables in Vercel ✅
Added via CLI automation:

| Variable | Status | Environments |
|----------|--------|--------------|
| `STRIPE_PRICE_HOBBYIST` | ✅ Added | Production, Preview, Development |
| `STRIPE_PRICE_PROFESSIONAL` | ✅ Added | Production, Preview, Development |
| `STRIPE_PRICE_STUDIO` | ✅ Added | Production, Preview, Development |

### 4. Documentation ✅
- ✅ `STRIPE_SETUP.md` - Complete setup guide (650+ lines)
- ✅ `STRIPE_ENV_VALUES.md` - Quick reference (gitignored)
- ✅ `STRIPE_INTEGRATION_COMPLETE.md` - Detailed summary
- ✅ `add-stripe-keys.sh` - Helper script for adding API keys

### 5. Configuration Files ✅
- ✅ `.env.production.example` - Updated with real price IDs
- ✅ `.gitignore` - Protected credential files

---

## ⏳ What's Still Needed

### 1. Get Stripe API Keys from Dashboard

You need to retrieve these from the **Ottowrite sandbox** Stripe account:

**Go to**: https://dashboard.stripe.com/test/apikeys

| Key | Format | Status |
|-----|--------|--------|
| Publishable Key | `pk_test_...` | ⏳ Need from dashboard |
| Secret Key | `sk_test_...` | ⏳ Need from dashboard |

**Why we can't automate this**: Stripe MCP doesn't expose secret keys for security reasons. They must be retrieved manually from the dashboard.

### 2. Add API Keys to Vercel

**Option A: Use the helper script** (easiest):
```bash
./add-stripe-keys.sh
```
This will prompt you for the keys and add them to all Vercel environments.

**Option B: Manual via CLI**:
```bash
echo "pk_test_YOUR_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
echo "pk_test_YOUR_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
echo "pk_test_YOUR_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY development

echo "sk_test_YOUR_KEY" | vercel env add STRIPE_SECRET_KEY production
echo "sk_test_YOUR_KEY" | vercel env add STRIPE_SECRET_KEY preview
echo "sk_test_YOUR_KEY" | vercel env add STRIPE_SECRET_KEY development
```

**Option C: Vercel Dashboard**:
Go to: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite/settings/environment-variables

### 3. Set Up Webhook Endpoint

**Go to**: https://dashboard.stripe.com/test/webhooks

1. Click "Add endpoint"
2. **Endpoint URL**: `https://ottowrite-emmanuels-projects-15fbaf71.vercel.app/api/webhooks/stripe`
   (Or your custom domain if you have one)
3. **Events to listen for**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click "Add endpoint"
5. **Copy the Signing Secret** (starts with `whsec_...`)

### 4. Add Webhook Secret to Vercel

```bash
echo "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production
echo "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET preview
echo "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET development
```

### 5. Update Local Environment

```bash
# Copy the example
cp .env.production.example .env.local

# Edit .env.local and add:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs are already in the example file!
```

---

## 📊 Progress Summary

| Task | Status | Time Required |
|------|--------|---------------|
| Create products in Stripe | ✅ Done | - |
| Retrieve price IDs | ✅ Done | - |
| Add price IDs to Vercel | ✅ Done | - |
| Implement checkout code | ✅ Done | - |
| Implement webhook handler | ✅ Done | - |
| Create documentation | ✅ Done | - |
| Get API keys from dashboard | ⏳ Pending | ~2 minutes |
| Add API keys to Vercel | ⏳ Pending | ~3 minutes |
| Create webhook endpoint | ⏳ Pending | ~3 minutes |
| Add webhook secret to Vercel | ⏳ Pending | ~2 minutes |
| Test checkout flow | ⏳ Pending | ~5 minutes |

**Total time remaining**: ~15 minutes

---

## 🚀 Quick Start (When You're Ready)

1. **Get the keys** (2 min):
   ```
   Open: https://dashboard.stripe.com/test/apikeys
   Copy: Publishable key + Secret key
   ```

2. **Run the script** (3 min):
   ```bash
   ./add-stripe-keys.sh
   ```

3. **Set up webhook** (3 min):
   ```
   Open: https://dashboard.stripe.com/test/webhooks
   Create endpoint for: https://ottowrite-emmanuels-projects-15fbaf71.vercel.app/api/webhooks/stripe
   Copy signing secret
   ```

4. **Add webhook secret** (1 min):
   ```bash
   echo "whsec_..." | vercel env add STRIPE_WEBHOOK_SECRET production
   echo "whsec_..." | vercel env add STRIPE_WEBHOOK_SECRET preview
   echo "whsec_..." | vercel env add STRIPE_WEBHOOK_SECRET development
   ```

5. **Redeploy** (1 min):
   ```bash
   vercel --prod
   ```

6. **Test** (5 min):
   ```
   Visit: https://ottowrite-emmanuels-projects-15fbaf71.vercel.app/pricing
   Click: Subscribe on any tier
   Use test card: 4242 4242 4242 4242
   ```

---

## 🔍 Verification

After adding the API keys, verify with:

```bash
# Check Vercel has all variables
vercel env ls | grep STRIPE

# Should show 6 variables × 3 environments = 18 total:
# - STRIPE_PRICE_HOBBYIST (✅ already added)
# - STRIPE_PRICE_PROFESSIONAL (✅ already added)
# - STRIPE_PRICE_STUDIO (✅ already added)
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (⏳ pending)
# - STRIPE_SECRET_KEY (⏳ pending)
# - STRIPE_WEBHOOK_SECRET (⏳ pending)
```

---

## 📖 Additional Resources

- **Detailed setup guide**: `STRIPE_SETUP.md`
- **Integration summary**: `STRIPE_INTEGRATION_COMPLETE.md`
- **Quick reference**: `STRIPE_ENV_VALUES.md` (gitignored)
- **Helper script**: `add-stripe-keys.sh`

---

## 🎯 Current Blocker

The only blocker is retrieving the API keys from the Stripe dashboard. Once you have those, the `add-stripe-keys.sh` script will automate adding them to Vercel in all environments.

**What's automated**:
- ✅ Price IDs added to Vercel (done via CLI)
- ✅ Helper script created for API keys
- ✅ All code implementation complete

**What needs manual action**:
- ⏳ Login to Stripe dashboard
- ⏳ Copy 2 API keys (publishable + secret)
- ⏳ Create webhook endpoint
- ⏳ Copy webhook signing secret

**Estimated time to complete**: 15 minutes

---

**Status**: 75% complete (price IDs ✅, code ✅, docs ✅, API keys pending ⏳)
**Next Action**: Get API keys from https://dashboard.stripe.com/test/apikeys
