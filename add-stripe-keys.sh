#!/bin/bash
# Quick script to add Stripe API keys to Vercel
# Usage: ./add-stripe-keys.sh

echo "🔑 Adding Stripe API Keys to Vercel"
echo "===================================="
echo ""
echo "Get your keys from: https://dashboard.stripe.com/test/apikeys"
echo "Make sure you're in the 'Ottowrite sandbox' account"
echo ""

# Publishable Key
echo "📝 Enter your Stripe Publishable Key (pk_test_...):"
read -r PUBLISHABLE_KEY

if [[ ! $PUBLISHABLE_KEY =~ ^pk_test_ ]]; then
  echo "❌ Error: Publishable key should start with 'pk_test_'"
  exit 1
fi

# Secret Key
echo ""
echo "📝 Enter your Stripe Secret Key (sk_test_...):"
read -rs SECRET_KEY  # -s hides input for security

if [[ ! $SECRET_KEY =~ ^sk_test_ ]]; then
  echo "❌ Error: Secret key should start with 'sk_test_'"
  exit 1
fi

echo ""
echo "✅ Keys validated!"
echo ""
echo "📤 Adding to Vercel (Production, Preview, Development)..."
echo ""

# Add Publishable Key
echo "Adding NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY..."
echo "$PUBLISHABLE_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
echo "$PUBLISHABLE_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
echo "$PUBLISHABLE_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY development

# Add Secret Key
echo ""
echo "Adding STRIPE_SECRET_KEY..."
echo "$SECRET_KEY" | vercel env add STRIPE_SECRET_KEY production
echo "$SECRET_KEY" | vercel env add STRIPE_SECRET_KEY preview
echo "$SECRET_KEY" | vercel env add STRIPE_SECRET_KEY development

echo ""
echo "✅ Stripe API keys added to Vercel!"
echo ""
echo "📋 Summary of what was added:"
echo "  ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (Production, Preview, Development)"
echo "  ✅ STRIPE_SECRET_KEY (Production, Preview, Development)"
echo ""
echo "📋 Previously added (via CLI):"
echo "  ✅ STRIPE_PRICE_HOBBYIST = price_1SImHmA2PfDiF2t51g2eMfQF"
echo "  ✅ STRIPE_PRICE_PROFESSIONAL = price_1SImHzA2PfDiF2t5WLRx7tN0"
echo "  ✅ STRIPE_PRICE_STUDIO = price_1SImIBA2PfDiF2t5L1x0YMwt"
echo ""
echo "⏭️  Next steps:"
echo "  1. Set up webhook endpoint in Stripe dashboard"
echo "  2. Add STRIPE_WEBHOOK_SECRET to Vercel"
echo "  3. Redeploy: vercel --prod"
echo ""
echo "📖 For webhook setup, see: STRIPE_SETUP.md"
