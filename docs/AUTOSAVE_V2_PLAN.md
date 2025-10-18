# Autosave v2 Plan (Phase 1)

_Draft_: October 17, 2025  
_Owner_: Codex (GPT-5)

## Goals
- Replace the 3-second polling autosave with a buffered, conflict-aware system.
- Persist lightweight snapshots for recovery/version diffing without overloading `document_versions`.
- Improve user feedback (clear “Saving…” states, conflict modals) and ensure no silent data loss.

## Architecture Overview

### 1. Client Buffering Layer
- Track editor mutations via debounced buffer (e.g., 750ms after last change).
- Maintain `dirtyHash` comparing editor content + structure + anchors.
- Only trigger save when buffer changes and network is idle.
- Use AbortController to cancel in-flight save when newer buffer arrives.

### 2. Snapshot Persistence
- New table: `document_snapshots`
  | column | type | notes |
  | --- | --- | --- |
  | id | uuid | PK |
  | document_id | uuid | FK → `documents` |
  | user_id | uuid | owner |
  | created_at | timestamptz | default now |
  | autosave_hash | text | hash of content+structure |
  | payload | jsonb | `{ html, structure, anchors, word_count }` |
- Retention limits per tier (e.g., Free: last 20 snapshots, paid: last 200).
- Cleanup job deletes snapshots older than 48h beyond retention.

### 3. Conflict Detection
- Each save request sends `base_hash` (hash of server content when user loaded).
- API compares `base_hash` to current server hash. If mismatch:
  - Return `409 conflict` with latest payload + diff metadata.
  - Client pauses autosave, surfaces conflict modal (choose local vs server vs merge).
- On resolution, client resends payload with updated `base_hash`.
- Server derives anchor IDs from stored HTML to avoid mismatches when the client’s anchor list is stale.

### 4. API Surface
- `POST /api/documents/[id]/autosave`
  - Request: `{ html, structure, anchorIds, wordCount, baseHash, snapshotOnly?: boolean }`
  - Response: `{ status: 'saved' | 'snapshot', hash, snapshotId? }`
  - Uses service to write snapshot, update `documents` table, and return new hash.
- Shared hashing helper: SHA-256 of normalized JSON `{ html, structure, anchors }`.

### 5. Supabase Changes
- Migration for `document_snapshots` + indexes + RLS policies mirroring `documents`.
- RPC/Edge Function `save_document_snapshot` to encapsulate insert + cleanup.
- Optional: Supabase cron job to prune old snapshots nightly.

### 6. Client UX Enhancements
- Status indicator states: `Idle`, `Saving…`, `Saved`, `Conflict`, `Offline`.
- Conflict modal with diff summary (maybe highlight word count delta, show anchor differences).
- Snackbar/toast when snapshot stored but server update deferred due to offline.
- Sidebar marker for scenes updated since last snapshot (optional stretch).

## Implementation Steps
1. **Schema & API**
   - Write migration for `document_snapshots`.
   - Create API route `/api/documents/[id]/autosave` with new response contract.
   - Integrate Supabase hashing helper + snapshot retention logic.
2. **Frontend Buffer**
   - Refactor editor state (React Query or Zustand) to manage debounced saves.
   - Store `baseHash` & `currentHash`; update after successful save.
   - Hook into anchor updates to include scene anchors in hash.
3. **Conflict Handling**
   - Add modal for conflict resolution with options: `Keep mine` (force save) or `Load theirs` (replace editor content).
   - Log conflict telemetry.
4. **QA & Telemetry**
   - Add tracking for autosave success/failure, snapshot-only events, conflicts.
   - Update `docs/UI_QA_REPORT.md` to include autosave regression checklist.

## Open Questions
- Do we throttle snapshot creation for extremely rapid edits (e.g., limit once per 15s)?
- Should we integrate with existing `document_versions` retention (avoid duplication)?
- Where to surface snapshot history in UI (Version History modal or separate tab)?

## QA Tracking
- Working checklist captured in [`docs/QA_AUTOSAVE_V2.md`](./QA_AUTOSAVE_V2.md) with conflict/offline/theme scenarios.
- Pending: automate offline regression and capture telemetry once the conflict modal ships to production.

## Dependencies
- Phase 0 completed: lint/build stable, anchors implemented.
- Requires Supabase migrations and potentially Supabase Queue/cron setup.
- Coordination with Platform squad for cleanup jobs and monitoring.

## Next Actions
- Draft migration SQL + API scaffolding (Plan Step 2).
- Begin frontend autosave refactor after backend endpoints are available (Plan Step 3).
