# UX-WORKSPACE-008: Consolidate Binder into Outline Sidebar

**Priority**: HIGH
**Effort**: Medium (4-5 hours)
**Impact**: High - Reduces clutter, simplifies UI significantly
**Status**: Not Started

---

## Problem Statement

**Current State:**
- 3 separate sidebars can be visible simultaneously (Binder, Outline, AI)
- Binder (left) shows document tree
- Outline (center-left) shows tabbed structure widgets
- Creates overwhelming 4-column layout when all visible
- Users must manage 3 different sidebar toggle states

**Professional Standard:**
- **Google Docs**: 1 sidebar maximum (right panel for comments/suggestions)
- **Microsoft Word**: 1 navigation pane (left side)
- **Scrivener**: 3 panes but highly integrated (Binder + Editor + Inspector)
- **Notion**: Sidebar is unified with pages and workspace tools

**User Pain:**
"There are too many panels. I just want my document list and outline in one place, not two separate sidebars that I have to open and close independently."

---

## Proposed Solution

Consolidate Binder into Outline sidebar as a new "Documents" tab:

### New Outline Sidebar Structure (6 Tabs)

1. **Documents** (new) - Document tree navigation
   - Previously: Separate Binder sidebar
   - Shows: Hierarchical document tree with DocumentTree component
   - Shortcut: `Cmd+Shift+D`

2. **Chapters** - Chapter/scene structure
   - Existing: ChapterSidebar component
   - Shortcut: `Cmd+Shift+C`

3. **Characters** - Character scene index
   - Existing: CharacterSceneIndex component
   - Shortcut: `Cmd+Shift+H`

4. **Timeline** - Reading time widget
   - Existing: ReadingTimeWidget component
   - Shortcut: `Cmd+Shift+T`

5. **Analysis** - Inline analytics
   - Existing: InlineAnalyticsPanel component
   - Shortcut: `Cmd+Shift+A`

6. **Settings** - Document metadata
   - Existing: DocumentMetadataForm component
   - Shortcut: `Cmd+Shift+S`

### Result

- Reduce from 3 sidebars to 2 sidebars maximum
- Binder functionality preserved but integrated
- Simpler grid layout (max 3 columns instead of 4)
- Less cognitive overhead for users

---

## Implementation Details

### Files to Modify

**1. `components/editor/tabbed-outline-sidebar.tsx`**

Add "Documents" tab as first tab:
```typescript
import { DocumentTree } from '@/components/editor/document-tree'
import { useDocumentTree } from '@/hooks/use-document-tree'
import { Files } from 'lucide-react' // New icon

// Add to tabs array (FIRST position)
const tabs = [
  {
    id: 'documents',
    label: 'Documents',
    icon: Files,
    shortcut: 'D',
    content: (
      <DocumentTree
        documents={documents}
        currentDocumentId={currentDocumentId}
        projectId={projectId}
      />
    ),
  },
  {
    id: 'chapters',
    label: 'Chapters',
    icon: BookOpen,
    shortcut: 'C',
    content: <ChapterSidebar /* ... */ />,
  },
  // ... other tabs
]

// Add documents prop to component signature
interface TabbedOutlineSidebarProps {
  // ... existing props
  documents: Document[]
  currentDocumentId: string
  projectId: string
}
```

**2. `components/editor/editor-workspace.tsx`**

Remove Binder sidebar entirely, pass documents to TabbedOutlineSidebar:

```typescript
// REMOVE these state variables
// const [showBinder, setShowBinder] = useState(false)

// REMOVE Binder sidebar toggle button from toolbar

// UPDATE TabbedOutlineSidebar usage
<TabbedOutlineSidebar
  // ... existing props
  documents={documents}
  currentDocumentId={documentId}
  projectId={document.project_id}
/>

// UPDATE grid layout classes (remove Binder column)
// Before: lg:grid-cols-[minmax(200px,280px)_minmax(220px,280px)_minmax(0,1fr)_minmax(280px,340px)]
// After:  lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(280px,340px)]

// Simplify to 3 grid configurations:
// 1. Outline only:     lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]
// 2. AI only:          lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]
// 3. Outline + AI:     lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(280px,340px)]
```

**3. `lib/editor/workspace-state.ts`**

Remove Binder preference:
```typescript
export interface WorkspacePreferences {
  // REMOVE: showBinder: boolean
  showOutline: boolean
  showUtilitySidebar: boolean
}

// Update all related functions to remove Binder references
```

**4. `lib/editor/workspace-layouts.ts`** (from UX-WORKSPACE-007)

Update layout configs to remove showBinder:
```typescript
export const WORKSPACE_LAYOUTS = {
  writer: {
    config: {
      // REMOVE: showBinder: false,
      showOutline: false,
      showUtilitySidebar: false,
    },
  },
  planner: {
    config: {
      // REMOVE: showBinder: true,
      showOutline: true,
      showUtilitySidebar: false,
    },
  },
  // ... etc
}
```

**5. `components/editor/keyboard-shortcuts-dialog.tsx`**

Update shortcuts to reflect new tab:
```typescript
{
  category: 'Outline Sidebar',
  shortcuts: [
    { keys: ['⌘', 'Shift', 'D'], description: 'Open Documents tab' }, // NEW
    { keys: ['⌘', 'Shift', 'C'], description: 'Open Chapters tab' },
    { keys: ['⌘', 'Shift', 'H'], description: 'Open Characters tab' },
    // ... etc
  ],
}
```

### Files to Remove

- Remove any Binder-specific components that aren't being reused
- Clean up imports of removed Binder components

---

## UI Changes

### Before (4-column max)
```
[Binder] [Outline] [Editor] [AI]
```

### After (3-column max)
```
[Outline (with Documents tab)] [Editor] [AI]
```

### Grid Simplification

**Before**: 9 different grid configurations
**After**: 3 grid configurations
- Outline only
- AI only
- Outline + AI

This dramatically simplifies the codebase and reduces maintenance burden.

---

## Success Metrics

### User Experience
- [ ] Document tree accessible via "Documents" tab in Outline sidebar
- [ ] All Binder functionality preserved
- [ ] Tab switching smooth and intuitive
- [ ] Keyboard shortcut works (Cmd+Shift+D)
- [ ] Default tab can be "Documents" for easy discovery
- [ ] Users can still navigate documents quickly

### Technical
- [ ] Grid layout simplified to 3 configurations
- [ ] No breaking changes to existing features
- [ ] Clean removal of Binder state management
- [ ] Reduced component complexity
- [ ] Smaller bundle size (fewer components)

### Visual
- [ ] Cleaner interface with max 3 columns
- [ ] Less horizontal scrolling on smaller screens
- [ ] More space for editor content
- [ ] Sidebar feels unified, not fragmented

---

## Migration Strategy

### User Communication
- [ ] Add toast on first load: "Document tree moved to Outline sidebar → Documents tab"
- [ ] Update keyboard shortcuts help
- [ ] Update onboarding/tour if exists

### Data Migration
- [ ] Check localStorage for showBinder preference
- [ ] If showBinder was true, set showOutline to true and default to "Documents" tab
- [ ] Clear old showBinder preference from localStorage

```typescript
// Migration code
function migrateBinderPreference() {
  if (typeof window === 'undefined') return

  const oldShowBinder = localStorage.getItem('ottowrite:workspace:showBinder')
  if (oldShowBinder === 'true') {
    // User had Binder open, so show Outline with Documents tab
    localStorage.setItem('ottowrite:workspace:showOutline', 'true')
    localStorage.setItem('ottowrite:workspace:defaultOutlineTab', 'documents')
  }

  // Clean up old preference
  localStorage.removeItem('ottowrite:workspace:showBinder')
}
```

---

## Testing Checklist

- [ ] Documents tab shows full document tree
- [ ] Can navigate to different documents from Documents tab
- [ ] Tab switching works smoothly (Documents, Chapters, Characters, etc.)
- [ ] Keyboard shortcut Cmd+Shift+D opens Documents tab
- [ ] Grid layout only shows max 3 columns
- [ ] No visual glitches when toggling Outline sidebar
- [ ] Migration runs correctly on first load after update
- [ ] localStorage correctly saves outline preference
- [ ] Works on mobile (tabs are accessible)
- [ ] No console errors or warnings

---

## Edge Cases

- [ ] User with showBinder=true migrates correctly
- [ ] User with both Binder and Outline open gets correct migration
- [ ] Empty document tree shows appropriate empty state
- [ ] Single document doesn't show tree (or shows minimal tree)
- [ ] Large document lists (100+ docs) still perform well in tab

---

## Notes

- This change makes OttoWrite more similar to Google Docs (single unified sidebar)
- Reduces cognitive load by having one "structure" sidebar instead of two
- Sets up cleaner foundation for future sidebar features
- Consider adding breadcrumb navigation since document tree is now hidden in tab

---

## Dependencies

- **Blocks**: UX-WORKSPACE-007 (Layout Presets) - needs to be updated after this
- **Requires**: Document tree component must work well in tabbed interface

---

## Follow-up Tickets

- [ ] UX-WORKSPACE-009: Add breadcrumb navigation for documents (since tree is now in tab)
- [ ] UX-WORKSPACE-010: Default tab preference (let users choose default tab)
