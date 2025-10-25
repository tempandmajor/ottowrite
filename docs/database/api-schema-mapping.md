# API Routes → Database Schema Mapping

> Documentation of how API endpoints interact with database tables, including query patterns, indexes used, and RLS policies.

## Table of Contents

- [Projects API](#projects-api)
- [Folders API](#folders-api)
- [Tags API](#tags-api)
- [Documents API](#documents-api)
- [AI Usage](#ai-usage)
- [Account & Usage](#account--usage)
- [Common Patterns](#common-patterns)

---

## Projects API

### GET /api/projects (with query params)

**Purpose**: List user's projects with optional filtering and search

**Tables Used**:
- `projects` (main query)
- `project_folders` (for folder names - optional JOIN)
- `project_tags` (for tag names - optional JOIN)
- `project_tag_links` (for tag filtering)

**Query Pattern**:
```sql
-- Base query
SELECT * FROM projects
WHERE user_id = $user_id
  AND type = $type (optional)
  AND folder_id = $folder_id (optional)
  AND search_vector @@ to_tsquery($search) (optional)
ORDER BY updated_at DESC
LIMIT $limit OFFSET $offset;

-- Tag filtering (if tag_id provided)
SELECT p.* FROM projects p
JOIN project_tag_links ptl ON p.id = ptl.project_id
WHERE p.user_id = $user_id
  AND ptl.tag_id = $tag_id;

-- Full-text search
SELECT *, ts_rank(search_vector, query) AS rank
FROM projects, to_tsquery('english', $search_term) query
WHERE user_id = $user_id
  AND search_vector @@ query
ORDER BY rank DESC;
```

**Indexes Used**:
- `projects_user_idx` (user_id, updated_at DESC) - Paginated lists
- `idx_projects_folder_id` - Folder filtering
- `idx_projects_type` - Type filtering
- `idx_projects_search_vector_gin` - Full-text search
- `project_tag_links_user_idx` - Tag filtering

**RLS Policy**: `auth.uid() = user_id`

**Performance Notes**:
- Always filters by `user_id` first (RLS + index)
- Search uses GIN index for fast full-text queries
- Pagination via LIMIT/OFFSET

---

### POST /api/projects

**Purpose**: Create new project with quota enforcement

**Tables Used**:
- `user_profiles` (SELECT for subscription tier)
- `subscription_plan_limits` (SELECT for quota limits)
- `projects` (COUNT for quota check, INSERT for creation)
- `user_plan_usage` (UPDATE via RPC for usage tracking)

**Query Pattern**:
```sql
-- Step 1: Get user's subscription tier
SELECT subscription_tier
FROM user_profiles
WHERE id = $user_id;

-- Step 2: Check current project count against limits
SELECT COUNT(*) FROM projects
WHERE user_id = $user_id;

SELECT max_projects FROM subscription_plan_limits
WHERE plan = $subscription_tier;

-- Step 3: Create project (if quota allows)
INSERT INTO projects (user_id, name, type, genre, description, folder_id)
VALUES ($user_id, $name, $type, $genre, $description, $folder_id)
RETURNING *;

-- Step 4: Update usage stats (non-blocking)
SELECT refresh_user_plan_usage($user_id);
```

**Business Logic**:
1. Authenticate user
2. Apply rate limiting
3. Fetch user's subscription tier
4. Check project quota (used vs. limit)
5. Return 402 Payment Required if quota exceeded
6. Validate required fields (name, type)
7. Normalize genre to array format
8. Insert project with RLS (auto-sets user_id)
9. Refresh usage statistics

**RLS Policy**: INSERT checks `auth.uid() = user_id` (WITH CHECK)

**Performance Notes**:
- Quota check uses indexed COUNT query
- RPC call for usage tracking is non-blocking (fire-and-forget)

---

### PATCH /api/projects/[id]

**Purpose**: Update existing project

**Tables Used**:
- `projects` (UPDATE)

**Query Pattern**:
```sql
UPDATE projects
SET
  name = $name (if provided),
  type = $type (if provided),
  genre = $genre (if provided),
  description = $description (if provided),
  folder_id = $folder_id (if provided),
  updated_at = NOW()
WHERE id = $id
  AND user_id = $user_id -- RLS automatically enforces this
RETURNING *;
```

**RLS Policy**: `auth.uid() = user_id` (auto-enforced)

---

### DELETE /api/projects/[id]

**Purpose**: Delete project and cascade to dependent data

**Tables Used**:
- `projects` (DELETE)
- `documents` (CASCADE DELETE via FK)
- `project_tag_links` (CASCADE DELETE via FK)
- `ai_usage` (SET NULL on document_id, preserves records)

**Query Pattern**:
```sql
DELETE FROM projects
WHERE id = $id
  AND user_id = $user_id -- RLS enforced
RETURNING id;
```

**Cascade Chain**:
```
DELETE projects
  └─> CASCADE DELETE documents
      └─> SET NULL ai_usage.document_id (preserves billing data)
  └─> CASCADE DELETE project_tag_links
```

**RLS Policy**: `auth.uid() = user_id`

---

## Folders API

### GET /api/projects/folders

**Purpose**: Get all user's folders in flat list

**Tables Used**:
- `project_folders` (SELECT)

**Query Pattern**:
```sql
SELECT id, name, color, parent_id, created_at, updated_at
FROM project_folders
WHERE user_id = $user_id
ORDER BY created_at ASC;
```

**Indexes Used**:
- `project_folders_user_idx` (user_id, created_at DESC)

**RLS Policy**: `auth.uid() = user_id`

**Frontend Transformation**:
- API returns flat list
- Frontend builds tree structure using `parent_id` relationships
- Root folders have `parent_id = NULL`

---

### POST /api/projects/folders

**Purpose**: Create new folder (optionally nested)

**Tables Used**:
- `project_folders` (SELECT for parent validation, INSERT for creation)

**Query Pattern**:
```sql
-- Step 1: Validate parent folder exists (if parent_id provided)
SELECT id FROM project_folders
WHERE id = $parent_id
  AND user_id = $user_id;

-- Step 2: Create folder
INSERT INTO project_folders (user_id, name, color, parent_id)
VALUES ($user_id, $name, $color, $parent_id)
RETURNING *;
```

**Validation**:
- Name is required (non-empty string)
- If `parent_id` provided, must be owned by same user
- Color is optional (hex format validated client-side)

**RLS Policy**: `auth.uid() = user_id`

---

### DELETE /api/projects/folders/[id]

**Purpose**: Delete folder with cascade behavior

**Tables Used**:
- `project_folders` (DELETE)
- `project_folders` (CASCADE DELETE child folders)
- `projects` (SET NULL on folder_id)

**Query Pattern**:
```sql
DELETE FROM project_folders
WHERE id = $id
  AND user_id = $user_id
RETURNING id;
```

**Cascade Behavior**:
- **Child folders**: CASCADE DELETE (recursive)
- **Projects in folder**: SET NULL (moved to root level)

**RLS Policy**: `auth.uid() = user_id`

---

## Tags API

### GET /api/projects/tags

**Purpose**: Get all user's tags with project counts

**Tables Used**:
- `project_tags` (SELECT)
- `project_tag_links` (COUNT for usage statistics)

**Query Pattern**:
```sql
-- Step 1: Get all tags
SELECT id, name, color, description, created_at, updated_at
FROM project_tags
WHERE user_id = $user_id
ORDER BY name ASC;

-- Step 2: Get usage counts
SELECT tag_id, COUNT(*) AS count
FROM project_tag_links
WHERE user_id = $user_id
  AND tag_id IN ($tag_ids)
GROUP BY tag_id;
```

**Response Format**:
```json
{
  "tags": [
    {
      "id": "uuid",
      "name": "Fantasy",
      "color": "#FF5733",
      "description": "Fantasy novels and stories",
      "project_count": 5,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Indexes Used**:
- `project_tags_user_idx` (user_id, name)
- `project_tag_links_user_idx` (user_id)

**RLS Policy**: `auth.uid() = user_id`

---

### POST /api/projects/tags

**Purpose**: Create new tag (case-insensitive uniqueness)

**Tables Used**:
- `project_tags` (INSERT)

**Query Pattern**:
```sql
INSERT INTO project_tags (user_id, name, color, description)
VALUES ($user_id, $name, $color, $description)
RETURNING *;
```

**Constraints**:
- `UNIQUE (user_id, LOWER(name))` - Case-insensitive uniqueness
- Attempting to create "fantasy" when "Fantasy" exists returns 409 Conflict

**RLS Policy**: `auth.uid() = user_id` (WITH CHECK)

---

### POST /api/projects/[projectId]/tags

**Purpose**: Add tag to project

**Tables Used**:
- `projects` (SELECT for validation)
- `project_tags` (SELECT for validation)
- `project_tag_links` (INSERT)

**Query Pattern**:
```sql
-- Validation happens via RLS (user must own both project and tag)
INSERT INTO project_tag_links (user_id, project_id, tag_id)
VALUES ($user_id, $project_id, $tag_id)
ON CONFLICT (project_id, tag_id) DO NOTHING
RETURNING *;
```

**Idempotency**: `ON CONFLICT DO NOTHING` makes it safe to retry

**Constraints**:
- `UNIQUE (project_id, tag_id)` prevents duplicate tag assignments
- CASCADE DELETE when project or tag deleted

**RLS Policy**: `auth.uid() = user_id`

---

### DELETE /api/projects/[projectId]/tags/[tagId]

**Purpose**: Remove tag from project

**Tables Used**:
- `project_tag_links` (DELETE)

**Query Pattern**:
```sql
DELETE FROM project_tag_links
WHERE project_id = $project_id
  AND tag_id = $tag_id
  AND user_id = $user_id -- RLS enforced
RETURNING *;
```

**RLS Policy**: `auth.uid() = user_id`

---

## Documents API

### GET /api/documents?project_id=[id]

**Purpose**: Get all documents in a project (ordered)

**Tables Used**:
- `documents` (SELECT)

**Query Pattern**:
```sql
SELECT id, title, type, word_count, position, created_at, updated_at
FROM documents
WHERE user_id = $user_id
  AND project_id = $project_id
ORDER BY position ASC, created_at ASC;
```

**Indexes Used**:
- `idx_documents_project_id` (project_id)
- `idx_documents_user_id` (user_id)

**RLS Policy**: `auth.uid() = user_id`

**Performance Notes**:
- `content` (JSONB) is excluded from list queries for performance
- Full content only fetched for single document GET

---

### POST /api/documents

**Purpose**: Create new document in project

**Tables Used**:
- `projects` (SELECT for validation)
- `documents` (INSERT)
- `user_profiles` (SELECT for quota check)
- `subscription_plan_limits` (SELECT for quota limits)

**Query Pattern**:
```sql
-- Step 1: Validate project ownership
SELECT id FROM projects
WHERE id = $project_id
  AND user_id = $user_id;

-- Step 2: Check document quota
SELECT COUNT(*) FROM documents WHERE user_id = $user_id;
SELECT max_documents FROM subscription_plan_limits
WHERE plan = (SELECT subscription_tier FROM user_profiles WHERE id = $user_id);

-- Step 3: Create document
INSERT INTO documents (user_id, project_id, title, type, content, position)
VALUES ($user_id, $project_id, $title, $type, $content, $position)
RETURNING *;
```

**Default Values**:
- `content`: `'{}'::jsonb` (empty ProseMirror doc)
- `word_count`: `0`
- `position`: Next highest position in project

**RLS Policy**: `auth.uid() = user_id`

---

### PATCH /api/documents/[id]

**Purpose**: Update document content and metadata

**Tables Used**:
- `documents` (UPDATE)

**Query Pattern**:
```sql
UPDATE documents
SET
  content = $content (if provided),
  title = $title (if provided),
  word_count = $word_count (calculated client-side),
  updated_at = NOW()
WHERE id = $id
  AND user_id = $user_id
RETURNING *;
```

**Word Count Calculation**:
- Performed client-side from ProseMirror document
- Passed to API on save
- Cached in database for aggregation queries

**RLS Policy**: `auth.uid() = user_id`

---

## AI Usage

### POST /api/ai/generate

**Purpose**: Generate AI content and log usage

**Tables Used**:
- `user_profiles` (SELECT for tier, UPDATE for monthly word count)
- `subscription_plan_limits` (SELECT for AI limits)
- `ai_usage` (INSERT for logging)
- `documents` (SELECT/UPDATE for content)

**Query Pattern**:
```sql
-- Step 1: Check AI quota
SELECT ai_words_used_this_month, subscription_tier
FROM user_profiles
WHERE id = $user_id;

SELECT ai_words_per_month FROM subscription_plan_limits
WHERE plan = $subscription_tier;

-- Step 2: Generate content (external AI API call)

-- Step 3: Log usage
INSERT INTO ai_usage (
  user_id, document_id, model,
  words_generated, prompt_tokens, completion_tokens,
  total_cost, prompt_preview
)
VALUES ($user_id, $document_id, $model, $words, $prompt_tokens, $completion_tokens, $cost, $preview)
RETURNING *;

-- Step 4: Update user's monthly word count
UPDATE user_profiles
SET ai_words_used_this_month = ai_words_used_this_month + $words
WHERE id = $user_id;
```

**Business Logic**:
1. Authenticate user
2. Check AI word quota (used vs. limit)
3. Return 402 if quota exceeded
4. Call AI provider API
5. Insert usage record (for billing/analytics)
6. Update user's monthly usage counter
7. Return generated content

**RLS Policy**:
- `ai_usage` is INSERT-only for authenticated users
- SELECT policy allows users to view their own usage

---

## Account & Usage

### GET /api/account/usage

**Purpose**: Get user's current usage vs. limits

**Tables Used**:
- `user_profiles` (SELECT for tier and AI usage)
- `subscription_plan_limits` (SELECT for limits)
- `projects` (COUNT)
- `documents` (COUNT)
- `ai_usage` (SUM for current month)

**Query Pattern**:
```sql
-- Get user profile and limits
SELECT
  up.*,
  spl.*
FROM user_profiles up
JOIN subscription_plan_limits spl ON up.subscription_tier = spl.plan
WHERE up.id = $user_id;

-- Count projects
SELECT COUNT(*) FROM projects WHERE user_id = $user_id;

-- Count documents
SELECT COUNT(*) FROM documents WHERE user_id = $user_id;

-- Sum AI usage this month
SELECT SUM(words_generated)
FROM ai_usage
WHERE user_id = $user_id
  AND created_at >= DATE_TRUNC('month', NOW());
```

**Response Format**:
```json
{
  "tier": "professional",
  "usage": {
    "projects": { "used": 12, "limit": 40 },
    "documents": { "used": 89, "limit": 300 },
    "ai_words": { "used": 45000, "limit": 400000 }
  }
}
```

**RLS Policy**: `auth.uid() = user_id`

---

## Common Patterns

### Multi-Tenant Isolation

**Pattern**: All queries filter by `user_id` with RLS enforcement

```sql
-- RLS policy on all user-scoped tables
CREATE POLICY "Users can manage their {table}"
ON public.{table}
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Benefits**:
- Impossible to access other users' data (database-enforced)
- No need for explicit `user_id` checks in application code
- Consistent security across all tables

---

### Quota Enforcement Pattern

**Steps**:
1. GET user's subscription tier from `user_profiles`
2. GET limits from `subscription_plan_limits`
3. COUNT user's current usage
4. Compare: `used < limit` (NULL limit = unlimited)
5. If exceeded, return 402 Payment Required
6. If allowed, perform operation
7. Update `user_plan_usage` (non-blocking)

**Example**:
```typescript
// 1. Get tier
const { subscription_tier } = await getUserProfile(userId)

// 2. Get limits
const { max_projects } = await getPlanLimits(subscription_tier)

// 3. Count usage
const projectCount = await countUserProjects(userId)

// 4. Check quota
if (max_projects !== null && projectCount >= max_projects) {
  return errorResponses.paymentRequired(
    `You've reached your plan's limit of ${max_projects} projects`
  )
}

// 5. Perform operation
await createProject(...)

// 6. Update usage (non-blocking)
await refreshUserPlanUsage(userId)
```

---

### Full-Text Search Pattern

**Tables**: Any with `search_vector` generated column

**Query**:
```sql
SELECT *, ts_rank(search_vector, query) AS rank
FROM projects, to_tsquery('english', $search_term) query
WHERE user_id = auth.uid()
  AND search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

**Index**: GIN index on `search_vector`

**Features**:
- Stemming: "runs" matches "running"
- Relevance ranking via `ts_rank()`
- Boolean operators: `fantasy & !romance`
- Phrase search: `"space opera"`

---

### Cascade Delete Pattern

**Projects → Documents**:
```sql
ALTER TABLE documents
ADD CONSTRAINT documents_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;
```

**Effect**: Deleting project deletes all its documents

**Use Cases**:
- Parent-child relationships where child has no meaning without parent
- Cleanup of dependent data

**Alternative**: `ON DELETE SET NULL` for optional relationships (e.g., `projects.folder_id`)

---

### Denormalized user_id Pattern

**Junction Tables**: `project_tag_links` includes denormalized `user_id`

**Why?**
```sql
-- Without denormalization (slow)
CREATE POLICY "RLS via JOIN" ON project_tag_links
FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);

-- With denormalization (fast)
CREATE POLICY "RLS direct" ON project_tag_links
FOR ALL USING (auth.uid() = user_id);
```

**Trade-off**: Extra 16 bytes per row for 10x query performance

---

## Related Documentation

- **[Schema Overview](./schema-overview.md)** - Detailed table descriptions
- **[ER Diagram](./schema-er-diagram.md)** - Visual schema representation
- **[Data Dictionary](./data-dictionary.md)** - Enums, constraints, business rules
- **[Migration Guidelines](./migration-guidelines.md)** - Schema evolution best practices

---

**Last Updated**: 2025-10-25
**API Version**: v1 (Next.js App Router)
