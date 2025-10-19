# Autosave Incidents Runbook

**Priority:** 🔴 **CRITICAL** - User data at risk
**Response Time:** Immediate (<15 minutes)
**Last Updated:** January 19, 2025

## Table of Contents

- [Overview](#overview)
- [Symptoms](#symptoms)
- [Impact Assessment](#impact-assessment)
- [Incident Types](#incident-types)
- [Diagnosis Procedures](#diagnosis-procedures)
- [Resolution Steps](#resolution-steps)
- [Data Recovery](#data-recovery)
- [User Communication](#user-communication)
- [Prevention](#prevention)
- [Post-Incident](#post-incident)

## Overview

Autosave is a critical feature that automatically saves user writing every 5 seconds. Failures can result in data loss and require immediate response.

**Architecture:**
- Client-side autosave timer (5 second interval)
- Optimistic UI updates with local state
- Background API calls to `/api/documents/[id]/autosave`
- Conflict detection with version tracking
- Fallback to document versions table

## Symptoms

### User Reports

Common user-reported symptoms:

- ❌ "My changes aren't saving"
- ❌ "I see 'Failed to save' error"
- ❌ "My document shows an old version"
- ❌ "I got a conflict dialog and don't know what to do"

### System Indicators

Check these monitoring systems:

1. **Sentry Alerts**
   ```
   Search: "autosave" OR "Failed to save document"
   Severity: error, warning
   ```

2. **Vercel Logs**
   ```bash
   vercel logs --since 1h | grep "autosave"
   ```

3. **Supabase Database**
   ```sql
   -- Check failed autosave telemetry
   SELECT COUNT(*), error_type, error_message
   FROM autosave_failures
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY error_type, error_message
   ORDER BY COUNT(*) DESC;
   ```

4. **Rate of 500 errors on /api/documents/*/autosave**
   - Check Vercel Analytics dashboard
   - Alert threshold: >5 errors in 5 minutes

## Impact Assessment

### Severity Levels

| Severity | Indicators | Impact | Response |
|----------|-----------|---------|----------|
| **P0 - Critical** | >10 users affected, data loss confirmed | Multiple users losing work | Immediate page, all hands |
| **P1 - High** | 1-10 users affected, autosave broken | Specific users losing work | Immediate response |
| **P2 - Medium** | Conflicts appearing frequently | Users confused, no data loss | Respond within 1 hour |
| **P3 - Low** | Single user, one-time issue | Minimal impact | Respond within 4 hours |

### Affected Users

Determine scope:

```sql
-- Find users with recent autosave failures
SELECT
  user_id,
  COUNT(*) as failure_count,
  MAX(created_at) as last_failure,
  error_type
FROM autosave_failures
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, error_type
HAVING COUNT(*) > 3
ORDER BY failure_count DESC;
```

## Incident Types

### 1. Network/Connectivity Failures

**Symptoms:**
- Intermittent save failures
- "Network error" in Sentry
- 502/503 responses from API

**Causes:**
- Vercel edge function timeout
- Supabase connection pool exhaustion
- Client network issues

**Quick Check:**
```bash
# Check Vercel status
curl -I https://your-app.vercel.app/api/health

# Check Supabase status
curl -I https://your-project.supabase.co/rest/v1/
```

### 2. Conflict Errors

**Symptoms:**
- `ConflictError` in Sentry
- Conflict resolution dialog shown to users
- Multiple browser tabs/devices editing same document

**Causes:**
- Simultaneous edits from different clients
- Stale version numbers
- Race conditions in update logic

**Quick Check:**
```sql
-- Check for documents with version conflicts
SELECT
  d.id,
  d.title,
  d.version,
  COUNT(dv.id) as version_count,
  MAX(dv.created_at) as latest_version_time
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
WHERE d.updated_at > NOW() - INTERVAL '1 hour'
GROUP BY d.id, d.title, d.version
HAVING COUNT(dv.id) > 5;
```

### 3. Quota/Permission Errors

**Symptoms:**
- 403 Forbidden errors
- "Unauthorized" errors
- Row Level Security (RLS) violations

**Causes:**
- Expired session tokens
- RLS policy bugs
- Subscription limits exceeded

**Quick Check:**
```sql
-- Check RLS policy violations
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'documents'
  AND policyname LIKE '%autosave%';
```

### 4. Database Constraint Violations

**Symptoms:**
- "unique_violation" errors
- "foreign_key_violation" errors
- 500 errors with constraint messages

**Causes:**
- Concurrent updates
- Missing foreign key references
- Orphaned records

**Quick Check:**
```sql
-- Check for orphaned documents
SELECT d.*
FROM documents d
LEFT JOIN projects p ON d.project_id = p.id
WHERE p.id IS NULL
  AND d.created_at > NOW() - INTERVAL '1 day';
```

## Diagnosis Procedures

### Step 1: Identify Scope

```bash
# 1. Check Sentry for error rate
# Navigate to: https://sentry.io/organizations/your-org/issues/
# Filter: "autosave" in last 1 hour

# 2. Query database for failure telemetry
supabase db remote execute --sql "
  SELECT
    COUNT(*) as total_failures,
    COUNT(DISTINCT user_id) as affected_users,
    error_type,
    error_message
  FROM autosave_failures
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY error_type, error_message
  ORDER BY total_failures DESC
  LIMIT 10;
"

# 3. Check Vercel logs
vercel logs production --since 1h | grep "autosave" | grep "error"
```

### Step 2: Reproduce Locally

```bash
# 1. Start dev environment
npm run dev

# 2. Open document editor
# Navigate to: http://localhost:3000/dashboard/editor/[test-document-id]

# 3. Monitor autosave in browser console
# Open DevTools > Network tab > Filter "autosave"

# 4. Trigger autosave
# Make edits and wait 5 seconds

# 5. Check for errors in console and network tab
```

### Step 3: Check System Health

```bash
# Database connections
supabase db remote execute --sql "
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE state = 'active';
"

# API response times (Vercel dashboard)
# Check: Analytics > Function Performance > /api/documents/[id]/autosave

# Rate limits
# Check: Vercel > Project Settings > Usage
```

## Resolution Steps

### Scenario 1: Network Timeout

**Diagnosis:** 502/503 errors, timeouts in logs

**Resolution:**

1. **Increase timeout (if needed)**
   ```typescript
   // app/api/documents/[id]/autosave/route.ts
   export const maxDuration = 30; // Increase from 10 to 30 seconds
   ```

2. **Deploy hotfix**
   ```bash
   git add app/api/documents/\[id\]/autosave/route.ts
   git commit -m "fix: increase autosave timeout to 30s"
   git push origin main
   ```

3. **Verify fix**
   ```bash
   # Wait for deployment
   vercel logs production --since 5m | grep "autosave"
   ```

### Scenario 2: Conflict Resolution

**Diagnosis:** Multiple ConflictError events in Sentry

**Resolution:**

1. **Check conflict handling code**
   ```typescript
   // lib/hooks/use-autosave.ts
   // Verify conflict detection logic is working
   ```

2. **Verify conflict UI is shown**
   - Check that `AutosaveConflictDialog` component renders
   - Verify diff view shows changes correctly

3. **If conflicts are false positives:**
   ```sql
   -- Reset document version
   UPDATE documents
   SET version = (
     SELECT MAX(version) FROM document_versions WHERE document_id = documents.id
   )
   WHERE id = '[document-id]';
   ```

### Scenario 3: RLS Policy Issue

**Diagnosis:** 403 errors, RLS violation messages

**Resolution:**

1. **Identify problematic policy**
   ```sql
   -- Check which policy is failing
   SELECT * FROM pg_policies
   WHERE tablename = 'documents';
   ```

2. **Test policy with user context**
   ```sql
   -- Set user context
   SET request.jwt.claims = '{"sub": "[user-id]"}';

   -- Test update
   UPDATE documents
   SET content = content
   WHERE id = '[document-id]';
   ```

3. **Fix policy if needed**
   ```sql
   -- Example: Fix autosave policy
   DROP POLICY IF EXISTS documents_autosave_policy ON documents;

   CREATE POLICY documents_autosave_policy ON documents
   FOR UPDATE
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id);
   ```

4. **Apply via migration**
   ```bash
   supabase db remote commit
   ```

### Scenario 4: Database Lock

**Diagnosis:** Long query times, lock wait timeout errors

**Resolution:**

1. **Identify blocking queries**
   ```sql
   SELECT
     blocked_locks.pid AS blocked_pid,
     blocked_activity.usename AS blocked_user,
     blocking_locks.pid AS blocking_pid,
     blocking_activity.usename AS blocking_user,
     blocked_activity.query AS blocked_statement,
     blocking_activity.query AS blocking_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.GRANTED;
   ```

2. **Kill blocking query (if safe)**
   ```sql
   SELECT pg_terminate_backend([blocking_pid]);
   ```

3. **Add index to reduce lock contention**
   ```sql
   CREATE INDEX CONCURRENTLY idx_documents_user_updated
   ON documents(user_id, updated_at DESC);
   ```

## Data Recovery

### Recover from Document Versions

If a user lost work, recover from document_versions table:

```sql
-- 1. Find recent versions
SELECT
  id,
  version,
  created_at,
  LENGTH(content) as content_length,
  created_by
FROM document_versions
WHERE document_id = '[document-id]'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Preview a specific version
SELECT content
FROM document_versions
WHERE id = '[version-id]';

-- 3. Restore version to main document (CAREFUL!)
UPDATE documents
SET
  content = (SELECT content FROM document_versions WHERE id = '[version-id]'),
  version = version + 1,
  updated_at = NOW()
WHERE id = '[document-id]';
```

### Manual Version Creation

Create a manual backup before recovery:

```sql
-- Insert current state as version
INSERT INTO document_versions (
  document_id,
  version,
  content,
  created_by
)
SELECT
  id,
  version,
  content,
  user_id
FROM documents
WHERE id = '[document-id]';
```

## User Communication

### Templates

#### Acknowledgment (within 15 minutes)

```
Subject: We're investigating your autosave issue

Hi [Name],

We've received your report about autosave issues and are investigating immediately.

Your document data is safe - we maintain automatic backups every time you save.

We'll update you within the hour with our findings.

Best regards,
OttoWrite Support Team
```

#### Resolution (after fix)

```
Subject: Autosave issue resolved

Hi [Name],

Good news! We've identified and fixed the autosave issue you reported.

What happened: [Brief explanation]
What we did: [Fix applied]
Your data: All your work has been preserved

Please refresh your browser and let us know if you experience any further issues.

Thank you for your patience!

Best regards,
OttoWrite Support Team
```

#### Data Recovery (if needed)

```
Subject: We've recovered your document

Hi [Name],

We've successfully recovered your document from our automatic backups.

Restored from: [Timestamp]
Document: [Title]

Your work is now accessible in the editor. We recommend reviewing the content to ensure everything is as expected.

We've also implemented additional safeguards to prevent this from happening again.

Best regards,
OttoWrite Support Team
```

## Prevention

### Monitoring

Set up alerts for autosave failures:

```javascript
// Sentry alert rule
if (event.message.includes('autosave') && event.level === 'error') {
  notify('pagerduty', { severity: 'high' });
}
```

### Testing

Add E2E tests for autosave scenarios:

```typescript
// tests/e2e/autosave.spec.ts
test('autosave handles network errors gracefully', async ({ page }) => {
  // Simulate network failure
  await page.route('**/api/documents/*/autosave', (route) => {
    route.abort('failed');
  });

  // Make changes
  await page.fill('[data-testid="editor"]', 'Test content');

  // Verify error UI appears
  await expect(page.locator('[data-testid="autosave-error"]')).toBeVisible();
});
```

### Code Review

Checklist for autosave-related changes:

- [ ] Error handling covers all failure modes
- [ ] Optimistic updates can be rolled back
- [ ] Version conflicts are detected and shown to user
- [ ] Telemetry logs failures with enough context
- [ ] Rate limiting doesn't block legitimate autosaves
- [ ] RLS policies allow autosave operations

## Post-Incident

### Incident Report Template

```markdown
## Autosave Incident - [DATE]

**Severity:** P[0-3]
**Duration:** [Start] to [End]
**Affected Users:** [Count]

### Timeline
- [Time]: Incident detected
- [Time]: Investigation started
- [Time]: Root cause identified
- [Time]: Fix deployed
- [Time]: Incident resolved

### Root Cause
[Detailed explanation]

### Impact
- Users affected: [Count]
- Data lost: [Yes/No - details]
- Revenue impact: $[Amount]

### Resolution
[What we did to fix it]

### Prevention
[What we're doing to prevent recurrence]

### Action Items
- [ ] Update monitoring
- [ ] Add tests
- [ ] Improve error messages
- [ ] Update documentation
```

### Metrics to Track

```sql
-- Autosave success rate (last 24 hours)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_saves,
  SUM(CASE WHEN error_type IS NULL THEN 1 ELSE 0 END) as successful_saves,
  ROUND(100.0 * SUM(CASE WHEN error_type IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM autosave_telemetry
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

## Escalation Path

1. **First 15 minutes:** On-call engineer responds
2. **After 30 minutes:** Page engineering lead
3. **After 1 hour:** Page CTO if data loss confirmed
4. **After 2 hours:** Notify all affected users

## Related Documents

- [Autosave Hook Implementation](../../lib/hooks/use-autosave.ts)
- [Conflict Resolution UI](../../components/editor/autosave-conflict-dialog.tsx)
- [Autosave API Endpoint](../../app/api/documents/[id]/autosave/route.ts)
- [Error Reporting Guide](../ERROR_REPORTING.md)

---

**Last Reviewed:** January 19, 2025
**Next Review:** February 19, 2025
