# Database Naming Conventions

> Official naming standards for OttoWrite database objects. This document establishes consistency for future schema changes while documenting existing patterns.

## Table of Contents

- [Overview](#overview)
- [Current State](#current-state)
- [Standard (Effective 2025-10-25)](#standard-effective-2025-10-25)
- [Examples](#examples)
- [Migration Policy](#migration-policy)
- [Enforcement](#enforcement)

---

## Overview

### Status

- **Decision**: Documentation-only approach (Option C from DB-005)
- **Effective Date**: 2025-10-25
- **Applies To**: All new database objects created after this date
- **Existing Objects**: Remain unchanged to avoid downtime

### Why Standardization Matters

- ✅ **Consistency** - Predictable patterns reduce cognitive load
- ✅ **Maintainability** - Easy to understand schema at a glance
- ✅ **Tooling** - Some tools expect specific naming conventions
- ✅ **Documentation** - Clearer when patterns are consistent

---

## Current State

### Documented Inconsistencies

The schema contains multiple naming patterns due to migrations created at different times:

#### Index Naming Patterns (3 variants found)

1. **Prefix style** (RECOMMENDED going forward):
   ```sql
   idx_projects_user_id
   idx_project_folders_parent_id
   idx_documents_project_id
   ```

2. **Suffix style** (legacy):
   ```sql
   projects_user_id_idx
   project_folders_user_id_idx
   ```

3. **Composite suffix style** (legacy):
   ```sql
   project_folders_user_idx
   project_tags_user_idx
   ```

#### Constraint Naming Patterns (2 variants found)

1. **Auto-generated** (PostgreSQL defaults):
   ```sql
   projects_pkey                      -- Primary key
   projects_user_id_fkey              -- Foreign key
   ```

2. **Manual descriptive**:
   ```sql
   project_tag_links_project_tag_unique  -- Unique constraint
   ```

### What's Consistent

✅ **Column names**: All use `snake_case` consistently
✅ **Table names**: All use `snake_case` plural nouns
✅ **Function names**: All use `snake_case`

---

## Standard (Effective 2025-10-25)

All **new** database objects must follow these conventions:

### Tables

**Format**: `{entity_plural}` in `snake_case`

**Rules**:
- Use plural nouns (e.g., `projects`, not `project`)
- Use descriptive names (avoid abbreviations)
- Maximum 63 characters (PostgreSQL limit)

**Examples**:
```sql
✅ projects
✅ project_folders
✅ project_tags
✅ project_tag_links
✅ manuscript_submissions
❌ proj (too abbreviated)
❌ ProjectFolders (wrong case)
❌ project (should be plural)
```

---

### Columns

**Format**: `{attribute}` in `snake_case`

**Rules**:
- Use snake_case for multi-word names
- Boolean columns: `is_{adjective}` or `has_{noun}`
- Timestamp columns: `{action}_at` (e.g., `created_at`, `updated_at`)
- Foreign keys: `{table_singular}_id`

**Examples**:
```sql
✅ user_id
✅ created_at
✅ is_public
✅ has_watermark
✅ folder_id
❌ userId (camelCase)
❌ CreatedAt (PascalCase)
❌ folder (missing _id)
```

---

### Indexes

**Format**: `idx_{table}_{columns}_{type}`

**Components**:
- **Prefix**: Always `idx_`
- **Table**: Table name (without `public.`)
- **Columns**: Underscore-separated column names
- **Type**: Optional suffix for special index types

**Column Order**: Match the index column order

**Type Suffixes**:
- `_gin` - GIN index
- `_gist` - GiST index
- `_hash` - Hash index
- `_brin` - BRIN index
- (no suffix) - B-tree index (default)

**Examples**:
```sql
-- Single column indexes
✅ idx_projects_user_id
✅ idx_documents_project_id
✅ idx_project_folders_parent_id

-- Composite indexes
✅ idx_projects_user_id_updated_at
✅ idx_projects_user_id_folder_id_type
✅ idx_project_tags_user_id_name

-- Special index types
✅ idx_projects_genre_gin              -- GIN index on array column
✅ idx_projects_search_vector_gin      -- GIN index for full-text search
✅ idx_documents_content_gin           -- GIN index on JSONB

-- Partial indexes (add descriptive suffix)
✅ idx_analytics_jobs_scheduled        -- Partial index with WHERE clause
✅ idx_metric_events_unread            -- WHERE is_read = false
```

**Anti-patterns**:
```sql
❌ projects_user_id_idx                -- Wrong: Suffix style
❌ project_folders_user_idx            -- Wrong: Missing column name
❌ idx_proj_user                       -- Wrong: Abbreviated table name
❌ user_id_idx                         -- Wrong: Missing table name
```

---

### Constraints

#### Primary Keys

**Format**: `{table}_pkey`

**Examples**:
```sql
✅ projects_pkey
✅ project_folders_pkey
✅ user_profiles_pkey
```

#### Foreign Keys

**Format**: `{table}_{column}_fkey`

**Examples**:
```sql
✅ projects_user_id_fkey
✅ projects_folder_id_fkey
✅ documents_project_id_fkey
```

#### Unique Constraints

**Format**: `{table}_{columns}_key`

**Examples**:
```sql
✅ project_tags_user_id_name_key
✅ project_tag_links_project_id_tag_id_key
✅ user_profiles_stripe_customer_id_key
```

#### Check Constraints

**Format**: `{table}_{column}_check`

**Examples**:
```sql
✅ projects_type_check
✅ documents_type_check
✅ user_profiles_subscription_tier_check
```

**Note**: PostgreSQL auto-generates these names. You can override with:
```sql
CONSTRAINT projects_type_check CHECK (type IN ('novel', 'screenplay', ...))
```

---

### Functions

**Format**: `{verb}_{noun}` or `{action_description}` in `snake_case`

**Examples**:
```sql
✅ refresh_user_plan_usage
✅ enforce_project_limit
✅ create_document_version
✅ update_updated_at_column
❌ refreshUserPlanUsage (camelCase)
❌ RefreshUsage (PascalCase)
```

---

### Triggers

**Format**: `{table}_{action}_{event}`

**Components**:
- **Table**: Table name
- **Action**: What the trigger does (e.g., `update`, `set`, `enforce`)
- **Event**: What it updates (e.g., `updated_at`, `search_vector`)

**Examples**:
```sql
✅ projects_update_updated_at
✅ projects_set_search_vector
✅ documents_update_updated_at
✅ documents_enforce_limit
```

---

### Views

**Format**: `{description}` in `snake_case` (no special prefix)

**Examples**:
```sql
✅ manuscript_access_summary
✅ user_subscription_status
✅ project_statistics
❌ vw_manuscript_access (no prefix needed)
```

---

## Examples

### Creating a New Table with Standard Naming

```sql
-- ✅ CORRECT: Follows all naming standards
CREATE TABLE public.character_relationships (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys (singular_id pattern)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Attributes (snake_case)
  relationship_type TEXT NOT NULL,
  description TEXT,

  -- Booleans (is_ prefix)
  is_primary BOOLEAN DEFAULT false,

  -- Timestamps (_at suffix)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints (descriptive names)
  CONSTRAINT character_relationships_type_check
    CHECK (relationship_type IN ('family', 'friend', 'enemy', 'romantic'))
);

-- ✅ Standard indexes
CREATE INDEX idx_character_relationships_user_id
  ON character_relationships(user_id);

CREATE INDEX idx_character_relationships_character_id
  ON character_relationships(character_id);

CREATE INDEX idx_character_relationships_related_character_id
  ON character_relationships(related_character_id);

-- ✅ Composite index
CREATE INDEX idx_character_relationships_character_related
  ON character_relationships(character_id, related_character_id);

-- ✅ Unique constraint
ALTER TABLE character_relationships
  ADD CONSTRAINT character_relationships_character_related_key
  UNIQUE (character_id, related_character_id);

-- ✅ Standard trigger
CREATE TRIGGER character_relationships_update_updated_at
  BEFORE UPDATE ON character_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration Policy

### For New Objects (REQUIRED)

All new database objects **must** follow the naming standards above.

**Enforcement**:
- Migration linter checks index names
- Code review checklist includes naming verification
- Documentation updated when new patterns emerge

### For Existing Objects (OPTIONAL)

Existing objects may retain their current names to avoid downtime.

**Rationale**:
- Renaming indexes requires `ACCESS EXCLUSIVE` locks (brief downtime)
- Index names are internal (apps don't reference them directly)
- Risk outweighs benefit for production systems

**Future Consideration**:
- Full rename may occur during next major version (v2.0)
- See DB-005 ticket for detailed migration plan

---

## Enforcement

### Pre-commit Checks

The migration linter (`scripts/lint-migrations.sh`) validates:
- ✅ Index names follow `idx_{table}_{columns}` pattern
- ✅ Indexes have descriptive names (not auto-generated)
- ✅ Function names use snake_case

### Code Review Checklist

When reviewing migrations, verify:
- [ ] Table names are plural snake_case
- [ ] Column names use snake_case
- [ ] Indexes follow `idx_` prefix pattern
- [ ] Constraints use PostgreSQL default naming
- [ ] Functions use descriptive snake_case names
- [ ] Triggers follow `{table}_{action}_{event}` pattern

### Linter Output Example

```bash
$ ./scripts/lint-migrations.sh supabase/migrations/20251025000000_new_migration.sql

Checking: 20251025000000_new_migration.sql
  ✓ Filename follows naming convention
  ✓ Has migration header
  ⚠️  WARNING: Index name doesn't follow standard
      Found: projects_user_id_idx
      Expected: idx_projects_user_id
  ✓ Uses IF NOT EXISTS for idempotency
```

---

## Related Documentation

- **[Schema Overview](./schema-overview.md)** - Detailed table descriptions
- **[Migration Guidelines](./migration-guidelines.md)** - Migration best practices
- **[DB-005 Ticket](../tickets/DB-005-standardize-naming-conventions.md)** - Original standardization proposal

---

## Changelog

### 2025-10-25 - Initial Standard

- Established naming conventions for all database objects
- Documented existing inconsistencies
- Chose documentation-only approach (no renames)
- Updated migration linter to enforce standards

---

**Last Updated**: 2025-10-25
**Status**: Active
**Owner**: Backend Team
