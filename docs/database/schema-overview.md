# Database Schema Overview

> Comprehensive documentation of the OttoWrite database schema, relationships, and design decisions.

## Table of Contents

- [Core Entities](#core-entities)
  - [Users (auth.users)](#users-authusers)
  - [User Profiles (public.user_profiles)](#user-profiles-publicuser_profiles)
  - [Projects (public.projects)](#projects-publicprojects)
  - [Documents (public.documents)](#documents-publicdocuments)
  - [Project Folders (public.project_folders)](#project-folders-publicproject_folders)
  - [Project Tags (public.project_tags)](#project-tags-publicproject_tags)
  - [Project Tag Links (public.project_tag_links)](#project-tag-links-publicproject_tag_links)
  - [AI Usage (public.ai_usage)](#ai-usage-publicai_usage)
  - [User Plan Usage (public.user_plan_usage)](#user-plan-usage-publicuser_plan_usage)
  - [Subscription Plan Limits (public.subscription_plan_limits)](#subscription-plan-limits-publicsubscription_plan_limits)
- [Design Decisions](#design-decisions)
- [Row-Level Security (RLS)](#row-level-security-rls)
- [Performance Considerations](#performance-considerations)

---

## Core Entities

### Users (auth.users)

Managed by **Supabase Auth**. Contains user authentication data including email, encrypted password, and auth metadata.

**Access Pattern**: All queries in `public` schema filter by `auth.uid()` for multi-tenant isolation.

**Key Relationships**:
- One-to-one with `user_profiles` (billing and subscription data)
- One-to-many with `projects`, `documents`, `folders`, `tags`
- One-to-many with `ai_usage` (AI usage tracking)

---

### User Profiles (public.user_profiles)

Extends Supabase Auth users with application-specific profile data, Stripe billing integration, and subscription management.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, FK → auth.users | User identifier (matches auth.users.id) |
| `email` | text | NOT NULL, UNIQUE | User email (denormalized from auth.users) |
| `stripe_customer_id` | text | UNIQUE | Stripe customer ID for billing |
| `stripe_subscription_id` | text | UNIQUE | Active Stripe subscription ID |
| `stripe_price_id` | text | | Stripe price ID for current plan |
| `subscription_status` | text | DEFAULT 'active' | Subscription status (active, canceled, past_due) |
| `subscription_tier` | text | CHECK constraint | Plan tier: `free`, `hobbyist`, `professional`, `studio` |
| `subscription_current_period_start` | timestamptz | | Billing period start |
| `subscription_current_period_end` | timestamptz | | Billing period end |
| `ai_words_used_this_month` | integer | DEFAULT 0 | AI word count for current billing period |
| `ai_words_reset_date` | timestamptz | | When AI usage counter resets |
| `created_at` | timestamptz | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | timestamptz | DEFAULT NOW() | Last profile update |

#### Relationships

- **1:1 with auth.users**: CASCADE delete when user account deleted
- **Referenced by**: Subscription and billing systems

#### RLS Policy

Users can only access their own profile:
```sql
CREATE POLICY "Users can manage their own profile"
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = id);
```

#### Indexes

- `idx_user_profiles_email` (email) - Email lookups
- `idx_user_profiles_stripe_customer` (stripe_customer_id) - Stripe webhooks

#### Common Queries

```sql
-- Get user's subscription details
SELECT subscription_tier, subscription_status, ai_words_used_this_month
FROM user_profiles
WHERE id = auth.uid();

-- Check if user has reached AI limit
SELECT
    up.ai_words_used_this_month,
    spl.ai_words_per_month AS limit
FROM user_profiles up
JOIN subscription_plan_limits spl ON up.subscription_tier = spl.plan
WHERE up.id = auth.uid();
```

---

### Projects (public.projects)

Main entity representing writing projects (novels, screenplays, etc.). Projects serve as containers for documents and organizational metadata.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique project identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | Project owner |
| `folder_id` | uuid | FK → project_folders, SET NULL | Optional folder for organization |
| `name` | text | NOT NULL | Project title (max 500 characters) |
| `type` | text | NOT NULL, CHECK constraint | Project type enum |
| `genre` | text[] | | Array of genre tags |
| `description` | text | | Optional project description |
| `search_vector` | tsvector | GENERATED ALWAYS | Full-text search index |
| `created_at` | timestamptz | DEFAULT NOW() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT NOW() | Last modification timestamp |

#### Project Types (CHECK Constraint)

- `novel` - Long-form fiction (typically 50,000+ words)
- `series` - Multi-book series
- `screenplay` - Film or TV script
- `play` - Stage play script
- `short_story` - Short fiction (< 50,000 words)

#### Relationships

- **Owned by one user** (many-to-one with auth.users)
- **Organized in zero or one folder** (many-to-one with project_folders)
- **Tagged with many tags** (many-to-many via project_tag_links)
- **Contains many documents** (one-to-many with documents)

#### RLS Policy

```sql
CREATE POLICY "Users can manage their own projects"
ON public.projects
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### Indexes

- `idx_projects_user_id` (user_id) - User's projects
- `projects_user_idx` (user_id, updated_at DESC) - Paginated lists
- `idx_projects_created_at` (created_at DESC) - Recent projects
- `idx_projects_folder_id` (folder_id) - Filter by folder
- `idx_projects_type` (type) - Filter by project type
- `idx_projects_genre_gin` (genre) - GIN index for array containment
- `idx_projects_search_vector_gin` (search_vector) - Full-text search
- `idx_projects_user_folder_type` (user_id, folder_id, type) WHERE folder_id IS NOT NULL - Composite filtering

#### Full-Text Search

The `search_vector` column is automatically generated:
```sql
search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
) STORED;
```

**Benefits**:
- Handles stemming (e.g., "running" matches "run")
- Supports ranking and relevance scoring
- Auto-updates when name or description changes
- Faster than LIKE queries

#### Common Queries

```sql
-- List user's projects sorted by recent activity
SELECT * FROM projects
WHERE user_id = auth.uid()
ORDER BY updated_at DESC
LIMIT 20;

-- Filter projects by folder and type
SELECT * FROM projects
WHERE user_id = auth.uid()
  AND folder_id = $1
  AND type = 'novel'
ORDER BY name;

-- Search projects by keyword
SELECT * FROM projects
WHERE user_id = auth.uid()
  AND search_vector @@ to_tsquery('english', $1)
ORDER BY ts_rank(search_vector, to_tsquery('english', $1)) DESC;

-- Filter by genre (array containment)
SELECT * FROM projects
WHERE user_id = auth.uid()
  AND genre @> ARRAY['fantasy']
ORDER BY updated_at DESC;
```

---

### Documents (public.documents)

Individual document files within projects. Each document contains rich-text content stored as ProseMirror JSON.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique document identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | Document owner |
| `project_id` | uuid | NOT NULL, FK → projects | Parent project |
| `title` | text | NOT NULL | Document title |
| `type` | text | NOT NULL, CHECK constraint | Document type (matches project types) |
| `content` | jsonb | DEFAULT '{}'::jsonb | ProseMirror document structure |
| `word_count` | integer | DEFAULT 0 | Cached word count |
| `position` | integer | DEFAULT 0 | Display order within project |
| `created_at` | timestamptz | DEFAULT NOW() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT NOW() | Last modification timestamp |

#### Relationships

- **Owned by one user** (many-to-one with auth.users)
- **Belongs to one project** (many-to-one with projects)
- **Associated with AI usage** (one-to-many with ai_usage)

#### RLS Policy

```sql
CREATE POLICY "Users can manage their own documents"
ON public.documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### Indexes

- `idx_documents_user_id` (user_id) - User's documents
- `idx_documents_project_id` (project_id) - Project's documents
- `idx_documents_updated_at` (updated_at DESC) - Recent documents

#### Content Structure

The `content` column stores ProseMirror JSON:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Chapter One..."
        }
      ]
    }
  ]
}
```

#### Common Queries

```sql
-- Get all documents in a project (ordered)
SELECT * FROM documents
WHERE user_id = auth.uid()
  AND project_id = $1
ORDER BY position ASC;

-- Get recent documents across all projects
SELECT d.*, p.name AS project_name
FROM documents d
JOIN projects p ON d.project_id = p.id
WHERE d.user_id = auth.uid()
ORDER BY d.updated_at DESC
LIMIT 10;

-- Update word count
UPDATE documents
SET word_count = $1, updated_at = NOW()
WHERE id = $2 AND user_id = auth.uid();
```

---

### Project Folders (public.project_folders)

Hierarchical folder system for organizing projects. Supports unlimited nesting depth via self-referencing foreign key.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique folder identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | Folder owner |
| `parent_id` | uuid | FK → project_folders | Parent folder (NULL = root) |
| `name` | text | NOT NULL | Folder name |
| `color` | text | | Optional hex color code for UI (e.g., '#FF5733') |
| `created_at` | timestamptz | DEFAULT NOW() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT NOW() | Last modification timestamp |

#### Relationships

- **Owned by one user** (many-to-one with auth.users)
- **Contains many projects** (one-to-many with projects)
- **Contains many child folders** (one-to-many with self)
- **Belongs to one parent folder** (many-to-one with self, nullable)

#### Cascade Behaviors

- **Deleting user**: CASCADE deletes all folders
- **Deleting parent folder**: CASCADE deletes child folders recursively
- **Deleting folder**: Sets `projects.folder_id = NULL` (projects move to root)

#### RLS Policy

```sql
CREATE POLICY "Users can manage their own folders"
ON public.project_folders
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### Indexes

- `project_folders_user_idx` (user_id, created_at DESC) - User's folders
- `project_folders_parent_idx` (parent_id) - Child folder lookups
- `idx_project_folders_user` (user_id, parent_id) - Composite filter

#### Common Queries

```sql
-- Get all root folders (no parent)
SELECT * FROM project_folders
WHERE user_id = auth.uid()
  AND parent_id IS NULL
ORDER BY name ASC;

-- Get folder hierarchy (recursive CTE)
WITH RECURSIVE folder_tree AS (
  -- Base case: root folders
  SELECT id, name, parent_id, color, 0 AS level, ARRAY[id] AS path
  FROM project_folders
  WHERE user_id = auth.uid() AND parent_id IS NULL

  UNION ALL

  -- Recursive case: child folders
  SELECT f.id, f.name, f.parent_id, f.color, t.level + 1, t.path || f.id
  FROM project_folders f
  JOIN folder_tree t ON f.parent_id = t.id
  WHERE f.user_id = auth.uid()
)
SELECT * FROM folder_tree
ORDER BY path;

-- Get child folders of a specific folder
SELECT * FROM project_folders
WHERE user_id = auth.uid()
  AND parent_id = $1
ORDER BY name ASC;

-- Get projects in folder (including counts)
SELECT
    f.*,
    COUNT(p.id) AS project_count
FROM project_folders f
LEFT JOIN projects p ON f.id = p.folder_id AND p.user_id = f.user_id
WHERE f.user_id = auth.uid()
GROUP BY f.id;
```

---

### Project Tags (public.project_tags)

User-defined tags for flexible project categorization. Tags are unique per user (case-insensitive).

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique tag identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | Tag owner |
| `name` | text | NOT NULL | Tag name (unique per user, case-insensitive) |
| `color` | text | | Optional hex color code for UI |
| `description` | text | | Optional tag description |
| `created_at` | timestamptz | DEFAULT NOW() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT NOW() | Last modification timestamp |

#### Constraints

- **UNIQUE (user_id, LOWER(name))**: Case-insensitive uniqueness per user
  - "Fantasy" and "fantasy" are treated as the same tag
  - Different users can have tags with the same name

#### Relationships

- **Owned by one user** (many-to-one with auth.users)
- **Links to many projects** (many-to-many via project_tag_links)

#### RLS Policy

```sql
CREATE POLICY "Users can manage their tags"
ON public.project_tags
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### Indexes

- `project_tags_user_idx` (user_id, name) - Sorted tag lists

#### Common Queries

```sql
-- Get all user's tags (sorted alphabetically)
SELECT * FROM project_tags
WHERE user_id = auth.uid()
ORDER BY name ASC;

-- Get tags for a specific project
SELECT t.*
FROM project_tags t
JOIN project_tag_links ptl ON t.id = ptl.tag_id
WHERE ptl.project_id = $1
  AND t.user_id = auth.uid()
ORDER BY t.name ASC;

-- Get tag usage counts
SELECT
    t.*,
    COUNT(ptl.project_id) AS project_count
FROM project_tags t
LEFT JOIN project_tag_links ptl ON t.id = ptl.tag_id
WHERE t.user_id = auth.uid()
GROUP BY t.id
ORDER BY project_count DESC, t.name ASC;

-- Create tag (with case-insensitive conflict handling)
INSERT INTO project_tags (user_id, name, color, description)
VALUES (auth.uid(), $1, $2, $3)
ON CONFLICT (user_id, LOWER(name)) DO NOTHING
RETURNING *;
```

---

### Project Tag Links (public.project_tag_links)

Junction table implementing many-to-many relationship between projects and tags. Includes denormalized `user_id` for RLS performance.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique link identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | Owner (denormalized for RLS) |
| `project_id` | uuid | NOT NULL, FK → projects | Project being tagged |
| `tag_id` | uuid | NOT NULL, FK → project_tags | Tag being applied |
| `created_at` | timestamptz | DEFAULT NOW() | When tag was applied |

#### Constraints

- **UNIQUE (project_id, tag_id)**: Prevents duplicate tag assignments
- **Foreign key to projects**: CASCADE delete when project deleted
- **Foreign key to project_tags**: CASCADE delete when tag deleted

#### Design Decision: Why Denormalize user_id?

**Problem**: RLS policies need to verify user ownership on every query.

**Without denormalization** (slow):
```sql
SELECT * FROM project_tag_links ptl
JOIN projects p ON ptl.project_id = p.id
WHERE p.user_id = auth.uid();  -- Requires JOIN for RLS check
```

**With denormalization** (fast):
```sql
SELECT * FROM project_tag_links
WHERE user_id = auth.uid();  -- Direct indexed lookup
```

**Trade-off**: Extra 16 bytes per row for significant query performance gain.

#### RLS Policy

```sql
CREATE POLICY "Users can manage their project tags"
ON public.project_tag_links
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### Indexes

- `project_tag_links_user_idx` (user_id) - User's tag links
- `idx_project_tag_links_tag_id` (tag_id) - Reverse lookup (tags to projects)

#### Common Queries

```sql
-- Add tag to project
INSERT INTO project_tag_links (user_id, project_id, tag_id)
VALUES (auth.uid(), $1, $2)
ON CONFLICT (project_id, tag_id) DO NOTHING;

-- Remove tag from project
DELETE FROM project_tag_links
WHERE project_id = $1
  AND tag_id = $2
  AND user_id = auth.uid();

-- Get all projects with a specific tag
SELECT p.*
FROM projects p
JOIN project_tag_links ptl ON p.id = ptl.project_id
WHERE ptl.tag_id = $1
  AND p.user_id = auth.uid()
ORDER BY p.updated_at DESC;

-- Get all tags for a project
SELECT t.*
FROM project_tags t
JOIN project_tag_links ptl ON t.id = ptl.tag_id
WHERE ptl.project_id = $1
  AND t.user_id = auth.uid()
ORDER BY t.name ASC;
```

---

### AI Usage (public.ai_usage)

Tracks all AI-powered content generation for billing, analytics, and usage limits enforcement.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique usage record identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | User who triggered AI generation |
| `document_id` | uuid | FK → documents, SET NULL | Associated document (nullable) |
| `model` | text | NOT NULL | AI model used (e.g., 'gpt-4', 'claude-3') |
| `words_generated` | integer | NOT NULL | Number of words generated |
| `prompt_tokens` | integer | NOT NULL | Input tokens consumed |
| `completion_tokens` | integer | NOT NULL | Output tokens generated |
| `total_cost` | numeric(10,6) | NOT NULL | Cost in USD (6 decimal precision) |
| `prompt_preview` | text | | First 200 chars of prompt (for debugging) |
| `created_at` | timestamptz | DEFAULT NOW() | Generation timestamp |

#### Relationships

- **Owned by one user** (many-to-one with auth.users)
- **Associated with one document** (many-to-one with documents, optional)

#### Cascade Behaviors

- **Deleting user**: CASCADE deletes all AI usage records
- **Deleting document**: SET NULL (preserves usage stats for billing)

#### RLS Policy

```sql
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

**Note**: INSERT/UPDATE/DELETE restricted to backend services only (not exposed via RLS).

#### Indexes

- `idx_ai_usage_user_id` (user_id) - User's AI usage
- `idx_ai_usage_created_at` (created_at DESC) - Temporal queries

#### Common Queries

```sql
-- Get user's total AI usage this month
SELECT
    COUNT(*) AS requests_count,
    SUM(words_generated) AS total_words,
    SUM(total_cost) AS total_cost
FROM ai_usage
WHERE user_id = auth.uid()
  AND created_at >= DATE_TRUNC('month', NOW())
  AND created_at < DATE_TRUNC('month', NOW() + INTERVAL '1 month');

-- Get AI usage breakdown by model
SELECT
    model,
    COUNT(*) AS requests,
    SUM(words_generated) AS words,
    SUM(total_cost) AS cost
FROM ai_usage
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY model
ORDER BY cost DESC;

-- Get document's AI assistance history
SELECT *
FROM ai_usage
WHERE document_id = $1
  AND user_id = auth.uid()
ORDER BY created_at DESC;
```

---

### User Plan Usage (public.user_plan_usage)

Aggregated usage snapshots per billing period for enforcing subscription limits.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Unique usage record identifier |
| `user_id` | uuid | NOT NULL, FK → auth.users | User being tracked |
| `period_start` | date | NOT NULL | Billing period start date |
| `period_end` | date | NOT NULL | Billing period end date |
| `projects_count` | integer | DEFAULT 0 | Number of active projects |
| `documents_count` | integer | DEFAULT 0 | Number of documents created |
| `document_snapshots_count` | integer | DEFAULT 0 | Number of version snapshots |
| `templates_created` | integer | DEFAULT 0 | Number of templates created |
| `ai_words_used` | integer | DEFAULT 0 | Total AI words generated |
| `ai_requests_count` | integer | DEFAULT 0 | Total AI requests made |
| `created_at` | timestamptz | DEFAULT NOW() | Record creation timestamp |

#### Constraints

- **UNIQUE (user_id, period_start)**: One record per user per billing period

#### RLS Policy

```sql
CREATE POLICY "Users can view their usage"
ON public.user_plan_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

#### Indexes

- `user_plan_usage_user_idx` (user_id, period_start DESC) - User's usage history

#### Common Queries

```sql
-- Get current billing period usage
SELECT * FROM user_plan_usage
WHERE user_id = auth.uid()
  AND period_start <= CURRENT_DATE
  AND period_end >= CURRENT_DATE;

-- Compare usage to limits
SELECT
    upu.*,
    spl.max_projects,
    spl.max_documents,
    spl.ai_words_per_month
FROM user_plan_usage upu
JOIN user_profiles up ON upu.user_id = up.id
JOIN subscription_plan_limits spl ON up.subscription_tier = spl.plan
WHERE upu.user_id = auth.uid()
  AND upu.period_start <= CURRENT_DATE
  AND upu.period_end >= CURRENT_DATE;
```

---

### Subscription Plan Limits (public.subscription_plan_limits)

Reference table defining feature limits for each subscription tier.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `plan` | text | PK | Plan identifier: free, hobbyist, professional, studio |
| `max_projects` | integer | | Maximum active projects (NULL = unlimited) |
| `max_documents` | integer | | Maximum documents (NULL = unlimited) |
| `max_document_snapshots` | integer | | Maximum version snapshots (NULL = unlimited) |
| `max_templates` | integer | | Maximum custom templates (NULL = unlimited) |
| `ai_words_per_month` | integer | | Monthly AI word allowance (NULL = unlimited) |
| `ai_requests_per_month` | integer | | Monthly AI request limit (NULL = unlimited) |
| `collaborator_slots` | integer | | Number of collaborators allowed |
| `created_at` | timestamptz | DEFAULT NOW() | Record creation timestamp |

#### Current Plan Limits

| Plan | Projects | Documents | Snapshots | Templates | AI Words/Month | AI Requests/Month | Collaborators |
|------|----------|-----------|-----------|-----------|----------------|-------------------|---------------|
| **free** | 5 | 20 | 200 | 10 | 25,000 | 300 | 0 |
| **hobbyist** | 15 | 100 | 1,000 | 25 | 120,000 | 1,500 | 1 |
| **professional** | 40 | 300 | 4,000 | 100 | 400,000 | 5,000 | 3 |
| **studio** | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | 10 |

**Note**: NULL values represent unlimited usage.

#### Common Queries

```sql
-- Get limits for user's current plan
SELECT spl.*
FROM subscription_plan_limits spl
JOIN user_profiles up ON spl.plan = up.subscription_tier
WHERE up.id = auth.uid();
```

---

## Design Decisions

### Why tsvector for Search?

PostgreSQL's full-text search offers significant advantages over simple LIKE queries:

**Benefits**:
- **Stemming**: "running" matches "run", "writes" matches "write"
- **Ranking**: Results sorted by relevance score
- **Performance**: GIN index enables fast searches even on large datasets
- **Auto-updates**: Generated column automatically stays in sync

**Comparison**:
```sql
-- Slow: LIKE query (full table scan)
SELECT * FROM projects WHERE name ILIKE '%fantasy%';  -- ~500ms on 100K rows

-- Fast: Full-text search (indexed)
SELECT * FROM projects WHERE search_vector @@ to_tsquery('fantasy');  -- ~5ms on 100K rows
```

### Why Denormalize user_id in project_tag_links?

RLS policies must verify user ownership on every query. Without denormalization:

**Slow approach** (requires JOIN for RLS):
```sql
CREATE POLICY "RLS via JOIN" ON project_tag_links
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE id = project_id AND user_id = auth.uid()
    )
);
-- Every query performs subquery to verify ownership
```

**Fast approach** (denormalized user_id):
```sql
CREATE POLICY "RLS direct" ON project_tag_links
FOR ALL USING (auth.uid() = user_id);
-- Direct indexed lookup, ~10x faster
```

**Trade-off**: 16 extra bytes per row (UUID) for 10x query performance improvement.

### Why Nullable folder_id in Projects?

Not all projects need folder organization. NULL `folder_id` means "not in any folder" (root level).

**Benefits**:
- Simpler data model (no "default folder" concept)
- Clearer semantics (NULL = unorganized)
- Flexible: Users can organize projects later
- Clean deletion: `ON DELETE SET NULL` moves projects to root instead of deleting them

### Why SET NULL Instead of CASCADE for Folder Deletion?

When a folder is deleted, projects inside should **not** be deleted:

**Use case**:
1. User deletes "Old Projects" folder
2. Projects move to root level (folder_id = NULL)
3. User can reorganize projects into different folders
4. No data loss

**Alternative** (CASCADE delete):
- Deleting folder deletes all projects inside
- High risk of accidental data loss
- Users would need to move projects before deleting folder

### Why CHECK Constraints on Enums?

Database-level validation prevents invalid data:

```sql
subscription_tier TEXT CHECK (subscription_tier IN ('free', 'hobbyist', 'professional', 'studio'))
```

**Benefits**:
- Enforced at database level (can't bypass via SQL)
- Self-documenting (constraints visible in schema)
- Application-agnostic (works regardless of API layer)
- Query planner can use constraints for optimization

**Alternative**: Application-level validation only
- Risk: Can be bypassed via direct SQL access
- Not self-documenting
- Harder to maintain consistency

---

## Row-Level Security (RLS)

All user-scoped tables enforce multi-tenant isolation using RLS policies.

### Pattern: FOR ALL Policy

All tables use consolidated `FOR ALL` policies instead of separate SELECT/INSERT/UPDATE/DELETE:

```sql
CREATE POLICY "Users can manage their {table}"
ON public.{table}
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Why FOR ALL?**
- **Simpler**: One policy instead of four
- **Consistent**: Same logic for all operations
- **Maintainable**: Easier to update and review
- **Performance**: PostgreSQL optimizes single policy better

See [ADR-001](../architecture/adr-001-consolidated-rls-policies.md) for full rationale.

### Performance Optimization

RLS policies are optimized with:
- **Indexed user_id columns**: All RLS checks use indexed lookups
- **Denormalized foreign keys**: Junction tables include user_id to avoid JOINs
- **Inlined auth.uid()**: Function is STABLE and efficiently cached per transaction

---

## Performance Considerations

### Index Strategy

#### Composite Indexes for Common Patterns

```sql
-- Paginated user queries
CREATE INDEX idx_projects_user_updated ON projects(user_id, updated_at DESC);

-- Filtered lists
CREATE INDEX idx_projects_user_folder_type
ON projects(user_id, folder_id, type)
WHERE folder_id IS NOT NULL;
```

#### Specialized Indexes

```sql
-- Full-text search
CREATE INDEX idx_projects_search_gin ON projects USING GIN(search_vector);

-- Array containment
CREATE INDEX idx_projects_genre_gin ON projects USING GIN(genre);
```

#### Partial Indexes

Reduce index size by filtering out irrelevant rows:
```sql
-- Only index projects in folders
CREATE INDEX idx_projects_user_folder_type
ON projects(user_id, folder_id, type)
WHERE folder_id IS NOT NULL;
```

### Query Optimization Best Practices

1. **Always filter by user_id first** - Leverages RLS indexes
2. **Use prepared statements** - Avoids query planning overhead
3. **Specify columns explicitly** - Avoid `SELECT *` in production
4. **Leverage generated columns** - `search_vector` updates automatically
5. **Use CTEs for complex queries** - Improves readability and planning

### Monitoring Queries

```sql
-- Index usage statistics
SELECT * FROM pg_stat_user_indexes
WHERE relname = 'projects';

-- Table statistics
SELECT * FROM pg_stat_user_tables
WHERE relname = 'projects';

-- Slow queries (requires pg_stat_statements extension)
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%projects%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Related Documentation

- **[ER Diagram](./schema-er-diagram.md)** - Visual schema overview with relationships
- **[Data Dictionary](./data-dictionary.md)** - Enums, constraints, and business rules
- **[API-Schema Mapping](./api-schema-mapping.md)** - API routes to database table mapping
- **[Migration Guidelines](./migration-guidelines.md)** - Best practices for schema changes
- **[ADR-002](../architecture/adr-002-project-tag-links-schema.md)** - Project tag links schema design

---

**Last Updated**: 2025-10-25
**Schema Version**: Based on migration `20251018000009_phase3_foundations.sql`
