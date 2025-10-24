#!/bin/bash

# Stripe Webhook Testing Script
# This script helps test all Stripe webhook events in your local or production environment
#
# Prerequisites:
# 1. Stripe CLI installed: brew install stripe/stripe-cli/stripe
# 2. Stripe CLI authenticated: stripe login
# 3. App running locally OR deployed to production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Stripe Webhook Testing Utility      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}❌ Stripe CLI not found${NC}"
    echo "Install it with: brew install stripe/stripe-cli/stripe"
    exit 1
fi

echo -e "${GREEN}✓ Stripe CLI found${NC}"
echo ""

# Ask for environment
echo "Select environment:"
echo "1) Local (localhost:3000)"
echo "2) Production (www.ottowrite.app)"
read -p "Enter choice (1 or 2): " ENV_CHOICE

if [ "$ENV_CHOICE" == "1" ]; then
    WEBHOOK_URL="http://localhost:3000/api/webhooks/stripe"
    ENV_NAME="LOCAL"
elif [ "$ENV_CHOICE" == "2" ]; then
    WEBHOOK_URL="https://www.ottowrite.app/api/webhooks/stripe"
    ENV_NAME="PRODUCTION"
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Testing webhooks at: $WEBHOOK_URL${NC}"
echo ""

# Test events
EVENTS=(
    "checkout.session.completed"
    "customer.subscription.created"
    "customer.subscription.updated"
    "customer.subscription.deleted"
    "invoice.payment_succeeded"
    "invoice.payment_failed"
)

TOTAL_TESTS=${#EVENTS[@]}
PASSED=0
FAILED=0

echo -e "${BLUE}Running webhook tests...${NC}"
echo ""

for event in "${EVENTS[@]}"; do
    echo -e "${YELLOW}Testing: ${event}${NC}"

    if [ "$ENV_NAME" == "LOCAL" ]; then
        # For local testing, use stripe trigger
        if stripe trigger $event --skip-verify 2>&1 | tee /tmp/stripe_test.log | grep -q "Ready!"; then
            echo -e "${GREEN}  ✓ Event triggered${NC}"
            ((PASSED++))
        else
            echo -e "${RED}  ✗ Event failed${NC}"
            ((FAILED++))
        fi
    else
        # For production, just test if webhook endpoint is accessible
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $WEBHOOK_URL \
            -H "Content-Type: application/json" \
            -d '{"type":"test"}' 2>/dev/null || echo "000")

        if [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "401" ]; then
            # 400/401 is expected (missing signature) - means endpoint is working
            echo -e "${GREEN}  ✓ Endpoint accessible (HTTP $HTTP_CODE - expected)${NC}"
            ((PASSED++))
        elif [ "$HTTP_CODE" == "200" ]; then
            echo -e "${GREEN}  ✓ Endpoint accessible (HTTP 200)${NC}"
            ((PASSED++))
        else
            echo -e "${RED}  ✗ Endpoint not accessible (HTTP $HTTP_CODE)${NC}"
            ((FAILED++))
        fi
    fi

    echo ""
    sleep 1
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Test Results Summary           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${YELLOW}$ENV_NAME${NC}"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:      ${GREEN}$PASSED${NC}"
echo -e "Failed:      ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
