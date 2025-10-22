# Binder/Document Organization - Implementation Tickets

**Context**: After analyzing Scrivener and Final Draft's binder systems, Ottowrite needs a project-level document navigator to organize manuscripts, research, and character files in a hierarchical tree structure.

**Current State**:
- ✅ Chapter/scene sidebar exists WITHIN documents (components/editor/chapter-sidebar.tsx)
- ❌ NO project-level document tree/binder
- ❌ NO folder hierarchy (documents are flat within projects)
- ❌ NO database support for parent_folder_id (column doesn't exist despite index)

**Goal**: Add a Scrivener-style binder to organize all project materials in the editor workspace.

---

## TICKET-001: Database Schema for Folder Hierarchy (P0 - Foundation)

**Priority**: P0 (Critical - Blocks all other tickets)
**Story Points**: 3
**Status**: Not Started

### Description
Add database columns and constraints to support hierarchical document organization with folders.

### Acceptance Criteria
- [ ] Add `parent_folder_id UUID` column to `documents` table (nullable, self-referential FK)
- [ ] Add `folder_type` enum column: 'manuscript', 'research', 'characters', 'deleted', 'notes', 'custom'
- [ ] Add `is_folder BOOLEAN DEFAULT FALSE` column to distinguish folders from files
- [ ] Add check constraint: folders cannot have content (if `is_folder = TRUE` then `content IS NULL`)
- [ ] Create index on `(project_id, parent_folder_id)` for tree queries
- [ ] Create RLS policies matching existing document policies
- [ ] Write migration with rollback script

### Implementation Notes
```sql
-- Migration: add_document_folders.sql
ALTER TABLE documents
  ADD COLUMN parent_folder_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  ADD COLUMN is_folder BOOLEAN DEFAULT FALSE,
  ADD COLUMN folder_type TEXT CHECK (folder_type IN ('manuscript', 'research', 'characters', 'deleted', 'notes', 'custom')),
  ADD CONSTRAINT folder_content_check CHECK (
    (is_folder = FALSE) OR
    (is_folder = TRUE AND content IS NULL)
  );

CREATE INDEX idx_documents_folder_hierarchy
  ON documents(project_id, parent_folder_id, position);
```

### Testing Checklist
- [ ] Can create folders (is_folder = TRUE)
- [ ] Can create documents within folders (parent_folder_id set)
- [ ] Cascade delete works (deleting folder deletes children)
- [ ] Cannot set content on folders (constraint enforced)
- [ ] RLS policies prevent cross-user access
- [ ] Build passes with 0 TypeScript errors

---

## TICKET-002: Document Tree Component (P0 - UI Foundation)

**Priority**: P0 (Critical - Core UX)
**Story Points**: 5
**Status**: Not Started
**Dependencies**: TICKET-001

### Description
Create a reusable DocumentTree component that displays hierarchical folder/file structure with expand/collapse, drag-and-drop, and context menus.

### Acceptance Criteria
- [ ] Create `components/editor/document-tree.tsx` component
- [ ] Recursive rendering of folders and documents
- [ ] Expand/collapse folders (persist state in localStorage)
- [ ] Visual distinction: folder icons vs. document type icons (novel, research, character)
- [ ] Highlight active document
- [ ] Click to navigate to document
- [ ] Show document word counts next to titles
- [ ] Drag-and-drop reordering (within same level)
- [ ] Drag-and-drop to move into folders
- [ ] Context menu (right-click): New Document, New Folder, Rename, Delete, Duplicate
- [ ] Keyboard navigation (arrow keys, Enter to open, Delete key)
- [ ] Search/filter documents by title

### Component API
```tsx
interface DocumentTreeProps {
  projectId: string
  activeDocumentId?: string
  onSelectDocument: (documentId: string) => void
  onCreateDocument: (parentId?: string) => void
  onCreateFolder: (parentId?: string) => void
  onDeleteNode: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onMove: (nodeId: string, newParentId: string | null, newPosition: number) => void
}
```

### UI/UX Specs
- **Folder Icons**:
  - Manuscript: 📝 (primary color)
  - Research: 🔬 (blue)
  - Characters: 👥 (purple)
  - Deleted: 🗑️ (muted)
  - Notes: 📋 (yellow)
  - Custom: 📁 (gray)

- **Document Icons**:
  - Novel: 📖
  - Screenplay: 🎬
  - Play: 🎭
  - Short Story: 📄

- **Interaction States**:
  - Hover: Background highlight
  - Active: Bold text + accent border-left
  - Dragging: Semi-transparent with dotted outline
  - Drop target: Dashed border animation

### Testing Checklist
- [ ] Renders tree structure correctly (3+ levels deep)
- [ ] Expand/collapse persists across page reloads
- [ ] Drag-and-drop updates database position
- [ ] Context menus trigger correct actions
- [ ] Keyboard navigation works with screen readers
- [ ] Search filters correctly
- [ ] Component is accessible (ARIA labels, roles)

---

## TICKET-003: Integrate Binder into Editor Workspace (P0 - Integration)

**Priority**: P0 (Critical)
**Story Points**: 3
**Status**: Not Started
**Dependencies**: TICKET-002

### Description
Add the DocumentTree component to the editor workspace as a collapsible left sidebar, replacing/complementing the current chapter sidebar.

### Acceptance Criteria
- [ ] Add DocumentTree to left sidebar of `components/editor/editor-workspace.tsx`
- [ ] Sidebar toggleable via button in header (icon: sidebar-left from lucide-react)
- [ ] Sidebar state persists in localStorage (`editor.binder.open`)
- [ ] Sidebar width resizable (min: 200px, max: 400px, default: 280px)
- [ ] Sidebar collapses in focus mode
- [ ] Clicking document in tree navigates to `/dashboard/editor/[id]`
- [ ] Active document highlighted in tree
- [ ] Chapter sidebar remains on right (structure WITHIN document)
- [ ] Mobile: Binder opens as modal overlay (not sidebar)

### Layout Changes
```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Breadcrumbs] [< Back] [Title] [Focus] [Save]      │
├──────┬──────────────────────────────────────────────┬───────┤
│ LEFT │                 EDITOR CANVAS                │ RIGHT │
│ TREE │                                              │ UTILS │
│      │                                              │       │
│ 📁 MS│  Lorem ipsum dolor sit amet, consectetur... │ 🤖 AI │
│ ├📖 1│                                              │ 📊 Anl│
│ ├📖 2│                                              │ ⚙️ Meta│
│ 📁 RS│                                              │       │
│ ├🔬 1│                                              │ RIGHT │
│ 📁 CH│                                              │ SCENE │
│ └👥 1│                                              │       │
│      │                                              │ Ch 1  │
│      │                                              │ ├ Sc1 │
│      │                                              │ └ Sc2 │
└──────┴──────────────────────────────────────────────┴───────┘
```

### Testing Checklist
- [ ] Sidebar toggles on/off
- [ ] Width resizing works smoothly
- [ ] Mobile modal overlay works
- [ ] Focus mode hides sidebar
- [ ] Navigation to documents works
- [ ] Build passes with 0 TypeScript errors
- [ ] Bundle size impact < 20kB

---

## TICKET-004: Default Folder Structure for New Projects (P1 - Polish)

**Priority**: P1 (High - UX improvement)
**Story Points**: 2
**Status**: Not Started
**Dependencies**: TICKET-001

### Description
Auto-create a Scrivener-style folder structure when users create new projects.

### Acceptance Criteria
- [ ] Update project creation flow to create default folders
- [ ] Default structure:
  ```
  📁 Manuscript (folder_type: 'manuscript')
  ├── 📖 Chapter 1 (document, position: 0)
  📁 Research (folder_type: 'research')
  📁 Characters (folder_type: 'characters')
  📁 Notes (folder_type: 'notes')
  📁 Deleted Scenes (folder_type: 'deleted')
  ```
- [ ] Structure customizable based on project type (novel vs. screenplay)
- [ ] Screenplay gets: Acts, Scenes, Characters, Locations
- [ ] Users can opt-out of default structure (checkbox in project creation)
- [ ] Existing projects unaffected (no retroactive changes)

### Implementation Location
`app/api/projects/route.ts` (POST handler)

### Testing Checklist
- [ ] New projects get default folders
- [ ] Screenplay projects get screenplay-specific structure
- [ ] Opt-out checkbox works
- [ ] Existing projects unchanged
- [ ] Build passes

---

## TICKET-005: Folder Templates Library (P2 - Enhancement)

**Priority**: P2 (Medium - Nice to have)
**Story Points**: 3
**Status**: Not Started
**Dependencies**: TICKET-003

### Description
Provide pre-built folder templates for common writing workflows (Hero's Journey, Three-Act Structure, etc.).

### Acceptance Criteria
- [ ] Create "Templates" dropdown in binder header
- [ ] Templates include:
  - **Hero's Journey**: 12 folders matching Campbell's stages
  - **Three-Act Structure**: Act I, II, III with midpoints
  - **Snowflake Method**: 10 levels of progressive detail
  - **Save the Cat**: 15 beat folders
  - **Blank**: No folders, just root
- [ ] Clicking template creates folders (non-destructive, adds to existing)
- [ ] Templates stored in `lib/binder/folder-templates.ts`
- [ ] Each template has title, description, icon, and folder structure

### Template Example
```tsx
const HEROS_JOURNEY_TEMPLATE = {
  id: 'heros-journey',
  name: "Hero's Journey (12 Stages)",
  description: "Joseph Campbell's monomyth structure",
  icon: '🗺️',
  folders: [
    { title: 'Act I - Departure', type: 'manuscript', children: [
      { title: '1. Ordinary World', type: 'manuscript' },
      { title: '2. Call to Adventure', type: 'manuscript' },
      { title: '3. Refusal of the Call', type: 'manuscript' },
      { title: '4. Meeting the Mentor', type: 'manuscript' },
      { title: '5. Crossing the Threshold', type: 'manuscript' },
    ]},
    // ... more acts
  ]
}
```

### Testing Checklist
- [ ] Templates render in dropdown
- [ ] Applying template creates correct folders
- [ ] Non-destructive (doesn't delete existing)
- [ ] Templates work with empty projects
- [ ] UI is accessible

---

## TICKET-006: Binder Compile Feature (P3 - Future Enhancement)

**Priority**: P3 (Low - Future)
**Story Points**: 8
**Status**: Backlog
**Dependencies**: TICKET-003

### Description
Allow users to select multiple documents from the binder and compile them into a single manuscript for export.

### Acceptance Criteria
- [ ] "Compile" button in binder header
- [ ] Multi-select documents (checkbox UI)
- [ ] Preview compiled output (word count, page count estimate)
- [ ] Export options: PDF, DOCX, Markdown, Fountain (screenplay)
- [ ] Separator options: Page break, scene break, custom text
- [ ] Preserve formatting from individual documents
- [ ] Include/exclude folders (toggle)
- [ ] Save compile configurations (profiles)

### Future Scope
This is a major feature that would compete with Scrivener's compile engine. Deferred to post-MVP.

---

## TICKET-007: Visual Metadata Badges in Binder (P2 - Polish)

**Priority**: P2 (Medium)
**Story Points**: 2
**Status**: Not Started
**Dependencies**: TICKET-003

### Description
Show inline status indicators next to documents in the binder (word count, completion status, AI-generated).

### Acceptance Criteria
- [ ] Word count badge (e.g., "2.4k") next to documents
- [ ] Color-coded status dots:
  - 🟢 Complete (user-marked)
  - 🟡 Draft
  - 🔴 TODO
  - 🔵 AI-generated
- [ ] Hover tooltip shows full metadata (created date, last edited, AI word count)
- [ ] Badges update in real-time as user edits
- [ ] Configurable visibility (toggle in settings)

### UI Example
```
📁 Manuscript
├── 📖 Chapter 1 🟢 12.3k
├── 📖 Chapter 2 🟡 8.1k
└── 📖 Chapter 3 🔴 0 words
```

### Testing Checklist
- [ ] Badges render correctly
- [ ] Word counts match document reality
- [ ] Status dots can be toggled
- [ ] Tooltips show on hover
- [ ] No performance impact on large projects (100+ docs)

---

## Implementation Priority Order

**Phase 1 - Foundation (2-3 weeks)**
1. TICKET-001: Database schema (3 SP)
2. TICKET-002: DocumentTree component (5 SP)
3. TICKET-003: Editor integration (3 SP)
4. **Total: 11 SP (Sprint 1)**

**Phase 2 - Polish (1 week)**
5. TICKET-004: Default folders (2 SP)
6. TICKET-007: Metadata badges (2 SP)
7. **Total: 4 SP (Sprint 2)**

**Phase 3 - Enhancement (2 weeks)**
8. TICKET-005: Folder templates (3 SP)
9. **Total: 3 SP (Sprint 3)**

**Future/Backlog**
10. TICKET-006: Compile feature (8 SP)

---

## Success Metrics

**Adoption**:
- 70%+ of projects use folders within first week
- Average 3+ folders per project
- 50%+ of users apply a folder template

**Engagement**:
- 30% reduction in time to find documents (navigation speed)
- 40% increase in research material usage (easier access)
- 20% increase in multi-document projects (enabling complex structures)

**Feedback**:
- NPS score +15 points from writers who requested binder feature
- <5% bug reports related to binder in first month
- Qualitative feedback mentioning "Scrivener-like" positively

---

## Technical Risks & Mitigations

**Risk 1: Performance with 100+ documents**
- **Mitigation**: Virtual scrolling with `react-window`, lazy load folder contents, index on `(project_id, parent_folder_id)`

**Risk 2: Complex drag-and-drop bugs**
- **Mitigation**: Use battle-tested library `@dnd-kit/core`, extensive E2E tests with Playwright

**Risk 3: Database migration breaking existing documents**
- **Mitigation**: Add columns as nullable, default values, comprehensive rollback script, test on staging

**Risk 4: Mobile UX with tree navigation**
- **Mitigation**: Modal overlay instead of sidebar, swipe gestures, simplified touch interactions

---

## Related UX Audit Tickets

This feature addresses:
- **UX-027**: Document Organization (P3) - Mentioned binder as potential solution
- **UX-033**: Navigation Between Documents (P2) - Binder solves this completely

---

**Last Updated**: January 21, 2025
**Owner**: Emmanuel Akangbou
**Status**: Ready for Review
