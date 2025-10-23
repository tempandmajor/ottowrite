-- Standardize Subscription Naming Convention
-- Ticket: FIX-7 - Standardize Subscription Field Naming
-- Rename subscription_plan_limits to subscription_tier_limits for consistency

BEGIN;

-- Rename the table
ALTER TABLE IF EXISTS public.subscription_plan_limits
    RENAME TO subscription_tier_limits;

-- Rename the primary key column for clarity
ALTER TABLE IF EXISTS public.subscription_tier_limits
    RENAME COLUMN plan TO tier;

-- Update RLS policies if any exist
-- (Currently this table likely doesn't have RLS, but future-proofing)

-- Add comment to document the table
COMMENT ON TABLE public.subscription_tier_limits IS
'Defines limits and features for each subscription tier (free, hobbyist, professional, studio).
Use subscription_tier, not subscription_plan, for consistency.';

COMMENT ON COLUMN public.subscription_tier_limits.tier IS
'Subscription tier: free, hobbyist, professional, or studio';

COMMIT;
