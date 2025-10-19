# Supabase RLS Regression Tests

## Overview

This directory contains comprehensive Row-Level Security (RLS) regression tests to ensure data isolation and prevent unauthorized access across the Ottowrite application.

## Quick Start

```bash
# Run full RLS security audit
npm run test:rls

# Or use the alias
npm run security:audit
```

## Test Suite

### What It Tests

The RLS regression test suite (`rls_regression_tests.sql`) covers:

1. **Cross-User Data Access Prevention**
   - Users cannot read other users' data
   - Users cannot modify other users' data
   - Users cannot delete other users' data

2. **Privilege Escalation Prevention**
   - Users cannot insert data with another user's ID
   - WITH CHECK clauses prevent user_id flipping on UPDATE
   - Service role usage is properly restricted

3. **JOIN Bypass Prevention**
   - Users cannot access restricted data through JOIN queries
   - Foreign key relationships respect RLS policies

4. **Public Table Access Control**
   - Public read-only tables (subscription_plan_limits, beat_templates)
   - Users cannot modify public reference data

### Test Coverage

| Table | Read | Insert | Update | Delete | Notes |
|-------|------|--------|--------|--------|-------|
| projects | ✅ | ✅ | ✅ | ✅ | User-scoped |
| documents | ✅ | - | - | - | + JOIN bypass test |
| characters | ✅ | - | ✅ | - | User-scoped |
| ai_usage | ✅ | ✅ | - | - | Telemetry |
| user_profiles | ✅ | - | ✅ | - | Sensitive PII |
| autosave_failures | ✅ | - | - | - | Telemetry |
| project_members | ✅ | - | - | - | Collaboration |
| world_elements | ✅ | - | - | - | User-scoped |
| ai_requests | ✅ | - | - | - | Telemetry |
| subscription_plan_limits | ✅ | - | ✅ | - | Public read-only |

**Total:** 18 automated regression tests

## Running Tests

### Automated Runner (Recommended)

```bash
# Full security audit with all checks
npm run test:rls
```

This runs:
1. Service role key leak detection
2. RLS status verification for all tables
3. Full RLS regression test suite

### Manual SQL Execution

```bash
# Via psql (requires database credentials)
psql "postgresql://postgres:password@db.project.supabase.co:5432/postgres" \
  -f supabase/tests/rls_regression_tests.sql

# Via Supabase CLI
supabase db execute -f supabase/tests/rls_regression_tests.sql
```

## Expected Output

### Successful Test Run

```
🔐 SUPABASE RLS SECURITY AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: production
Supabase URL: https://jtngociduoicfnieidxf.supabase.co
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Checking for service role key leaks...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ No service role leaks detected in client-side code
✅ No hardcoded keys detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️  Verifying RLS is enabled on all tables...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ projects
✅ documents
✅ characters
✅ user_profiles
... (more tables)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RLS is properly enabled on all sensitive tables

📝 Executing RLS regression tests...

RLS Regression Test Suite Starting...
==========================================
✓ Test 1.1 PASSED: Users cannot read other users' projects
✓ Test 1.2 PASSED: Users cannot create projects for other users
✓ Test 1.3 PASSED: Users cannot update other users' projects
✓ Test 1.4 PASSED: Users cannot delete other users' projects
✓ Test 2.1 PASSED: Users cannot read other users' documents
✓ Test 2.2 PASSED: Cannot bypass document RLS via project join
... (12 more tests)
==========================================
RLS Regression Test Suite Complete
==========================================

✅ RLS regression tests completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Security audit complete
```

### Failed Test Example

If a test fails, you'll see:

```
✗ Test 1.1 FAILED: Cross-user project access detected!
```

**Action Required:** Fix the RLS policy immediately and re-run tests.

## Test Details

### Test 1: Projects Table

**Tests cross-user access prevention on the core `projects` table**

- Test 1.1: User cannot read other users' projects
- Test 1.2: User cannot create projects for other users
- Test 1.3: User cannot update other users' projects
- Test 1.4: User cannot delete other users' projects

### Test 2: Documents Table

**Tests document isolation and JOIN bypass prevention**

- Test 2.1: User cannot read other users' documents
- Test 2.2: Cannot bypass document RLS via project JOIN

### Test 3: Characters Table

**Tests character data isolation**

- Test 3.1: User cannot read other users' characters
- Test 3.2: User cannot modify other users' characters

### Test 4: AI Usage Table

**Tests AI telemetry data isolation**

- Test 4.1: User cannot read other users' AI usage
- Test 4.2: User cannot create AI usage for other users

### Test 5: User Profiles Table

**Tests sensitive PII protection**

- Test 5.1: User cannot read other users' profiles
- Test 5.2: User cannot modify other users' subscriptions

### Test 6: Autosave Failures Table

**Tests autosave telemetry isolation**

- Test 6.1: User cannot read other users' autosave failures

### Test 7: Project Members Table

**Tests collaboration access control**

- Test 7.1: User cannot read invitations sent to other users

### Test 8: World Elements Table

**Tests world-building data isolation**

- Test 8.1: User cannot read other users' world elements

### Test 9: AI Requests Table

**Tests AI request telemetry isolation**

- Test 9.1: User cannot read other users' AI requests

### Test 10: Subscription Plan Limits

**Tests public reference data access**

- Test 10.1: All users can read subscription plan limits
- Test 10.2: Regular users cannot modify plan limits

## Writing New Tests

When adding a new table with RLS policies, add corresponding tests:

```sql
-- Template for new RLS test
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    row_count INTEGER;
BEGIN
    -- Set session to user1
    PERFORM set_config('request.jwt.claims',
      '{"sub":"00000000-0000-0000-0000-000000000001"}', TRUE);

    -- Try to count records belonging to user2
    SELECT COUNT(*) INTO row_count
    FROM your_new_table
    WHERE user_id = '00000000-0000-0000-0000-000000000002'::UUID;

    test_passed := (row_count = 0);

    IF test_passed THEN
        RAISE NOTICE '✓ Test X.X PASSED: [Description]';
    ELSE
        RAISE WARNING '✗ Test X.X FAILED: [Description]!';
    END IF;
END $$;
```

## Security Best Practices

### DO:
- ✅ Run RLS tests after every schema migration
- ✅ Run RLS tests before deploying to production
- ✅ Add tests for every new table with user data
- ✅ Use `auth.uid()` in RLS policies, never client-provided IDs
- ✅ Include WITH CHECK clauses on UPDATE policies

### DON'T:
- ❌ Disable RLS on tables with user data
- ❌ Skip RLS testing "just this once"
- ❌ Trust client-side authorization
- ❌ Use SECURITY DEFINER functions without careful review
- ❌ Commit service role keys to version control

## Troubleshooting

### Tests fail with "permission denied"

**Cause:** Running with regular user credentials instead of service role

**Solution:**
```bash
# Ensure SUPABASE_SERVICE_ROLE_KEY is set
echo $SUPABASE_SERVICE_ROLE_KEY

# If missing, add to .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Tests show "Cannot connect to database"

**Cause:** Database URL or credentials incorrect

**Solution:**
```bash
# Verify Supabase URL
echo $NEXT_PUBLIC_SUPABASE_URL

# Test connection
npx supabase status
```

### All tests pass but data leak suspected

**Action:**
1. Check Supabase Dashboard RLS status for all tables
2. Review policy definitions in migrations
3. Add specific tests for the suspected leak
4. Contact security team if confirmed

## CI/CD Integration

### GitHub Actions Example

```yaml
name: RLS Security Tests

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
      - 'app/**/*.ts'
      - 'lib/**/*.ts'

jobs:
  rls-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run RLS tests
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run test:rls
```

## Related Documentation

- [SECURITY_AUDIT.md](../../SECURITY_AUDIT.md) - Full security audit log
- [Key Rotation Procedures](../../SECURITY_AUDIT.md#key-rotation-procedures)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For security issues or questions:
- Review [SECURITY_AUDIT.md](../../SECURITY_AUDIT.md)
- Check Supabase Dashboard RLS status
- Consult team security contact

---

**Last Updated:** 2025-10-19
**Test Suite Version:** 1.0.0
**Coverage:** 18 tests across 10 table groups
