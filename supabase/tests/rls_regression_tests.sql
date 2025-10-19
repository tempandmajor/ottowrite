-- =====================================================
-- RLS REGRESSION TEST SUITE
-- =====================================================
-- Comprehensive Row-Level Security tests to prevent:
-- 1. Cross-user data access
-- 2. Unauthorized modifications
-- 3. Privilege escalation
-- 4. Data leakage through joins
--
-- Run these tests regularly after any schema changes
-- =====================================================

-- Test Setup: Create test users
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    project1_id UUID;
    project2_id UUID;
BEGIN
    -- Note: This requires service role access
    -- In production, use separate test database

    RAISE NOTICE 'RLS Regression Test Suite Starting...';
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- TEST 1: PROJECTS TABLE
-- =====================================================

-- Test 1.1: User cannot read other users' projects
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count projects belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM projects
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 1.1 PASSED: Users cannot read other users projects';
    ELSE
        RAISE WARNING '✗ Test 1.1 FAILED: Cross-user project access detected!';
    END IF;
END $$;

-- Test 1.2: User cannot insert projects for another user
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
BEGIN
    BEGIN
        -- Set session to user1
        PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

        -- Try to insert project for user2
        INSERT INTO projects (user_id, name, type)
        VALUES ('00000000-0000-0000-0000-000000000002'::UUID, 'Malicious Project', 'novel');

        test_passed := FALSE;
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        test_passed := TRUE;
    END;

    IF test_passed THEN
        RAISE NOTICE '✓ Test 1.2 PASSED: Users cannot create projects for other users';
    ELSE
        RAISE WARNING '✗ Test 1.2 FAILED: Cross-user project creation allowed!';
        -- Cleanup
        DELETE FROM projects WHERE name = 'Malicious Project';
    END IF;
END $$;

-- Test 1.3: User cannot update other users' projects
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    affected_rows INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to update project belonging to user2
    UPDATE projects
    SET name = 'Hacked Project'
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    test_passed := (affected_rows = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 1.3 PASSED: Users cannot update other users projects';
    ELSE
        RAISE WARNING '✗ Test 1.3 FAILED: Cross-user project update allowed!';
    END IF;
END $$;

-- Test 1.4: User cannot delete other users' projects
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    affected_rows INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to delete project belonging to user2
    DELETE FROM projects
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    test_passed := (affected_rows = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 1.4 PASSED: Users cannot delete other users projects';
    ELSE
        RAISE WARNING '✗ Test 1.4 FAILED: Cross-user project deletion allowed!';
    END IF;
END $$;

-- =====================================================
-- TEST 2: DOCUMENTS TABLE
-- =====================================================

-- Test 2.1: User cannot read other users' documents
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count documents belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM documents
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 2.1 PASSED: Users cannot read other users documents';
    ELSE
        RAISE WARNING '✗ Test 2.1 FAILED: Cross-user document access detected!';
    END IF;
END $$;

-- Test 2.2: User cannot access documents through project join
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to access documents via project join for user2's data
    SELECT COUNT(*) INTO row_count
    FROM documents d
    JOIN projects p ON d.project_id = p.id
    WHERE p.user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 2.2 PASSED: Cannot bypass document RLS via project join';
    ELSE
        RAISE WARNING '✗ Test 2.2 FAILED: Document RLS bypass via join detected!';
    END IF;
END $$;

-- =====================================================
-- TEST 3: CHARACTERS TABLE
-- =====================================================

-- Test 3.1: User cannot read other users' characters
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count characters belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM characters
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 3.1 PASSED: Users cannot read other users characters';
    ELSE
        RAISE WARNING '✗ Test 3.1 FAILED: Cross-user character access detected!';
    END IF;
END $$;

-- Test 3.2: User cannot modify character belonging to another user
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    affected_rows INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to update character belonging to user2
    UPDATE characters
    SET name = 'Hacked Character'
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    test_passed := (affected_rows = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 3.2 PASSED: Users cannot modify other users characters';
    ELSE
        RAISE WARNING '✗ Test 3.2 FAILED: Cross-user character modification allowed!';
    END IF;
END $$;

-- =====================================================
-- TEST 4: AI_USAGE TABLE
-- =====================================================

-- Test 4.1: User cannot read other users' AI usage data
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count AI usage records belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM ai_usage
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 4.1 PASSED: Users cannot read other users AI usage';
    ELSE
        RAISE WARNING '✗ Test 4.1 FAILED: Cross-user AI usage access detected!';
    END IF;
END $$;

-- Test 4.2: User cannot insert AI usage for another user
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
BEGIN
    BEGIN
        -- Set session to user1
        PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

        -- Try to insert AI usage for user2
        INSERT INTO ai_usage (user_id, model, words_generated)
        VALUES ('00000000-0000-0000-0000-000000000002'::UUID, 'gpt-4', 100);

        test_passed := FALSE;
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        test_passed := TRUE;
    END;

    IF test_passed THEN
        RAISE NOTICE '✓ Test 4.2 PASSED: Users cannot create AI usage for other users';
    ELSE
        RAISE WARNING '✗ Test 4.2 FAILED: Cross-user AI usage creation allowed!';
        -- Cleanup
        DELETE FROM ai_usage WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID AND model = 'gpt-4';
    END IF;
END $$;

-- =====================================================
-- TEST 5: USER_PROFILES TABLE
-- =====================================================

-- Test 5.1: User cannot read other users' profiles
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to read user2's profile
    SELECT COUNT(*) INTO row_count
    FROM user_profiles
    WHERE id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 5.1 PASSED: Users cannot read other users profiles';
    ELSE
        RAISE WARNING '✗ Test 5.1 FAILED: Cross-user profile access detected!';
    END IF;
END $$;

-- Test 5.2: User cannot modify other users' subscription tiers
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    affected_rows INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to upgrade user2's subscription
    UPDATE user_profiles
    SET subscription_tier = 'enterprise'
    WHERE id = '00000000-0000-0000-0000-000000000002'::UUID;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    test_passed := (affected_rows = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 5.2 PASSED: Users cannot modify other users subscriptions';
    ELSE
        RAISE WARNING '✗ Test 5.2 FAILED: Cross-user subscription modification allowed!';
    END IF;
END $$;

-- =====================================================
-- TEST 6: AUTOSAVE_FAILURES TABLE
-- =====================================================

-- Test 6.1: User cannot read other users' autosave failures
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count autosave failures belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM autosave_failures
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 6.1 PASSED: Users cannot read other users autosave failures';
    ELSE
        RAISE WARNING '✗ Test 6.1 FAILED: Cross-user autosave failure access detected!';
    END IF;
END $$;

-- =====================================================
-- TEST 7: COLLABORATION & PROJECT_MEMBERS
-- =====================================================

-- Test 7.1: User cannot read invitations sent to other users
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to read invitations where user2 is the member
    SELECT COUNT(*) INTO row_count
    FROM project_members
    WHERE member_id = '00000000-0000-0000-0000-000000000002'::UUID
    AND inviter_id != '00000000-0000-0000-0000-000000000001'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 7.1 PASSED: Users cannot read other users invitations';
    ELSE
        RAISE WARNING '✗ Test 7.1 FAILED: Cross-user invitation access detected!';
    END IF;
END $$;

-- =====================================================
-- TEST 8: WORLD_ELEMENTS TABLE
-- =====================================================

-- Test 8.1: User cannot read other users' world elements
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count world elements belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM world_elements
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 8.1 PASSED: Users cannot read other users world elements';
    ELSE
        RAISE WARNING '✗ Test 8.1 FAILED: Cross-user world element access detected!';
    END IF;
END $$;

-- =====================================================
-- TEST 9: AI_REQUESTS TABLE (Telemetry)
-- =====================================================

-- Test 9.1: User cannot read other users' AI request telemetry
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count AI requests belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM ai_requests
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 9.1 PASSED: Users cannot read other users AI requests';
    ELSE
        RAISE WARNING '✗ Test 9.1 FAILED: Cross-user AI request access detected!';
    END IF;
END $$;

-- =====================================================
-- TEST 10: SUBSCRIPTION_PLAN_LIMITS (Public Read-Only)
-- =====================================================

-- Test 10.1: All users can read subscription plan limits
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to read plan limits (should be allowed)
    SELECT COUNT(*) INTO row_count
    FROM subscription_plan_limits;

    test_passed := (row_count > 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test 10.1 PASSED: Users can read subscription plan limits';
    ELSE
        RAISE WARNING '✗ Test 10.1 FAILED: Cannot read subscription plan limits!';
    END IF;
END $$;

-- Test 10.2: Regular users cannot modify subscription plan limits
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
BEGIN
    BEGIN
        -- Set session to user1
        PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

        -- Try to update plan limits
        UPDATE subscription_plan_limits
        SET max_projects = 999999
        WHERE plan = 'free';

        test_passed := FALSE;
    EXCEPTION WHEN insufficient_privilege THEN
        test_passed := TRUE;
    END;

    IF test_passed THEN
        RAISE NOTICE '✓ Test 10.2 PASSED: Users cannot modify subscription plan limits';
    ELSE
        RAISE WARNING '✗ Test 10.2 FAILED: User modified subscription plan limits!';
        -- Cleanup
        ROLLBACK;
    END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RLS Regression Test Suite Complete';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Review output above for any FAILED tests';
    RAISE NOTICE 'All tests should show ✓ PASSED status';
    RAISE NOTICE '==========================================';
END $$;
