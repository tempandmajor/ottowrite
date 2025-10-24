-- ============================================================================
-- RLS Policy Verification Tests
-- ============================================================================
--
-- This script verifies that Row Level Security (RLS) policies are correctly
-- configured across all tables in the database.
--
-- Run with: psql or via Supabase SQL Editor
-- ============================================================================

\echo '═══════════════════════════════════════════════════'
\echo '        RLS Policy Verification Test Suite'
\echo '═══════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- PART 1: Check that RLS is enabled on all critical tables
-- ============================================================================

\echo '1️⃣  Checking RLS is enabled on critical tables...'
\echo ''

DO $$
DECLARE
  critical_tables text[] := ARRAY[
    'user_profiles',
    'projects',
    'documents',
    'ai_usage',
    'api_requests',
    'manuscript_submissions',
    'partner_submissions',
    'user_legal_agreements',
    'document_versions',
    'project_members',
    'comments',
    'writing_sessions'
  ];
  table_name text;
  rls_enabled boolean;
  missing_rls text[] := ARRAY[]::text[];
BEGIN
  FOREACH table_name IN ARRAY critical_tables
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = table_name;

    IF NOT rls_enabled THEN
      missing_rls := array_append(missing_rls, table_name);
    END IF;
  END LOOP;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE WARNING 'RLS not enabled on: %', array_to_string(missing_rls, ', ');
  ELSE
    RAISE NOTICE '✅ RLS enabled on all critical tables (%/% tables)',
      array_length(critical_tables, 1), array_length(critical_tables, 1);
  END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 2: Count RLS policies by table
-- ============================================================================

\echo '2️⃣  Counting RLS policies by table...'
\echo ''

SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd, ', ' ORDER BY cmd) as operations,
  STRING_AGG(DISTINCT policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles', 'projects', 'documents', 'ai_usage',
    'manuscript_submissions', 'project_members'
  )
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- PART 3: Check for tables with RLS enabled but no policies
-- ============================================================================

\echo '3️⃣  Checking for tables with RLS enabled but no policies...'
\echo ''

DO $$
DECLARE
  orphan_count integer;
  orphan_tables text;
BEGIN
  SELECT
    COUNT(*),
    STRING_AGG(c.relname, ', ')
  INTO orphan_count, orphan_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND p.policyname IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING '⚠️  % tables have RLS enabled but no policies: %', orphan_count, orphan_tables;
  ELSE
    RAISE NOTICE '✅ All tables with RLS have at least one policy';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 4: Verify specific RLS policy patterns
-- ============================================================================

\echo '4️⃣  Verifying common RLS policy patterns...'
\echo ''

-- Check user_profiles has user_id based policies
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND (
      qual::text LIKE '%auth.uid()%' OR
      with_check::text LIKE '%auth.uid()%'
    );

  IF policy_count > 0 THEN
    RAISE NOTICE '✅ user_profiles: Found % policies using auth.uid()', policy_count;
  ELSE
    RAISE WARNING '⚠️  user_profiles: No policies using auth.uid() found';
  END IF;
END $$;

-- Check projects has user_id or project_members based policies
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND (
      qual::text LIKE '%auth.uid()%' OR
      with_check::text LIKE '%auth.uid()%' OR
      qual::text LIKE '%project_members%' OR
      with_check::text LIKE '%project_members%'
    );

  IF policy_count > 0 THEN
    RAISE NOTICE '✅ projects: Found % policies using auth.uid() or project_members', policy_count;
  ELSE
    RAISE WARNING '⚠️  projects: No policies using auth.uid() or project_members found';
  END IF;
END $$;

-- Check documents has project-based access control
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'documents'
    AND (
      qual::text LIKE '%project%' OR
      with_check::text LIKE '%project%' OR
      qual::text LIKE '%user_id%' OR
      with_check::text LIKE '%user_id%'
    );

  IF policy_count > 0 THEN
    RAISE NOTICE '✅ documents: Found % policies using project or user_id checks', policy_count;
  ELSE
    RAISE WARNING '⚠️  documents: No policies using project or user_id checks found';
  END IF;
END $$;

-- Check ai_usage has user-based isolation
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ai_usage'
    AND (
      qual::text LIKE '%auth.uid()%' OR
      with_check::text LIKE '%auth.uid()%' OR
      qual::text LIKE '%user_id%' OR
      with_check::text LIKE '%user_id%'
    );

  IF policy_count > 0 THEN
    RAISE NOTICE '✅ ai_usage: Found % policies using user_id isolation', policy_count;
  ELSE
    RAISE WARNING '⚠️  ai_usage: No policies using user_id isolation found';
  END IF;
END $$;

-- Check manuscript_submissions has user-based isolation
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'manuscript_submissions'
    AND (
      qual::text LIKE '%auth.uid()%' OR
      with_check::text LIKE '%auth.uid()%' OR
      qual::text LIKE '%user_id%' OR
      with_check::text LIKE '%user_id%'
    );

  IF policy_count > 0 THEN
    RAISE NOTICE '✅ manuscript_submissions: Found % policies using user_id isolation', policy_count;
  ELSE
    RAISE WARNING '⚠️  manuscript_submissions: No policies using user_id isolation found';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 5: Check for overly permissive policies
-- ============================================================================

\echo '5️⃣  Checking for overly permissive policies...'
\echo ''

-- Check for policies that allow ALL without restrictions
DO $$
DECLARE
  permissive_count integer;
  permissive_tables text;
BEGIN
  SELECT
    COUNT(DISTINCT tablename),
    STRING_AGG(DISTINCT tablename, ', ')
  INTO permissive_count, permissive_tables
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd = 'ALL'
    AND (qual IS NULL OR qual::text = 'true')
    AND roles @> ARRAY['public'::name]
    AND tablename NOT IN ('subscription_tier_limits', 'beat_templates', 'document_type_metadata');

  IF permissive_count > 0 THEN
    RAISE WARNING '⚠️  Found % tables with overly permissive ALL policies: %',
      permissive_count, permissive_tables;
  ELSE
    RAISE NOTICE '✅ No overly permissive ALL policies found';
  END IF;
END $$;

-- Check for SELECT policies without user restrictions
DO $$
DECLARE
  open_select_count integer;
  open_select_tables text;
BEGIN
  SELECT
    COUNT(DISTINCT tablename),
    STRING_AGG(DISTINCT tablename, ', ')
  INTO open_select_count, open_select_tables
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd = 'SELECT'
    AND (qual IS NULL OR qual::text = 'true')
    AND roles @> ARRAY['public'::name]
    AND tablename NOT IN (
      'subscription_tier_limits',
      'beat_templates',
      'document_type_metadata',
      'dmca_notice_templates',
      'submission_partners'
    );

  IF open_select_count > 0 THEN
    RAISE WARNING '⚠️  Found % tables with unrestricted SELECT for public: %',
      open_select_count, open_select_tables;
  ELSE
    RAISE NOTICE '✅ No unrestricted SELECT policies found for sensitive tables';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 6: Summary Statistics
-- ============================================================================

\echo '6️⃣  Summary Statistics'
\echo ''

SELECT
  COUNT(DISTINCT c.relname) as tables_with_rls,
  COUNT(DISTINCT p.tablename) as tables_with_policies,
  COUNT(p.policyname) as total_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true;

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo '              Verification Complete'
\echo '═══════════════════════════════════════════════════'
\echo ''
\echo 'Review any warnings above and ensure:'
\echo '  1. All critical tables have RLS enabled'
\echo '  2. All tables with RLS have appropriate policies'
\echo '  3. Policies use auth.uid() or user_id for isolation'
\echo '  4. No overly permissive policies exist'
\echo ''
