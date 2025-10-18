#!/bin/bash

# Stripe Setup Script for Ottowrite
# This script creates all products, prices, and configures environment variables

set -e

echo "🎯 Ottowrite Stripe Setup"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}❌ Stripe CLI is not installed${NC}"
    echo "Install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

echo -e "${GREEN}✅ Stripe CLI found${NC}"
echo ""

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Stripe CLI${NC}"
    echo "Run: stripe login"
    exit 1
fi

echo -e "${GREEN}✅ Stripe CLI authenticated${NC}"
echo ""

# Step 1: Create Products
echo -e "${BLUE}📦 Step 1: Creating Stripe Products${NC}"
echo ""

# Check if Hobbyist product already exists
HOBBYIST_PRODUCT=$(stripe products list --limit 100 2>/dev/null | grep -o '"id": "prod_[^"]*"' | grep -A 5 '"name": "Hobbyist"' | head -1 | grep -o 'prod_[^"]*' || echo "")

if [ -n "$HOBBYIST_PRODUCT" ]; then
    echo -e "${YELLOW}⚠️  Hobbyist product already exists: $HOBBYIST_PRODUCT${NC}"
else
    echo "Creating Hobbyist product..."
    HOBBYIST_PRODUCT=$(stripe products create \
        --name "Hobbyist" \
        --description "For serious writers - 100K AI words/month, unlimited documents, all AI models" \
        --format json | grep -o '"id": "prod_[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Created Hobbyist product: $HOBBYIST_PRODUCT${NC}"
fi

# Check if Professional product already exists
PROFESSIONAL_PRODUCT=$(stripe products list --limit 100 2>/dev/null | grep -o '"id": "prod_[^"]*"' | grep -A 5 '"name": "Professional"' | head -1 | grep -o 'prod_[^"]*' || echo "")

if [ -n "$PROFESSIONAL_PRODUCT" ]; then
    echo -e "${YELLOW}⚠️  Professional product already exists: $PROFESSIONAL_PRODUCT${NC}"
else
    echo "Creating Professional product..."
    PROFESSIONAL_PRODUCT=$(stripe products create \
        --name "Professional" \
        --description "For professional authors - 500K AI words/month, API access, priority support" \
        --format json | grep -o '"id": "prod_[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Created Professional product: $PROFESSIONAL_PRODUCT${NC}"
fi

# Check if Studio product already exists
STUDIO_PRODUCT=$(stripe products list --limit 100 2>/dev/null | grep -o '"id": "prod_[^"]*"' | grep -A 5 '"name": "Studio"' | head -1 | grep -o 'prod_[^"]*' || echo "")

if [ -n "$STUDIO_PRODUCT" ]; then
    echo -e "${YELLOW}⚠️  Studio product already exists: $STUDIO_PRODUCT${NC}"
else
    echo "Creating Studio product..."
    STUDIO_PRODUCT=$(stripe products create \
        --name "Studio" \
        --description "For teams and studios - 2M AI words/month, team collaboration, dedicated support" \
        --format json | grep -o '"id": "prod_[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Created Studio product: $STUDIO_PRODUCT${NC}"
fi

echo ""

# Step 2: Create Prices
echo -e "${BLUE}💰 Step 2: Creating Stripe Prices${NC}"
echo ""

echo "Creating Hobbyist price ($20/month)..."
HOBBYIST_PRICE=$(stripe prices create \
    --product "$HOBBYIST_PRODUCT" \
    --currency usd \
    --unit-amount 2000 \
    --recurring[interval]=month \
    --nickname "Hobbyist Monthly" \
    --format json | grep -o '"id": "price_[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Created Hobbyist price: $HOBBYIST_PRICE${NC}"

echo "Creating Professional price ($60/month)..."
PROFESSIONAL_PRICE=$(stripe prices create \
    --product "$PROFESSIONAL_PRODUCT" \
    --currency usd \
    --unit-amount 6000 \
    --recurring[interval]=month \
    --nickname "Professional Monthly" \
    --format json | grep -o '"id": "price_[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Created Professional price: $PROFESSIONAL_PRICE${NC}"

echo "Creating Studio price ($100/month)..."
STUDIO_PRICE=$(stripe prices create \
    --product "$STUDIO_PRODUCT" \
    --currency usd \
    --unit-amount 10000 \
    --recurring[interval]=month \
    --nickname "Studio Monthly" \
    --format json | grep -o '"id": "price_[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Created Studio price: $STUDIO_PRICE${NC}"

echo ""

# Step 3: Get Stripe API keys
echo -e "${BLUE}🔑 Step 3: Getting Stripe API Keys${NC}"
echo ""

PUBLISHABLE_KEY=$(stripe config --list | grep 'test_mode_pub_key' | awk '{print $3}')
SECRET_KEY=$(stripe config --list | grep 'test_mode_api_key' | awk '{print $3}')

echo -e "${GREEN}✅ Publishable Key: ${PUBLISHABLE_KEY:0:20}...${NC}"
echo -e "${GREEN}✅ Secret Key: ${SECRET_KEY:0:20}...${NC}"

echo ""

# Step 4: Update Local .env
echo -e "${BLUE}📝 Step 4: Updating Local .env${NC}"
echo ""

# Create or update .env.local
ENV_FILE=".env.local"

# Backup existing .env.local if it exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"
    echo -e "${YELLOW}⚠️  Backed up existing $ENV_FILE${NC}"
fi

# Remove old Stripe variables if they exist
if [ -f "$ENV_FILE" ]; then
    grep -v "STRIPE_PRICE_HOBBYIST\|STRIPE_PRICE_PROFESSIONAL\|STRIPE_PRICE_STUDIO\|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\|STRIPE_SECRET_KEY" "$ENV_FILE" > "$ENV_FILE.tmp" || true
    mv "$ENV_FILE.tmp" "$ENV_FILE"
fi

# Add new variables
{
    echo ""
    echo "# Stripe Configuration (Updated $(date))"
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY"
    echo "STRIPE_SECRET_KEY=$SECRET_KEY"
    echo ""
    echo "# Stripe Price IDs"
    echo "STRIPE_PRICE_HOBBYIST=$HOBBYIST_PRICE"
    echo "NEXT_PUBLIC_STRIPE_PRICE_HOBBYIST=$HOBBYIST_PRICE"
    echo "STRIPE_PRICE_PROFESSIONAL=$PROFESSIONAL_PRICE"
    echo "NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=$PROFESSIONAL_PRICE"
    echo "STRIPE_PRICE_STUDIO=$STUDIO_PRICE"
    echo "NEXT_PUBLIC_STRIPE_PRICE_STUDIO=$STUDIO_PRICE"
} >> "$ENV_FILE"

echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"
echo ""

# Step 5: Update Vercel Environment Variables
echo -e "${BLUE}☁️  Step 5: Updating Vercel Environment Variables${NC}"
echo ""

read -p "Do you want to update Vercel environment variables now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Updating Vercel environment variables..."

    # Function to add or update env var
    add_vercel_env() {
        local key=$1
        local value=$2
        local env=$3

        # Remove existing variable if it exists
        vercel env rm "$key" "$env" -y 2>/dev/null || true

        # Add new variable
        echo "$value" | vercel env add "$key" "$env"
    }

    # Add publishable key (public)
    for env in production preview development; do
        echo "Adding NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to $env..."
        add_vercel_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$PUBLISHABLE_KEY" "$env"
    done

    # Add secret key (server-only)
    for env in production preview development; do
        echo "Adding STRIPE_SECRET_KEY to $env..."
        add_vercel_env "STRIPE_SECRET_KEY" "$SECRET_KEY" "$env"
    done

    # Add price IDs
    for env in production preview development; do
        echo "Adding price IDs to $env..."
        add_vercel_env "STRIPE_PRICE_HOBBYIST" "$HOBBYIST_PRICE" "$env"
        add_vercel_env "NEXT_PUBLIC_STRIPE_PRICE_HOBBYIST" "$HOBBYIST_PRICE" "$env"
        add_vercel_env "STRIPE_PRICE_PROFESSIONAL" "$PROFESSIONAL_PRICE" "$env"
        add_vercel_env "NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL" "$PROFESSIONAL_PRICE" "$env"
        add_vercel_env "STRIPE_PRICE_STUDIO" "$STUDIO_PRICE" "$env"
        add_vercel_env "NEXT_PUBLIC_STRIPE_PRICE_STUDIO" "$STUDIO_PRICE" "$env"
    done

    echo -e "${GREEN}✅ Vercel environment variables updated${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped Vercel environment variable update${NC}"
fi

echo ""

# Step 6: Webhook Setup Instructions
echo -e "${BLUE}🔗 Step 6: Webhook Setup${NC}"
echo ""
echo "To complete the setup, you need to configure a webhook endpoint:"
echo ""
echo "Option 1: Local Development (using Stripe CLI)"
echo "  Run this command in a new terminal:"
echo -e "  ${YELLOW}stripe listen --forward-to http://localhost:3000/api/webhooks/stripe${NC}"
echo ""
echo "Option 2: Production Webhook"
echo "  1. Go to: https://dashboard.stripe.com/test/webhooks"
echo "  2. Click 'Add endpoint'"
echo "  3. Enter URL: https://www.ottowrite.app/api/webhooks/stripe"
echo "  4. Select events:"
echo "     - customer.subscription.created"
echo "     - customer.subscription.updated"
echo "     - customer.subscription.deleted"
echo "     - invoice.payment_succeeded"
echo "     - invoice.payment_failed"
echo "  5. Copy the signing secret and add to Vercel:"
echo -e "     ${YELLOW}vercel env add STRIPE_WEBHOOK_SECRET production${NC}"
echo ""

# Summary
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "📋 Summary:"
echo "  • Products Created: 3 (Hobbyist, Professional, Studio)"
echo "  • Prices Created: 3 ($20, $60, $100/month)"
echo "  • Local .env updated: ✅"
echo "  • Price IDs:"
echo "    - Hobbyist: $HOBBYIST_PRICE"
echo "    - Professional: $PROFESSIONAL_PRICE"
echo "    - Studio: $STUDIO_PRICE"
echo ""
echo "🚀 Next Steps:"
echo "  1. Configure webhook (see instructions above)"
echo "  2. Redeploy your app: git push"
echo "  3. Test checkout flow at /pricing"
echo ""
echo -e "${BLUE}Happy coding! 🎉${NC}"
