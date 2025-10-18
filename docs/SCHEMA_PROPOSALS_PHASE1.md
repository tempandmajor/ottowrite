# Phase 1 Schema Proposals

_Drafted: October 17, 2025_  
_Owner: Codex (ChatGPT)_

This document captures the recommended database additions ahead of Phase 1 (Editor & AI Core). The goal is to unblock collaboration on schema design, Supabase RLS updates, and background processing before we begin large application changes.

---

## 1. AI Logging & Routing

### 1.1 `ai_requests`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Generated via `uuid_generate_v4()` |
| `user_id` | `uuid` FK → `auth.users` | Caller |
| `project_id` | `uuid` FK → `projects` | Optional (null for freeform requests) |
| `document_id` | `uuid` FK → `documents` | Optional; set when editor context provided |
| `model` | `text` | e.g. `claude-sonnet-4.5`, `gpt-5` |
| `intent` | `text` | Classified command (`continue`, `rewrite`, etc.) |
| `prompt_tokens` | `integer` | Raw count from provider |
| `completion_tokens` | `integer` | Raw count from provider |
| `latency_ms` | `integer` | End-to-end latency for debugging |
| `status` | `text` | `success`, `error`, `cancelled` |
| `error_code` | `text` | Provider error identifier (nullable) |
| `prompt_hash` | `text` | SHA-256 of normalized prompt for dedupe, optional |
| `response_excerpt` | `text` | Truncated response (first 500 chars) |
| `metadata` | `jsonb` | Routing metadata (model scores, fallback flags) |
| `created_at` | `timestamptz` default `now()` | |

**Indexes**
- (`user_id`, `created_at DESC`)
- (`project_id`, `document_id`, `created_at`)
- `status`

**RLS**
- Enable RLS; grant users `SELECT` on records with `user_id = auth.uid()`.
- Service role function to insert results; consider Edge Function for AI orchestration to avoid client exposures.

### 1.2 `ai_context_snapshots`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK |
| `request_id` | `uuid` FK → `ai_requests(id)` | Cascade delete |
| `characters` | `jsonb` | Character snippets loaded for prompt |
| `locations` | `jsonb` | Location snippets |
| `outline_sections` | `jsonb` | Outline/beat context |
| `story_state` | `jsonb` | Editor cursor, word counts, etc. |

> Used to expose context breadcrumbs to the user and to audit prompt construction. RLS inherits from parent request via `USING (request_id IN (SELECT id FROM ai_requests WHERE user_id = auth.uid()))`.

### 1.3 `ai_request_aggregates`

Materialized view or table refreshed nightly (Supabase cron) summarizing:
- Per-user totals (words, tokens, latency stats)
- Per-model usage for routing heatmaps
- Failure counts by error code

---

## 2. Collaboration Foundations

### 2.1 `project_members`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK |
| `project_id` | `uuid` FK → `projects` |
| `user_id` | `uuid` FK → `auth.users` |
| `role` | `text` CHECK (`owner`,`editor`,`reviewer`,`viewer`) |
| `invited_by` | `uuid` FK → `auth.users` |
| `invited_at` | `timestamptz` |
| `accepted_at` | `timestamptz` |

RLS policies must allow owners/editors to manage membership. `projects` table currently ties to a single owner via `user_id`; we should maintain that column (canonical owner) and treat `project_members.role = 'owner'` as redundant for now.

### 2.2 `document_collaborators`

Optional override for per-document permissions (share a single doc without full project access).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK |
| `document_id` | `uuid` FK → `documents` |
| `user_id` | `uuid` FK → `auth.users` |
| `role` | `text` CHECK (`editor`,`commenter`,`viewer`) |
| `created_at` | `timestamptz` default `now()` |

RLS will check membership for either project or document to authorize access.

### 2.3 Realtime Support Tables

For Supabase Realtime/CRDT later in Phase 4, reserve namespaces now:
- `document_presence` (`document_id`, `user_id`, `cursor`, `updated_at`)
- `document_comments` (threaded comments, replies, resolved flags)

We will scaffold migrations with placeholder columns but can defer full implementation until collaboration workstreams kick off.

---

## 3. Quotas & Billing Audit Trail

### 3.1 `usage_ledgers`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK |
| `user_id` | `uuid` |
| `project_id` | `uuid` nullable |
| `document_id` | `uuid` nullable |
| `metric` | `text` (`ai_words`, `documents_created`, `exports`, `collaborators`) |
| `amount` | `integer` (positive or negative) |
| `source` | `text` (app, webhook, admin) |
| `notes` | `text` |
| `occurred_at` | `timestamptz` default `now()` |

Facilitates monthly rollups, Stripe usage dashboards, and alerts. Add index on (`user_id`, `metric`, `occurred_at DESC`).

### 3.2 `subscription_events`

Records Stripe webhook events (subscription created, updated, cancelled, trial start/end). Light schema:
- `id` UUID PK
- `user_id` UUID
- `event_type` TEXT
- `stripe_event_id` TEXT unique
- `payload` JSONB
- `created_at` timestamptz default `now()`

---

## 4. Export Jobs Staging

Create `export_jobs` to track heavy export requests off the Next.js server:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK |
| `user_id` | `uuid` |
| `document_id` | `uuid` |
| `format` | `text` (`pdf`,`docx`,`epub`,`fdx`,`fountain`,`html`) |
| `status` | `text` CHECK (`queued`,`in_progress`,`succeeded`,`failed`,`cancelled`) |
| `storage_path` | `text` |
| `error_message` | `text` |
| `queued_at` | `timestamptz` default `now()` |
| `completed_at` | `timestamptz` nullable |

**Next steps**
- Provision Supabase Queue or external worker to process `queued` jobs.
- RLS: users can `SELECT` own jobs; server-side worker uses service role.

---

## 5. Migration Plan (High-Level)

1. Draft SQL migrations for tables above; validate with `npx supabase db lint`.
2. Apply to local instance via `npx supabase db reset --db-url ...` or Docker stack.
3. Update Supabase RLS policies carefully—prefer functions to reduce duplication.
4. Refresh ERD (`docs/erd/`) post-merge.
5. Document operational impacts in `docs/DATA_OPS_BASELINE.md` once migrations land.

Feedback welcome; we can split implementation across squads (Editor vs. Platform) once reviewed.
