# DB-007: Consolidate RLS Policies for Clarity

## Severity
ℹ️ **INFO / LOW PRIORITY**

## Priority
**LONG TERM** - Nice to have, not urgent

## Description
While RLS policies are functionally correct, they could be more concise and easier to understand:

### Current State: Verbose Policies
Each table has ONE policy using `FOR ALL USING`:

```sql
-- Example: project_folders
CREATE POLICY "Users can manage their folders"
ON public.project_folders
FOR ALL
TO authenticated
USING (auth.uid() = user_id);
```

**Issues**:
- Policy name implies CRUD operations but doesn't explicitly show them
- `FOR ALL USING` covers both SELECT and modifications, which is not immediately obvious
- Could be more explicit about what operations are allowed

### Alternative: Explicit Policies
```sql
-- More explicit approach (what some teams prefer)
CREATE POLICY "folders_select_policy"
ON public.project_folders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "folders_insert_policy"
ON public.project_folders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "folders_update_policy"
ON public.project_folders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "folders_delete_policy"
ON public.project_folders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## Impact/Risk Assessment
- **Security**: NONE (current policies are secure)
- **Performance**: NONE (same checks either way)
- **Clarity**: LOW (verbose but clear once you understand FOR ALL)
- **Maintenance**: LOW (fewer policies = easier to manage)

**Current approach is actually BETTER for this use case** because:
- ✅ Fewer policies to maintain
- ✅ Consistent user_id check across all operations
- ✅ Less code to review
- ✅ Easier to audit

## Analysis

### When to Use `FOR ALL`
✅ **Good fit** (our case):
- Same USING/WITH CHECK for all operations
- Simple user isolation (user_id check)
- Low complexity

### When to Use Explicit Policies
❌ **Not needed** for our case, but useful when:
- Different rules for different operations
- Complex permission logic
- Need operation-specific logging
- Role-based access with different rules per operation

## Recommendation
**KEEP CURRENT APPROACH** (`FOR ALL`) because:
1. Our use case is simple user isolation
2. Same check applies to all operations
3. Fewer policies = easier maintenance
4. Security is clear and correct

**Only change IF**:
- We need different rules per operation
- Team consensus prefers explicit policies
- Audit requirements demand operation-level policies

## Alternative: Improve Policy Names
If we want better clarity WITHOUT adding complexity:

```sql
-- Current (slightly vague)
CREATE POLICY "Users can manage their folders"

-- Improved (more explicit)
CREATE POLICY "Users can perform all operations on their own folders"

-- Or even more explicit
CREATE POLICY "User isolation: all operations require user_id match"
```

## Implementation (If Proceeding)

### Option A: Keep Current + Improve Names
```sql
-- Rename existing policies for clarity
ALTER POLICY "Users can manage their folders"
ON public.project_folders
RENAME TO "Enforce user_id isolation for all operations";

ALTER POLICY "Users can manage their tags"
ON public.project_tags
RENAME TO "Enforce user_id isolation for all operations";

ALTER POLICY "Users can manage their tag links"
ON public.project_tag_links
RENAME TO "Enforce user_id isolation for all operations";

ALTER POLICY "Users can manage their projects"
ON public.projects
RENAME TO "Enforce user_id isolation for all operations";
```

### Option B: Split Into Explicit Policies (NOT RECOMMENDED)
Only if team decides explicit policies are preferred.

```sql
-- Example for project_folders (repeat for other tables)

-- Drop existing FOR ALL policy
DROP POLICY "Users can manage their folders" ON public.project_folders;

-- Create explicit policies
CREATE POLICY "project_folders_select"
ON public.project_folders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "project_folders_insert"
ON public.project_folders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "project_folders_update"
ON public.project_folders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "project_folders_delete"
ON public.project_folders FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## Testing Requirements
If implementing Option A (rename policies):

### 1. Verify Policy Rename
```sql
-- Check new policy names
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('projects', 'project_folders', 'project_tags', 'project_tag_links')
ORDER BY tablename;
```

### 2. Functional Testing
- [ ] User can view only their own folders
- [ ] User can create new folders
- [ ] User can update their own folders
- [ ] User can delete their own folders
- [ ] User CANNOT view other users' folders
- [ ] User CANNOT modify other users' folders
- [ ] Repeat for tags, tag links, projects

### 3. Security Testing
```sql
-- Verify isolation works
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-a-uuid';

-- Should return only user A's data
SELECT * FROM project_folders;

-- Should fail (or return 0 rows)
SELECT * FROM project_folders WHERE user_id != 'user-a-uuid';
```

## Acceptance Criteria
- [x] Team consensus on approach (keep current - DOCUMENTATION ONLY)
- [x] RLS policy guidelines documentation created
- [x] Current state documented with analysis
- [x] Decision matrix and examples provided
- [x] Security best practices documented
- [x] Testing strategies documented

## Implementation Summary

**Status**: ✅ COMPLETE

**Approach**: Documentation Only (RECOMMENDED)

**Decision**: Keep current mixed approach with clear guidelines

**Rationale:**
- Current policies are secure and functionally correct
- Mixed approach is intentional and appropriate:
  - Simple tables (`project_folders`, `project_tags`, `project_tag_links`) use `FOR ALL` policies ✅
  - Complex tables (`projects`, `documents`) use explicit policies for different validation rules ✅
- No security or performance issues identified
- Documentation provides clarity without schema changes

**Files Created:**
1. `docs/database/rls-policy-guidelines.md` (600+ lines)
   - Current state analysis with actual policy inventory
   - Guidelines for `FOR ALL` vs explicit policies
   - Naming conventions for both approaches
   - Decision matrix for choosing approach
   - Comprehensive examples and anti-patterns
   - Security best practices
   - Testing strategies (manual and automated)

**Benefits:**
- ✅ Zero downtime (no policy changes)
- ✅ Clear standards for future policies
- ✅ Decision framework for developers
- ✅ Improved maintainability going forward
- ✅ Security best practices documented

**Findings:**
The existing schema uses both approaches appropriately:
- ✅ `FOR ALL` policies for simple user isolation (3 tables)
- ✅ Explicit policies for complex validation (3 tables)
- ✅ All policies properly enforce user isolation
- ✅ No redundant or duplicate policies (post DB-001 cleanup)
- ✅ Naming is consistent within each approach

**Completed**: 2025-10-25

## Decision Framework
Use this to decide:

| Question | Answer | Recommendation |
|----------|--------|----------------|
| Do we need different rules per operation? | No | Keep `FOR ALL` |
| Is the logic complex? | No (simple user_id check) | Keep `FOR ALL` |
| Do we plan to add operation-specific logging? | No | Keep `FOR ALL` |
| Does the team prefer explicit policies? | TBD | Ask team |
| Do audit requirements demand it? | No | Keep `FOR ALL` |

**If all answers are "No"**: KEEP CURRENT APPROACH

## Estimated Effort
- **Option A** (Rename only): 1-2 hours
- **Option B** (Split policies): 6-8 hours
- **Recommendation**: Option A or no action

## Related Issues
- Related to DB-001 (Remove Duplicate RLS Policies)

## Assignee
Backend Team (Low priority)

## Labels
`database`, `rls`, `security`, `code-quality`, `info`, `nice-to-have`
