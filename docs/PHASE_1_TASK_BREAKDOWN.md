# Phase 1 – Editor & AI Core Task Breakdown

_Drafted: October 17, 2025_  
_Owner: Codex (GPT-5)_  
_Reviewers:_ Editor squad lead (TBD), AI squad lead (TBD)

> **Goals Recap:** ship the dual editor revamp (prose + screenplay), inline analytics tools, resilient autosave/snapshots, and the first wave of AI commands (continue, rewrite, shorten, tone) with cursor-aware insertion.

---

## 1. Prose Editor Enhancements

| # | Work Item | Description | Dependencies | Owner (TBD) | Est. |
|---|-----------|-------------|--------------|-------------|------|
| P1 | Chapter/Scene Sidebar | Build left sidebar listing chapters + nested scenes; allow drag re-order and quick navigation. Persist structure in `documents.content.structure`. | Schema update (new `sections` array) |  | 5d |
| P2 | Metadata Panel | Add per-scene metadata fields (POV, pacing, tension level) editable inline; store in section nodes. | Depends on P1 storage |  | 3d |
| P3 | Reading-Time & Pace Gauges | Compute estimated reading time + pace warnings (words per scene, average sentence length). Display in sidebar summary + analytics panel. | Needs analytics data pipeline (S3) |  | 2d |
| P4 | Formatting Polish | Expand Tiptap toolbar for callouts, scene separators, comments placeholder. Ensure keyboard shortcuts documented. |  | 2d |
| P5 | Editor QA Pass | Cross-browser testing, keyboard nav, performance profiling on 50k word doc. | After implementation |  | 2d |

## 2. Screenplay Editor Enhancements

| # | Work Item | Description | Dependencies | Owner (TBD) | Est. |
|---|-----------|-------------|--------------|-------------|------|
| S1 | Act/Sequence Board | Introduce top-level act tabs + horizontal sequence lanes; persisted structure (`document.content.screenplayActs`). | Schema update |  | 4d |
| S2 | Element Formatting Fidelity | Match industry spec: auto uppercase scene headers, enforce indentation, add slugline validation. | None |  | 3d |
| S3 | Character & Scene Index | Generate side index with character appearances and scenes; support filtering. | Depends on S2 metadata extraction |  | 3d |
| S4 | Import/Export Upgrades | Lossless Fountain/FDX import/export with new structures. | Needs S1 schema |  | 4d |
| S5 | Screenplay QA Suite | Snapshot tests + manual QA for formatting (PDF export included). | After S1-S4 |  | 2d |

## 3. Shared Editor Platform Work

| # | Work Item | Description | Dependencies | Owner (TBD) | Est. |
|---|-----------|-------------|--------------|-------------|------|
| C1 | Inline Analytics Panel | Slide-out panel showing live metrics: word count, dialogue ratio, passive voice hits, pacing gauge (consumes P3/S3 outputs). | Requires text analytics worker |  | 4d |
| C2 | Text Analytics Service | Node worker (Edge Function or Supabase function) to analyze document diffs, produce metrics cached in `analytics_snapshots`. | Schema change + queue |  | 5d |
| C3 | Autosave v2 | Replace 3s interval with debounced change buffer + optimistic snapshots. Save version batches, handle conflicts. | Depends on snapshot schema |  | 4d |
| C4 | Snapshot Storage | Add `document_snapshots` table (10min cadence, limit per tier). Wire cleanup job. | Requires DB migration |  | 3d |
| C5 | Editor State Refactor | Convert editor state to React Query/store to support background saves, offline banner. | After C3 |  | 4d |
| C6 | Telemetry Hooks | Instrument key interactions (AI usage, autosave success/failure, panel toggles) to Supabase logging. |  | 2d |

## 4. AI Orchestration v1

| # | Work Item | Description | Dependencies | Owner (TBD) | Est. |
|---|-----------|-------------|--------------|-------------|------|
| A1 | Prompt Template Library | Define YAML/JSON prompt templates per command (continue/rewrite/shorten/tone) with variables. | Schema for templates? |  | 2d |
| A2 | Intent Detection | Add quick-select command UI + simple classifier (keyword/LLM) to route to A1 templates. | A1 |  | 3d |
| A3 | Cursor-aware Context | Capture editor selection, preceding & following text; update `/api/ai/generate` to use new payload. | C3 refactor helpful |  | 3d |
| A4 | Response Insertion Engine | Insert AI output at cursor with preview + undo. Works for both Tiptap + screenplay arrays. | Depends on A3 |  | 4d |
| A5 | Usage Logging | Extend proposed `ai_requests` table to record commands, latency, tokens. | Requires schema migration |  | 2d |
| A6 | Guardrails & Tier Limits | Enforce per-tier command limits, show upgrade CTA when exceeded. | Uses `user_profiles` |  | 2d |

## 5. Supporting Ops & QA

| # | Work Item | Description | Dependencies | Owner (TBD) | Est. |
|---|-----------|-------------|--------------|-------------|------|
| O1 | Schema Migrations | Implement Phase 1 DB changes (`ai_requests`, `document_snapshots`, section metadata). | Blocking for most items |  | 4d |
| O2 | Seed/Backfill Scripts | Backfill existing documents with default structure, create snapshot seeds. | After O1 |  | 2d |
| O3 | Feature Flags | Introduce LaunchDarkly (or Supabase flags) to roll out new editors per cohort. | None |  | 2d |
| O4 | Performance Budget | Establish baseline metrics (TTI, autosave latency) + regression alerts. | After core implementations |  | 2d |
| O5 | Documentation & Training | Update docs (`WORLD_BUILDING_USER_GUIDE`, new editor guides), record Looms. | Rolling |  | 2d |

---

## 6. Sequencing Notes

1. **Kickoff:** finalize migrations (O1) + schema proposals review (`docs/SCHEMA_PROPOSALS_PHASE1.md`), enabling structures for sections, snapshots, and AI logging.
2. **Parallel Tracks:**  
   - Editor squad tackles P1–P3 + S1–S3 while Platform handles C2/C4.  
   - AI squad drives A1–A4 once cursor context API is ready (depends on C3/C5).  
3. **Feature Flags:** gate new editors behind flag until QA passes (O3).
4. **QA Milestones:** dedicated regression passes after each major cluster (prose, screenplay, AI).

---

## 7. Open Questions

- Do we store chapter/scene hierarchy in `documents.content` JSON or separate table for collaborative editing?  
- Which analytics (passive voice, pacing) run locally vs. server worker?  
- Should AI orchestration run via Supabase Edge Function or Vercel Serverless (cold start cost trade-offs)?  
- Autosave conflict resolution UI: simple toast vs. diff modal?

---

## 8. Next Steps

1. Review + assign owners/estimates during Monday planning.  
2. Approve schema migrations (O1) and start implementation branch.  
3. Schedule design review for sidebar & analytics panel UI (needs Figma).  
4. Spin up dedicated QA checklist for editor regressions (link from `docs/UI_QA_REPORT.md`).

> Update this doc as tasks are accepted, and log major decisions in `CHANGELOG.md` under Phase 1.
