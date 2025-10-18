# Phase 0 Data & Ops Baseline

_Last updated: October 17, 2025_  
_Owner: Codex (ChatGPT)_

This document captures the current Supabase schema and operational posture ahead of the Phase 1 editor/AI expansion. Use it as the jumping-off point for schema planning, ops reviews, and onboarding new contributors.

---

## 1. Schema Snapshot (Supabase)

| Domain | Tables / Views | Notes |
| --- | --- | --- |
| Accounts & Billing | `user_profiles`, `ai_usage` | Tracks Stripe identifiers, subscription tier, AI word counters. Monthly reset handled in app logic; no cron job yet. |
| Projects & Docs | `projects`, `documents`, `document_versions`, `document_templates` | Core authoring entities. Version retention enforced via trigger (30 days for free tier). Templates seeded for novels/screenplays/blog posts. |
| Outlines | `outlines`, `outline_sections` | Outline metadata + nested sections. Includes generator metadata fields (`model`, `temperature`, `prompt`). |
| Story Structure | `story_beats`, `beat_templates` | Per-project beat boards plus public templates (Save the Cat, Hero’s Journey, etc.). |
| Plot Analysis | `plot_analyses`, `plot_issues` | Stores runs + generated issue cards. Issues reference analyses via FK; includes severity/category/status fields. |
| Characters | `characters`, `character_relationships`, `character_arcs` | Comprehensive character records with arcs + relationship graph. |
| World Building | `locations`, `location_events` | Location profiles and associated timeline events. |
| Storage | `storage.objects` (bucket `character-images`) | Public bucket, RLS ensures users stay within their own folder prefix. |

**Relationship Overview**
- Every domain table links back to `auth.users` via `user_id` and to `projects` where applicable.  
- `documents` → `document_versions` (cascade delete) with trigger-managed history.  
- Outline and plot-analysis tables both depend on `projects` **and** `documents`; ensure project/document cleanup jobs cascade appropriately.  
- Storage bucket relies on folder naming convention `user_id/asset.jpg`; guardrails enforced via policies.

> _Action:_ Generate an ERD snapshot after any schema change. Suggested command (requires Supabase CLI + local Docker):  
> `supabase db diff --linked --use-migra --schema public --file docs/erd/$(date +%Y%m%d)_public_schema.sql`

---

## 2. Gap Analysis vs. Roadmap

| Roadmap Area | Current Coverage | Gaps to Address |
| --- | --- | --- |
| **AI Logs & Routing** | `ai_usage` captures per-call counts + cost. Prompt preview stored, but no response cache/latency/error tracking. | Create `ai_requests` (store prompt, response hash, latency, model, status), `ai_context_snapshots` for story bible reference, and nightly aggregation tables for dashboards. |
| **Collaboration** | Per-user ownership enforced via RLS; no shared access tables. | Introduce `project_members` (role-based), `document_collaborators`, `comments`, and Realtime presence tables. Review RLS to allow shared access without service-role leaks. |
| **Pricing & Quotas** | `user_profiles.subscription_tier` + price IDs in code. No usage ledger beyond AI words. | Add `subscription_events`, `usage_ledgers` (documents created, exports, collaborators), and enforce limits via database checks or edge functions. |
| **Exports & Background Jobs** | Export handled in-app (`lib/export/utils.ts`), no persistence. | Create `export_jobs` table (status, format, storage_url), plus a job runner (Supabase Queue or external worker). Track failures for support. |
| **Analytics** | Minimal—`ai_usage` only. | Prepare `analytics_sessions`, `content_metrics` for future Phase 5 dashboards. |

---

## 3. Operational Checklist

- **Environment parity**
  - [x] `.env.production.example` lists Supabase + Stripe keys (Oct 17 update).
  - [x] `VERCEL_ENV_VARS.md` documents required secrets without embedding production values.
  - [x] `"type": "module"` added to `package.json`; Tailwind config updated for ESM compatibility (Oct 17).
- **Migrations**
  - Run `npx supabase db push` before each deploy.
  - Document migration order + rollback plan in `APPLY_STORAGE_MIGRATION.md` if storage buckets change.
- **Stripe**
  - Confirm webhook endpoint `/api/webhooks/stripe` is registered with signing secret set in all environments.
  - Validate price IDs (`STRIPE_PRICE_*`) match Stripe dashboard products before launching paid tiers.
- **Supabase Policies**
  - RLS enabled across all domain tables; audit quarterly to ensure new tables inherit secure defaults.
  - Schedule review for collaboration tables once designed (will require role-aware policies).
- **Monitoring**
  - Next.js build + lint verified (Oct 17). Add CI job: `npm run lint`, `npm run build`, `npm run build-storybook`.
  - Plan to enable Supabase log drains + Vercel logging for webhook failure alerts.
- **Backups & Resets**
  - Ensure Supabase PITR retention matches enterprise commitments (30 days minimum today).
  - Add monthly job to reset `ai_words_used_this_month` on first-of-month (currently handled manually).

---

## 4. Next Steps (Phase 0 Exit Criteria)

1. Share ERD artifacts (`docs/erd/phase0-schema.{mmd,svg,png}`) with stakeholders; embed PNG in the ops deck.
2. Draft schema proposals for collaboration & export jobs; review with Platform squad before Phase 3 kickoff.
3. Implement ops automation: CI Storybook build, Stripe webhook replay script, Supabase migration smoke test.
4. Update `SECURITY_AUDIT.md` with any secrets rotations or policy changes performed during Phase 0.

Once these tasks land, Phase 0 success criteria (stable builds, env hygiene, schema map, ops checklist) are met and we can transition into the editor/AI feature workstreams.
