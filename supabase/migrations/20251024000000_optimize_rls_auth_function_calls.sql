-- Migration: Optimize RLS Auth Function Calls for Performance
-- Generated: 2025-10-24
--
-- Fixes 425 performance warnings by wrapping auth function calls in SELECT subqueries
-- This prevents PostgreSQL from re-evaluating auth.uid() and auth.jwt() for every row
--
-- Performance Impact:
-- - Before: auth.uid() evaluated N times (once per row)
-- - After: (select auth.uid()) evaluated once and cached
--
-- Affects 245 policies across 85 tables
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_rls_init_plan

-- ============================================================================
-- OPTIMIZATION STRATEGY
-- ============================================================================
-- We cannot ALTER a policy's qual or with_check directly in PostgreSQL
-- We must DROP and CREATE each policy with the optimized expression
--
-- Pattern replacements:
-- 1. auth.uid() → (select auth.uid())
-- 2. auth.jwt() → (select auth.jwt())
--
-- This applies to both qual (WHERE clause) and with_check (CHECK clause)
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
  new_qual text;
  new_with_check text;
  create_policy_sql text;
  policies_optimized integer := 0;
BEGIN
  RAISE NOTICE 'Starting RLS policy optimization...';
  RAISE NOTICE 'This will optimize 245 policies to improve query performance';
  RAISE NOTICE '';

  -- Loop through all policies that need optimization
  FOR policy_record IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.cmd,
      p.permissive,
      p.roles,
      p.qual::text as qual_text,
      p.with_check::text as with_check_text
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.qual::text LIKE '%auth.uid()%' AND p.qual::text NOT LIKE '%(select auth.uid())%')
        OR
        (p.qual::text LIKE '%auth.jwt()%' AND p.qual::text NOT LIKE '%(select auth.jwt())%')
        OR
        (p.with_check::text LIKE '%auth.uid()%' AND p.with_check::text NOT LIKE '%(select auth.uid())%')
        OR
        (p.with_check::text LIKE '%auth.jwt()%' AND p.with_check::text NOT LIKE '%(select auth.jwt())%')
      )
    ORDER BY p.tablename, p.policyname
  LOOP
    -- Optimize qual (WHERE clause)
    IF policy_record.qual_text IS NOT NULL THEN
      new_qual := policy_record.qual_text;
      -- Replace auth.uid() with (select auth.uid())
      new_qual := REPLACE(new_qual, 'auth.uid()', '(select auth.uid())');
      -- Replace auth.jwt() with (select auth.jwt())
      new_qual := REPLACE(new_qual, 'auth.jwt()', '(select auth.jwt())');
    ELSE
      new_qual := NULL;
    END IF;

    -- Optimize with_check (CHECK clause)
    IF policy_record.with_check_text IS NOT NULL THEN
      new_with_check := policy_record.with_check_text;
      -- Replace auth.uid() with (select auth.uid())
      new_with_check := REPLACE(new_with_check, 'auth.uid()', '(select auth.uid())');
      -- Replace auth.jwt() with (select auth.jwt())
      new_with_check := REPLACE(new_with_check, 'auth.jwt()', '(select auth.jwt())');
    ELSE
      new_with_check := NULL;
    END IF;

    -- Drop the existing policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );

    -- Recreate the policy with optimized expressions
    create_policy_sql := format('CREATE POLICY %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );

    -- Add AS clause (PERMISSIVE or RESTRICTIVE)
    IF policy_record.permissive = 'PERMISSIVE' THEN
      create_policy_sql := create_policy_sql || ' AS PERMISSIVE';
    ELSE
      create_policy_sql := create_policy_sql || ' AS RESTRICTIVE';
    END IF;

    -- Add FOR clause (SELECT, INSERT, UPDATE, DELETE, or ALL)
    create_policy_sql := create_policy_sql || format(' FOR %s', policy_record.cmd);

    -- Add TO clause (roles)
    create_policy_sql := create_policy_sql || format(' TO %s',
      (SELECT string_agg(quote_ident(r), ', ') FROM unnest(policy_record.roles) AS r)
    );

    -- Add USING clause (qual) if present
    IF new_qual IS NOT NULL THEN
      create_policy_sql := create_policy_sql || format(' USING (%s)', new_qual);
    END IF;

    -- Add WITH CHECK clause if present
    IF new_with_check IS NOT NULL THEN
      create_policy_sql := create_policy_sql || format(' WITH CHECK (%s)', new_with_check);
    END IF;

    -- Execute the CREATE POLICY statement
    EXECUTE create_policy_sql;

    policies_optimized := policies_optimized + 1;

    -- Log progress every 50 policies
    IF policies_optimized % 50 = 0 THEN
      RAISE NOTICE 'Optimized % policies...', policies_optimized;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✓ Successfully optimized % policies', policies_optimized;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify no policies remain with unoptimized auth function calls
DO $$
DECLARE
  remaining_issues integer;
BEGIN
  SELECT COUNT(*) INTO remaining_issues
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(select auth.uid())%')
      OR
      (qual::text LIKE '%auth.jwt()%' AND qual::text NOT LIKE '%(select auth.jwt())%')
      OR
      (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(select auth.uid())%')
      OR
      (with_check::text LIKE '%auth.jwt()%' AND with_check::text NOT LIKE '%(select auth.jwt())%')
    );

  IF remaining_issues > 0 THEN
    RAISE WARNING '% policies still need optimization', remaining_issues;
  ELSE
    RAISE NOTICE '✓ All RLS policies optimized! No remaining performance issues.';
  END IF;
END $$;

-- ============================================================================
-- PERFORMANCE TEST QUERY
-- ============================================================================
-- After migration, this query should show 0 policies with direct auth calls

-- SELECT
--   COUNT(*) as optimized_policies,
--   COUNT(*) FILTER (WHERE qual::text LIKE '%(select auth.uid())%') as qual_optimized,
--   COUNT(*) FILTER (WHERE with_check::text LIKE '%(select auth.uid())%') as with_check_optimized
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual::text LIKE '%auth.uid%' OR with_check::text LIKE '%auth.uid%');
