## Database Migration Rollbacks

Comprehensive system for safely rolling back database migrations with validation, dependency tracking, and audit trails.

## Overview

Our migration rollback system provides:
- **Safe rollback validation** - Prevents dangerous rollbacks
- **Dependency tracking** - Ensures correct rollback order
- **Automatic snapshots** - Captures schema before changes
- **Rollback SQL tracking** - Stores undo operations for each migration
- **Audit trail** - Complete history of all migrations and rollbacks
- **CLI tool** - Easy-to-use interface for migration management

## Architecture

```
Migration Flow:
┌─────────────────────┐
│  New Migration      │
│  (*.sql file)       │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Extract Rollback    │
│ SQL from comments   │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Apply Migration     │
│ (supabase db push)  │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Register in         │
│ migration_history   │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Track Dependencies  │
│ (if any)            │
└─────────────────────┘

Rollback Flow:
┌─────────────────────┐
│ Request Rollback    │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Validate Rollback   │
│ - Check status      │
│ - Check dependents  │
│ - Verify rollback   │
│   SQL exists        │
└──────┬──────────────┘
       │
       ├─ Invalid ──→ Abort
       │
       ↓ Valid
┌─────────────────────┐
│ Execute Rollback    │
│ SQL                 │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Update Status       │
│ - Set rolled_back   │
│ - Log timestamp     │
│ - Log user          │
└─────────────────────┘
```

## Database Schema

### migration_history Table

Tracks all applied migrations with rollback information:

```sql
CREATE TABLE migration_history (
    id UUID PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    migration_version TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by TEXT DEFAULT current_user,
    rollback_sql TEXT,           -- SQL to undo migration
    checksum TEXT,                -- SHA-256 hash for integrity
    status TEXT,                  -- 'applied', 'rolled_back', 'failed'
    rollback_at TIMESTAMPTZ,
    rollback_by TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);
```

### migration_dependencies Table

Tracks dependencies between migrations:

```sql
CREATE TABLE migration_dependencies (
    id UUID PRIMARY KEY,
    migration_name TEXT NOT NULL REFERENCES migration_history(migration_name),
    depends_on TEXT NOT NULL REFERENCES migration_history(migration_name),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(migration_name, depends_on)
);
```

## Writing Rollback-Friendly Migrations

### Basic Pattern

```sql
-- Migration: 20250120_add_user_settings.sql
-- Description: Add user settings table

-- UP MIGRATION (what to apply)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- ROLLBACK START
-- This section defines how to undo the migration

DROP INDEX IF EXISTS public.idx_user_settings_user_id;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- ROLLBACK END
```

### Complex Migration with Dependencies

```sql
-- Migration: 20250120_add_project_analytics.sql
-- Depends on: 20250119_add_analytics_queue.sql

-- UP MIGRATION
CREATE TABLE IF NOT EXISTS public.project_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    analytics_job_id UUID REFERENCES public.analytics_queue(id),
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_queue
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- ROLLBACK START

ALTER TABLE public.analytics_queue
DROP COLUMN IF EXISTS project_id;

DROP TABLE IF EXISTS public.project_analytics CASCADE;

-- ROLLBACK END
```

**Important**: Rollback SQL should be in reverse order of the UP migration.

### Guidelines for Rollback SQL

1. **Use IF EXISTS**: Always use `DROP ... IF EXISTS` to avoid errors
2. **Use CASCADE carefully**: Only use CASCADE when you're sure
3. **Reverse order**: Undo operations in reverse order
4. **Data preservation**: Consider backing up data before drops
5. **Test locally**: Always test rollback on local/staging first

## CLI Usage

### Installation

The migration manager script is located at `scripts/migration-manager.ts`.

```bash
# Make it executable (one-time setup)
chmod +x scripts/migration-manager.ts

# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Commands

#### 1. List Rollbackable Migrations

View all applied migrations and their rollback status:

```bash
tsx scripts/migration-manager.ts list
```

Output:
```
📋 Listing rollbackable migrations...

Applied Migrations:

────────────────────────────────────────────────────────────────────────────
Migration                                          Can Rollback Applied At          Has Rollback Blocking Reason
────────────────────────────────────────────────────────────────────────────
20250120_migration_rollback_system                 ✅ Yes       1/20/25, 2:30 PM     ✅           -
20250119_add_metrics_schema                        ✅ Yes       1/19/25, 3:15 PM     ✅           -
20251019232120_ai_routing_metadata                 ❌ No        10/19/24, 6:21 PM    ✅           Migration can be rolled back
────────────────────────────────────────────────────────────────────────────

Total: 34 migrations
Rollbackable: 32
```

#### 2. Check Specific Migration

Check if a specific migration can be rolled back:

```bash
tsx scripts/migration-manager.ts check 20250120_migration_rollback_system
```

Output:
```
🔍 Checking rollback status for: 20250120_migration_rollback_system

Status: ✅ Can rollback
Reason: Migration can be safely rolled back
```

If migration has dependents:
```
Status: ❌ Cannot rollback
Reason: Cannot rollback: other migrations depend on this one

Dependent migrations (must be rolled back first):
  - 20250121_add_migration_logs
  - 20250122_extend_migration_metadata
```

#### 3. Dry Run Rollback

Preview what would happen without executing:

```bash
tsx scripts/migration-manager.ts rollback 20250120_migration_rollback_system --dry-run
```

Output:
```
🔍 DRY RUN: Rolling back: 20250120_migration_rollback_system

✅ Dry run: rollback SQL shown below (not executed)

SQL that would be executed:
────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_migration_snapshot CASCADE;
DROP FUNCTION IF EXISTS public.list_rollbackable_migrations CASCADE;
DROP FUNCTION IF EXISTS public.execute_migration_rollback CASCADE;
DROP FUNCTION IF EXISTS public.can_rollback_migration CASCADE;
DROP INDEX IF EXISTS public.idx_migration_deps_depends_on;
DROP INDEX IF EXISTS public.idx_migration_deps_migration;
DROP TABLE IF EXISTS public.migration_dependencies CASCADE;
DROP INDEX IF EXISTS public.idx_migration_history_applied_at;
DROP INDEX IF EXISTS public.idx_migration_history_status;
DROP INDEX IF EXISTS public.idx_migration_history_version;
DROP TABLE IF NOT EXISTS public.migration_history CASCADE;
────────────────────────────────────────────────────────────────────────────
```

#### 4. Execute Rollback

Actually rollback a migration (with confirmation):

```bash
tsx scripts/migration-manager.ts rollback 20250120_add_user_settings
```

Output:
```
⚠️ Rolling back: 20250120_add_user_settings

⚠️  Are you sure you want to rollback this migration? (yes/no): yes

✅ Migration rolled back successfully

SQL executed:
────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_user_settings_user_id;
DROP TABLE IF EXISTS public.user_settings CASCADE;
────────────────────────────────────────────────────────────────────────────
```

#### 5. Register Migration

Register an existing migration file in the tracking system:

```bash
tsx scripts/migration-manager.ts register 20250120_add_user_settings
```

Output:
```
📝 Registering migration: 20250120_add_user_settings
✅ Migration registered successfully
   Rollback SQL: ✅ Available
```

#### 6. Generate Rollback Template

Get a suggested rollback template for a migration:

```bash
tsx scripts/migration-manager.ts template 20250120_add_user_settings
```

Output:
```
📝 Generating rollback template for: 20250120_add_user_settings

Suggested rollback template:
────────────────────────────────────────────────────────────────────────────
-- ROLLBACK START

-- TODO: Add SQL to undo this migration
-- Common patterns:

-- DROP TABLE IF EXISTS table_name CASCADE;
-- ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
-- DROP INDEX IF EXISTS index_name;
-- DROP FUNCTION IF EXISTS function_name;

-- ROLLBACK END
────────────────────────────────────────────────────────────────────────────

💡 Add this to your migration file and adjust as needed
```

#### 7. Sync Migrations

Sync all migration files with the database tracking system:

```bash
tsx scripts/migration-manager.ts sync
```

Output:
```
🔄 Syncing migration files with database...

📝 Registering: 20250119_performance_indexes.sql
   ✅ Registered (Rollback: Yes)
📝 Registering: 20250120_migration_rollback_system.sql
   ✅ Registered (Rollback: Yes)

✅ Sync complete: 2 registered, 32 skipped
```

## Common Workflows

### Workflow 1: Create New Migration with Rollback

1. **Create migration file**:
```bash
# Using Supabase CLI (if configured)
supabase migration new add_user_preferences

# Or manually create file
touch supabase/migrations/20250120_add_user_preferences.sql
```

2. **Write migration with rollback**:
```sql
-- UP migration
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}'
);

-- ROLLBACK START
DROP TABLE IF EXISTS public.user_preferences CASCADE;
-- ROLLBACK END
```

3. **Apply migration**:
```bash
# Using Supabase MCP (if connected)
SUPABASE_ACCESS_TOKEN=xxx PGPASSWORD="xxx" supabase db push

# Or use Supabase CLI
supabase db push
```

4. **Register in tracking system**:
```bash
tsx scripts/migration-manager.ts register 20250120_add_user_preferences
```

### Workflow 2: Rollback Recent Migration

1. **List migrations**:
```bash
tsx scripts/migration-manager.ts list
```

2. **Check if safe to rollback**:
```bash
tsx scripts/migration-manager.ts check 20250120_add_user_preferences
```

3. **Dry run to preview**:
```bash
tsx scripts/migration-manager.ts rollback 20250120_add_user_preferences --dry-run
```

4. **Execute rollback**:
```bash
tsx scripts/migration-manager.ts rollback 20250120_add_user_preferences
```

### Workflow 3: Add Rollback to Existing Migration

1. **Generate template**:
```bash
tsx scripts/migration-manager.ts template 20251019232120_ai_routing_metadata
```

2. **Edit migration file** and add rollback section:
```sql
-- ... existing migration ...

-- ROLLBACK START
-- Add your rollback SQL here
DROP TABLE IF EXISTS ai_routing_metadata CASCADE;
-- ROLLBACK END
```

3. **Update tracking**:
```bash
# Re-register to update rollback SQL
tsx scripts/migration-manager.ts register 20251019232120_ai_routing_metadata
```

### Workflow 4: Rollback Chain of Dependent Migrations

If migration B depends on A, you must rollback B first:

1. **Check dependencies**:
```bash
tsx scripts/migration-manager.ts check 20250119_add_analytics_queue
```

Output shows dependent migrations that block rollback.

2. **Rollback in reverse order**:
```bash
# Rollback dependent first
tsx scripts/migration-manager.ts rollback 20250120_add_project_analytics

# Then rollback original
tsx scripts/migration-manager.ts rollback 20250119_add_analytics_queue
```

## Database Functions

### can_rollback_migration()

Check if migration can be safely rolled back:

```sql
SELECT * FROM can_rollback_migration('20250120_add_user_settings');
```

Returns:
```
can_rollback | reason                                      | dependent_migrations
-------------+--------------------------------------------+---------------------
true         | Migration can be safely rolled back        | {}
```

### execute_migration_rollback()

Execute a migration rollback:

```sql
SELECT * FROM execute_migration_rollback(
    '20250120_add_user_settings',
    false  -- dry_run: false = execute, true = preview only
);
```

Returns:
```
success | message                              | sql_executed
--------+-------------------------------------+---------------
true    | Migration rolled back successfully  | DROP TABLE...
```

### list_rollbackable_migrations()

List all migrations that can be rolled back:

```sql
SELECT * FROM list_rollbackable_migrations()
ORDER BY applied_at DESC
LIMIT 10;
```

### create_migration_snapshot()

Create snapshot before risky operation:

```sql
SELECT create_migration_snapshot(
    '20250120_risky_migration',
    'Snapshot before major schema change'
);
```

Returns snapshot UUID for reference.

## Safety Features

### 1. Dependency Validation

The system prevents rolling back a migration if other migrations depend on it:

```sql
-- Migration A creates table
-- Migration B adds foreign key to table from A
-- Migration C adds index to table from A

-- Attempting to rollback A will fail:
SELECT * FROM can_rollback_migration('migration_a');
-- Returns: can_rollback=false, reason="Cannot rollback: other migrations depend on this one"
```

### 2. Status Tracking

Migrations can only be rolled back if status is 'applied':

- `applied` - Can be rolled back
- `rolled_back` - Already rolled back, cannot rollback again
- `failed` - Rollback failed, manual intervention required

### 3. Checksum Verification

Each migration is tracked with a SHA-256 checksum to detect file tampering:

```typescript
// Automatically calculated during registration
checksum: sha256(migration_file_content)
```

If file is modified after applying, you'll be warned during rollback.

### 4. Audit Trail

Complete history of all migration operations:

```sql
SELECT
    migration_name,
    status,
    applied_at,
    applied_by,
    rollback_at,
    rollback_by
FROM migration_history
WHERE migration_name = '20250120_add_user_settings';
```

### 5. Transactional Rollbacks

All rollback operations are wrapped in transactions - either fully succeeds or fully fails.

## Best Practices

### 1. Always Write Rollback SQL

**Bad**:
```sql
CREATE TABLE users (id UUID PRIMARY KEY);
-- No rollback section
```

**Good**:
```sql
CREATE TABLE users (id UUID PRIMARY KEY);

-- ROLLBACK START
DROP TABLE IF EXISTS users CASCADE;
-- ROLLBACK END
```

### 2. Test Rollbacks Locally

Before deploying to production:

```bash
# Apply migration locally
supabase db push

# Test rollback with dry-run
tsx scripts/migration-manager.ts rollback 20250120_new_feature --dry-run

# Execute rollback
tsx scripts/migration-manager.ts rollback 20250120_new_feature

# Re-apply to verify
supabase db push
```

### 3. Document Complex Rollbacks

```sql
-- ROLLBACK START

-- Step 1: Remove foreign key constraints first
ALTER TABLE child_table DROP CONSTRAINT IF EXISTS fk_parent;

-- Step 2: Drop dependent indexes
DROP INDEX IF EXISTS idx_parent_data;

-- Step 3: Finally drop the table
DROP TABLE IF EXISTS parent_table CASCADE;

-- ROLLBACK END
```

### 4. Preserve Data When Possible

For column drops, consider archiving data:

```sql
-- UP: Add archive table before dropping column
CREATE TABLE archived_user_emails AS
SELECT id, email FROM users;

ALTER TABLE users DROP COLUMN email;

-- ROLLBACK START
-- Restore email column
ALTER TABLE users ADD COLUMN email TEXT;

-- Restore data from archive
UPDATE users u
SET email = a.email
FROM archived_user_emails a
WHERE u.id = a.id;

-- Cleanup archive
DROP TABLE IF EXISTS archived_user_emails;
-- ROLLBACK END
```

### 5. Version Dependencies Explicitly

When migrations depend on each other, document it:

```sql
-- Migration: 20250120_add_project_tags.sql
-- Depends on: 20250119_add_tags_table.sql
--
-- This migration adds project_tags junction table
-- which requires tags table from 20250119

CREATE TABLE project_tags (
    project_id UUID REFERENCES projects(id),
    tag_id UUID REFERENCES tags(id),  -- from 20250119
    PRIMARY KEY (project_id, tag_id)
);

-- ROLLBACK START
DROP TABLE IF EXISTS project_tags CASCADE;
-- ROLLBACK END
```

## Troubleshooting

### Error: "Cannot rollback: other migrations depend on this one"

**Solution**: Rollback dependent migrations first:

```bash
# Check which migrations depend on it
tsx scripts/migration-manager.ts check 20250119_base_migration

# Rollback dependents in reverse order
tsx scripts/migration-manager.ts rollback 20250120_dependent_migration
tsx scripts/migration-manager.ts rollback 20250119_base_migration
```

### Error: "No rollback SQL defined for this migration"

**Solution**: Add rollback SQL to the migration file:

```bash
# Generate template
tsx scripts/migration-manager.ts template 20250120_my_migration

# Edit migration file and add rollback section
# Re-register
tsx scripts/migration-manager.ts register 20250120_my_migration
```

### Error: "Rollback failed: table does not exist"

**Cause**: Rollback SQL is incorrect or migration wasn't fully applied.

**Solution**:

1. Check migration status:
```sql
SELECT * FROM migration_history WHERE migration_name = '20250120_failed_migration';
```

2. If status is 'failed', manually fix and update:
```sql
-- Fix the issue manually
-- Then update status
UPDATE migration_history
SET status = 'rolled_back'
WHERE migration_name = '20250120_failed_migration';
```

### Rollback Succeeded But App Still Broken

**Possible causes**:
1. Application code still references rolled-back schema
2. Cached data in application
3. Other migrations added new dependencies

**Solution**:
1. Deploy matching application code
2. Clear application cache
3. Check for additional migrations that need rollback

## Production Rollback Checklist

Before rolling back in production:

- [ ] Tested rollback in staging environment
- [ ] Verified application code compatible with rolled-back schema
- [ ] Checked for dependent migrations
- [ ] Created database backup
- [ ] Scheduled maintenance window
- [ ] Notified team/users of downtime
- [ ] Prepared rollback of rollback plan (re-apply migration)
- [ ] Documented reason for rollback

During rollback:

- [ ] Enable maintenance mode
- [ ] Execute dry-run first
- [ ] Take final backup
- [ ] Execute rollback
- [ ] Verify database state
- [ ] Deploy matching application version
- [ ] Run smoke tests
- [ ] Monitor error rates

After rollback:

- [ ] Document what went wrong
- [ ] Update migration with fixes
- [ ] Plan re-deployment
- [ ] Disable maintenance mode
- [ ] Notify team/users

## Advanced Usage

### Rollback Multiple Migrations

```bash
# Create a batch rollback script
cat > rollback-batch.sh << 'EOF'
#!/bin/bash
MIGRATIONS=(
    "20250122_feature_c"
    "20250121_feature_b"
    "20250120_feature_a"
)

for migration in "${MIGRATIONS[@]}"; do
    echo "Rolling back $migration..."
    tsx scripts/migration-manager.ts rollback "$migration"
    if [ $? -ne 0 ]; then
        echo "Rollback failed at $migration"
        exit 1
    fi
done
EOF

chmod +x rollback-batch.sh
./rollback-batch.sh
```

### Automated Rollback on Deploy Failure

```yaml
# .github/workflows/deploy.yml
- name: Deploy Database Migrations
  id: migrate
  run: |
    LAST_MIGRATION=$(tsx scripts/migration-manager.ts list | tail -1 | awk '{print $1}')
    supabase db push
    echo "last_migration=$LAST_MIGRATION" >> $GITHUB_OUTPUT

- name: Deploy Application
  id: deploy
  run: |
    vercel deploy --prod

- name: Rollback on Failure
  if: failure() && steps.deploy.outcome == 'failure'
  run: |
    tsx scripts/migration-manager.ts rollback ${{ steps.migrate.outputs.last_migration }}
```

### Query Migration History

```sql
-- Migrations applied in last 7 days
SELECT
    migration_name,
    applied_at,
    applied_by,
    status
FROM migration_history
WHERE applied_at > NOW() - INTERVAL '7 days'
ORDER BY applied_at DESC;

-- Migrations that have been rolled back
SELECT
    migration_name,
    applied_at,
    rollback_at,
    rollback_by,
    notes
FROM migration_history
WHERE status = 'rolled_back'
ORDER BY rollback_at DESC;

-- Migrations without rollback SQL
SELECT
    migration_name,
    applied_at
FROM migration_history
WHERE (rollback_sql IS NULL OR rollback_sql = '')
  AND status = 'applied';
```

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [Database Connection Pooling](./DATABASE_CONNECTION_POOLING.md)
- [Supabase RLS Policies](./RLS_POLICIES.md)

## References

- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Supabase CLI Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migration-strategies)
