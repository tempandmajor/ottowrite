#!/bin/bash

# Sentry Environment Variables Setup Script
# This script helps you add Sentry environment variables to Vercel
#
# Prerequisites:
# 1. Install Vercel CLI: npm i -g vercel
# 2. Login to Vercel: vercel login
# 3. Have your Sentry credentials ready

set -e

echo "🔐 Sentry Production Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI found${NC}"
echo ""

# Prompt for Sentry credentials
echo "Please enter your Sentry credentials:"
echo "-------------------------------------"
echo ""

read -p "Sentry DSN (https://...@...ingest.sentry.io/...): " SENTRY_DSN
read -p "Sentry Organization Slug: " SENTRY_ORG
read -p "Sentry Project Slug (default: ottowrite): " SENTRY_PROJECT
SENTRY_PROJECT=${SENTRY_PROJECT:-ottowrite}
read -p "Sentry Auth Token (sntrys_...): " SENTRY_AUTH_TOKEN

echo ""
echo -e "${YELLOW}📝 Summary of values to add:${NC}"
echo "-------------------------------------"
echo "NEXT_PUBLIC_SENTRY_DSN: $SENTRY_DSN"
echo "SENTRY_ORG: $SENTRY_ORG"
echo "SENTRY_PROJECT: $SENTRY_PROJECT"
echo "SENTRY_AUTH_TOKEN: $SENTRY_AUTH_TOKEN"
echo "NEXT_PUBLIC_SENTRY_ENVIRONMENT: production"
echo ""

read -p "Are these values correct? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo -e "${RED}Cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Adding environment variables to Vercel...${NC}"
echo ""

# Add environment variables
vercel env add NEXT_PUBLIC_SENTRY_DSN production <<EOF
$SENTRY_DSN
EOF

vercel env add SENTRY_ORG production <<EOF
$SENTRY_ORG
EOF

vercel env add SENTRY_PROJECT production <<EOF
$SENTRY_PROJECT
EOF

vercel env add SENTRY_AUTH_TOKEN production <<EOF
$SENTRY_AUTH_TOKEN
EOF

vercel env add NEXT_PUBLIC_SENTRY_ENVIRONMENT production <<EOF
production
EOF

echo ""
echo -e "${GREEN}✅ Environment variables added successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Trigger a new deployment: vercel --prod"
echo "2. Test error capture (see docs/SENTRY_PRODUCTION_SETUP.md)"
echo "3. Set up alert rules in Sentry dashboard"
echo ""
echo "Documentation: docs/SENTRY_PRODUCTION_SETUP.md"
