-- Add routing metadata columns to ai_requests for observability

BEGIN;

ALTER TABLE public.ai_requests
  ADD COLUMN IF NOT EXISTS routing_metadata JSONB,
  ADD COLUMN IF NOT EXISTS context_tokens JSONB,
  ADD COLUMN IF NOT EXISTS context_warnings TEXT[];

CREATE INDEX IF NOT EXISTS idx_ai_requests_routing_model
  ON public.ai_requests ((routing_metadata ->> 'model'));

COMMIT;
