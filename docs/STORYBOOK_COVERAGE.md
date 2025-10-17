# Storybook Coverage Plan (Phase 5)

_Last updated: October 18, 2025_  
_Owner: Codex (ChatGPT)_

## 1. Goal
Provide a Storybook-equivalent reference for new dashboard/editor components introduced during Phases 2–4, ensuring designers and QA can review states without booting the full app. Actual stories should live under `./stories` (to be added) with type-safe controls.

## 2. Component Matrix

| Component | Location | Required Stories |
|-----------|----------|------------------|
| `OutlineCard` | `components/outlines/outline-card.tsx` | Default, long premise, expanded sections, deletion confirmation (mocked). |
| `OutlineGeneratorDialog` | `components/outlines/outline-generator-dialog.tsx` | Closed, open (idle), generating (loading state), success. |
| `app/dashboard/projects/[id]/outlines/page` filter card | Page-level pattern | Snapshot stories: empty dataset, filtered results, loading skeletons. |
| Outline detail notes card | Page-level section | Notes clean, dirty (unsaved badge), over character limit. |
| Sticky outline summary aside | Page-level section | Desktop sticky, mobile collapsed snapshot. |
| `PlotAnalysisPage` summary tab | Page-level section | Pending analysis, completed with issues, completed zero issues. |
| `PlotAnalysisPage` history tab | Page-level section | Multiple runs (active + inactive), empty history. |
| `PlotIssueList` | `components/plot-analysis/plot-issue-list.tsx` | Critical issue, resolved issue, empty state. |
| `Badge` variants | `components/ui/badge.tsx` | Default, secondary, destructive (dirty state), outline (metadata tags). |
| `Skeleton` usage | `components/ui/skeleton.tsx` | Card grid placeholder (outline list), tab content loading. |

## 3. Technical Notes
- **Framework**: Use Storybook 8 with the Next.js framework builder (`@storybook/nextjs`). Add stories under `stories/` with co-located mock data in `stories/mocks/`.
- **Data dependencies**: Replace Supabase calls with mock providers or React Query `QueryClientProvider` configured for story mode.
- **Controls**: Expose toggles for badges (`dirty`, `model`), filter selections, and issue severity.
- **Accessibility**: Enable `@storybook/addon-a11y` to validate focus rings, contrast, and keyboard navigation for each story.

## 4. Action Items
1. Scaffold Storybook (`npx storybook@latest init --builder @storybook/nextjs --default`).  
2. Port component stories according to matrix above.  
3. Integrate into CI (run `npm run lint && npm run build-storybook`).  
4. Share Storybook static build link with design/QA ahead of release sign-off.

## 5. Sign-off Checklist
- [ ] Storybook command available (`npm run storybook`, `npm run build-storybook`).
- [ ] All components in matrix documented with knobs/controls.
- [ ] Accessibility addon passes for each story.
- [ ] Linked from `README.md` (Design System section) once live.
