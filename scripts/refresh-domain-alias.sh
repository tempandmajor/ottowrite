#!/usr/bin/env bash

# Refresh the Vercel custom-domain alias so the latest deployment is served.
# Usage:
#   export VERCEL_DEPLOYMENT_URL="https://your-deployment.vercel.app"
#   ./scripts/refresh-domain-alias.sh www.ottowrite.app
#
# Requirements:
#   - Vercel CLI (`npm i -g vercel`)
#   - Logged in (`vercel login`)
#   - Project already linked locally (`vercel link`)

set -euo pipefail

if [ -z "${VERCEL_DEPLOYMENT_URL:-}" ]; then
  echo "ERROR: VERCEL_DEPLOYMENT_URL is not set."
  echo "Set it to the target deployment URL, e.g."
  echo "  export VERCEL_DEPLOYMENT_URL=\"https://ottowrite-xxxx.vercel.app\""
  exit 1
fi

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

echo "Refreshing alias for $DOMAIN -> $VERCEL_DEPLOYMENT_URL"

echo "Removing existing alias (if present)..."
vercel alias rm "$DOMAIN" --yes || true

echo "Setting alias..."
vercel alias set "$VERCEL_DEPLOYMENT_URL" "$DOMAIN"

echo "Alias refreshed. Verify with:"
echo "  curl -I https://$DOMAIN/dashboard"
