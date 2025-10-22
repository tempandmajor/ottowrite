# Database Schema Comparison
## Audit vs. Actual Migrations

**Date**: 2025-01-21
**Audit Document**: DATABASE-SCHEMA-AUDIT.md (identified 45 tables)
**Migration Files**: 56 tables found
**Discrepancy**: 11 tables not documented in audit

---

## Tables in Migrations NOT in Audit Document

The following **11 tables** exist in migrations but were NOT documented in the audit:

1. **analytics_jobs** - Background jobs for analytics processing
2. **autosave_failures** - Log autosave failures for debugging
3. **beat_cards** - Visual beat board cards for story structure
4. **document_metrics** - Document-level metrics tracking
5. **document_undo_history** - Undo/redo history tracking
6. **document_versions** - Document version control
7. **metric_events** - Analytics event tracking
8. **migration_dependencies** - Migration dependency tracking
9. **migration_history** - Migration execution history
10. **project_folders** - Hierarchical project organization
11. **project_members** - Collaboration/project membership
12. **project_tag_links** - Junction table for project tags
13. **project_tags** - User-defined project tags
14. **search_history** - User search history tracking
15. **session_activity_log** - Detailed session activity logging

**Actual Count**: 15 undocumented tables (not 11)

---

## Tables Documented in Audit but Potentially Missing Columns

Based on ALTER TABLE statements found in migrations, the following tables have additional columns not initially created:

### user_profiles
- ✅ `full_name` TEXT
- ✅ `preferred_genres` TEXT[]
- ✅ `writing_focus` TEXT
- ✅ `writing_preferences` JSONB
- ✅ `timezone` TEXT
- ✅ `has_completed_onboarding` BOOLEAN
- ✅ `onboarding_completed_at` TIMESTAMPTZ
- ✅ `onboarding_step` INTEGER
- ✅ `onboarding_checklist` JSONB

### projects
- ✅ `folder_id` UUID (FK to project_folders)
- ✅ `search_vector` tsvector (full-text search)
- ✅ `collaborators_count` INTEGER

### documents
- ✅ `is_template` BOOLEAN
- ✅ `template_category` TEXT

### ai_requests
- ✅ `routing_metadata` JSONB
- ✅ `context_tokens` JSONB
- ✅ `context_warnings` TEXT[]

### location_events
- ✅ `order_index` INTEGER

### search_history (new table)
- ✅ `search_provider` TEXT

### research_notes
- ✅ `tags` TEXT[]
- ✅ `category` TEXT
- ✅ `is_pinned` BOOLEAN
- ✅ `updated_at` TIMESTAMPTZ
- ✅ `note_metadata` JSONB

---

## Critical Missing Elements for Production

### 1. Missing `updated_at` Columns

The audit document identified these tables as missing `updated_at`:
- ⚠️ `session_fingerprints` - STILL MISSING
- ⚠️ `subscription_plan_limits` - STILL MISSING (reference table, may not need)
- ⚠️ `plot_analyses` - Has `generated_at` but no `updated_at`
- ⚠️ `dialogue_samples` - STILL MISSING
- ⚠️ `dialogue_validations` - STILL MISSING
- ⚠️ `voice_analyses` - STILL MISSING
- ⚠️ `ensemble_feedback` - STILL MISSING
- ⚠️ `beat_templates` - STILL MISSING (reference table, may not need)
- ⚠️ `document_templates` - NEED TO VERIFY

---

## Recommendations

### Priority 1: Add Missing `updated_at` Columns
```sql
-- Session tracking
ALTER TABLE session_fingerprints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE session_activity_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- AI & Analysis
ALTER TABLE plot_analyses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE dialogue_samples ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE dialogue_validations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE voice_analyses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ensemble_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ai_background_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Templates (if user-modifiable)
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Collaboration
ALTER TABLE comment_threads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE document_changes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Priority 2: Add Missing Indexes

Based on audit recommendations, verify these indexes exist:
- `idx_documents_user_project` ON documents(user_id, project_id)
- `idx_characters_project` ON characters(project_id)
- `idx_comment_threads_document` ON comment_threads(document_id)
- `idx_outlines_project` ON outlines(project_id)
- `idx_story_beats_project_order` ON story_beats(project_id, order_position)

### Priority 3: Verify RLS Policies

All new tables need RLS policies:
- `project_folders` - User ownership
- `project_tags` - User ownership
- `project_tag_links` - User ownership via project_id
- `project_members` - Collaboration access
- `search_history` - User ownership
- `session_activity_log` - User ownership
- `analytics_jobs` - User ownership
- `autosave_failures` - User ownership

---

## Tables Missing from Production (Next Audit Pass)

These tables are referenced in code but may not have complete migrations:
- ❓ `project_templates` - Mentioned in audit but no CREATE TABLE found
- ❓ `document_branches` (old version?) vs `branch_commits`/`branch_merges`

---

## Summary

- **Tables in Migrations**: 56
- **Tables in Audit**: 45
- **Undocumented Tables**: 15
- **Missing `updated_at`**: ~10 tables
- **Missing Indexes**: ~5 recommended indexes to verify
- **RLS Coverage**: ~8 tables need policy verification

**Next Steps**:
1. Create migration to add missing `updated_at` columns
2. Add missing indexes from audit recommendations
3. Verify RLS policies on all tables
4. Update DATABASE-SCHEMA-AUDIT.md with complete 56-table list
5. Apply migration to production
