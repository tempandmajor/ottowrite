-- Add order_index column to location_events for drag-and-drop timeline reordering
-- FEATURE-023: Location-Event Relationships UI

ALTER TABLE public.location_events
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_location_events_order
ON public.location_events(location_id, order_index);

-- Add comment
COMMENT ON COLUMN public.location_events.order_index IS 'Custom sort order for timeline display (0-based index)';
