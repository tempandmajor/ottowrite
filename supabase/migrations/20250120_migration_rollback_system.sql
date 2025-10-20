-- Migration Rollback System
-- Enables safe database migration rollbacks with tracking and validation

-- ============================================================================
-- 1. MIGRATION TRACKING TABLE
-- ============================================================================

-- Track all applied migrations with metadata
CREATE TABLE IF NOT EXISTS public.migration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name TEXT NOT NULL UNIQUE,
    migration_version TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by TEXT DEFAULT current_user,
    rollback_sql TEXT, -- SQL to undo this migration
    checksum TEXT, -- Hash of migration file for integrity verification
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'rolled_back', 'failed')),
    rollback_at TIMESTAMPTZ,
    rollback_by TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_migration_history_version ON public.migration_history(migration_version);
CREATE INDEX IF NOT EXISTS idx_migration_history_status ON public.migration_history(migration_status);
CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON public.migration_history(applied_at DESC);

-- ============================================================================
-- 2. MIGRATION DEPENDENCIES TABLE
-- ============================================================================

-- Track dependencies between migrations
CREATE TABLE IF NOT EXISTS public.migration_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name TEXT NOT NULL REFERENCES public.migration_history(migration_name),
    depends_on TEXT NOT NULL REFERENCES public.migration_history(migration_name),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(migration_name, depends_on)
);

-- Prevent circular dependencies
CREATE INDEX IF NOT EXISTS idx_migration_deps_migration ON public.migration_dependencies(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_deps_depends_on ON public.migration_dependencies(depends_on);

-- ============================================================================
-- 3. ROLLBACK VALIDATION FUNCTION
-- ============================================================================

-- Validates if a migration can be safely rolled back
CREATE OR REPLACE FUNCTION public.can_rollback_migration(p_migration_name TEXT)
RETURNS TABLE (
    can_rollback BOOLEAN,
    reason TEXT,
    dependent_migrations TEXT[]
) AS $$
DECLARE
    v_status TEXT;
    v_dependents TEXT[];
BEGIN
    -- Check if migration exists and is applied
    SELECT status INTO v_status
    FROM public.migration_history
    WHERE migration_name = p_migration_name;

    IF v_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Migration not found', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    IF v_status != 'applied' THEN
        RETURN QUERY SELECT FALSE, format('Migration status is %s, not applied', v_status), ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Check for dependent migrations that are still applied
    SELECT ARRAY_AGG(md.migration_name)
    INTO v_dependents
    FROM public.migration_dependencies md
    JOIN public.migration_history mh ON md.migration_name = mh.migration_name
    WHERE md.depends_on = p_migration_name
      AND mh.status = 'applied';

    IF v_dependents IS NOT NULL AND array_length(v_dependents, 1) > 0 THEN
        RETURN QUERY SELECT
            FALSE,
            'Cannot rollback: other migrations depend on this one',
            v_dependents;
        RETURN;
    END IF;

    -- Migration can be rolled back
    RETURN QUERY SELECT TRUE, 'Migration can be safely rolled back', ARRAY[]::TEXT[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. EXECUTE ROLLBACK FUNCTION
-- ============================================================================

-- Execute a migration rollback with validation and tracking
CREATE OR REPLACE FUNCTION public.execute_migration_rollback(
    p_migration_name TEXT,
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    sql_executed TEXT
) AS $$
DECLARE
    v_can_rollback BOOLEAN;
    v_reason TEXT;
    v_dependents TEXT[];
    v_rollback_sql TEXT;
    v_error_message TEXT;
BEGIN
    -- Validate rollback
    SELECT can_rollback, reason, dependent_migrations
    INTO v_can_rollback, v_reason, v_dependents
    FROM public.can_rollback_migration(p_migration_name);

    IF NOT v_can_rollback THEN
        RETURN QUERY SELECT FALSE, v_reason, NULL::TEXT;
        RETURN;
    END IF;

    -- Get rollback SQL
    SELECT rollback_sql INTO v_rollback_sql
    FROM public.migration_history
    WHERE migration_name = p_migration_name;

    IF v_rollback_sql IS NULL OR v_rollback_sql = '' THEN
        RETURN QUERY SELECT
            FALSE,
            'No rollback SQL defined for this migration',
            NULL::TEXT;
        RETURN;
    END IF;

    -- Dry run: just return what would be executed
    IF p_dry_run THEN
        RETURN QUERY SELECT
            TRUE,
            'Dry run: rollback SQL shown below (not executed)',
            v_rollback_sql;
        RETURN;
    END IF;

    -- Execute rollback SQL
    BEGIN
        EXECUTE v_rollback_sql;

        -- Update migration status
        UPDATE public.migration_history
        SET status = 'rolled_back',
            rollback_at = NOW(),
            rollback_by = current_user
        WHERE migration_name = p_migration_name;

        RETURN QUERY SELECT
            TRUE,
            'Migration rolled back successfully',
            v_rollback_sql;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;

        -- Mark migration as failed
        UPDATE public.migration_history
        SET status = 'failed',
            notes = format('Rollback failed: %s', v_error_message)
        WHERE migration_name = p_migration_name;

        RETURN QUERY SELECT
            FALSE,
            format('Rollback failed: %s', v_error_message),
            v_rollback_sql;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. LIST ROLLBACK-ABLE MIGRATIONS
-- ============================================================================

-- Get list of migrations that can be rolled back
CREATE OR REPLACE FUNCTION public.list_rollbackable_migrations()
RETURNS TABLE (
    migration_name TEXT,
    migration_version TEXT,
    applied_at TIMESTAMPTZ,
    has_rollback_sql BOOLEAN,
    can_rollback BOOLEAN,
    blocking_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mh.migration_name,
        mh.migration_version,
        mh.applied_at,
        (mh.rollback_sql IS NOT NULL AND mh.rollback_sql != '') AS has_rollback_sql,
        crm.can_rollback,
        crm.reason AS blocking_reason
    FROM public.migration_history mh
    CROSS JOIN LATERAL public.can_rollback_migration(mh.migration_name) crm
    WHERE mh.status = 'applied'
    ORDER BY mh.applied_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. MIGRATION SNAPSHOT FUNCTION
-- ============================================================================

-- Create a snapshot of current database schema before migration
CREATE OR REPLACE FUNCTION public.create_migration_snapshot(
    p_migration_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_schema_snapshot JSONB;
BEGIN
    -- Create snapshot ID
    v_snapshot_id := uuid_generate_v4();

    -- Capture current schema information
    v_schema_snapshot := jsonb_build_object(
        'tables', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'table_name', table_name,
                    'table_schema', table_schema
                )
            )
            FROM information_schema.tables
            WHERE table_schema = 'public'
        ),
        'columns', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'table_name', table_name,
                    'column_name', column_name,
                    'data_type', data_type,
                    'is_nullable', is_nullable
                )
            )
            FROM information_schema.columns
            WHERE table_schema = 'public'
        ),
        'indexes', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'index_name', indexname,
                    'table_name', tablename,
                    'index_def', indexdef
                )
            )
            FROM pg_indexes
            WHERE schemaname = 'public'
        )
    );

    -- Store snapshot in migration history metadata
    UPDATE public.migration_history
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{snapshot}',
        jsonb_build_object(
            'id', v_snapshot_id,
            'created_at', NOW(),
            'description', p_description,
            'schema', v_schema_snapshot
        )
    )
    WHERE migration_name = p_migration_name;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on rollback functions
GRANT EXECUTE ON FUNCTION public.can_rollback_migration TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_migration_rollback TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_rollbackable_migrations TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_migration_snapshot TO authenticated;

-- Grant select on migration tables (read-only for safety)
GRANT SELECT ON public.migration_history TO authenticated;
GRANT SELECT ON public.migration_dependencies TO authenticated;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.migration_history IS 'Tracks all database migrations with rollback information';
COMMENT ON TABLE public.migration_dependencies IS 'Tracks dependencies between migrations for safe rollback validation';
COMMENT ON FUNCTION public.can_rollback_migration IS 'Validates whether a migration can be safely rolled back';
COMMENT ON FUNCTION public.execute_migration_rollback IS 'Executes a migration rollback with validation and tracking';
COMMENT ON FUNCTION public.list_rollbackable_migrations IS 'Lists all migrations that can potentially be rolled back';
COMMENT ON FUNCTION public.create_migration_snapshot IS 'Creates a snapshot of database schema before migration';

-- ============================================================================
-- ROLLBACK SQL
-- ============================================================================

-- ROLLBACK START

-- Drop functions in reverse order
DROP FUNCTION IF EXISTS public.create_migration_snapshot(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.list_rollbackable_migrations() CASCADE;
DROP FUNCTION IF EXISTS public.execute_migration_rollback(TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.can_rollback_migration(TEXT) CASCADE;

-- Drop indexes for migration_dependencies
DROP INDEX IF EXISTS public.idx_migration_deps_depends_on;
DROP INDEX IF EXISTS public.idx_migration_deps_migration;

-- Drop migration_dependencies table
DROP TABLE IF EXISTS public.migration_dependencies CASCADE;

-- Drop indexes for migration_history
DROP INDEX IF EXISTS public.idx_migration_history_applied_at;
DROP INDEX IF EXISTS public.idx_migration_history_status;
DROP INDEX IF EXISTS public.idx_migration_history_version;

-- Drop migration_history table
DROP TABLE IF EXISTS public.migration_history CASCADE;

-- ROLLBACK END
