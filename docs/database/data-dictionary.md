# Database Data Dictionary

> Glossary of domain terms, enum values, constraints, and business rules for the OttoWrite database schema.

## Table of Contents

- [Enums and Constants](#enums-and-constants)
- [Business Rules](#business-rules)
- [Calculated Fields](#calculated-fields)
- [Constraints Summary](#constraints-summary)
- [Data Types](#data-types)

---

## Enums and Constants

### Project Types

Values enforced via CHECK constraint on `projects.type`:

| Value | Description | Typical Word Count | Example |
|-------|-------------|-------------------|---------|
| `novel` | Long-form fiction | 50,000 - 120,000+ words | Full-length novel, epic fantasy |
| `series` | Multi-book series | Variable | Trilogy, book series |
| `screenplay` | Film or TV script | 7,500 - 22,500 words (90-120 pages) | Movie screenplay, TV pilot |
| `play` | Stage play script | 12,000 - 25,000 words | Broadway play, one-act play |
| `short_story` | Short fiction | 1,000 - 15,000 words | Novelette, novella, short story |

**Database Constraint**:
```sql
CHECK (type IN ('novel', 'series', 'screenplay', 'play', 'short_story'))
```

### Document Types

Same as project types - documents inherit type from their parent project:

| Value | Description |
|-------|-------------|
| `novel` | Novel chapter or section |
| `screenplay` | Screenplay scene or act |
| `play` | Play scene or act |
| `short_story` | Short story section |

### Subscription Tiers

Values enforced via CHECK constraint on `user_profiles.subscription_tier`:

| Value | Display Name | Description |
|-------|--------------|-------------|
| `free` | Free | Limited features, trial tier |
| `hobbyist` | Hobbyist | Entry-level paid plan for casual writers |
| `professional` | Professional | Mid-tier plan for serious writers |
| `studio` | Studio | Unlimited plan for teams and publishers |

**Database Constraint**:
```sql
CHECK (subscription_tier IN ('free', 'hobbyist', 'professional', 'studio'))
```

### Subscription Status

Values for `user_profiles.subscription_status`:

| Value | Description |
|-------|-------------|
| `active` | Subscription active and in good standing |
| `canceled` | Subscription canceled (still active until period end) |
| `past_due` | Payment failed, grace period active |
| `trialing` | Free trial period |
| `incomplete` | Payment setup incomplete |
| `incomplete_expired` | Payment setup failed/expired |
| `unpaid` | Subscription unpaid and suspended |

### Project Genres

User-defined array values (not enforced by constraint). Common values:

| Genre | Typical Sub-genres |
|-------|-------------------|
| `fantasy` | Epic fantasy, urban fantasy, magical realism |
| `sci-fi` | Space opera, cyberpunk, dystopian |
| `mystery` | Detective, cozy mystery, thriller |
| `thriller` | Psychological thriller, crime thriller |
| `romance` | Contemporary romance, historical romance |
| `horror` | Supernatural horror, psychological horror |
| `literary-fiction` | Character-driven, experimental |
| `historical` | Historical fiction, period drama |
| `adventure` | Action-adventure, quest |
| `comedy` | Romantic comedy, satire |
| `drama` | Family drama, coming-of-age |
| `young-adult` | YA fiction, teen fiction |
| `children` | Middle grade, picture books |
| `non-fiction` | Memoir, biography, self-help |

**Implementation**:
```sql
-- Multiple genres allowed
genre TEXT[] DEFAULT ARRAY[]::TEXT[]

-- Example values
['fantasy', 'adventure', 'young-adult']
```

### Color Codes

Format used for `project_folders.color` and `project_tags.color`:

| Format | Example | Description |
|--------|---------|-------------|
| Hex color | `#FF5733` | Standard 6-digit hex color |
| NULL | `NULL` | No color assigned (uses default) |

**Validation** (application-level):
- Must start with `#`
- Followed by exactly 6 hexadecimal digits (0-9, A-F)
- Case-insensitive

---

## Business Rules

### User Isolation (Multi-Tenancy)

**Rule**: All user-scoped data is isolated via Row-Level Security (RLS).

**Implementation**:
- Every table includes `user_id` foreign key to `auth.users.id`
- RLS policies enforce `auth.uid() = user_id` on all operations
- No cross-user data access permitted
- Indexes on `user_id` ensure performance

**Exception**: Reference tables (`subscription_plan_limits`) are global and READ-ONLY.

### Folder Hierarchy Rules

**Rule**: Folders support unlimited nesting depth via self-referencing.

**Structure**:
- Root folders have `parent_id = NULL`
- Child folders reference parent via `parent_id`
- Circular references prevented by application logic
- Recommended max depth: 10 levels (for UX reasons)

**Cascade Behavior**:
```sql
-- Deleting a folder
ON DELETE CASCADE  -- Child folders deleted recursively
ON DELETE SET NULL -- Projects moved to root level (folder_id = NULL)
```

**Use Cases**:
```
Root
├── Fiction
│   ├── Novels
│   │   └── Completed
│   └── Short Stories
└── Non-Fiction
    └── Essays
```

### Tag Uniqueness Rules

**Rule**: Tag names are unique per user (case-insensitive).

**Constraint**:
```sql
UNIQUE (user_id, LOWER(name))
```

**Examples**:
- ✅ User A creates "Fantasy" → Success
- ❌ User A creates "fantasy" → Conflict (same as "Fantasy")
- ✅ User B creates "Fantasy" → Success (different user)

**Rationale**: Prevents duplicate tags while allowing different users to have identically named tags.

### Project-Tag Association Rules

**Rule**: Each project can have each tag applied at most once.

**Constraint**:
```sql
UNIQUE (project_id, tag_id)
```

**Cascade Behavior**:
- Deleting project → Deletes all tag links (`ON DELETE CASCADE`)
- Deleting tag → Deletes all tag links (`ON DELETE CASCADE`)

### Project Deletion Rules

**Rule**: Deleting a project cascades to all dependent data.

**Cascade Chain**:
```
DELETE projects
  └─> CASCADE DELETE documents
      └─> SET NULL ai_usage.document_id (preserves usage stats)
  └─> CASCADE DELETE project_tag_links
```

**Data Preservation**:
- `ai_usage` records retained (for billing/analytics)
- `user_plan_usage` aggregates unaffected

### Subscription Plan Limits

**Rule**: Feature usage enforced against `subscription_plan_limits` table.

**Current Limits**:

| Feature | Free | Hobbyist | Professional | Studio |
|---------|------|----------|--------------|--------|
| Max Projects | 5 | 15 | 40 | ∞ (NULL) |
| Max Documents | 20 | 100 | 300 | ∞ (NULL) |
| Max Snapshots | 200 | 1,000 | 4,000 | ∞ (NULL) |
| Max Templates | 10 | 25 | 100 | ∞ (NULL) |
| AI Words/Month | 25,000 | 120,000 | 400,000 | ∞ (NULL) |
| AI Requests/Month | 300 | 1,500 | 5,000 | ∞ (NULL) |
| Collaborators | 0 | 1 | 3 | 10 |

**Note**: NULL values represent unlimited usage (no limit).

**Enforcement**:
- Application checks limits before INSERT operations
- `user_plan_usage` tracks current usage
- Monthly reset via cron job

### Word Count Tracking

**Rule**: Document word counts are cached and updated on save.

**Implementation**:
```sql
documents.word_count INTEGER DEFAULT 0
```

**Update Pattern**:
```sql
-- Application calculates word count from ProseMirror JSON
UPDATE documents
SET word_count = $calculated_count,
    updated_at = NOW()
WHERE id = $id AND user_id = auth.uid();
```

**Aggregate Calculation**:
```sql
-- Project total word count
SELECT SUM(word_count) FROM documents
WHERE project_id = $project_id AND user_id = auth.uid();
```

### AI Usage Billing Rules

**Rule**: All AI operations are logged for billing and usage tracking.

**Required Fields**:
- `user_id` - Who triggered the request
- `model` - Which AI model was used
- `words_generated` - Output word count
- `prompt_tokens` - Input token count
- `completion_tokens` - Output token count
- `total_cost` - Cost in USD (6 decimal places)

**Cost Calculation** (application-level):
```
total_cost = (prompt_tokens * model.input_price) + (completion_tokens * model.output_price)
```

**Monthly Aggregation**:
```sql
-- User's AI usage this month
SELECT SUM(words_generated) AS total_words
FROM ai_usage
WHERE user_id = auth.uid()
  AND created_at >= DATE_TRUNC('month', NOW());
```

---

## Calculated Fields

### projects.search_vector

**Type**: `tsvector` (PostgreSQL full-text search)

**Generated From**:
```sql
to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
```

**Features**:
- **Stemming**: "running" matches "run", "writes" matches "write"
- **Ranking**: Results sorted by relevance via `ts_rank()`
- **Auto-updates**: Generated column, updates automatically
- **Language**: English dictionary (configurable)

**Usage**:
```sql
-- Search projects
SELECT *, ts_rank(search_vector, query) AS rank
FROM projects, to_tsquery('english', 'fantasy & adventure') query
WHERE user_id = auth.uid()
  AND search_vector @@ query
ORDER BY rank DESC;
```

**Index**: GIN index for performance
```sql
CREATE INDEX idx_projects_search_vector_gin ON projects USING GIN(search_vector);
```

---

## Constraints Summary

### Primary Keys

| Table | Column | Type |
|-------|--------|------|
| `user_profiles` | `id` | uuid (FK to auth.users) |
| `projects` | `id` | uuid |
| `documents` | `id` | uuid |
| `project_folders` | `id` | uuid |
| `project_tags` | `id` | uuid |
| `project_tag_links` | `id` | uuid |
| `ai_usage` | `id` | uuid |
| `user_plan_usage` | `id` | uuid |
| `subscription_plan_limits` | `plan` | text (enum) |

### Foreign Keys

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| `user_profiles` | `id` | `auth.users(id)` | CASCADE |
| `projects` | `user_id` | `auth.users(id)` | CASCADE |
| `projects` | `folder_id` | `project_folders(id)` | SET NULL |
| `documents` | `user_id` | `auth.users(id)` | CASCADE |
| `documents` | `project_id` | `projects(id)` | CASCADE |
| `project_folders` | `user_id` | `auth.users(id)` | CASCADE |
| `project_folders` | `parent_id` | `project_folders(id)` | CASCADE |
| `project_tags` | `user_id` | `auth.users(id)` | CASCADE |
| `project_tag_links` | `user_id` | `auth.users(id)` | CASCADE |
| `project_tag_links` | `project_id` | `projects(id)` | CASCADE |
| `project_tag_links` | `tag_id` | `project_tags(id)` | CASCADE |
| `ai_usage` | `user_id` | `auth.users(id)` | CASCADE |
| `ai_usage` | `document_id` | `documents(id)` | SET NULL |
| `user_plan_usage` | `user_id` | `auth.users(id)` | CASCADE |

### Unique Constraints

| Table | Columns | Purpose |
|-------|---------|---------|
| `user_profiles` | `email` | Prevent duplicate emails |
| `user_profiles` | `stripe_customer_id` | One Stripe customer per user |
| `user_profiles` | `stripe_subscription_id` | One active subscription per user |
| `project_tags` | `(user_id, LOWER(name))` | Case-insensitive unique tags per user |
| `project_tag_links` | `(project_id, tag_id)` | Prevent duplicate tag assignments |
| `user_plan_usage` | `(user_id, period_start)` | One usage record per billing period |

### Check Constraints

| Table | Column | Constraint |
|-------|--------|------------|
| `projects` | `type` | `IN ('novel', 'series', 'screenplay', 'play', 'short_story')` |
| `documents` | `type` | `IN ('novel', 'screenplay', 'play', 'short_story')` |
| `user_profiles` | `subscription_tier` | `IN ('free', 'hobbyist', 'professional', 'studio')` |

### Not Null Constraints

**Core Identity Fields** (always required):
- All `id` columns (primary keys)
- All `user_id` columns (multi-tenancy)
- All `created_at` columns (audit trail)

**Business-Critical Fields**:
- `projects.name` - Project must have a name
- `projects.type` - Project must have a type
- `documents.title` - Document must have a title
- `documents.project_id` - Document must belong to a project
- `project_folders.name` - Folder must have a name
- `project_tags.name` - Tag must have a name
- `ai_usage.model` - Must track which model was used
- `ai_usage.words_generated` - Must track usage
- `ai_usage.total_cost` - Must track costs

---

## Data Types

### UUID (Universally Unique Identifier)

**Usage**: Primary keys and foreign keys

**Format**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Generation**:
```sql
DEFAULT uuid_generate_v4()  -- Random UUIDs
```

**Benefits**:
- Globally unique (no collisions)
- Merge-friendly (distributed systems)
- Security (non-sequential, hard to guess)

### TEXT vs VARCHAR

**Choice**: All string columns use `TEXT` (no length limit)

**Rationale**:
- PostgreSQL stores TEXT and VARCHAR identically
- TEXT is more flexible (no arbitrary limits)
- Application enforces length validation where needed

**Example**:
```sql
name TEXT  -- No limit (validated in application)
```

### TIMESTAMPTZ (Timestamp with Time Zone)

**Usage**: All temporal columns

**Format**: `2025-10-25 08:00:00+00`

**Default**: `DEFAULT NOW()` - Current timestamp

**Benefits**:
- Automatic UTC conversion
- Time zone aware
- Proper handling across regions

**Query Example**:
```sql
-- Filter by date range
WHERE created_at >= '2025-10-01' AND created_at < '2025-11-01'

-- Truncate to month
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
```

### JSONB (Binary JSON)

**Usage**: `documents.content` - ProseMirror document structure

**Format**:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "Chapter One..."}
      ]
    }
  ]
}
```

**Benefits**:
- Schema-flexible
- Indexable (GIN indexes)
- Queryable (JSON operators)
- Efficient storage (binary format)

**Query Example**:
```sql
-- Extract text content
SELECT content->'content'->0->'content'->0->>'text' AS first_paragraph
FROM documents WHERE id = $id;
```

### Arrays (TEXT[])

**Usage**: `projects.genre` - Multiple genre tags

**Format**: `ARRAY['fantasy', 'adventure', 'young-adult']`

**Operators**:
- `@>` - Contains (e.g., `genre @> ARRAY['fantasy']`)
- `&&` - Overlaps (e.g., `genre && ARRAY['fantasy', 'sci-fi']`)
- `||` - Append (e.g., `genre || 'mystery'`)

**Index**: GIN index for containment queries
```sql
CREATE INDEX idx_projects_genre_gin ON projects USING GIN(genre);
```

**Query Example**:
```sql
-- Find projects with fantasy genre
SELECT * FROM projects
WHERE user_id = auth.uid()
  AND genre @> ARRAY['fantasy'];
```

### NUMERIC(10,6)

**Usage**: `ai_usage.total_cost` - USD currency with high precision

**Format**: `NUMERIC(10, 6)` - 10 total digits, 6 after decimal

**Range**: `$0.000001` to `$9999.999999`

**Example Values**:
- `0.000450` - $0.00045 (GPT-4 API call)
- `1.234567` - $1.23 rounded for display
- `9999.999999` - $9,999.99 (max value)

**Why 6 Decimals?**
- AI API costs are fractional cents
- Precision needed for accurate billing
- Aggregation doesn't lose precision

---

## Related Documentation

- **[Schema Overview](./schema-overview.md)** - Detailed table descriptions and relationships
- **[ER Diagram](./schema-er-diagram.md)** - Visual schema representation
- **[API-Schema Mapping](./api-schema-mapping.md)** - API routes to database mapping
- **[Migration Guidelines](./migration-guidelines.md)** - Schema evolution best practices

---

**Last Updated**: 2025-10-25
**Schema Version**: Based on migration `20251018000009_phase3_foundations.sql`
