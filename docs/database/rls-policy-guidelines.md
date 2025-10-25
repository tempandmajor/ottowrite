# RLS Policy Guidelines

> Standards and best practices for Row-Level Security (RLS) policies in OttoWrite. This guide helps maintain clarity, security, and consistency across database policies.

## Table of Contents

- [Overview](#overview)
- [Current State](#current-state)
- [Policy Types](#policy-types)
- [Naming Conventions](#naming-conventions)
- [When to Use Each Approach](#when-to-use-each-approach)
- [Examples](#examples)
- [Security Best Practices](#security-best-practices)
- [Testing RLS Policies](#testing-rls-policies)

---

## Overview

### Status

- **Decision**: Keep current mixed approach with clear guidelines
- **Effective Date**: 2025-10-25
- **Applies To**: All new RLS policies created after this date
- **Existing Policies**: Remain unchanged unless refactoring for functionality

### Why RLS Policy Standards Matter

- ✅ **Security** - Enforces data isolation at database level
- ✅ **Clarity** - Clear policy names reduce cognitive load
- ✅ **Maintainability** - Consistent patterns easier to audit
- ✅ **Performance** - Well-designed policies optimize query execution

---

## Current State

### Tables Using `FOR ALL` Policies

**Concise single-policy approach:**

| Table | Policy Name | Operations |
|-------|-------------|------------|
| `project_folders` | "Users can manage their own folders" | ALL (SELECT, INSERT, UPDATE, DELETE) |
| `project_tags` | "Users can manage their own tags" | ALL |
| `project_tag_links` | "Users can manage their own tag links" | ALL |

**Pattern:**
```sql
CREATE POLICY "Users can manage their own {entity}"
ON public.{table}
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Tables Using Explicit Policies

**Granular per-operation approach:**

| Table | Policies | Operations |
|-------|----------|------------|
| `projects` | 4 policies | SELECT, INSERT, UPDATE, DELETE |
| `documents` | 4 policies | SELECT, INSERT, UPDATE, DELETE |
| `user_profiles` | 2 policies | SELECT, UPDATE |

**Pattern:**
```sql
CREATE POLICY "Users can {operation} their own {entity}"
ON public.{table}
FOR {OPERATION}
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Analysis Summary

**Strengths:**
- ✅ Both approaches are secure and functionally correct
- ✅ `FOR ALL` policies are more concise (3 tables use this)
- ✅ Explicit policies provide operation-level visibility (3 tables use this)
- ✅ All policies enforce proper user isolation

**Observations:**
- Mixed approach is intentional - simpler tables use `FOR ALL`, complex tables use explicit policies
- No redundant or duplicate policies (after DB-001 cleanup)
- Policy names are descriptive and follow consistent patterns

---

## Policy Types

### FOR ALL Policies

**Definition:** Single policy covering all CRUD operations (SELECT, INSERT, UPDATE, DELETE)

**Syntax:**
```sql
CREATE POLICY "policy_name"
ON schema.table
FOR ALL
TO role
USING (condition)
WITH CHECK (condition);
```

**Use Cases:**
- ✅ Simple user isolation (user_id check)
- ✅ Same condition for all operations
- ✅ Straightforward CRUD patterns
- ✅ Low complexity requirements

**Benefits:**
- Fewer policies to maintain
- Easier to audit (one place to check)
- Less code to review
- Consistent logic across all operations

**Example:**
```sql
CREATE POLICY "Users can manage their own folders"
ON public.project_folders
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### Explicit Policies

**Definition:** Separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)

**Syntax:**
```sql
CREATE POLICY "policy_name_select"
ON schema.table
FOR SELECT
TO role
USING (condition);

CREATE POLICY "policy_name_insert"
ON schema.table
FOR INSERT
TO role
WITH CHECK (condition);

CREATE POLICY "policy_name_update"
ON schema.table
FOR UPDATE
TO role
USING (condition)
WITH CHECK (condition);

CREATE POLICY "policy_name_delete"
ON schema.table
FOR DELETE
TO role
USING (condition);
```

**Use Cases:**
- ✅ Different conditions per operation
- ✅ Complex permission logic
- ✅ Operation-specific validation
- ✅ Role-based access with varying rules
- ✅ Need for operation-level audit trails

**Benefits:**
- Granular control over each operation
- Explicit visibility of what's allowed
- Easier to add operation-specific rules
- Better for complex authorization logic

**Example:**
```sql
CREATE POLICY "Users can view their own projects"
ON public.projects
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
ON public.projects
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
TO public
USING (auth.uid() = user_id);
```

---

## Naming Conventions

### General Rules

**Format:** Descriptive English sentence explaining what the policy allows

**Pattern:** `"{Role/Actor} can {operation} {condition}"`

**Rules:**
- Use active voice ("Users can..." not "User's...")
- Be specific about the operation
- Include the ownership/condition clause
- Keep under 80 characters
- Use lowercase except for proper nouns

### FOR ALL Policy Names

**Format:** `"Users can manage their own {entity_plural}"`

**Examples:**
```sql
✅ "Users can manage their own folders"
✅ "Users can manage their own tags"
✅ "Users can manage their own tag links"
✅ "Admins can manage all projects"

❌ "Folder management policy"  -- Too vague
❌ "Users folders"             -- Incomplete sentence
❌ "project_folders_all"       -- Technical, not descriptive
```

**Alternative (More Explicit):**
```sql
✅ "Enforce user isolation for all folder operations"
✅ "User-owned tags: all operations allowed"
```

### Explicit Policy Names

**Format:** `"Users can {operation} their own {entity_plural}"`

**Operation Verbs:**
- **SELECT**: "view", "read", "list"
- **INSERT**: "create", "insert", "add"
- **UPDATE**: "update", "modify", "edit"
- **DELETE**: "delete", "remove"

**Examples:**
```sql
-- SELECT
✅ "Users can view their own projects"
✅ "Users can read their own documents"
✅ "Public can view published content"

-- INSERT
✅ "Users can create their own projects"
✅ "Users can insert documents"
✅ "Authenticated users can add comments"

-- UPDATE
✅ "Users can update their own projects"
✅ "Users can modify their own profile"
✅ "Editors can update drafts"

-- DELETE
✅ "Users can delete their own projects"
✅ "Users can remove their own comments"
✅ "Admins can delete any content"

-- Anti-patterns
❌ "project_select_policy"     -- Technical naming
❌ "SELECT on projects"        -- Not descriptive
❌ "Users can do stuff"        -- Too vague
❌ "Allow project access"      -- Unclear what operations
```

---

## When to Use Each Approach

### Decision Matrix

| Criteria | FOR ALL | Explicit Policies |
|----------|---------|-------------------|
| **Condition Complexity** | Simple (user_id check) | Complex or varies by operation |
| **Operations Allowed** | All CRUD operations | Subset of operations or different rules |
| **Future Changes** | Unlikely to need per-op rules | Likely to need granular control |
| **Audit Requirements** | Basic logging sufficient | Need operation-level tracking |
| **Team Preference** | Concise code | Explicit visibility |
| **Table Complexity** | Simple user-owned data | Complex relationships/validation |

### Use FOR ALL When:

✅ **Simple User Isolation**
- Table has `user_id` column
- Same ownership check for all operations
- No special validation per operation

**Example Tables:**
- `project_folders` - User owns all their folders
- `project_tags` - User owns all their tags
- `user_preferences` - User controls their settings

✅ **Consistent Logic**
```sql
-- Same condition for USING and WITH CHECK
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

✅ **Low Complexity**
- No role-based differences
- No operation-specific business rules
- Straightforward CRUD access

---

### Use Explicit Policies When:

✅ **Different Rules Per Operation**

**Example: Documents with hierarchy validation**
```sql
-- SELECT: Simple user_id check
CREATE POLICY "Users can view own documents"
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Must validate parent folder ownership
CREATE POLICY "Users can create documents"
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (parent_folder_id IS NULL OR EXISTS (
    SELECT 1 FROM documents parent
    WHERE parent.id = parent_folder_id
    AND parent.user_id = auth.uid()
  ))
);
```

✅ **Subset of Operations**
```sql
-- User profiles: users can view and update, but not insert or delete
CREATE POLICY "Users can view their own profile"
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
FOR UPDATE
USING (auth.uid() = id);

-- No INSERT or DELETE policies (managed by auth triggers)
```

✅ **Role-Based Access**
```sql
-- Different rules for different roles
CREATE POLICY "Users can view their own projects"
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all projects"
FOR SELECT TO admin
USING (true);
```

✅ **Complex Validation**
```sql
-- Update requires additional checks
CREATE POLICY "Users can update projects with validation"
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  status IN ('draft', 'in_progress') AND
  NOT is_archived
);
```

---

## Examples

### Example 1: Simple User-Owned Table (Use FOR ALL)

**Table:** `character_profiles`
- User owns all their characters
- Same rules for all operations
- No complex validation

```sql
-- ✅ RECOMMENDED: FOR ALL
CREATE POLICY "Users can manage their own characters"
ON public.character_profiles
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;
```

---

### Example 2: Complex Table (Use Explicit Policies)

**Table:** `collaborative_projects`
- Users can view shared projects
- Users can only create their own projects
- Users can update their own or projects they're invited to
- Users can only delete their own projects

```sql
-- ✅ RECOMMENDED: Explicit policies with different rules

-- SELECT: View own projects or shared projects
CREATE POLICY "Users can view accessible projects"
ON public.collaborative_projects
FOR SELECT
TO public
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = collaborative_projects.id
    AND user_id = auth.uid()
  )
);

-- INSERT: Can only create as owner
CREATE POLICY "Users can create their own projects"
ON public.collaborative_projects
FOR INSERT
TO public
WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Can update if owner or collaborator with edit permission
CREATE POLICY "Users can update accessible projects"
ON public.collaborative_projects
FOR UPDATE
TO public
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = collaborative_projects.id
    AND user_id = auth.uid()
    AND can_edit = true
  )
)
WITH CHECK (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = collaborative_projects.id
    AND user_id = auth.uid()
    AND can_edit = true
  )
);

-- DELETE: Only owner can delete
CREATE POLICY "Users can delete their own projects"
ON public.collaborative_projects
FOR DELETE
TO public
USING (auth.uid() = owner_id);
```

---

### Example 3: Public Read, Authenticated Write

**Table:** `story_templates`
- Anyone can view published templates
- Only authenticated users can create
- Only owner can update/delete

```sql
-- SELECT: Public can view published, users can view all their own
CREATE POLICY "Anyone can view published templates"
ON public.story_templates
FOR SELECT
TO public
USING (
  is_published = true OR
  auth.uid() = user_id
);

-- INSERT: Authenticated users only
CREATE POLICY "Authenticated users can create templates"
ON public.story_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only owner
CREATE POLICY "Users can update their own templates"
ON public.story_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Only owner
CREATE POLICY "Users can delete their own templates"
ON public.story_templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

---

## Security Best Practices

### 1. Always Enable RLS

```sql
-- ✅ ALWAYS do this after creating policies
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;
```

### 2. Use auth.uid() Not request.jwt.claims

```sql
-- ✅ CORRECT: Use auth.uid()
USING (auth.uid() = user_id)

-- ❌ WRONG: Direct JWT access
USING (request.jwt.claims->>'sub' = user_id::text)
```

### 3. Include WITH CHECK for Modifications

```sql
-- ✅ CORRECT: Both USING and WITH CHECK
CREATE POLICY "policy_name"
FOR UPDATE
USING (auth.uid() = user_id)      -- Can see the row
WITH CHECK (auth.uid() = user_id); -- New values valid

-- ⚠️ INCOMPLETE: Missing WITH CHECK
CREATE POLICY "policy_name"
FOR UPDATE
USING (auth.uid() = user_id);      -- Users could update to invalid state
```

### 4. Test Policies Thoroughly

```sql
-- Set role and test
SET ROLE authenticated;
SET request.jwt.claims.sub = 'test-user-uuid';

-- Should return only user's data
SELECT * FROM {table};

-- Should fail or return empty
SELECT * FROM {table} WHERE user_id != 'test-user-uuid';

-- Reset
RESET ROLE;
```

### 5. Avoid Overly Complex Policies

```sql
-- ❌ BAD: Too complex, hard to audit
USING (
  (auth.uid() = user_id AND status = 'active') OR
  (auth.uid() IN (SELECT collaborator_id FROM ...) AND ...) OR
  (role = 'admin' AND ...) OR
  ...
)

-- ✅ BETTER: Split into multiple policies
CREATE POLICY "Owners can access"
USING (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Collaborators can access"
USING (auth.uid() IN (SELECT collaborator_id FROM collaborators WHERE ...));

CREATE POLICY "Admins can access"
TO admin
USING (true);
```

### 6. Denormalize for Performance

```sql
-- ✅ GOOD: Denormalized user_id for fast RLS check
CREATE TABLE project_tag_links (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,  -- Denormalized for RLS performance
  project_id UUID REFERENCES projects(id),
  tag_id UUID REFERENCES project_tags(id)
);

CREATE POLICY "Users can manage their own tag links"
FOR ALL
USING (auth.uid() = user_id);  -- Fast index lookup

-- ❌ SLOW: Requires JOIN in RLS policy
USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id))
```

---

## Testing RLS Policies

### Manual Testing

```sql
-- 1. Create test users
INSERT INTO auth.users (id, email) VALUES
  ('user-a-uuid', 'user-a@example.com'),
  ('user-b-uuid', 'user-b@example.com');

-- 2. Create test data as each user
SET request.jwt.claims.sub = 'user-a-uuid';
INSERT INTO projects (user_id, name) VALUES ('user-a-uuid', 'User A Project');

SET request.jwt.claims.sub = 'user-b-uuid';
INSERT INTO projects (user_id, name) VALUES ('user-b-uuid', 'User B Project');

-- 3. Test isolation
SET request.jwt.claims.sub = 'user-a-uuid';
SELECT * FROM projects;  -- Should return only User A's project

SET request.jwt.claims.sub = 'user-b-uuid';
SELECT * FROM projects;  -- Should return only User B's project

-- 4. Test unauthorized access
SET request.jwt.claims.sub = 'user-a-uuid';
UPDATE projects SET name = 'Hacked' WHERE user_id = 'user-b-uuid';
-- Should affect 0 rows

-- 5. Cleanup
RESET ROLE;
DELETE FROM projects WHERE user_id IN ('user-a-uuid', 'user-b-uuid');
```

### Automated Testing

```sql
-- Create test function
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS void AS $$
DECLARE
  user_a_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  user_b_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  count_a INT;
  count_b INT;
BEGIN
  -- Setup
  PERFORM set_config('request.jwt.claims.sub', user_a_id::text, true);
  INSERT INTO projects (user_id, name) VALUES (user_a_id, 'Test A');

  PERFORM set_config('request.jwt.claims.sub', user_b_id::text, true);
  INSERT INTO projects (user_id, name) VALUES (user_b_id, 'Test B');

  -- Test User A sees only their data
  PERFORM set_config('request.jwt.claims.sub', user_a_id::text, true);
  SELECT COUNT(*) INTO count_a FROM projects;
  ASSERT count_a = 1, 'User A should see 1 project';

  -- Test User B sees only their data
  PERFORM set_config('request.jwt.claims.sub', user_b_id::text, true);
  SELECT COUNT(*) INTO count_b FROM projects;
  ASSERT count_b = 1, 'User B should see 1 project';

  -- Cleanup
  DELETE FROM projects WHERE user_id IN (user_a_id, user_b_id);

  RAISE NOTICE 'RLS isolation test passed!';
END;
$$ LANGUAGE plpgsql;

-- Run test
SELECT test_rls_isolation();
```

---

## Related Documentation

- **[Schema Overview](./schema-overview.md)** - Table structures and relationships
- **[Naming Conventions](./naming-conventions.md)** - Database object naming standards
- **[Migration Guidelines](./migration-guidelines.md)** - How to create migrations
- **[DB-007 Ticket](../tickets/DB-007-consolidate-rls-policies.md)** - Original policy consolidation analysis

---

## Changelog

### 2025-10-25 - Initial Guidelines

- Documented current state (mixed approach)
- Established guidelines for `FOR ALL` vs explicit policies
- Created naming conventions for both approaches
- Provided decision matrix and examples
- Added security best practices and testing strategies

---

**Last Updated**: 2025-10-25
**Status**: Active
**Owner**: Backend Team
