# Supabase Migration Procedures Runbook

**Priority:** 🟠 **MEDIUM** - Planned maintenance
**Response Time:** <4 hours (for incidents)
**Last Updated:** January 19, 2025

## Table of Contents

- [Overview](#overview)
- [Migration Types](#migration-types)
- [Prerequisites](#prerequisites)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Procedures](#migration-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Testing Protocols](#testing-protocols)
- [Common Migration Patterns](#common-migration-patterns)
- [Troubleshooting](#troubleshooting)
- [Post-Migration](#post-migration)

## Overview

Database migrations are changes to the database schema or data. Proper procedures ensure zero-downtime deployments and data integrity.

**Migration System:**
- Tool: Supabase CLI + SQL migrations
- Location: `supabase/migrations/`
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Tracking: `supabase_migrations` table
- Environments: Local → Staging → Production

## Migration Types

### 1. Schema Migrations (DDL)

Changes to database structure:
- Creating/altering tables
- Adding/removing columns
- Creating/dropping indexes
- Modifying constraints
- Changing data types

**Risk:** 🟡 MEDIUM - Can cause downtime

### 2. Data Migrations (DML)

Changes to data:
- Bulk updates
- Data transformations
- Backfilling new columns
- Data cleanup

**Risk:** 🔴 HIGH - Can corrupt data

### 3. Policy Migrations

Changes to Row Level Security:
- Creating/modifying RLS policies
- Changing permissions
- Adding role-based access

**Risk:** 🟡 MEDIUM - Can expose/hide data

### 4. Function Migrations

Changes to database functions:
- Creating/updating functions
- Modifying triggers
- Changing stored procedures

**Risk:** 🟢 LOW - Usually safe

## Prerequisites

### Required Access

- [ ] Supabase project access (Owner/Admin)
- [ ] Local development environment
- [ ] Staging environment access
- [ ] Production database access (read-only by default)

### Required Tools

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Verify installation
supabase --version

# Login
supabase login

# Link to project
supabase link --project-ref [your-project-ref]
```

### Environment Setup

```bash
# Set up local Supabase
supabase init

# Start local Supabase (for testing)
supabase start

# Pull remote schema (to sync with production)
supabase db pull

# Generate TypeScript types
supabase gen types typescript --local > lib/database.types.ts
```

## Pre-Migration Checklist

### Planning Phase

- [ ] Migration goal clearly defined
- [ ] Impact analysis completed
- [ ] Rollback plan documented
- [ ] Test data prepared
- [ ] Stakeholders notified

### Technical Review

- [ ] Migration SQL reviewed and tested locally
- [ ] Indexes added for new queries
- [ ] RLS policies updated
- [ ] Foreign keys validated
- [ ] No hardcoded IDs in migration
- [ ] Idempotent (safe to run multiple times)

### Testing

- [ ] Tested on local database
- [ ] Tested with production data snapshot
- [ ] Performance impact measured
- [ ] Rollback tested
- [ ] CI/CD pipeline updated

### Backup

- [ ] Recent backup verified
- [ ] Backup retention confirmed
- [ ] Point-in-time recovery available
- [ ] Snapshot taken before migration

## Migration Procedures

### Step 1: Create Migration File

```bash
# Create new migration
supabase migration new add_character_notes_column

# This creates:
# supabase/migrations/20250119120000_add_character_notes_column.sql
```

### Step 2: Write Migration SQL

**Example: Adding a column**

```sql
-- supabase/migrations/20250119120000_add_character_notes_column.sql

-- Add column with default value (safe for existing rows)
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Add index if needed for queries
CREATE INDEX IF NOT EXISTS idx_characters_notes
ON characters(notes)
WHERE notes IS NOT NULL AND notes != '';

-- Update RLS policies if needed
DROP POLICY IF EXISTS characters_select_policy ON characters;
CREATE POLICY characters_select_policy ON characters
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON COLUMN characters.notes IS 'Character notes and background information';
```

### Step 3: Test Locally

```bash
# Start local Supabase
supabase start

# Apply migration
supabase db reset

# Verify migration applied
supabase db remote execute --sql "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'characters' AND column_name = 'notes';
"

# Test application with new schema
npm run dev
# Navigate to character page and test notes field

# Run tests
npm test
```

### Step 4: Deploy to Staging (if available)

```bash
# Link to staging project
supabase link --project-ref [staging-project-ref]

# Push migration
supabase db push

# Verify
supabase db remote execute --sql "
  SELECT migration_name, executed_at
  FROM supabase_migrations
  ORDER BY executed_at DESC
  LIMIT 5;
"

# Test staging application
# Visit staging URL and verify changes
```

### Step 5: Deploy to Production

**⚠️ CRITICAL: Only during maintenance window or off-peak hours**

```bash
# Take manual backup first
# Navigate to: Supabase Dashboard > Database > Backups
# Click "Take backup"

# Link to production project
supabase link --project-ref [production-project-ref]

# Review migration one more time
cat supabase/migrations/20250119120000_add_character_notes_column.sql

# Push to production
supabase db push

# Verify migration applied
supabase db remote execute --sql "
  SELECT migration_name, executed_at
  FROM supabase_migrations
  ORDER BY executed_at DESC
  LIMIT 1;
"

# Check for errors
supabase db remote execute --sql "
  SELECT * FROM pg_stat_activity
  WHERE state = 'active' AND wait_event_type IS NOT NULL;
"
```

### Step 6: Verify Production

```bash
# 1. Check schema
supabase db remote execute --sql "
  \d characters
"

# 2. Check data integrity
supabase db remote execute --sql "
  SELECT COUNT(*) as total,
         COUNT(notes) as with_notes,
         COUNT(*) - COUNT(notes) as without_notes
  FROM characters;
"

# 3. Test RLS policies
supabase db remote execute --sql "
  -- Set user context
  SET request.jwt.claims = '{\"sub\": \"[test-user-id]\"}';

  -- Try to select
  SELECT id, name, notes FROM characters LIMIT 5;
"

# 4. Check application logs
vercel logs production --since 5m | grep "error\|warning"

# 5. Monitor Sentry for errors
# Navigate to: Sentry > Issues > filter by "last 5 minutes"
```

## Rollback Procedures

### Automatic Rollback (Preferred)

Create rollback migration:

```sql
-- supabase/migrations/20250119130000_rollback_character_notes.sql

-- Remove column
ALTER TABLE characters
DROP COLUMN IF EXISTS notes;

-- Remove index
DROP INDEX IF EXISTS idx_characters_notes;

-- Restore old RLS policy (if changed)
-- Copy from previous migration
```

Apply rollback:

```bash
supabase db push
```

### Manual Rollback (Emergency)

**⚠️ Use only if automated rollback fails**

```bash
# 1. Identify migration to rollback
supabase db remote execute --sql "
  SELECT * FROM supabase_migrations
  ORDER BY executed_at DESC
  LIMIT 5;
"

# 2. Get migration content
cat supabase/migrations/20250119120000_add_character_notes_column.sql

# 3. Write reverse SQL
supabase db remote execute --sql "
  -- Reverse the migration
  ALTER TABLE characters DROP COLUMN IF EXISTS notes;
  DROP INDEX IF EXISTS idx_characters_notes;
"

# 4. Remove migration from history (optional)
supabase db remote execute --sql "
  DELETE FROM supabase_migrations
  WHERE migration_name = '20250119120000_add_character_notes_column';
"
```

### Point-in-Time Recovery (Last Resort)

**⚠️ Results in data loss for recent changes**

1. Navigate to: Supabase Dashboard > Database > Backups
2. Find backup before migration
3. Click "Restore"
4. Confirm restoration point
5. Wait for restoration (can take 10-30 minutes)
6. Verify data integrity

## Testing Protocols

### Unit Tests for Migrations

```typescript
// tests/db/migrations.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Character notes migration', () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  it('should add notes column', async () => {
    const { data, error } = await supabase
      .from('characters')
      .select('notes')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should allow updating notes', async () => {
    const { data, error } = await supabase
      .from('characters')
      .update({ notes: 'Test notes' })
      .eq('id', 'test-character-id')
      .select();

    expect(error).toBeNull();
    expect(data?.[0]?.notes).toBe('Test notes');
  });
});
```

### Integration Tests

```typescript
// tests/e2e/character-notes.spec.ts
import { test, expect } from '@playwright/test';

test('character notes field appears', async ({ page }) => {
  await page.goto('/dashboard/projects/test-id/characters/char-id');

  // Verify notes field exists
  await expect(page.locator('[data-testid="character-notes"]')).toBeVisible();

  // Fill notes
  await page.fill('[data-testid="character-notes"]', 'Character background');

  // Save
  await page.click('[data-testid="save-character"]');

  // Verify saved
  await page.reload();
  await expect(page.locator('[data-testid="character-notes"]')).toHaveValue('Character background');
});
```

### Performance Testing

```sql
-- Test query performance before and after migration
EXPLAIN ANALYZE
SELECT * FROM characters
WHERE notes LIKE '%keyword%'
LIMIT 100;

-- Compare execution time
-- Before: ~50ms
-- After with index: ~10ms
```

## Common Migration Patterns

### Pattern 1: Adding a Column (Safe)

```sql
-- Add column with default value
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;

-- Add NOT NULL constraint later (after backfilling)
-- Don't add NOT NULL immediately!
```

### Pattern 2: Changing Column Type (Risky)

```sql
-- Option 1: Safe but requires downtime
ALTER TABLE table_name
ALTER COLUMN column_name TYPE new_type;

-- Option 2: Zero-downtime (preferred)
-- Step 1: Add new column
ALTER TABLE table_name
ADD COLUMN column_name_new new_type;

-- Step 2: Backfill data
UPDATE table_name
SET column_name_new = column_name::new_type;

-- Step 3: Update application to use new column
-- Deploy application changes

-- Step 4: Drop old column (in next migration)
ALTER TABLE table_name
DROP COLUMN column_name,
RENAME COLUMN column_name_new TO column_name;
```

### Pattern 3: Adding Index (Safe but Slow)

```sql
-- Use CONCURRENTLY to avoid locking table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name
ON table_name(column_name);

-- If index creation fails, clean up
DROP INDEX CONCURRENTLY IF EXISTS idx_name;
```

### Pattern 4: Backfilling Data (Risky)

```sql
-- For small tables (<10,000 rows)
UPDATE table_name
SET new_column = old_column * 2
WHERE new_column IS NULL;

-- For large tables (use batching)
DO $$
DECLARE
  batch_size INT := 1000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE table_name
    SET new_column = old_column * 2
    WHERE id IN (
      SELECT id FROM table_name
      WHERE new_column IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    -- Commit and sleep to avoid overwhelming DB
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

### Pattern 5: Modifying RLS Policies (Moderate Risk)

```sql
-- Drop and recreate (safe if done in transaction)
BEGIN;

DROP POLICY IF EXISTS old_policy_name ON table_name;

CREATE POLICY new_policy_name ON table_name
FOR SELECT
USING (auth.uid() = user_id);

COMMIT;

-- Test immediately after
SET request.jwt.claims = '{"sub": "test-user-id"}';
SELECT * FROM table_name LIMIT 1;
```

## Troubleshooting

### Error: "Migration has already been applied"

**Cause:** Migration file hash changed or duplicate migration

**Solution:**
```bash
# Check migration status
supabase db remote execute --sql "
  SELECT migration_name, executed_at
  FROM supabase_migrations
  ORDER BY executed_at DESC;
"

# If duplicate, rename new migration
mv supabase/migrations/20250119120000_*.sql \
   supabase/migrations/20250119120001_*.sql
```

### Error: "Column already exists"

**Cause:** Migration ran partially or was run twice

**Solution:**
```sql
-- Use IF NOT EXISTS
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TYPE;
```

### Error: "Cannot drop column: other objects depend on it"

**Cause:** Foreign keys or views reference the column

**Solution:**
```sql
-- Option 1: Drop dependent objects first
DROP VIEW IF EXISTS view_name CASCADE;
ALTER TABLE table_name DROP COLUMN column_name;

-- Option 2: Find dependencies
SELECT * FROM information_schema.view_column_usage
WHERE column_name = 'your_column';
```

### Error: "Lock timeout exceeded"

**Cause:** Table locked by long-running query

**Solution:**
```sql
-- Find blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- Kill blocking query (if safe)
SELECT pg_terminate_backend(blocking_pid);
```

### Error: "Out of memory"

**Cause:** Migration updating too many rows at once

**Solution:**
```sql
-- Use batching (see Pattern 4 above)
-- Reduce batch_size
-- Add COMMIT after each batch
```

## Post-Migration

### Verification Checklist

- [ ] Migration applied successfully
- [ ] All tests passing
- [ ] Application deployed
- [ ] No errors in Sentry
- [ ] Performance metrics normal
- [ ] RLS policies working
- [ ] Indexes created
- [ ] Data integrity verified

### Documentation

Update the following:

```bash
# 1. Generate new TypeScript types
supabase gen types typescript --linked > lib/database.types.ts

# 2. Commit types
git add lib/database.types.ts
git commit -m "chore: update database types after migration"

# 3. Update API documentation (if needed)
# Edit docs/API.md with new endpoints/fields

# 4. Update changelog
# Add migration to CHANGELOG.md
```

### Monitoring

Set up alerts for:

```sql
-- Monitor migration performance impact
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%table_name%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Communication

Notify stakeholders:

```markdown
## Migration Complete: Character Notes Feature

**Date:** 2025-01-19 12:00 UTC
**Duration:** 5 minutes
**Impact:** None - zero downtime deployment

**Changes:**
- Added `notes` column to `characters` table
- Created index for search performance
- Updated RLS policies
- Deployed application changes

**Rollback:** Available if needed (automated)
**Monitoring:** All metrics normal

**Next Steps:**
- Feature announcement email tomorrow
- Documentation updated
- Training video next week
```

## Related Documents

- [Database Schema](../../supabase/migrations/)
- [RLS Policies](../../supabase/migrations/*_rls_policies.sql)
- [TypeScript Types](../../lib/database.types.ts)
- [Supabase Documentation](https://supabase.com/docs/guides/cli)

---

**Last Reviewed:** January 19, 2025
**Next Review:** February 19, 2025
