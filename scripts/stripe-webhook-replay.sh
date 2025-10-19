#!/usr/bin/env bash

set -euo pipefail

EVENT_NAME=${1:-"checkout.session.completed"}

if ! command -v stripe >/dev/null 2>&1; then
  echo "stripe CLI not found. Install it from https://stripe.com/docs/stripe-cli before running this script." >&2
  exit 1
fi

ENV_FILE=${STRIPE_ENV_FILE:-".env.local"}

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file $ENV_FILE not found. Provide STRIPE_ENV_FILE or create .env.local." >&2
  exit 1
fi

echo "Replaying Stripe event: $EVENT_NAME"
stripe trigger "$EVENT_NAME" --env-file "$ENV_FILE"
