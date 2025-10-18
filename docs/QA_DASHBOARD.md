# Dashboard QA Notes

_Date_: October 18, 2025  
_Owner_: Codex (GPT-5)

## Scenario Checklist

### 1. Unauthenticated Visit
- **Action**: Open `/dashboard` without a valid Supabase session.
- **Expectation**: Supabase auth returns no user; layout/page redirect to `/auth/login`.
- **Result**: ✅ Verified after adding guards in `app/dashboard/layout.tsx` and `app/dashboard/page.tsx`.

### 2. Supabase Error Handling
- **Action**: Temporarily revoke Supabase anon key or simulate network failure.
- **Expectation**: Client loader logs error, keeps dashboard stable (loading false) without crashing.
- **Result**: ⚠️ Manual verification pending; console logging in place for future debugging.

### 3. Authenticated Load
- **Action**: Log in and visit `/dashboard`.
- **Expectation**: Stats render safely even if tables return empty sets; no thrown errors on missing data.
- **Result**: ✅ Confirmed with latest deployment.
