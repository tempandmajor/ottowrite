# Database Schema ER Diagram

## Core Entity Relationships

```mermaid
erDiagram
    users ||--o{ user_profiles : has
    users ||--o{ projects : owns
    users ||--o{ documents : owns
    users ||--o{ project_folders : owns
    users ||--o{ project_tags : owns
    users ||--o{ project_tag_links : creates
    users ||--o{ ai_usage : generates
    users ||--o{ user_plan_usage : tracks

    projects ||--o{ documents : contains
    projects }o--|| project_folders : "organized in"
    projects ||--o{ project_tag_links : "tagged with"

    project_tags ||--o{ project_tag_links : "links to"
    project_folders ||--o{ project_folders : "contains (self-ref)"

    documents ||--o{ ai_usage : "AI assisted"

    users {
        uuid id PK "auth.users"
        text email UK
        timestamptz created_at
    }

    user_profiles {
        uuid id PK "FK to auth.users"
        text email UK
        text stripe_customer_id UK "Stripe integration"
        text stripe_subscription_id UK
        text stripe_price_id
        text subscription_status "default: active"
        text subscription_tier "free, hobbyist, professional, studio"
        timestamptz subscription_current_period_start
        timestamptz subscription_current_period_end
        integer ai_words_used_this_month
        timestamptz ai_words_reset_date
        timestamptz created_at
        timestamptz updated_at
    }

    projects {
        uuid id PK
        uuid user_id FK "to auth.users"
        uuid folder_id FK "nullable, to project_folders"
        text name "NOT NULL, max 500 chars"
        text type "novel, series, screenplay, play, short_story"
        text_array genre "array of genres"
        text description "nullable"
        tsvector search_vector "generated, full-text search"
        timestamptz created_at
        timestamptz updated_at
    }

    documents {
        uuid id PK
        uuid user_id FK "to auth.users"
        uuid project_id FK "to projects"
        text title "NOT NULL"
        text type "novel, screenplay, play, short_story"
        jsonb content "ProseMirror document"
        integer word_count "default: 0"
        integer position "display order"
        timestamptz created_at
        timestamptz updated_at
    }

    project_folders {
        uuid id PK
        uuid user_id FK "to auth.users"
        uuid parent_id FK "nullable, self-ref"
        text name "NOT NULL"
        text color "nullable, hex code"
        timestamptz created_at
        timestamptz updated_at
    }

    project_tags {
        uuid id PK
        uuid user_id FK "to auth.users"
        text name "NOT NULL, unique per user"
        text color "nullable, hex code"
        text description "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    project_tag_links {
        uuid id PK
        uuid user_id FK "denormalized for RLS"
        uuid project_id FK "to projects"
        uuid tag_id FK "to project_tags"
        timestamptz created_at
    }

    ai_usage {
        uuid id PK
        uuid user_id FK "to auth.users"
        uuid document_id FK "nullable, to documents"
        text model "AI model used"
        integer words_generated
        integer prompt_tokens
        integer completion_tokens
        numeric total_cost "precision 10, scale 6"
        text prompt_preview
        timestamptz created_at
    }

    user_plan_usage {
        uuid id PK
        uuid user_id FK "to auth.users"
        date period_start
        date period_end
        integer projects_count "default: 0"
        integer documents_count "default: 0"
        integer document_snapshots_count "default: 0"
        integer templates_created "default: 0"
        integer ai_words_used "default: 0"
        integer ai_requests_count "default: 0"
        timestamptz created_at
    }
```

## Cascade Behaviors

### ON DELETE CASCADE
Deleting a parent row automatically deletes child rows:

- `auth.users` → `user_profiles` (1:1 relationship)
- `auth.users` → `projects` (deletes all user's projects)
- `auth.users` → `documents` (deletes all user's documents)
- `auth.users` → `project_folders` (deletes all user's folders)
- `auth.users` → `project_tags` (deletes all user's tags)
- `auth.users` → `project_tag_links` (deletes all user's tag links)
- `auth.users` → `ai_usage` (deletes all user's AI usage records)
- `auth.users` → `user_plan_usage` (deletes all user's usage records)
- `projects` → `documents` (deletes all project documents)
- `projects` → `project_tag_links` (deletes all project tag associations)
- `project_tags` → `project_tag_links` (deletes all tag associations)
- `project_folders` → `project_folders` (deletes child folders recursively)

### ON DELETE SET NULL
Parent deletion keeps child rows but nullifies foreign key:

- `project_folders` → `projects.folder_id` (projects move to root level)
- `documents` → `ai_usage.document_id` (preserves AI usage stats)

## Key Design Patterns

### Multi-Tenant Isolation
All tables include `user_id` with RLS policies enforcing `auth.uid() = user_id`:
- Ensures complete data isolation between users
- Indexed for performance
- Denormalized in junction tables for RLS efficiency

### Hierarchical Folders
`project_folders` uses self-referencing foreign key:
- `parent_id` references `project_folders(id)`
- NULL `parent_id` = root folder
- Supports unlimited nesting depth
- CASCADE delete removes entire subtree

### Many-to-Many with Metadata
`project_tag_links` junction table includes:
- `id` as primary key (stable row identifier)
- `created_at` timestamp (audit trail)
- `user_id` denormalization (RLS performance)
- Unique constraint on `(project_id, tag_id)` prevents duplicates

### Full-Text Search
`projects.search_vector`:
- Generated column (auto-updates)
- Indexes `name` and `description`
- GIN index for fast searches
- Supports ranking and relevance

### Soft Constraints
`subscription_tier` uses CHECK constraint:
- Enforces valid values at database level
- Application can query allowed values
- Prevents invalid data entry

## Index Strategy

### Composite Indexes
- `(user_id, updated_at DESC)` - Paginated user queries
- `(user_id, parent_id)` - Folder hierarchies
- `(user_id, name)` - Sorted lists with filtering

### Specialized Indexes
- GIN on `search_vector` - Full-text search
- GIN on `genre[]` - Array containment queries
- B-tree on foreign keys - JOIN performance
- B-tree on timestamps - Temporal queries

## Related Documentation

- [Schema Overview](./schema-overview.md) - Detailed table descriptions
- [Data Dictionary](./data-dictionary.md) - Enums, constraints, business rules
- [API-Schema Mapping](./api-schema-mapping.md) - API routes to table mapping
- [Migration Guidelines](./migration-guidelines.md) - Schema evolution best practices
