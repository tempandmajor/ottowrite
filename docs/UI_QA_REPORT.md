# UI Phase 0 QA Baseline

_Last updated: October 17, 2025_  
_Owner: Codex (ChatGPT)_

## 1. Scope & Builds
- **Scope**: Dashboard editors (outlines, plot analysis, story structure), shared filters, and AI tool surfaces prepared for Phase 1.
- **Build Health (Oct 17, 2025)**:
  - `npm run lint` ✅ (warning: Node re-parses `eslint.config.js` as ESM – see Action Item A2)
  - `npm run build` ✅ (no type errors; only experimental Type Stripping notice)
  - `npm run build-storybook` ✅ (chunk-size warnings acceptable for now)

## 2. Regression Checklist

### Outline Workspace
- [x] Project guard rails redirect unauthenticated users to `/auth/login`.
- [x] Filter/search controls update cards immediately; reset button clears state.
- [x] Empty state differentiates between “no data” and “no matches”.
- [x] Outline deletion confirms and refreshes list.
- [x] Generator dialog closes and refreshes results after completion (manual stubbing).

### Outline Detail
- [x] Sticky summary panel renders on ≥1024px without layout jumps.
- [x] Dirty state badge displays when notes differ from saved section content.
- [x] Notes save button disabled while request inflight or when character limit exceeded.
- [x] Character/location/plot point chips render when metadata present.
- [x] Outline metadata badges (format, genre, model) visible when data provided.

### Plot Analysis
- [x] Analysis type select persists choice between runs.
- [x] Run button disabled under 100-word threshold.
- [x] Summary tab displays counts once analysis completes; pending analyses show spinner state.
- [x] History tab lists runs sorted by recency; selecting a historical run hydrates summary tab.
- [x] Issue list refreshes after toggling resolved state (verifies callback path).

### Shared UX/Accessibility
- [x] Keyboard navigation covers all new controls (tested with `Tab`, `Shift+Tab`).
- [x] Focus rings visible on interactive elements.
- [x] Buttons include accessible labels/icons for screen readers.

## 3. Issue Burn-Down

| ID | Area | Severity | Status | Notes |
|----|------|----------|--------|-------|
| A1 | Footer/global shell | Medium | Open | Universal footer still pending from Phase 1 backlog. |
| A2 | Tooling | Low | Resolved | Added `"type": "module"` to `package.json` and converted Tailwind config to ESM imports (Oct 17). |
| A3 | Accessibility | Medium | In Progress | Full cross-browser + screen-reader sweep scheduled during Phase 5. |
| A4 | Settings/Billing styling | Low | Open | Phase 4 follow-up to align with new design system. |

All blockers resolved for current release scope; remaining items scheduled for Phase 5 completion sprint.

## 4. Manual Test Matrix

| Browser | Viewport | Status | Notes |
|---------|----------|--------|-------|
| Chrome 118 (macOS) | 1440 × 900 | ✅ | Primary authoring environment. |
| Chrome 118 (macOS) | 375 × 812 | ✅ | Sticky summary collapses beneath sections on mobile. |
| Safari 17 (macOS) | 1440 × 900 | ⚠️ | Pending verification. |
| Firefox 129 (macOS) | 1440 × 900 | ⚠️ | Pending verification. |

## 5. Recommended Next Actions
1. **Cross-browser sweep**: cover Safari + Firefox, capture screenshots, and note discrepancies.
2. **Accessibility audit**: run axe DevTools + screen reader pass; log follow-up tasks under A3.
3. **Storybook parity**: capture new OutlineCard/PlotAnalysis states in component docs (see `docs/STORYBOOK_COVERAGE.md`).
