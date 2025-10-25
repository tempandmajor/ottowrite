# UX-WORKSPACE-000: Master Tracking - Document Workspace Refresh

**Priority**: HIGH
**Effort**: Large (15-18 hours total)
**Impact**: Very High - Transforms workspace to match industry standards
**Status**: In Progress

---

## Overview

This master ticket tracks the comprehensive refresh of the document workspace to match professional word processor standards (Google Docs, Microsoft Word, Final Draft, Scrivener).

**Research Date**: 2025-01-24
**Research Source**: Comparative analysis of Google Docs, Microsoft Word, Final Draft, and Scrivener

---

## Problem Statement

Current OttoWrite workspace has several issues:
1. Too many sidebars (Binder + Outline + AI) creates cognitive overload
2. No quick layout switching (users must manually toggle each sidebar)
3. Toolbar not as clean as Google Docs (visible complexity)
4. Grid complexity makes maintenance difficult
5. Analytics always visible (mental distraction)

**User Feedback**: "The document workspace still looks like not much has changed. [It] does not look standard and it is cluttered."

---

## Sub-Tickets (Implementation Order)

### Phase 1: Quick Wins (HIGH PRIORITY)
These provide maximum impact with reasonable effort:

1. **UX-WORKSPACE-007: Add Quick Layout Presets** (3-4 hours)
   - Status: Not Started
   - Four preset layouts: Writer, Planner, Assistant, Full
   - Keyboard shortcuts for instant switching
   - Saves state in localStorage
   - **Impact**: Dramatically improves discoverability and ease of use

2. **UX-WORKSPACE-009: Simplify Toolbar** (2-3 hours)
   - Status: Not Started
   - Remove "Actions" dropdown
   - Keep only: Back, Undo/Redo, Command Palette, Focus Mode
   - Move all secondary actions to Command Palette
   - **Impact**: Makes interface feel immediately more professional

3. **UX-WORKSPACE-008: Consolidate Sidebars** (4-5 hours)
   - Status: Not Started
   - Merge Binder into Outline sidebar as "Documents" tab
   - Reduce from 3 sidebars to 2 (Outline left, AI right)
   - Simplify grid layout significantly
   - **Impact**: Reduces clutter, simplifies UI significantly

### Phase 2: Polish (MEDIUM PRIORITY)
These improve maintainability and refinement:

4. **UX-WORKSPACE-010: Hide Analytics by Default** (2 hours)
   - Status: Not Started
   - Remove sticky bottom status bar
   - Add "Analytics" button in toolbar (opens drawer on demand)
   - Keep essential info in Command Palette
   - **Impact**: Cleaner interface, less distraction

5. **UX-WORKSPACE-011: Simplify Grid Layout** (3-4 hours)
   - Status: Not Started
   - Replace complex grid with flexbox
   - Add draggable panel resizing
   - Eliminate 9 grid configuration conditionals
   - **Impact**: Better maintainability, smoother UX

---

## Dependencies

### Implementation Order
```
Phase 1 (Parallel - can be done simultaneously):
├── UX-WORKSPACE-007 (Layout Presets) ← Start first
├── UX-WORKSPACE-009 (Clean Toolbar)  ← Can start immediately
└── UX-WORKSPACE-008 (Consolidate)    ← Requires most changes

Phase 2 (Sequential - depends on Phase 1):
├── UX-WORKSPACE-010 (Hide Analytics) ← After toolbar cleanup
└── UX-WORKSPACE-011 (Simplify Grid)  ← After consolidation
```

### File Dependencies
All tickets modify:
- `components/editor/editor-workspace.tsx` (main workspace)
- `components/editor/editor-toolbar.tsx` (toolbar)
- `lib/editor/workspace-state.ts` (state management)

---

## Success Criteria

### Quantitative Metrics
- [ ] Sidebar count reduced from 3 to 2
- [ ] Grid configurations reduced from 9 to 3-4
- [ ] Toolbar buttons reduced from 8+ to 4-5
- [ ] Layout switching time < 100ms
- [ ] Workspace state persistence 100% reliable

### Qualitative Metrics
- [ ] Interface feels as clean as Google Docs
- [ ] Layout switching as easy as Scrivener
- [ ] Sidebar organization as clear as Final Draft
- [ ] Developer maintenance effort reduced by 40%

### User Feedback Goals
- [ ] "Workspace feels professional and polished"
- [ ] "I can focus on writing, not fighting the UI"
- [ ] "Layout presets make it easy to switch modes"

---

## Research Comparison

### Professional Word Processor Patterns

| Feature           | Google Docs | Word   | Final Draft | Scrivener | OttoWrite (Before) | OttoWrite (After) |
|-------------------|-------------|--------|-------------|-----------|-------------------|-------------------|
| Sidebar Count     | 1           | 1      | 2-3         | 3         | 3                 | 2 ✅              |
| Layout Presets    | No          | No     | Yes         | Yes (7)   | No                | Yes (4) ✅        |
| Clean Toolbar     | ★★★★★       | ★★★☆☆  | ★★★★☆       | ★★☆☆☆     | ★★★☆☆             | ★★★★☆ ✅          |
| Analytics Visible | Hidden      | Ribbon | Hidden      | Optional  | Always            | On-demand ✅      |
| Grid Complexity   | Simple      | Simple | Draggable   | Draggable | 9 configs         | 3-4 configs ✅    |

---

## Testing Checklist

### Functionality Testing
- [ ] All 4 layout presets switch correctly
- [ ] Sidebar state persists across page reloads
- [ ] Keyboard shortcuts work (Cmd+1, 2, 3, 4)
- [ ] Command Palette shows all hidden actions
- [ ] Analytics drawer opens/closes smoothly
- [ ] Panel resizing works with mouse drag
- [ ] Mobile responsive (sidebars collapse to drawer)

### Visual Testing
- [ ] No layout shifts when switching presets
- [ ] Sidebar transitions are smooth (300ms)
- [ ] Toolbar looks clean and minimal
- [ ] Editor canvas stays centered
- [ ] Focus mode hides everything correctly
- [ ] Dark mode works for all new components

### Performance Testing
- [ ] Layout switching < 100ms
- [ ] No unnecessary re-renders
- [ ] localStorage updates don't block UI
- [ ] Panel resizing is smooth (60fps)

### Accessibility Testing
- [ ] Keyboard navigation works for all presets
- [ ] Screen reader announces layout changes
- [ ] Focus management when switching layouts
- [ ] ARIA labels for all new buttons
- [ ] Keyboard shortcuts documented in help

---

## Migration Plan

### Backward Compatibility
1. **Existing workspace state**: Migrate old sidebar states to new preset system
2. **User preferences**: Map old preferences to closest preset
3. **Default behavior**: If no saved state, default to "Writer" preset

### Migration Script
```typescript
// Run on first load after update
function migrateWorkspaceState() {
  const old = localStorage.getItem('workspace-state')
  if (!old) return 'writer' // New user

  const state = JSON.parse(old)

  // Map old state to new preset
  if (!state.showBinder && !state.showOutline && !state.showAI) {
    return 'writer'
  } else if (state.showOutline && !state.showAI) {
    return 'planner'
  } else if (state.showAI && !state.showOutline) {
    return 'assistant'
  } else {
    return 'full'
  }
}
```

### Rollout Plan
1. **Week 1**: Deploy Phase 1 tickets (Layout Presets, Clean Toolbar, Consolidate Sidebars)
2. **Week 2**: Monitor user feedback, fix bugs
3. **Week 3**: Deploy Phase 2 tickets (Hide Analytics, Simplify Grid)
4. **Week 4**: Final polish and optimization

---

## Rollback Plan

If issues arise:
1. **Immediate rollback**: Revert to previous Git commit
2. **Partial rollback**: Disable individual features via feature flags
3. **Data migration rollback**: Restore old localStorage schema

Feature flags to add:
- `ENABLE_LAYOUT_PRESETS` (default: true)
- `ENABLE_CONSOLIDATED_SIDEBAR` (default: true)
- `ENABLE_CLEAN_TOOLBAR` (default: true)

---

## Related Tickets

### Prerequisites (Completed)
- ✅ UX-WORKSPACE-001: Remove 15% Toolbar and Always Show Bottom Status Bar
- ✅ UX-WORKSPACE-002: Remove Grid, Design Consistent Sidebar Layout
- ✅ UX-WORKSPACE-003: Align Action Panel Icon Strip Vertically
- ✅ UX-WORKSPACE-004: Increase Action Panel Icon Size
- ✅ UX-WORKSPACE-005: Remove Dashboard Tiles from Editor Canvas
- ✅ UX-WORKSPACE-006: Visual Refresh and Design System Compliance

### New Tickets (This Epic)
- 🔲 UX-WORKSPACE-007: Add Quick Layout Presets
- 🔲 UX-WORKSPACE-008: Consolidate Binder into Outline Sidebar
- 🔲 UX-WORKSPACE-009: Simplify Toolbar to Google Docs-Style
- 🔲 UX-WORKSPACE-010: Hide Analytics by Default
- 🔲 UX-WORKSPACE-011: Simplify Grid Layout with Flexbox

---

## Estimated Timeline

| Ticket | Effort | Can Parallelize? | ETA |
|--------|--------|------------------|-----|
| UX-WORKSPACE-007 | 3-4h | Yes | Day 1-2 |
| UX-WORKSPACE-009 | 2-3h | Yes | Day 1 |
| UX-WORKSPACE-008 | 4-5h | Yes | Day 2-3 |
| UX-WORKSPACE-010 | 2h | After 009 | Day 3 |
| UX-WORKSPACE-011 | 3-4h | After 008 | Day 4-5 |

**Total Effort**: 15-18 hours (2-3 days if working sequentially, 1-2 days if parallelized)

---

## Definition of Done

- [ ] All 5 sub-tickets completed and tested
- [ ] No regressions in existing workspace functionality
- [ ] Workspace feels as clean as Google Docs
- [ ] Layout switching as easy as Scrivener
- [ ] Documentation updated (keyboard shortcuts, Command Palette)
- [ ] Migration script tested with real user data
- [ ] Performance benchmarks meet targets (<100ms switching)
- [ ] Accessibility audit passed
- [ ] User acceptance testing completed
- [ ] Deployed to production

---

## Notes

### Design Inspiration
- **Google Docs**: Clean toolbar, hidden complexity
- **Microsoft Word**: Tabbed ribbon (inspiration for layout presets)
- **Final Draft**: Customizable panels, focus modes
- **Scrivener**: 7 preset layouts, 3-pane organization

### Key Design Decisions
1. **4 presets vs. 7**: Start with 4 common patterns, add more based on usage
2. **Consolidate to 2 sidebars**: Reduces complexity while maintaining functionality
3. **Analytics on-demand**: Matches Google Docs pattern of hiding metrics
4. **Flexbox over grid**: Simpler codebase, easier drag-and-drop later

### Future Enhancements (Not in Scope)
- Customizable toolbar (let users add/remove buttons)
- Draggable panel resizing (Scrivener-style)
- More than 4 layout presets
- Per-document layout preferences
- Collaborative layout sharing

---

**Created**: 2025-01-24
**Last Updated**: 2025-01-24
**Assigned To**: TBD
**Reviewer**: TBD
