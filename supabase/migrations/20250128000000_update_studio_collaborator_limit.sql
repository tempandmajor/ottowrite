-- Update Studio collaborator slots from 10 to 5
-- Ticket: FIX-4 - Implement Team Seat Limit Enforcement
-- Studio plan includes 5 team seats

BEGIN;

UPDATE public.subscription_plan_limits
SET collaborator_slots = 5
WHERE plan = 'studio';

COMMIT;
