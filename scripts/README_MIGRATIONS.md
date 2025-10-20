# Migration Management Scripts

Quick reference for database migration rollback tools.

## Prerequisites

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Quick Commands

```bash
# List all rollbackable migrations
npm run migration:list

# Sync migration files with database
npm run migration:sync

# Check specific migration
npm run migration:check 20250120_migration_name

# Rollback with dry-run (preview only)
npm run migration:rollback 20250120_migration_name --dry-run

# Execute rollback (with confirmation)
npm run migration:rollback 20250120_migration_name
```

## Advanced Usage

```bash
# Direct script execution for more options
tsx scripts/migration-manager.ts template 20250120_migration_name
tsx scripts/migration-manager.ts register 20250120_migration_name
```

## Writing Migrations with Rollback

Add rollback section to your migration files:

```sql
-- UP MIGRATION
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL
);

-- ROLLBACK START
DROP TABLE IF EXISTS users CASCADE;
-- ROLLBACK END
```

## Full Documentation

See [docs/DATABASE_MIGRATION_ROLLBACKS.md](../docs/DATABASE_MIGRATION_ROLLBACKS.md) for complete guide.
