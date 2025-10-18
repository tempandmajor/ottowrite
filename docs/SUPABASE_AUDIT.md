# Supabase Audit Notes

_Date_: October 18, 2025  
_Owner_: Codex (GPT-5)

## Environment Configuration
- **Public keys**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (used by middleware, server, and browser clients). Missing or newline‑padded values cause Supabase to throw “Invalid supabaseUrl”.  
- **Service role**: `SUPABASE_SERVICE_ROLE_KEY` needed for scripts/backfills. Current repo trims env values before passing to the client helpers.
- Local dev currently has no supabase env vars; developers must copy the values from Vercel (`VERCEL_ENV_VARS.md`).

## Client Entry Points
- `middleware.ts`: refreshes sessions; now skips gracefully when env vars missing.
- `lib/supabase/server.ts`: used in server components/layouts; throws if env vars absent.
- `lib/supabase/client.ts`: browser client; throws if public env vars absent.
- `lib/supabase/service-role.ts`: service-role client; requires trimmed service key.

## Recommended Checks
1. Verify env vars on Vercel don’t contain trailing whitespace.
2. Ensure Supabase table policies (`supabase/migrations`) match current app expectations (especially `documents`, `projects`, `ai_usage`).
3. Consider adding health-check endpoint to confirm Supabase availability before deployments.
