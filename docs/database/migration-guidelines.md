# Database Migration Guidelines

## Overview

This document defines best practices for creating and managing database migrations in this project. Following these guidelines ensures maintainability, reviewability, and safe schema evolution.

## Table of Contents

- [Core Principles](#core-principles)
- [Naming Convention](#naming-convention)
- [Migration Template](#migration-template)
- [When to Create a Migration](#when-to-create-a-migration)
- [When to Split Migrations](#when-to-split-migrations)
- [Migration Checklist](#migration-checklist)
- [Common Patterns](#common-patterns)
- [Anti-Patterns](#anti-patterns)
- [Testing Migrations](#testing-migrations)
- [Rollback Strategy](#rollback-strategy)
- [Performance Considerations](#performance-considerations)

---

## Core Principles

### 1. One Purpose Per Migration
Each migration should do **ONE** logical thing. Don't mix unrelated changes.

✅ **Good:**
```
20251025120000_add_user_preferences_table.sql
20251025120100_add_user_preferences_indexes.sql
20251025120200_add_user_preferences_rls.sql
```

❌ **Bad:**
```
20251025120000_phase4_updates.sql  // Contains 10 different features
```

### 2. Descriptive Names
Migration filenames should clearly describe what they do.

✅ **Good:**
```
create_projects_table.sql
add_projects_folder_id_column.sql
add_projects_folder_id_index.sql
```

❌ **Bad:**
```
update_schema.sql
new_features.sql
fix_stuff.sql
```

### 3. Idempotent When Possible
Migrations should be safe to run multiple times (when feasible).

✅ **Good:**
```sql
CREATE TABLE IF NOT EXISTS projects (...);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_id UUID;
```

❌ **Bad:**
```sql
CREATE TABLE projects (...);  -- Fails if table exists
ALTER TABLE projects ADD COLUMN folder_id UUID;  -- Fails if column exists
```

### 4. Tested Locally First
**Always** test migrations locally before applying to production.

```bash
# Test fresh deployment
npx supabase db reset

# Test existing database
npx supabase db push

# Verify changes
psql -c "\d table_name"
```

### 5. Documented Thoroughly
Use the migration template and include:
- Description of changes
- Impact assessment
- Rollback instructions
- Testing steps

---

## Naming Convention

### Format
```
YYYYMMDDHHMMSS_action_target.sql
```

Where:
- **YYYYMMDDHHMMSS**: Timestamp (ensures ordering)
- **action**: Verb describing what you're doing
- **target**: What you're modifying

### Action Verbs

| Verb | Use For | Example |
|------|---------|---------|
| `create` | New tables, indexes, functions | `create_projects_table.sql` |
| `add` | New columns, constraints | `add_projects_folder_id.sql` |
| `drop` | Removing schema objects | `drop_projects_old_column.sql` |
| `alter` | Modifying existing objects | `alter_projects_name_length.sql` |
| `rename` | Renaming objects | `rename_user_to_author.sql` |
| `migrate` | Data migrations | `migrate_old_tags_to_new_format.sql` |
| `reconcile` | Schema drift fixes | `reconcile_tag_links_schema.sql` |
| `consolidate` | Combining/simplifying | `consolidate_rls_policies.sql` |
| `optimize` | Performance improvements | `optimize_projects_indexes.sql` |

### Examples

```
20251025120000_create_user_preferences_table.sql
20251025120100_add_user_preferences_user_id_index.sql
20251025120200_create_user_preferences_rls_policy.sql
20251025120300_add_projects_status_column.sql
20251025120400_migrate_projects_to_new_status.sql
20251025120500_drop_projects_old_status_column.sql
```

---

## Migration Template

Always start with the template:

```bash
cp supabase/migrations/.template.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.sql
```

The template includes:
- Structured header with metadata
- Pre-flight checks
- Migration body
- Post-migration validation
- Rollback instructions
- Usage examples

**See:** `supabase/migrations/.template.sql` for full template

---

## When to Create a Migration

Create a migration when you need to:

✅ **Schema Changes:**
- Create/drop tables
- Add/remove/modify columns
- Add/remove constraints
- Create/drop indexes
- Modify RLS policies

✅ **Data Changes:**
- Migrate existing data to new format
- Seed initial data
- Backfill new columns

✅ **Permission Changes:**
- Modify RLS policies
- Grant/revoke permissions

❌ **Don't Create Migrations For:**
- Application code changes
- Configuration changes
- Environment variables

---

## When to Split Migrations

Split migrations when:

### 1. Multiple Tables Involved
If creating multiple related tables, consider splitting:

```
20251025120000_create_folders_table.sql
20251025120100_create_tags_table.sql
20251025120200_create_folder_tag_links_table.sql
```

**Exception**: Tightly coupled tables can be in one migration if they must exist together.

### 2. Schema + Data Changes
Separate schema changes from data migrations:

```
20251025120000_add_projects_status_column.sql     // Schema: ADD COLUMN
20251025120100_migrate_projects_to_new_status.sql // Data: UPDATE rows
20251025120200_drop_projects_old_status.sql       // Schema: DROP COLUMN
```

### 3. Migration Exceeds 150 Lines
If a migration grows beyond ~150 lines, consider splitting by:
- Table (if multiple tables)
- Type (schema vs indexes vs RLS)
- Feature (if multiple features)

### 4. Different Deployment Timing
If some changes need to be deployed before others:

```
20251025120000_add_projects_new_column.sql  // Deploy in week 1
20251025130000_migrate_data_to_new_column.sql  // Deploy in week 2 (after code deployed)
20251025140000_drop_projects_old_column.sql  // Deploy in week 3 (after verification)
```

---

## Migration Checklist

Before submitting a migration for review:

### Pre-Development
- [ ] Reviewed existing schema to understand current state
- [ ] Checked for existing indexes/constraints that might conflict
- [ ] Identified tables/columns that will be affected
- [ ] Estimated impact (rows affected, downtime needed)

### Development
- [ ] Used migration template (`cp supabase/migrations/.template.sql ...`)
- [ ] Followed naming convention
- [ ] Included descriptive header with metadata
- [ ] Added pre-flight checks for prerequisites
- [ ] Added post-migration validation
- [ ] Documented rollback instructions
- [ ] Used `IF NOT EXISTS` / `IF EXISTS` where appropriate
- [ ] Used `CREATE INDEX CONCURRENTLY` for zero-downtime indexes

### Testing
- [ ] Tested on fresh database (`npx supabase db reset`)
- [ ] Tested on database with existing data (`npx supabase db push`)
- [ ] Verified all constraints work as expected
- [ ] Tested rollback instructions
- [ ] Ran linter (`./scripts/lint-migrations.sh`)
- [ ] Verified no hardcoded UUIDs or sensitive data

### Documentation
- [ ] Updated schema documentation (if applicable)
- [ ] Linked to related ticket/PR
- [ ] Added usage examples in migration comments
- [ ] Documented any breaking changes

### Review
- [ ] Migration reviewed by teammate
- [ ] Database changes approved by tech lead
- [ ] Impact assessment reviewed
- [ ] Rollback plan reviewed

---

## Common Patterns

### Pattern 1: Creating a New Table

```sql
-- Create table with RLS
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT,
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes (use CONCURRENTLY for production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_user
ON public.user_preferences(user_id);
```

### Pattern 2: Adding a Column

```sql
-- Add column with default
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Add constraint after backfilling (if needed)
ALTER TABLE public.projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('draft', 'active', 'archived'));

-- Create index if column will be filtered/sorted
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status
ON public.projects(status);
```

### Pattern 3: Migrating Data

```sql
-- Step 1: Add new column
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS status_new TEXT DEFAULT 'draft';

-- Step 2: Migrate data (in batches for large tables)
DO $$
DECLARE
  batch_size INT := 1000;
  offset_val INT := 0;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE public.projects
    SET status_new = CASE
      WHEN old_status = 'active' THEN 'published'
      WHEN old_status = 'inactive' THEN 'draft'
      ELSE 'draft'
    END
    WHERE id IN (
      SELECT id FROM public.projects
      WHERE status_new IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    RAISE NOTICE 'Migrated % rows', rows_updated;
    offset_val := offset_val + batch_size;
  END LOOP;
END $$;

-- Step 3: Verify migration
DO $$
DECLARE
  unmigrated_count INT;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM public.projects
  WHERE status_new IS NULL;

  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % rows not migrated', unmigrated_count;
  END IF;
END $$;
```

### Pattern 4: Removing a Column (Safe Way)

```sql
-- Step 1 (Separate deployment): Add new column and migrate data
-- (done in previous migrations)

-- Step 2 (This migration): Drop old column
-- Only do this after code is deployed and verified
ALTER TABLE public.projects
DROP COLUMN IF EXISTS old_status;

-- Verify column is gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'old_status'
  ) THEN
    RAISE EXCEPTION 'Column old_status still exists';
  END IF;
END $$;
```

### Pattern 5: Creating Indexes Without Downtime

```sql
-- Use CONCURRENTLY for zero-downtime index creation
-- Note: Cannot be used inside a transaction block

-- Create index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_folder_id
ON public.projects(folder_id)
WHERE folder_id IS NOT NULL;  -- Partial index

-- Verify index was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_projects_folder_id'
  ) THEN
    RAISE WARNING 'Index was not created successfully';
  END IF;
END $$;
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Hardcoded UUIDs

```sql
-- BAD: Hardcoded UUIDs
INSERT INTO projects (id, user_id, name)
VALUES ('123e4567-e89b-12d3-a456-426614174000',
        'user-uuid-here',
        'Sample Project');

-- GOOD: Use uuid_generate_v4()
INSERT INTO projects (user_id, name)
VALUES (auth.uid(), 'Sample Project');
```

### ❌ Anti-Pattern 2: Missing Pre-flight Checks

```sql
-- BAD: No validation
ALTER TABLE projects
ADD COLUMN folder_id UUID REFERENCES folders(id);
-- Fails silently if folders table doesn't exist

-- GOOD: Check prerequisites
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'folders') THEN
    RAISE EXCEPTION 'Migration requires folders table. Run migration XXX first.';
  END IF;
END $$;

ALTER TABLE projects
ADD COLUMN folder_id UUID REFERENCES folders(id);
```

### ❌ Anti-Pattern 3: No Rollback Plan

```sql
-- BAD: No rollback documentation
CREATE TABLE complex_table (...);
-- 50 more lines of complex schema
```

```sql
-- GOOD: Clear rollback
CREATE TABLE complex_table (...);
-- ... migration ...

-- ROLLBACK:
-- DROP TABLE IF EXISTS complex_table CASCADE;
```

### ❌ Anti-Pattern 4: Mixing Schema and Data

```sql
-- BAD: Schema + data in same block (hard to rollback)
ALTER TABLE projects ADD COLUMN status TEXT;
UPDATE projects SET status = 'active';
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
```

```sql
-- GOOD: Separate migrations
-- Migration 1: Add column
ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft';

-- Migration 2: Backfill data
UPDATE projects SET status = 'active' WHERE...;

-- Migration 3: Add constraint
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
```

### ❌ Anti-Pattern 5: Destructive Operations Without Backup Plan

```sql
-- BAD: Immediate data loss
ALTER TABLE projects DROP COLUMN important_data;

-- GOOD: Rename first, drop later
-- Migration 1: Rename (reversible)
ALTER TABLE projects RENAME COLUMN important_data TO important_data_deprecated;

-- Migration 2 (after verification): Drop
ALTER TABLE projects DROP COLUMN important_data_deprecated;
```

---

## Testing Migrations

### Local Testing

```bash
# Test 1: Fresh database
npx supabase db reset
# Should apply all migrations from scratch

# Test 2: Existing database
npx supabase db push
# Should apply only new migrations

# Test 3: Verify schema
psql -c "\d table_name"
psql -c "\di"  # List indexes
psql -c "SELECT * FROM pg_policies WHERE tablename = 'table_name';"  # List policies
```

### Rollback Testing

```bash
# Apply migration
npx supabase db push

# Test rollback instructions from migration file
psql -f rollback_instructions.sql

# Verify rollback
psql -c "\d table_name"
```

### Data Integrity Testing

```sql
-- After data migration, verify counts match
SELECT COUNT(*) FROM old_table;
SELECT COUNT(*) FROM new_table;

-- Check for orphaned records
SELECT COUNT(*) FROM child_table c
WHERE NOT EXISTS (
  SELECT 1 FROM parent_table p WHERE p.id = c.parent_id
);
```

---

## Rollback Strategy

### Option 1: Manual Rollback (Preferred)

Include rollback SQL in migration comments:

```sql
-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- 1. Drop the new table
-- DROP TABLE IF EXISTS new_table CASCADE;
--
-- 2. Remove the new column
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
--
-- 3. Verify cleanup
-- SELECT COUNT(*) FROM pg_tables WHERE tablename = 'new_table';
-- ============================================================================
```

### Option 2: Down Migrations (Optional)

Create a corresponding down migration:

```
20251025120000_create_user_preferences.sql       # Up migration
20251025120000_create_user_preferences_down.sql  # Down migration
```

Down migration content:
```sql
-- Rollback for: create_user_preferences
DROP TABLE IF EXISTS public.user_preferences CASCADE;
```

### Rollback Checklist

- [ ] Rollback instructions documented in migration
- [ ] Rollback tested locally
- [ ] Data loss documented (if any)
- [ ] Dependencies identified (what else breaks?)
- [ ] Timeline estimated (how long to rollback?)

---

## Performance Considerations

### 1. Use CONCURRENTLY for Indexes

```sql
-- Zero downtime (takes longer, but doesn't lock)
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- With downtime (faster, but locks table)
CREATE INDEX idx_name ON table(column);
```

**Use CONCURRENTLY when:**
- Table has production traffic
- Table has more than 1,000 rows
- Downtime is not acceptable

### 2. Batch Large Updates

```sql
-- BAD: Single transaction locks table
UPDATE large_table SET new_column = 'value';

-- GOOD: Batch updates
DO $$
DECLARE
  batch_size INT := 1000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE large_table
    SET new_column = 'value'
    WHERE id IN (
      SELECT id FROM large_table
      WHERE new_column IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.1);  -- Pause between batches
  END LOOP;
END $$;
```

### 3. Add Constraints After Backfilling

```sql
-- Step 1: Add column without constraint
ALTER TABLE projects ADD COLUMN status TEXT;

-- Step 2: Backfill data
UPDATE projects SET status = 'draft';

-- Step 3: Add constraint
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT status_check CHECK (status IN ('draft', 'active'));
```

### 4. Use Partial Indexes

```sql
-- Full index (larger, slower to build)
CREATE INDEX idx_projects_folder_id ON projects(folder_id);

-- Partial index (smaller, faster, same benefit)
CREATE INDEX idx_projects_folder_id
ON projects(folder_id)
WHERE folder_id IS NOT NULL;
```

---

## Questions?

- Review existing migrations for examples
- Check the migration template
- Ask in team chat before making large schema changes
- Reference this guide for best practices

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-10-25 | Initial version | DB-006 Implementation |
