# Supabase Schema Synchronization Tickets

**Created:** 2025-10-23
**Project:** Ottowrite Database Schema Fixes
**Epic:** Production Schema Synchronization & Type Constraint Alignment
**Priority:** P0 (Critical - Blocking Production)

---

## Executive Summary

The production database schema is out of sync with the application code, causing 500 errors on `/api/projects/query` and preventing users from creating projects with newer document types. Four critical issues have been identified:

1. **Missing Phase 3 schema** - Production DB lacks `folder_id` column and related tables
2. **Outdated type constraints** - Database only allows 5 legacy project types, not the full 18 types
3. **Hard-coded validation schemas** - Server validation frozen on legacy type list
4. **Genre array mismatch** - API writes single string, DB expects TEXT[] array

**Estimated Total Effort:** 8 story points (3-4 days)

---

## TICKET DB-001: Apply Pending Phase 3 Migrations to Production

**Priority:** P0 (Critical - Blocking)
**Effort:** 2 story points (1 day)
**Severity:** 🔴 **BLOCKS ALL PROJECT QUERIES** - Users see 500 errors
**Component:** Database Schema
**Status:** 🔴 NOT STARTED

### Problem Statement

The `/api/projects/query` endpoint is selecting `projects.folder_id` and joining `project_folders`/`project_tag_links` tables, but the production database (`jtngociduoicfnieidxf`) is still on the pre-Phase 3 schema. These columns and tables don't exist in production.

**Error Message:**
```
column "folder_id" does not exist
```

**Impact:**
- ❌ All project queries return 500 errors
- ❌ Dashboard cannot load projects
- ❌ Users cannot browse or search projects
- ❌ Complete feature outage

### Root Cause

Migration `20251018000009_phase3_foundations.sql` (lines 33-85) adds:
- `projects.folder_id` column
- `project_folders` table
- `project_tag_links` table

This migration exists locally but has NOT been applied to production.

### Current State

**Local Schema (✅ Has Phase 3):**
```sql
-- projects table includes folder_id
ALTER TABLE projects ADD COLUMN folder_id UUID REFERENCES project_folders(id);

-- project_folders table exists
CREATE TABLE project_folders (...);

-- project_tag_links table exists
CREATE TABLE project_tag_links (...);
```

**Production Schema (❌ Missing Phase 3):**
```sql
-- projects table does NOT have folder_id
-- project_folders table does NOT exist
-- project_tag_links table does NOT exist
```

**API Code (Expects Phase 3):**
```typescript
// app/api/projects/query/route.ts:158
let query = supabase
  .from('projects')
  .select('id, name, type, genre, description, created_at, updated_at, folder_id', { count: 'exact' })
  //                                                                      ^^^^^^^^^ DOES NOT EXIST IN PROD
```

### Acceptance Criteria

- ✅ All pending migrations applied to production database
- ✅ `projects.folder_id` column exists in production
- ✅ `project_folders` table exists in production
- ✅ `project_tag_links` table exists in production
- ✅ RLS policies for new tables are active
- ✅ `/api/projects/query?limit=20` returns 200 (not 500)
- ✅ Dashboard loads without errors

### Implementation Steps

**Option A: Using Supabase CLI (Recommended)**
```bash
# 1. Verify local migrations are ready
ls -la supabase/migrations/202510*.sql

# 2. Push migrations to production (linked project)
npx supabase db push --linked

# 3. Verify migrations applied
npx supabase migration list --linked
```

**Option B: Using Migration Manager Script**
```bash
# 1. Ensure service role key is in environment
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 2. Run migration manager
node scripts/migration-manager.ts

# 3. Follow prompts to apply pending migrations
```

**Option C: Manual SQL Execution (Last Resort)**
```bash
# 1. Connect to production database
psql "postgresql://postgres:[PASSWORD]@db.jtngociduoicfnieidxf.supabase.co:5432/postgres"

# 2. Execute migration files in order
\i supabase/migrations/20251018000009_phase3_foundations.sql
\i supabase/migrations/20251018000010_phase3_rls.sql
# ... etc for all pending Phase 3 migrations

# 3. Verify schema
\d projects
\d project_folders
\d project_tag_links
```

### Verification Query

Run this after applying migrations:
```sql
-- Should return folder_id column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'folder_id';

-- Should return rows (not error)
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('project_folders', 'project_tag_links');
```

### Testing

After applying migrations:
```bash
# 1. Test the failing endpoint
curl https://www.ottowrite.app/api/projects/query?limit=20

# Expected: 200 OK with JSON response
# Previous: 500 Internal Server Error

# 2. Test in browser
# Navigate to https://www.ottowrite.app/dashboard/projects
# Expected: Projects load without console errors

# 3. Test folder creation/assignment
# Create a folder, assign a project to it
# Query projects with folderId filter
```

### Rollback Plan

If migrations cause issues:
```sql
-- Rollback Phase 3 migrations
ALTER TABLE projects DROP COLUMN IF EXISTS folder_id;
DROP TABLE IF EXISTS project_tag_links CASCADE;
DROP TABLE IF EXISTS project_folders CASCADE;
```

### Files Referenced
- `supabase/migrations/20251018000009_phase3_foundations.sql` (lines 33-85)
- `app/api/projects/query/route.ts` (lines 158-212)

### Related Tickets
- Blocks: DB-002, DB-003 (can't test until this is fixed)

---

## TICKET DB-002: Extend Projects Type Constraint to Support All Document Types

**Priority:** P0 (Critical - Blocks New Project Creation)
**Effort:** 2 story points (1 day)
**Severity:** 🟠 **BLOCKS NEW PROJECT TYPES** - Users see constraint errors
**Component:** Database Schema, Migrations
**Status:** 🔴 NOT STARTED

### Problem Statement

The `projects` table has a CHECK constraint that only allows 5 legacy document types:
```sql
CHECK (type IN ('novel', 'series', 'screenplay', 'play', 'short_story'))
```

However, the application now supports **18 document types** (defined in `lib/document-types.ts`) including:
- `feature_film`, `tv_pilot`, `tv_drama`, `tv_comedy`
- `audio_drama`, `stage_musical`, `web_series`
- `graphic_novel`, `poetry_collection`
- And more...

**Error When Creating New Type:**
```
new row for relation "projects" violates check constraint "projects_type_check"
```

**Impact:**
- ❌ Users cannot create feature films, TV pilots, etc.
- ❌ Project creation fails with 500 error for non-legacy types
- ❌ UI shows options that don't work

### Root Cause Analysis

**1. Database Constraint (Outdated):**
```sql
-- supabase/migrations/20251016000001_initial_schema.sql:25-34
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'novel',
    'series',
    'screenplay',
    'play',
    'short_story'
  )),
  -- ... other columns
);
```

**2. Application Type List (Correct):**
```typescript
// lib/document-types.ts:21-55
export const DOCUMENT_TYPES = [
  'novel', 'series', 'screenplay', 'play', 'short_story',
  'feature_film', 'short_film', 'tv_pilot', 'tv_drama', 'tv_comedy',
  'audio_drama', 'stage_musical', 'web_series', 'podcast_script',
  'graphic_novel', 'poetry_collection', 'non_fiction', 'memoir'
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];
```

**3. UI Sends New Types:**
```typescript
// app/dashboard/projects/page.tsx:321-329
const handleCreateProject = async () => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: newProjectName,
      type: newProjectType, // Could be 'feature_film', 'tv_pilot', etc.
      genre: newProjectGenre,
    }),
  });
};
```

### Acceptance Criteria

- ✅ Database constraint updated to include all 18 document types
- ✅ Constraint matches `DOCUMENT_TYPES` array exactly
- ✅ Migration is reversible (has DOWN migration)
- ✅ Existing projects remain unaffected
- ✅ Can create projects with any document type
- ✅ Constraint validation still works (rejects invalid types like "foo")

### Implementation: Create Migration

Create new migration file:
```bash
npx supabase migration new update_projects_type_constraint
```

**Migration Content:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_update_projects_type_constraint.sql

-- Description: Extend projects.type constraint to support all 18 document types
-- Ticket: DB-002

BEGIN;

-- Drop the old constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_type_check;

-- Add new constraint with full document type list
ALTER TABLE projects
ADD CONSTRAINT projects_type_check
CHECK (type IN (
  -- Original types
  'novel',
  'series',
  'screenplay',
  'play',
  'short_story',

  -- Film & Video
  'feature_film',
  'short_film',
  'tv_pilot',
  'tv_drama',
  'tv_comedy',
  'web_series',

  -- Audio & Stage
  'audio_drama',
  'stage_musical',
  'podcast_script',

  -- Written Works
  'graphic_novel',
  'poetry_collection',
  'non_fiction',
  'memoir'
));

-- Verify constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_type_check'
  ) THEN
    RAISE EXCEPTION 'projects_type_check constraint not created';
  END IF;
END $$;

COMMIT;
```

**Rollback Migration (DOWN):**
```sql
-- Rollback to original 5 types (dangerous - may break existing data!)
BEGIN;

-- Warning: This will fail if any projects exist with non-legacy types
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_type_check;

ALTER TABLE projects
ADD CONSTRAINT projects_type_check
CHECK (type IN ('novel', 'series', 'screenplay', 'play', 'short_story'));

COMMIT;
```

### Testing

**1. Test Invalid Type (Should Fail):**
```sql
-- Should fail with constraint violation
INSERT INTO projects (user_id, name, type)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Test Project',
  'invalid_type'
);
-- Expected: ERROR: new row violates check constraint
```

**2. Test Legacy Type (Should Pass):**
```sql
-- Should succeed
INSERT INTO projects (user_id, name, type)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Test Novel',
  'novel'
);
-- Expected: INSERT 0 1
```

**3. Test New Type (Should Pass):**
```sql
-- Should succeed after migration
INSERT INTO projects (user_id, name, type)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Test Feature Film',
  'feature_film'
);
-- Expected: INSERT 0 1
```

**4. Test Via API:**
```bash
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Feature Film",
    "type": "feature_film",
    "genre": ["action", "thriller"]
  }'

# Expected: 201 Created
# Previous: 500 Internal Server Error
```

### Maintenance Strategy

To avoid this issue in the future, consider:

**Option A: Query document_type_metadata (Recommended)**
```sql
-- Use the documents constraint as source of truth
ALTER TABLE projects
ADD CONSTRAINT projects_type_check
CHECK (type IN (
  SELECT DISTINCT type FROM document_type_metadata
));
```

**Option B: Remove Constraint Entirely**
```sql
-- Let application validation handle it
ALTER TABLE projects
DROP CONSTRAINT projects_type_check;

-- Add comment explaining why
COMMENT ON COLUMN projects.type IS
  'Document type - validated by application layer (lib/document-types.ts)';
```

**Recommendation:** Keep constraint for data integrity, but document the need to update it when adding new types.

### Files to Modify
- `supabase/migrations/` (new migration file)

### Files Referenced
- `supabase/migrations/20251016000001_initial_schema.sql` (lines 25-34)
- `lib/document-types.ts` (lines 21-55)
- `app/dashboard/projects/page.tsx` (lines 321-329)

### Related Tickets
- Depends on: DB-001 (apply Phase 3 migrations first)
- Blocks: DB-003 (validation schema uses same type list)

---

## TICKET DB-003: Update Server Validation to Use Dynamic Document Types

**Priority:** P0 (Critical - Blocks API Requests)
**Effort:** 2 story points (1 day)
**Severity:** 🟠 **BLOCKS NEW PROJECT TYPES** - API returns 422 errors
**Component:** Server Validation, Zod Schemas
**Status:** 🔴 NOT STARTED

### Problem Statement

Server-side validation for projects is frozen on the legacy 5-type list, causing 422 validation errors even after the database constraint is fixed.

**Current Hard-Coded Validation:**
```typescript
// lib/validation/schemas/projects.ts:23-76
const projectType = z.enum([
  'novel',
  'series',
  'screenplay',
  'play',
  'short_story',
]);
```

**What Users See:**
```json
{
  "error": "Validation failed",
  "details": {
    "issues": [
      {
        "path": "type",
        "message": "Invalid enum value. Expected 'novel' | 'series' | 'screenplay' | 'play' | 'short_story', received 'feature_film'"
      }
    ]
  }
}
```

### Root Cause

The Zod schema hard-codes the legacy type list instead of importing from `lib/document-types.ts`.

**Problem Code:**
```typescript
// lib/validation/schemas/projects.ts:23-76
import { z } from 'zod'

// ❌ Hard-coded list, out of sync with DOCUMENT_TYPES
const projectType = z.enum([
  'novel',
  'series',
  'screenplay',
  'play',
  'short_story',
])

export const projectSchema = z.object({
  name: z.string().min(1).max(200),
  type: projectType, // Only accepts 5 legacy types
  genre: z.string().optional(),
  description: z.string().optional(),
})
```

**Correct Definition:**
```typescript
// lib/document-types.ts:21-55
export const DOCUMENT_TYPES = [
  'novel', 'series', 'screenplay', 'play', 'short_story',
  'feature_film', 'short_film', 'tv_pilot', 'tv_drama', 'tv_comedy',
  'audio_drama', 'stage_musical', 'web_series', 'podcast_script',
  'graphic_novel', 'poetry_collection', 'non_fiction', 'memoir'
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];
```

### Acceptance Criteria

- ✅ Validation schema imports `DOCUMENT_TYPES` from `lib/document-types.ts`
- ✅ Schema accepts all 18 document types
- ✅ Schema rejects invalid types (validation still works)
- ✅ Type safety maintained (TypeScript errors if types mismatch)
- ✅ All API endpoints using `projectSchema` work with new types
- ✅ No breaking changes to existing validation logic

### Implementation

**1. Refactor Validation Schema:**
```typescript
// lib/validation/schemas/projects.ts
import { z } from 'zod'
import { DOCUMENT_TYPES, type DocumentType } from '@/lib/document-types'

// ✅ Use the canonical source of truth
const projectType = z.enum(DOCUMENT_TYPES)

// Or if you need more flexibility:
const projectType = z.string().refine(
  (val): val is DocumentType => DOCUMENT_TYPES.includes(val as DocumentType),
  { message: `Type must be one of: ${DOCUMENT_TYPES.join(', ')}` }
)

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  type: projectType,
  genre: z.string().optional(),
  description: z.string().optional(),
  folder_id: z.string().uuid().optional().nullable(),
})

export const projectQuerySchema = z.object({
  search: z.string().optional(),
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  type: projectType.optional(),
  genre: z.string().optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  sortBy: z.enum(['name', 'created_at', 'updated_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export type ProjectSchema = z.infer<typeof projectSchema>
export type ProjectQuerySchema = z.infer<typeof projectQuerySchema>
```

**2. Verify Type Compatibility:**
```typescript
// Add a compile-time check to ensure schemas match
import type { DocumentType } from '@/lib/document-types'
import type { ProjectSchema } from '@/lib/validation/schemas/projects'

// This should not cause a TypeScript error:
const testType: ProjectSchema['type'] = 'feature_film' satisfies DocumentType
```

### Alternative Approach: Query Database Metadata

If you want ultimate flexibility:

```typescript
// lib/validation/schemas/projects.ts
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Dynamic validation that queries document_type_metadata
export async function createProjectSchema() {
  const supabase = await createClient()
  const { data: types } = await supabase
    .from('document_type_metadata')
    .select('type')

  const validTypes = types?.map(t => t.type) ?? []

  return z.object({
    name: z.string().min(1).max(200),
    type: z.enum(validTypes as [string, ...string[]]),
    genre: z.string().optional(),
    description: z.string().optional(),
  })
}

// Usage in API route:
const schema = await createProjectSchema()
const validated = schema.parse(body)
```

**Pros:** Always in sync with database
**Cons:** Adds latency to validation, requires async validation

**Recommendation:** Use static import from `lib/document-types.ts` for performance. Update both files when adding new types.

### Testing

**1. Test Validation with Legacy Type:**
```typescript
import { projectSchema } from '@/lib/validation/schemas/projects'

const result = projectSchema.safeParse({
  name: 'My Novel',
  type: 'novel',
})

console.assert(result.success === true)
```

**2. Test Validation with New Type:**
```typescript
const result = projectSchema.safeParse({
  name: 'My Feature Film',
  type: 'feature_film', // Should now pass
})

console.assert(result.success === true)
```

**3. Test Validation with Invalid Type:**
```typescript
const result = projectSchema.safeParse({
  name: 'My Project',
  type: 'invalid_type', // Should fail
})

console.assert(result.success === false)
console.assert(result.error.issues[0].path[0] === 'type')
```

**4. Test API Endpoint:**
```bash
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My TV Pilot",
    "type": "tv_pilot"
  }'

# Expected: 201 Created
# Previous: 422 Unprocessable Entity
```

### Files to Modify
- `lib/validation/schemas/projects.ts` (lines 23-76)
- Any other validation schemas that reference project types

### Files Referenced
- `lib/document-types.ts` (lines 21-55)
- `lib/validation/schemas/projects.ts` (entire file)

### Impact Assessment

**API Routes Affected:**
- `app/api/projects/route.ts` (POST, PUT)
- `app/api/projects/query/route.ts` (GET)
- `app/api/projects/[projectId]/route.ts` (GET, PATCH, DELETE)

All will now accept the full range of document types.

### Related Tickets
- Depends on: DB-002 (database constraint must be updated first)
- Blocks: None (but unblocks user project creation)

---

## TICKET DB-004: Fix Genre Array Type Mismatch in Project Creation

**Priority:** P1 (High - Data Integrity Issue)
**Effort:** 2 story points (1 day)
**Severity:** 🟡 **DATA INTEGRITY RISK** - Genre saved incorrectly
**Component:** API Route, Database Schema
**Status:** 🔴 NOT STARTED

### Problem Statement

The `POST /api/projects` endpoint writes `genre: genre || null`, treating genre as a single string. However, the database column is defined as `TEXT[]` (array).

**Error When Single String Sent:**
```
invalid input syntax for type text[]: "fantasy"
```

**Database Schema:**
```sql
-- supabase/migrations/20251016000001_initial_schema.sql:31
genre TEXT[], -- Array of genres
```

**API Code:**
```typescript
// app/api/projects/route.ts:62-80
const { data: project, error } = await supabase
  .from('projects')
  .insert([
    {
      user_id: user.id,
      name,
      type,
      genre: genre || null, // ❌ If genre is string "fantasy", PostgREST rejects it
      description,
    },
  ])
  .select()
  .single()
```

**Client Code:**
```typescript
// app/dashboard/projects/page.tsx:321-329
const response = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    name: newProjectName,
    type: newProjectType,
    genre: newProjectGenre, // Could be string or array
  }),
});
```

### Root Cause

**Schema Definition Mismatch:**
- Database expects: `TEXT[]` (e.g., `['fantasy', 'adventure']`)
- API receives: `string | string[] | undefined`
- API sends: `string | null` (does not normalize to array)

### Acceptance Criteria

**Option A: Normalize to Array (Recommended)**
- ✅ API accepts both `string` and `string[]` for genre
- ✅ API always stores as `TEXT[]` in database
- ✅ Empty/null genre stored as `NULL` (not empty array)
- ✅ Single string normalized to single-element array
- ✅ Array passed through unchanged
- ✅ Validation ensures all genres are valid strings

**Option B: Change Column to TEXT**
- ✅ Column changed from `TEXT[]` to `TEXT`
- ✅ Migration preserves existing data (first element or null)
- ✅ API code unchanged
- ✅ Less flexible (can't store multiple genres)

**Recommendation:** Option A (normalize to array) for maximum flexibility.

### Implementation: Option A - Normalize to Array

**1. Update API Route:**
```typescript
// app/api/projects/route.ts

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const body = await request.json()
    const { name, type, genre, description, folder_id } = body

    // Validate with updated schema
    const validationResult = projectSchema.safeParse({
      name,
      type,
      genre, // Can be string, string[], or undefined
      description,
      folder_id,
    })

    if (!validationResult.success) {
      return errorResponses.validationError('Invalid project data', {
        issues: validationResult.error.issues,
      })
    }

    const validated = validationResult.data

    // ✅ Normalize genre to array or null
    const normalizedGenre = validated.genre
      ? Array.isArray(validated.genre)
        ? validated.genre.filter(g => g.trim().length > 0) // Filter empty strings
        : [validated.genre].filter(g => g.trim().length > 0)
      : null

    const { data: project, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: user.id,
          name: validated.name,
          type: validated.type,
          genre: normalizedGenre?.length ? normalizedGenre : null, // Use null for empty array
          description: validated.description,
          folder_id: validated.folder_id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return successResponse(project, { status: 201 })
  } catch (error) {
    logger.error('Project creation failed', {
      operation: 'projects:create',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to create project', { status: 500, details: error })
  }
}
```

**2. Update Validation Schema:**
```typescript
// lib/validation/schemas/projects.ts

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  type: z.enum(DOCUMENT_TYPES),

  // Accept string or string[] and normalize
  genre: z
    .union([
      z.string().min(1),
      z.array(z.string().min(1))
    ])
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return null
      if (Array.isArray(val)) return val
      return [val]
    }),

  description: z.string().max(5000).optional(),
  folder_id: z.string().uuid().optional().nullable(),
})
```

**3. Update PATCH Route (Similar Logic):**
```typescript
// app/api/projects/[projectId]/route.ts

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  // ... auth checks ...

  const updates: Record<string, any> = {}

  if (name !== undefined) updates.name = name
  if (type !== undefined) updates.type = type
  if (description !== undefined) updates.description = description

  // ✅ Normalize genre
  if (genre !== undefined) {
    updates.genre = genre
      ? Array.isArray(genre)
        ? genre.filter(g => g.trim().length > 0)
        : [genre].filter(g => g.trim().length > 0)
      : null
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select()
    .single()

  // ... rest of handler ...
}
```

### Implementation: Option B - Change Column to TEXT (Not Recommended)

If you decide to simplify to single genre:

**1. Create Migration:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_change_genre_to_text.sql

BEGIN;

-- Backup existing data
CREATE TEMP TABLE genre_backup AS
SELECT id, genre FROM projects WHERE genre IS NOT NULL;

-- Change column type (preserve first element)
ALTER TABLE projects
ALTER COLUMN genre TYPE TEXT
USING CASE
  WHEN genre IS NULL THEN NULL
  WHEN array_length(genre, 1) > 0 THEN genre[1]
  ELSE NULL
END;

-- Log any multi-genre projects that lost data
DO $$
DECLARE
  lost_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO lost_count
  FROM genre_backup
  WHERE array_length(genre, 1) > 1;

  IF lost_count > 0 THEN
    RAISE NOTICE 'WARNING: % projects had multiple genres - only first genre preserved', lost_count;
  END IF;
END $$;

COMMIT;
```

**2. No API Changes Needed** (current code works)

**Cons:**
- ❌ Loses multi-genre capability
- ❌ Data loss for existing projects with multiple genres
- ❌ Less flexible for future features

### Testing

**Test 1: Single String Genre**
```bash
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Fantasy Novel",
    "type": "novel",
    "genre": "fantasy"
  }'

# Expected: 201 Created
# Database should store: genre = ['fantasy']
```

**Test 2: Array Genre**
```bash
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Multi-Genre Novel",
    "type": "novel",
    "genre": ["fantasy", "adventure", "romance"]
  }'

# Expected: 201 Created
# Database should store: genre = ['fantasy', 'adventure', 'romance']
```

**Test 3: Null/Empty Genre**
```bash
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Ungenred Project",
    "type": "novel"
  }'

# Expected: 201 Created
# Database should store: genre = NULL
```

**Test 4: Verify Database Storage**
```sql
-- Check genre is stored as array
SELECT id, name, genre, pg_typeof(genre) AS genre_type
FROM projects
WHERE name IN ('Fantasy Novel', 'Multi-Genre Novel', 'Ungenred Project');

-- Expected output:
-- id | name              | genre                              | genre_type
-- ---|-------------------|------------------------------------|-----------
-- ...| Fantasy Novel     | {fantasy}                          | text[]
-- ...| Multi-Genre Novel | {fantasy,adventure,romance}        | text[]
-- ...| Ungenred Project  | NULL                               | text[]
```

### Validation Edge Cases

Handle these scenarios:
```typescript
// Empty string → null
genre: "" → null

// Empty array → null
genre: [] → null

// Array with empty strings → filter them out
genre: ["fantasy", "", "adventure"] → ["fantasy", "adventure"]

// Whitespace-only strings → filter them out
genre: ["  ", "fantasy"] → ["fantasy"]

// Null explicitly sent → null
genre: null → null

// Undefined (not sent) → null
genre: undefined → null
```

### Files to Modify
- `app/api/projects/route.ts` (lines 62-80)
- `app/api/projects/[projectId]/route.ts` (PATCH handler)
- `lib/validation/schemas/projects.ts` (genre field definition)

### Files Referenced
- `supabase/migrations/20251016000001_initial_schema.sql` (line 31)
- `app/dashboard/projects/page.tsx` (lines 321-329)

### Related Tickets
- Independent (can be done in parallel with DB-001, DB-002, DB-003)

---

## Implementation Order & Dependencies

```mermaid
graph TD
    A[DB-001: Apply Phase 3 Migrations] --> B[DB-002: Extend Type Constraint]
    B --> C[DB-003: Update Validation Schema]
    D[DB-004: Fix Genre Array]

    style A fill:#ff6b6b
    style B fill:#ff6b6b
    style C fill:#ff6b6b
    style D fill:#ffd93d
```

### Phase 1: Critical Path (Must Be Sequential)
**Day 1:**
1. ✅ **DB-001** - Apply Phase 3 migrations (2 points)
   - **BLOCKS EVERYTHING** - do this first!

**Day 2:**
2. ✅ **DB-002** - Extend type constraint (2 points)
   - Depends on DB-001 (needs schema to be stable)

**Day 3:**
3. ✅ **DB-003** - Update validation (2 points)
   - Depends on DB-002 (validation must match database)

### Phase 2: Independent Fix (Can Run in Parallel)
**Day 3-4 (Parallel):**
4. ✅ **DB-004** - Fix genre array (2 points)
   - Independent, can be done anytime

### Total Timeline: 3-4 Days

---

## Verification Checklist

After completing all tickets:

### Database State
- [ ] All Phase 3 migrations applied to production
- [ ] `projects.folder_id` column exists
- [ ] `project_folders` table exists with RLS policies
- [ ] `project_tag_links` table exists with RLS policies
- [ ] `projects.type` constraint includes all 18 types
- [ ] Genre is consistently `TEXT[]` or normalized by API

### API Endpoints
- [ ] `GET /api/projects/query?limit=20` returns 200
- [ ] `POST /api/projects` accepts all document types
- [ ] `POST /api/projects` accepts genre as string or array
- [ ] `PATCH /api/projects/[id]` validates with new schema
- [ ] No 500 errors in production logs

### Application Behavior
- [ ] Dashboard loads projects without errors
- [ ] Can create novel (legacy type)
- [ ] Can create feature_film (new type)
- [ ] Can create tv_pilot (new type)
- [ ] Genre saved correctly as array
- [ ] Folder assignment works
- [ ] Tag filtering works

### Testing Commands

Run these after all migrations:

```bash
# 1. Test query endpoint
curl https://www.ottowrite.app/api/projects/query?limit=20
# Expected: 200 OK with projects array

# 2. Test creating new type
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Feature Film",
    "type": "feature_film",
    "genre": ["action"]
  }'
# Expected: 201 Created

# 3. Test query with folder filter
curl 'https://www.ottowrite.app/api/projects/query?folderId=<uuid>&limit=10'
# Expected: 200 OK with filtered projects

# 4. Test creating with multiple genres
curl -X POST https://www.ottowrite.app/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Multi-Genre Test",
    "type": "novel",
    "genre": ["fantasy", "adventure", "romance"]
  }'
# Expected: 201 Created, genre stored as array
```

---

## Risk Assessment

### High Risk
- **DB-001**: Applying migrations to production
  - **Mitigation**: Test on staging first, have rollback plan
  - **Rollback**: Drop new columns/tables if issues arise

### Medium Risk
- **DB-002**: Changing type constraint
  - **Mitigation**: Existing projects unaffected (only adds new values)
  - **Rollback**: Revert constraint (but breaks new projects)

- **DB-003**: Validation schema changes
  - **Mitigation**: Code change only, easily revertable
  - **Rollback**: Git revert the commit

### Low Risk
- **DB-004**: Genre normalization
  - **Mitigation**: Handles both string and array, backwards compatible
  - **Rollback**: Remove normalization logic

---

## Success Metrics

### Before Fixes
- ❌ `/api/projects/query` returns 500
- ❌ Creating feature_film fails with 500
- ❌ Creating tv_pilot fails with 422
- ❌ Genre as string causes database error

### After Fixes
- ✅ `/api/projects/query` returns 200
- ✅ All 18 document types can be created
- ✅ Validation accepts all document types
- ✅ Genre works as string or array
- ✅ Folder filtering works
- ✅ Tag filtering works
- ✅ No 500 errors in production

### Performance
- Query endpoint response time: < 500ms (with proper indexing)
- Project creation: < 300ms
- Validation overhead: < 10ms

---

## Next Steps After Completion

1. **Monitor Production Logs**
   - Watch for any new errors
   - Check query performance
   - Verify user behavior

2. **Update Documentation**
   - Document the 18 supported types
   - Update API documentation
   - Update README with new features

3. **Add Tests**
   - Integration tests for all 18 types
   - API tests for genre normalization
   - E2E tests for project creation flow

4. **Consider Future Improvements**
   - Add database indices on `folder_id`, `type`
   - Add full-text search on `name` and `description`
   - Add genre autocomplete/suggestions
   - Add project templates per type

---

**Created by:** Claude (AI Assistant)
**Last Updated:** 2025-10-23
**Status:** Ready for implementation
**Estimated Completion:** 3-4 days (sequential execution)

**CRITICAL PATH:** DB-001 → DB-002 → DB-003 → Verify
**PARALLEL TASK:** DB-004 (can be done anytime)
