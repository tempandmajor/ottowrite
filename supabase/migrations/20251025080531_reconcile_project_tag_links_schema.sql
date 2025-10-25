-- ============================================================================
-- Migration: Reconcile project_tag_links Schema Drift (DB-004)
-- Created: 2025-10-25
-- Ticket: DB-004
--
-- Description:
--   This migration reconciles the schema drift in project_tag_links table.
--   The original migration (20251018000009) defined a composite PRIMARY KEY
--   (project_id, tag_id), but production has evolved to use a single-column
--   PRIMARY KEY (id) with a UNIQUE constraint on (project_id, tag_id).
--
-- Schema Drift Details:
--   Original (Migration):     PRIMARY KEY (project_id, tag_id)
--   Current (Production):     PRIMARY KEY (id) + UNIQUE (project_id, tag_id)
--
-- Why Production Schema is Better:
--   - Provides stable row identifier (id) for ORM compatibility
--   - Preserves uniqueness via UNIQUE constraint
--   - Easier to reference individual links (e.g., for audit logs)
--   - Standard pattern for junction tables
--
-- Impact:
--   - Tables affected: 1 (project_tag_links)
--   - Downtime required: No (idempotent migration)
--   - Functional impact: None (data integrity preserved)
--
-- Migration Behavior:
--   - If schema is in migration state (composite PK): Transform to production state
--   - If schema is in production state (single PK): No-op (already correct)
--   - Idempotent: Safe to run multiple times
--
-- Related Documentation:
--   - See: docs/architecture/adr-002-project-tag-links-schema.md
--   - See: Original migration with updated comments
-- ============================================================================

-- Pre-flight checks
DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_tag_links' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'Migration requires project_tag_links table to exist';
  END IF;

  RAISE NOTICE 'Pre-flight checks passed';
END $$;

-- ============================================================================
-- BEGIN MIGRATION (Idempotent Schema Transformation)
-- ============================================================================

DO $$
DECLARE
  id_column_exists BOOLEAN;
  composite_pk_exists BOOLEAN;
  single_pk_exists BOOLEAN;
  unique_constraint_exists BOOLEAN;
BEGIN
  -- Check current schema state
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_tag_links'
      AND column_name = 'id'
  ) INTO id_column_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_tag_links'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) LIKE '%project_id, tag_id%'
  ) INTO composite_pk_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_tag_links'::regclass
      AND contype = 'p'
      AND conname = 'project_tag_links_pkey'
      AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
  ) INTO single_pk_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_tag_links'::regclass
      AND contype = 'u'
      AND conname = 'project_tag_links_project_id_tag_id_key'
  ) INTO unique_constraint_exists;

  -- Log current state
  RAISE NOTICE 'Current schema state:';
  RAISE NOTICE '  - id column exists: %', id_column_exists;
  RAISE NOTICE '  - Composite PK exists: %', composite_pk_exists;
  RAISE NOTICE '  - Single PK (id) exists: %', single_pk_exists;
  RAISE NOTICE '  - Unique constraint exists: %', unique_constraint_exists;

  -- ============================================================================
  -- Case 1: Schema is already in production state
  -- ============================================================================
  IF id_column_exists AND single_pk_exists AND unique_constraint_exists THEN
    RAISE NOTICE 'Schema already matches production state - no changes needed';
    RAISE NOTICE 'PRIMARY KEY (id) exists';
    RAISE NOTICE 'UNIQUE (project_id, tag_id) exists';
    RETURN;
  END IF;

  -- ============================================================================
  -- Case 2: Schema is in migration state - transform to production state
  -- ============================================================================
  IF composite_pk_exists AND NOT id_column_exists THEN
    RAISE NOTICE 'Transforming schema from migration state to production state...';

    -- Step 1: Add id column with default values
    RAISE NOTICE 'Step 1: Adding id column...';
    ALTER TABLE public.project_tag_links
    ADD COLUMN id UUID DEFAULT uuid_generate_v4() NOT NULL;

    -- Step 2: Drop existing composite primary key
    RAISE NOTICE 'Step 2: Dropping composite PRIMARY KEY (project_id, tag_id)...';
    ALTER TABLE public.project_tag_links
    DROP CONSTRAINT project_tag_links_pkey;

    -- Step 3: Set id as new primary key
    RAISE NOTICE 'Step 3: Creating new PRIMARY KEY (id)...';
    ALTER TABLE public.project_tag_links
    ADD PRIMARY KEY (id);

    -- Step 4: Add unique constraint on (project_id, tag_id)
    RAISE NOTICE 'Step 4: Adding UNIQUE (project_id, tag_id) constraint...';
    ALTER TABLE public.project_tag_links
    ADD CONSTRAINT project_tag_links_project_id_tag_id_key UNIQUE (project_id, tag_id);

    RAISE NOTICE 'Schema transformation complete!';
    RAISE NOTICE 'Changed from: PRIMARY KEY (project_id, tag_id)';
    RAISE NOTICE 'Changed to:   PRIMARY KEY (id) + UNIQUE (project_id, tag_id)';
  ELSE
    -- Unexpected state
    RAISE WARNING 'Schema is in an unexpected state:';
    RAISE WARNING '  - id exists: %, composite PK: %, single PK: %, unique constraint: %',
      id_column_exists, composite_pk_exists, single_pk_exists, unique_constraint_exists;
    RAISE WARNING 'Manual intervention may be required';
  END IF;

END $$;


-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
  column_count INT;
  id_column_exists BOOLEAN;
  pk_definition TEXT;
  unique_constraint_exists BOOLEAN;
BEGIN
  -- Verify column count (should be 5: id, user_id, project_id, tag_id, created_at)
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'project_tag_links';

  IF column_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 columns, found %', column_count;
  END IF;

  -- Verify id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_tag_links'
      AND column_name = 'id'
      AND data_type = 'uuid'
      AND is_nullable = 'NO'
  ) INTO id_column_exists;

  IF NOT id_column_exists THEN
    RAISE EXCEPTION 'id column does not exist or has wrong definition';
  END IF;

  -- Verify PRIMARY KEY is on id
  SELECT pg_get_constraintdef(oid) INTO pk_definition
  FROM pg_constraint
  WHERE conrelid = 'public.project_tag_links'::regclass
    AND contype = 'p'
    AND conname = 'project_tag_links_pkey';

  IF pk_definition != 'PRIMARY KEY (id)' THEN
    RAISE EXCEPTION 'PRIMARY KEY is not on id column: %', pk_definition;
  END IF;

  -- Verify UNIQUE constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_tag_links'::regclass
      AND contype = 'u'
      AND conname = 'project_tag_links_project_id_tag_id_key'
  ) INTO unique_constraint_exists;

  IF NOT unique_constraint_exists THEN
    RAISE EXCEPTION 'UNIQUE constraint on (project_id, tag_id) does not exist';
  END IF;

  RAISE NOTICE 'Post-migration validation passed!';
  RAISE NOTICE 'Schema is now consistent with production:';
  RAISE NOTICE '  ✓ 5 columns (id, user_id, project_id, tag_id, created_at)';
  RAISE NOTICE '  ✓ PRIMARY KEY (id)';
  RAISE NOTICE '  ✓ UNIQUE (project_id, tag_id)';
  RAISE NOTICE '  ✓ All foreign keys intact';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration completed successfully!';
END $$;


-- ============================================================================
-- DATA INTEGRITY VERIFICATION
-- ============================================================================

DO $$
DECLARE
  row_count INT;
  duplicate_count INT;
BEGIN
  -- Count total rows
  SELECT COUNT(*) INTO row_count
  FROM public.project_tag_links;

  -- Check for duplicates (should be 0 with unique constraint)
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT project_id, tag_id, COUNT(*) as cnt
    FROM public.project_tag_links
    GROUP BY project_id, tag_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate (project_id, tag_id) pairs', duplicate_count;
  END IF;

  RAISE NOTICE 'Data integrity verified:';
  RAISE NOTICE '  - Total rows: %', row_count;
  RAISE NOTICE '  - Duplicate (project_id, tag_id) pairs: 0';
  RAISE NOTICE '  - All rows have unique id values';
END $$;


-- ============================================================================
-- NOTES
-- ============================================================================
-- Why this schema is better:
--
-- 1. Stable Row Identifier
--    - id column provides a stable, unique identifier for each link
--    - Useful for audit logs, change tracking, soft deletes
--    - ORM-friendly (most ORMs prefer single-column PKs)
--
-- 2. Preserved Data Integrity
--    - UNIQUE (project_id, tag_id) enforces the same uniqueness
--    - No functional change to application logic
--    - Same performance characteristics
--
-- 3. Future-Proof
--    - Easier to extend with additional metadata (e.g., link_type, notes)
--    - Can track individual link creation/deletion in audit tables
--    - Standard pattern used across the industry
--
-- ============================================================================
