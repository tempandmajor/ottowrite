#!/usr/bin/env bash

set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it from https://supabase.com/docs/guides/cli before running this script." >&2
  exit 1
fi

echo "Running Supabase migration dry run..."
supabase db push --dry-run

echo
echo "Checking migration formatting..."
supabase db lint

echo
echo "Supabase smoke test completed."
