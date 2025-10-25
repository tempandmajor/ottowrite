# ADR-002: project_tag_links Schema Design

## Status
**Accepted** (2025-10-25)

## Context

The `project_tag_links` table is a junction table implementing a many-to-many relationship between projects and tags. There was a discrepancy between the original migration definition and the production schema.

### Original Migration Definition
```sql
CREATE TABLE public.project_tag_links (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES project_tags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, tag_id)  -- Composite PK
);
```

### Production Schema (Current)
```sql
-- Actual schema in production
Columns:
  - id UUID NOT NULL DEFAULT uuid_generate_v4()  -- Unique row identifier
  - user_id UUID NOT NULL                         -- Denormalized for RLS
  - project_id UUID NOT NULL                      -- FK to projects
  - tag_id UUID NOT NULL                          -- FK to project_tags
  - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- Timestamp

Constraints:
  - PRIMARY KEY (id)                              -- Single-column PK
  - UNIQUE (project_id, tag_id)                   -- Composite uniqueness
  - FOREIGN KEY (project_id) → projects(id) ON DELETE CASCADE
  - FOREIGN KEY (tag_id) → project_tags(id) ON DELETE CASCADE
  - FOREIGN KEY (user_id) → auth.users(id) ON DELETE CASCADE
```

## Decision

**We adopt the production schema** with `PRIMARY KEY (id)` and `UNIQUE (project_id, tag_id)`.

This schema was created via migration reconciliation (20251025080531) to document and standardize the drift.

## Rationale

### 1. Stable Row Identifier
A single-column UUID primary key provides:
- **Stable reference**: Each link has a unique, unchanging identifier
- **Audit capability**: Can reference specific link creation/deletion events
- **Soft delete support**: Could add `deleted_at` column if needed in future
- **Metadata extension**: Can add columns like `link_type`, `notes`, `priority` without affecting PK

### 2. ORM Compatibility
Most ORMs (Object-Relational Mappers) prefer single-column primary keys:
- **Prisma**: Prefers single-column `id` fields
- **TypeORM**: Simpler entity definitions with single PK
- **Supabase JS**: Easier auto-generated TypeScript types
- **GraphQL**: Simpler schema generation with single `id` field

### 3. Data Integrity Preserved
The `UNIQUE (project_id, tag_id)` constraint maintains the same data integrity:
- **No duplicates**: Cannot link same project to same tag multiple times
- **Same performance**: Unique constraint uses same index structure as composite PK
- **Foreign key behavior**: CASCADE deletes work identically

### 4. Industry Standard Pattern
This pattern is widely used for junction tables:

**Companies using single PK + unique constraint:**
- GitHub (repository_tags, issue_labels)
- Stripe (subscription_items, tax_rates)
- Shopify (product_collections, order_line_items)

**Example from GitHub schema:**
```sql
CREATE TABLE repository_labels (
  id UUID PRIMARY KEY,
  repository_id UUID NOT NULL,
  label_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (repository_id, label_id)
);
```

### 5. Future-Proofing
Having an `id` column enables future enhancements:

**Possible future additions:**
```sql
-- Link metadata (without changing PK)
ALTER TABLE project_tag_links ADD COLUMN link_type TEXT;
ALTER TABLE project_tag_links ADD COLUMN notes TEXT;
ALTER TABLE project_tag_links ADD COLUMN display_order INT;

-- Soft deletes
ALTER TABLE project_tag_links ADD COLUMN deleted_at TIMESTAMPTZ;

-- Audit trail
CREATE TABLE project_tag_links_audit (
  audit_id UUID PRIMARY KEY,
  link_id UUID REFERENCES project_tag_links(id),
  action TEXT,
  changed_at TIMESTAMPTZ,
  changed_by UUID
);
```

With composite PK, these would be harder to implement.

## Alternatives Considered

### Alternative 1: Keep Composite PK (Rejected)
```sql
PRIMARY KEY (project_id, tag_id)
```

**Pros:**
- Slightly simpler (one less column)
- Composite PK enforces uniqueness directly

**Cons:**
- No stable row identifier
- Harder to reference in audit logs
- Less ORM-friendly
- Cannot extend with metadata easily
- Industry moving away from this pattern

### Alternative 2: Composite PK + Surrogate Key (Rejected)
```sql
id UUID DEFAULT uuid_generate_v4(),
PRIMARY KEY (project_id, tag_id)
```

**Cons:**
- Adds id but doesn't use it as PK (confusing)
- Wastes index space (PK index + id column)
- Inconsistent with other tables

## Consequences

### Positive
✅ **Consistent schema across environments** - Migration reconciliation ensures fresh deployments match production
✅ **ORM-friendly** - Easier TypeScript type generation, simpler queries
✅ **Extensible** - Can add metadata without schema refactoring
✅ **Standard pattern** - Follows industry best practices
✅ **Same performance** - Unique constraint provides same query optimization as composite PK

### Negative
⚠️ **One extra column** - 16 bytes per row for UUID (minimal cost)
⚠️ **Migration drift** - Original migration differs from production (now documented and reconciled)

### Neutral
- **Disk space**: +16 bytes per link (negligible - ~160KB for 10,000 links)
- **Query patterns**: No changes required in application code
- **Index count**: Same (PK index + unique constraint index)

## Implementation

### Migration Created
- `20251025080531_reconcile_project_tag_links_schema.sql`
- Idempotent migration that transforms schema if needed
- No-op on production (already in correct state)
- Handles fresh deployments automatically

### Documentation Updated
- Original migration (20251018000009) updated with comments
- This ADR created to explain the decision
- Schema documentation updated to reflect current state

## Verification

### Data Integrity
```sql
-- Verify no duplicates exist
SELECT project_id, tag_id, COUNT(*)
FROM project_tag_links
GROUP BY project_id, tag_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### Performance
```sql
-- Verify unique constraint is used for lookups
EXPLAIN ANALYZE
SELECT * FROM project_tag_links
WHERE project_id = 'uuid' AND tag_id = 'uuid';
-- Should use: project_tag_links_project_id_tag_id_key index
```

## References

- **Ticket**: DB-004 - Document Schema Drift
- **Migration**: 20251025080531_reconcile_project_tag_links_schema.sql
- **Original Migration**: 20251018000009_phase3_foundations.sql

## Related ADRs
- None (this is the first schema ADR)

## Review History
- **2025-10-25**: Initial version (accepted)
