-- ============================================================================
-- Migration: [Short descriptive title - e.g., "Add user preferences table"]
-- Created: YYYY-MM-DD
-- Author: [Your name or GitHub username]
-- Ticket: [DB-XXX, JIRA-123, or GitHub issue #123]
--
-- Description:
--   [2-3 sentences describing what this migration does and why it's needed.
--   Be specific about the business requirement or technical improvement.]
--
-- Changes:
--   - [Specific change 1 - e.g., "CREATE TABLE user_preferences"]
--   - [Specific change 2 - e.g., "ADD INDEX idx_users_email"]
--   - [Specific change 3 - e.g., "CREATE RLS policy for user isolation"]
--
-- Impact:
--   - Tables affected: [list tables - e.g., "users, user_preferences"]
--   - Estimated rows affected: [number or "N/A for new table"]
--   - Downtime required: [yes/no - use CONCURRENTLY for indexes if no]
--   - Rollback available: [yes/no - see Rollback section below]
--
-- Testing:
--   - Run locally: npx supabase db reset
--   - Verify: [specific checks - e.g., "table exists, RLS enabled"]
--   - Test queries: [example queries that should work]
--
-- Rollback:
--   - [Instructions for manual rollback if needed]
--   - [Or reference to down migration file]
--   - [Specify any data loss risks]
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================
-- Verify prerequisites before running migration
-- This helps catch issues early and provides clear error messages

DO $$
BEGIN
  -- Example: Check if required table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'required_table'
      AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Migration requires required_table to exist. Run migration YYYYMMDDHHMMSS first.';
  END IF;

  -- Example: Check if required column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'existing_table'
      AND column_name = 'required_column'
  ) THEN
    RAISE EXCEPTION 'Migration requires existing_table.required_column to exist';
  END IF;

  -- Example: Check if extension is available
  IF NOT EXISTS (
    SELECT 1 FROM pg_available_extensions
    WHERE name = 'uuid-ossp'
  ) THEN
    RAISE EXCEPTION 'Migration requires uuid-ossp extension';
  END IF;

  RAISE NOTICE 'Pre-flight checks passed';
END $$;


-- ============================================================================
-- BEGIN MIGRATION
-- ============================================================================

-- Example: Create new table
CREATE TABLE IF NOT EXISTS public.example_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example: Create index (use CONCURRENTLY for zero-downtime)
-- Note: CONCURRENTLY cannot be used inside a transaction block
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_example_user_id
-- ON public.example_table(user_id);

-- Example: Add RLS
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own data"
ON public.example_table
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Example: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_example_table_updated_at
  BEFORE UPDATE ON public.example_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================
-- Verify the migration completed successfully
-- This helps catch issues immediately rather than later in production

DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  policy_count INT;
BEGIN
  -- Verify table was created
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'example_table'
      AND schemaname = 'public'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Migration failed: example_table was not created';
  END IF;

  -- Verify RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'example_table'
    AND relnamespace = 'public'::regnamespace;

  IF NOT rls_enabled THEN
    RAISE WARNING 'RLS is not enabled on example_table';
  END IF;

  -- Verify policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'example_table'
    AND schemaname = 'public';

  IF policy_count = 0 THEN
    RAISE WARNING 'No RLS policies found for example_table';
  END IF;

  -- Verify column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'example_table'
      AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: user_id column not found';
  END IF;

  RAISE NOTICE 'Post-migration validation passed';
  RAISE NOTICE 'Created example_table with RLS enabled';
  RAISE NOTICE 'Created % RLS policies', policy_count;
  RAISE NOTICE 'Migration completed successfully';
END $$;


-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- -- Drop table and all dependent objects
-- DROP TABLE IF EXISTS public.example_table CASCADE;
--
-- -- Drop trigger function if not used elsewhere
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
--
-- -- Verify cleanup
-- SELECT COUNT(*) FROM pg_tables WHERE tablename = 'example_table';
-- -- Should return 0
-- ============================================================================


-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
-- Examples of how to use the new schema
--
-- -- Insert a record
-- INSERT INTO public.example_table (user_id, name, description)
-- VALUES (auth.uid(), 'Example', 'Example description');
--
-- -- Query user's records
-- SELECT * FROM public.example_table
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;
--
-- -- Update a record
-- UPDATE public.example_table
-- SET name = 'Updated name'
-- WHERE id = 'some-uuid'
--   AND user_id = auth.uid();
--
-- -- Delete a record
-- DELETE FROM public.example_table
-- WHERE id = 'some-uuid'
--   AND user_id = auth.uid();
-- ============================================================================


-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- Expected performance characteristics:
--
-- - Index overhead: ~X MB per 10,000 rows
-- - Query time: <10ms for user_id lookups
-- - Write time: <5ms per INSERT
--
-- Monitor using:
-- SELECT * FROM pg_stat_user_tables WHERE relname = 'example_table';
-- SELECT * FROM pg_stat_user_indexes WHERE relname LIKE 'example%';
-- ============================================================================
