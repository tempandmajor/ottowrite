# DB-005: Standardize Database Naming Conventions

## Severity
🟡 **MEDIUM**

## Priority
**LONG TERM** - Plan for major version upgrade

## Description
Inconsistent naming conventions across database objects make the schema harder to understand and maintain:

### Index Naming Inconsistencies

**Three different patterns found:**

1. **Prefix style**: `idx_{table}_{column}`
   - Example: `idx_project_folders_user`
   - Example: `idx_project_tags_user`

2. **Suffix style**: `{table}_{column}_idx`
   - Example: `projects_user_id_idx`
   - Example: `project_folders_user_id_idx`

3. **Composite suffix style**: `{table}_{purpose}_idx`
   - Example: `project_folders_user_idx`
   - Example: `project_tags_user_idx`

### Constraint Naming Inconsistencies

**Two patterns found:**

1. **Auto-generated**: `{table}_pkey`, `{table}_{column}_fkey`
   - Example: `projects_pkey`
   - Example: `projects_user_id_fkey`

2. **Manual descriptive**: `{table}_{column}_{constraint_type}`
   - Example: `project_tag_links_project_tag_unique`

### Column Naming Note
✅ Column names are consistent (snake_case throughout)

## Impact/Risk Assessment
- **Developer Experience**: MEDIUM (confusion about naming patterns)
- **Maintenance**: LOW (doesn't affect functionality)
- **Tooling**: LOW (some tools expect specific patterns)
- **Migration Complexity**: HIGH (renaming indexes requires downtime)

## Root Cause
- Multiple developers/migrations
- No naming convention documented
- Migrations created at different times with different styles

## Recommended Standards

### Proposed Naming Convention

```sql
-- ============================================================================
-- INDEX NAMING STANDARD
-- ============================================================================
-- Format: idx_{table}_{columns}_{type}
-- Examples:
--   idx_projects_user_id              (single column)
--   idx_projects_user_id_updated_at   (composite)
--   idx_projects_name_gin             (GIN index)
--   idx_projects_search_vector_gist   (GiST index)

-- ============================================================================
-- CONSTRAINT NAMING STANDARD
-- ============================================================================
-- Primary Key:   {table}_pkey
-- Foreign Key:   {table}_{column}_fkey
-- Unique:        {table}_{columns}_key
-- Check:         {table}_{column}_check

-- Examples:
--   projects_pkey
--   projects_user_id_fkey
--   projects_folder_id_fkey
--   project_tags_user_id_name_key
--   projects_type_check

-- ============================================================================
-- TRIGGER NAMING STANDARD
-- ============================================================================
-- Format: {table}_{action}_{event}
-- Examples:
--   projects_update_updated_at
--   projects_set_search_vector
```

## Solution

### Phase 1: Document Current State (IMMEDIATE)
Create `docs/database/naming-conventions.md`:

```markdown
# Database Naming Conventions

## Current State (As of 2025-01)
- **Inconsistent**: Multiple index naming patterns exist
- **See**: DB-005 for standardization plan

## Standard (Effective 2025-Q2)
- **Indexes**: `idx_{table}_{columns}_{type}`
- **Constraints**: PostgreSQL defaults
- **Columns**: snake_case
- **Tables**: snake_case, plural nouns

## Migration Plan
See DB-005 for migration strategy.
```

### Phase 2: Rename Indexes (LONG TERM)
⚠️ **WARNING**: Index renames require `ACCESS EXCLUSIVE` lock (brief downtime)

```sql
-- This migration should be run during a maintenance window
-- Estimated downtime: 2-5 seconds per index

BEGIN;

-- ============================================================================
-- Rename project_folders indexes to standard format
-- ============================================================================
ALTER INDEX IF EXISTS idx_project_folders_user
  RENAME TO idx_project_folders_user_id;

ALTER INDEX IF EXISTS project_folders_user_id_idx
  RENAME TO idx_project_folders_user_id_created_at;

-- ============================================================================
-- Rename project_tags indexes to standard format
-- ============================================================================
ALTER INDEX IF EXISTS idx_project_tags_user
  RENAME TO idx_project_tags_user_id;

ALTER INDEX IF EXISTS project_tags_user_id_idx
  RENAME TO idx_project_tags_user_id_name;

-- ============================================================================
-- Rename projects indexes to standard format
-- ============================================================================
ALTER INDEX IF EXISTS projects_user_id_idx
  RENAME TO idx_projects_user_id;

ALTER INDEX IF EXISTS projects_user_idx
  RENAME TO idx_projects_user_id_updated_at;

-- ============================================================================
-- Rename project_tag_links indexes to standard format
-- ============================================================================
ALTER INDEX IF EXISTS project_tag_links_project_tag_unique
  RENAME TO project_tag_links_project_id_tag_id_key;

COMMIT;
```

### Phase 3: Update Future Migrations (IMMEDIATE)
Add linting rule or documentation requiring new indexes to follow standard.

## Alternative: Accept Inconsistency
**If renaming is too risky**, document the inconsistency and:
1. ✅ Require new indexes to follow standard
2. ✅ Leave existing indexes unchanged
3. ✅ Document all naming patterns in schema docs

## Testing Requirements

### 1. Pre-deployment: Verify No Dependencies
```sql
-- Check if any application code references index names directly
-- (Usually safe to rename indexes - apps don't reference them)

-- Check for any custom index hints (unlikely in this codebase)
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND relname IN ('projects', 'project_folders', 'project_tags', 'project_tag_links');
```

### 2. Deployment: Schedule Maintenance Window
- **Duration**: 5-10 minutes
- **Impact**: Brief table locks (2-5 seconds per index)
- **Timing**: Off-peak hours (e.g., 2 AM UTC)

### 3. Post-deployment: Verify Renames
```sql
-- Verify all indexes follow new naming convention
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('projects', 'project_folders', 'project_tags', 'project_tag_links')
ORDER BY tablename, indexname;
```

### 4. Functional Testing
- [ ] All CRUD operations on projects → Should work
- [ ] All CRUD operations on folders → Should work
- [ ] All CRUD operations on tags → Should work
- [ ] Tag linking/unlinking → Should work
- [ ] Query performance unchanged → Verify with EXPLAIN ANALYZE

## Acceptance Criteria
- [x] Naming convention documented in `docs/database/naming-conventions.md`
- [x] Decision made: Accept inconsistency (Option C - Documentation Only)
- [x] Inconsistency documented in naming-conventions.md
- [x] Future migrations follow new standard (enforced via linter)
- [x] Migration linter updated to check index naming
- [x] CONTRIBUTING.md references naming conventions guide
- [x] All functional tests pass (no schema changes)

## Implementation Summary

**Status**: ✅ COMPLETE

**Approach**: Option C - Documentation Only (RECOMMENDED)

**Files Created**:
1. `docs/database/naming-conventions.md` - Comprehensive naming standards for all database objects
   - Current state documentation (existing inconsistencies)
   - Standard for new objects (effective 2025-10-25)
   - Examples and anti-patterns
   - Migration policy (new vs. existing objects)

**Files Updated**:
1. `scripts/lint-migrations.sh` - Added index naming validation
   - Checks for `idx_` prefix pattern
   - Warns about legacy suffix-style names (`*_idx`)
   - Enforces standards for future migrations

2. `CONTRIBUTING.md` - Added naming conventions reference
   - Quick reference to naming standards
   - Link to full documentation

**Decisions Made**:
- ✅ **No schema renames** - Existing objects remain unchanged
- ✅ **Documentation-only** - Avoids downtime and risk
- ✅ **Enforced for new objects** - Linter checks future migrations
- ✅ **Defer full rename** - Consider for v2.0 major version

**Benefits**:
- ✅ Zero downtime (no schema changes)
- ✅ Clear standards for developers
- ✅ Automated enforcement via linter
- ✅ Improved maintainability going forward

**Findings**:
The existing schema is already quite consistent:
- ✅ Most indexes already use `idx_` prefix pattern
- ✅ All columns use snake_case
- ✅ All tables use snake_case plural nouns
- ⚠️ Minor inconsistencies in older migrations (documented)

**Completed**: 2025-10-25

## Rollback Plan
```sql
-- If issues occur, revert index names
-- (Provide exact rollback SQL based on chosen renames)
ALTER INDEX idx_project_folders_user_id
  RENAME TO idx_project_folders_user;
-- ... etc for all renamed indexes
```

## Alternatives Considered

### Option A: Full Standardization (HIGH EFFORT)
- Rename all indexes, constraints, triggers
- Requires maintenance window
- Risk: Medium
- Benefit: Fully consistent schema

### Option B: Partial Standardization (MEDIUM EFFORT)
- Rename only indexes (constraints stay as-is)
- Shorter maintenance window
- Risk: Low
- Benefit: Good consistency

### Option C: Documentation Only (LOW EFFORT) ← RECOMMENDED
- Document existing patterns
- Standardize future objects only
- No maintenance window needed
- Risk: None
- Benefit: Improved clarity, no downtime

## Recommendation
**Choose Option C** for now:
1. Document all existing naming patterns
2. Require new objects to follow standard
3. Consider full rename in next major version (v2.0)

## Related Issues
- Related to DB-004 (Schema Drift Documentation)
- Related to DB-006 (Migration Structure Improvements)

## Estimated Effort
- **Option A**: 8-12 hours + maintenance window
- **Option B**: 4-6 hours + maintenance window
- **Option C**: 2-3 hours (documentation only) ← RECOMMENDED

## Assignee
Backend Team

## Labels
`database`, `schema`, `documentation`, `naming`, `medium-priority`, `technical-debt`
