# Scene Anchor Strategy (Phase 1)

_Draft_: October 17, 2025  
_Owner_: Codex (GPT‑5)

## Goal
Provide a stable mapping between the chapter/scene structure stored in `documents.content.structure` and the rich-text content rendered by Tiptap. Sidebar navigation, autosave snapshots, and AI commands should be able to reference scenes by ID without relying on fuzzy title matching.

## Proposed Approach

### 1. Custom Tiptap Node (`sceneAnchor`)
- Create an inline, zero-width node that renders as:
  ```html
  <span data-scene-id="scene_1234" data-scene-anchor="true"></span>
  ```
- Node is ignored visually (CSS `display:none`), but persisted in HTML.
- Parsing: when loading legacy HTML without anchors, skip node creation (backwards compatible).
- Rendering: during document save, the node serialises as the `span` element so autosave/version history include anchors.

### 2. Anchor Injection & Maintenance
- When a scene is created (sidebar), insert the anchor node at the current selection (or top of document if nothing selected).
- When a scene is moved between chapters, keep the anchor ID the same; structure array order changes do not modify anchors.
- Provide a sidebar action “Insert anchor at cursor” to manually place scene anchors; default scene creation also prompts insertion.

### 3. Migration Plan
1. Ship the extension + runtime detection first (no automatic migration).
2. Backfill script scans documents with structure data and injects anchors at best-effort positions (e.g., before matching headings) for high-priority projects. Manual QA afterwards.
3. For documents without structure, no changes.

See `docs/scripts/backfill-scene-anchors.ts` (outline) for implementation details.

### 4. Failure Handling
- If a scene lacks an anchor (no span found), retain current fuzzy matching fallback and show the existing toast.
- Provide inline badge in sidebar highlighting scenes still missing anchors.

### 5. Data Model Impact
- No DB schema change required; structure array already stores scene ID and metadata.
- Document content HTML gains `<span data-scene-id="...">` markers.

### 6. Tasks
1. Implement `SceneAnchor` Tiptap extension (Node + command helpers).
2. Add editor commands:
   - `insertSceneAnchor(sceneId)`
   - `ensureSceneAnchors(structure)`
3. Update sidebar to:
   - Highlight scenes missing anchors.
   - Offer “Insert anchor at cursor” action.
4. Update autosave/version restore to preserve anchor nodes (already handled once extension serialises them).
5. Draft migration script outline (CLI or Edge Function).

### 7. Open Questions
- Should anchors be forced to precede block-level headings only (scene slug)? Or allow inline insertion?
- Do we auto-remove anchors when scenes are deleted?
- How to handle multiple anchors for the same scene (split scenes)?

## Next Steps
- Implement the extension prototype and wire sidebar “Insert anchor” flow (Plan Step 2).
- After anchors exist, run the backfill script for existing documents and revisit autosave conflict handling for duplicate or missing anchors (Plan Step 3).

## Backfill Script Usage

Script path: `docs/scripts/backfill-scene-anchors.ts`

1. Export your Supabase service credentials:
   ```bash
   export SUPABASE_URL="https://<project>.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
   ```
2. Dry run (no writes, generates JSON report under `docs/scripts/`):
   ```bash
   npx tsx docs/scripts/backfill-scene-anchors.ts
   ```
3. Apply updates (persists anchors and logs results):
   ```bash
   npx tsx docs/scripts/backfill-scene-anchors.ts --apply
   ```
4. Review the generated report for inserted anchors and spot-check in the UI.

> Heuristics: the script matches scene titles against headings first, then paragraphs. Anchors with no textual match are inserted at the top of the document—plan manual QA for those cases.

## Risks & Validation Checklist
- **Duplicate anchors**: script skips existing IDs, but manual merges may create duplicates—run the sidebar “Insert anchor” scan post-deploy to confirm.
- **Missing matches**: titles without textual matches are anchored at the document start; QA should confirm placement and adjust manually if needed.
- **Service key scope**: script requires the Supabase service role key—store it securely and rotate if compromised.
- **Dry run first**: always run without `--apply` to review the JSON report before modifying production data.
