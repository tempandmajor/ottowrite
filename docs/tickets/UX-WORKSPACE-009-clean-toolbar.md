# UX-WORKSPACE-009: Simplify Toolbar to Google Docs-Style Minimalism

**Priority**: HIGH
**Effort**: Small (2-3 hours)
**Impact**: High - Makes interface feel immediately more professional
**Status**: Not Started

---

## Problem Statement

**Current State:**
- Top toolbar has 3 zones with multiple visible buttons
- "More" dropdown contains secondary actions
- Save button always visible (even when auto-saving works)
- Undo/Redo controls visible in toolbar
- Document metadata inline in header (type, word count, save status)
- Cognitive overhead from too many visible options

**Professional Standard:**
- **Google Docs**: Minimal toolbar, most actions hidden until needed
- **Microsoft Word**: Ribbon can be minimized, command search prominent
- **Notion**: Clean header with just page title and essential actions
- **Linear**: Search-first interface, minimal chrome

**User Pain:**
"The toolbar feels busy and cluttered. I just want to write, not see a wall of buttons. Google Docs feels so clean by comparison."

---

## Proposed Solution

Drastically simplify toolbar to essentials only:

### New Toolbar Layout (3 zones)

**Left Zone: Navigation Only**
- Back button (to dashboard)
- That's it.

**Center Zone: Document Identity**
- Document title (editable inline)
- Subtle metadata below: Type · Save status
- Remove: Word count, project link, autosave label

**Right Zone: Essential Actions**
- Layout Switcher (from UX-WORKSPACE-007)
- Command Palette (Cmd+K) - primary action
- Focus Mode toggle
- Document menu (replaces "More" dropdown)

### Everything Else Goes To:

1. **Command Palette** (Cmd+K)
   - Undo/Redo
   - Save
   - Export
   - Version history
   - Plot analysis
   - Toggle sidebars
   - Keyboard shortcuts
   - All other actions

2. **Document Menu** (new dropdown)
   - Document metadata
   - Share (future)
   - Duplicate
   - Move to folder
   - Delete

3. **Auto-save Only** (remove manual save)
   - Like Google Docs, saving happens automatically
   - Save status shows in center zone
   - No manual save button needed

---

## Implementation Details

### Files to Modify

**1. `components/editor/editor-workspace.tsx`**

Simplify toolbar to 4 buttons only:

```typescript
{/* Left Zone: Navigation */}
<div className="flex items-center gap-2">
  <Button variant="ghost" size="sm" asChild>
    <Link href="/dashboard/documents">
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Back to documents</span>
    </Link>
  </Button>
</div>

{/* Center Zone: Document Identity */}
<div className="flex min-w-0 flex-col items-center justify-center">
  <input
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    className="w-full truncate border-none bg-transparent text-center text-lg font-semibold text-foreground outline-none focus-visible:ring-0"
    placeholder="Untitled document"
  />
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <span className="capitalize">{document.type}</span>
    <span className="h-3 w-px bg-border" aria-hidden />
    <span className={isDirty ? 'text-amber-600' : 'text-muted-foreground'}>
      {savedMessage}
    </span>
  </div>
</div>

{/* Right Zone: Essential Actions */}
<div className="flex items-center justify-end gap-2">
  {/* Layout Switcher (from UX-WORKSPACE-007) */}
  <LayoutSwitcher onLayoutChange={handleLayoutChange} />

  {/* Command Palette - PRIMARY ACTION */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Command className="h-4 w-4" />
        <span className="hidden md:inline ml-2">Commands</span>
        <kbd className="hidden md:inline ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
      </Button>
    </TooltipTrigger>
    <TooltipContent>Command Palette (⌘K)</TooltipContent>
  </Tooltip>

  {/* Focus Mode */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleFocusMode}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Focus Mode (⌘.)</TooltipContent>
  </Tooltip>

  {/* Document Menu (replaces "More" dropdown) */}
  <DocumentMenu
    document={document}
    onOpenMetadata={() => setShowMetadata(true)}
    onExport={handleExportClick}
    onViewHistory={() => setShowVersionHistory(true)}
  />
</div>
```

**2. Create `components/editor/document-menu.tsx`**

New component to replace "More" dropdown:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  FileText,
  Share2,
  Copy,
  FolderInput,
  Trash2,
} from 'lucide-react'

interface DocumentMenuProps {
  document: any
  onOpenMetadata: () => void
  onExport: () => void
  onViewHistory: () => void
}

export function DocumentMenu({
  document,
  onOpenMetadata,
  onExport,
  onViewHistory,
}: DocumentMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Document menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onOpenMetadata}>
          <FileText className="mr-2 h-4 w-4" />
          Document Info
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onViewHistory}>
          <History className="mr-2 h-4 w-4" />
          Version History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>
          <Share2 className="mr-2 h-4 w-4" />
          Share (soon)
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FolderInput className="mr-2 h-4 w-4" />
          Move to Folder
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="text-destructive" disabled>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**3. `components/editor/command-palette.tsx`**

Add all removed toolbar actions to command palette:

```typescript
// Add these commands
const commands = [
  // ... existing commands

  // Document actions
  {
    id: 'save',
    title: 'Save Document',
    description: 'Manually trigger save',
    keywords: ['save', 'write'],
    icon: Save,
    shortcut: 'mod+s',
    onSelect: async () => {
      await saveDocument()
      toast({ title: 'Document saved' })
    },
  },
  {
    id: 'undo',
    title: 'Undo',
    description: 'Undo last change',
    keywords: ['undo', 'revert'],
    icon: Undo,
    shortcut: 'mod+z',
    onSelect: () => undoRedoAPI.undo(),
  },
  {
    id: 'redo',
    title: 'Redo',
    description: 'Redo last undone change',
    keywords: ['redo'],
    icon: Redo,
    shortcut: 'mod+shift+z',
    onSelect: () => undoRedoAPI.redo(),
  },
  {
    id: 'export',
    title: 'Export Document',
    description: 'Export to PDF, DOCX, or other formats',
    keywords: ['export', 'download', 'pdf', 'docx'],
    icon: FileDown,
    onSelect: () => setShowExportModal(true),
  },
  {
    id: 'version-history',
    title: 'Version History',
    description: 'View and restore previous versions',
    keywords: ['history', 'versions', 'restore'],
    icon: History,
    onSelect: () => setShowVersionHistory(true),
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'View all keyboard shortcuts',
    keywords: ['shortcuts', 'keys', 'help'],
    icon: Keyboard,
    onSelect: () => setShowKeyboardShortcuts(true),
  },

  // Sidebar toggles
  {
    id: 'toggle-outline',
    title: 'Toggle Outline Sidebar',
    description: showOutline ? 'Hide outline' : 'Show outline',
    keywords: ['outline', 'sidebar', 'chapters'],
    icon: PanelLeft,
    shortcut: 'mod+\\',
    onSelect: () => setShowOutline(!showOutline),
  },
  {
    id: 'toggle-ai',
    title: 'Toggle AI Assistant',
    description: showAI ? 'Hide AI assistant' : 'Show AI assistant',
    keywords: ['ai', 'assistant', 'sidebar'],
    icon: Sparkles,
    shortcut: 'mod+shift+\\',
    onSelect: () => setShowAI(!showAI),
  },

  // Plot analysis
  {
    id: 'plot-analysis',
    title: 'Plot Analysis',
    description: 'Analyze story structure and pacing',
    keywords: ['plot', 'analysis', 'structure'],
    icon: BarChart,
    onSelect: () => router.push(`/dashboard/editor/${document.id}/plot-analysis`),
  },
]
```

**4. Remove Components**

Remove these from toolbar completely:
- Save button (auto-save only)
- Undo/Redo controls (moved to command palette)
- "More" dropdown (replaced by Document Menu)
- Inline metadata (word count, project link, autosave label)

---

## Visual Comparison

### Before (Cluttered)
```
[Back] [Title | Type • 1,234 words • Project Link • Saved • Auto-saving...] [Save][Undo][Redo][⌘K][Focus][More ▼]
```

### After (Clean)
```
[Back] [Title | Type • Saved] [Layout ▼][Commands ⌘K][Focus][•••]
```

**Reduction**: 9+ visible items → 4 essential buttons

---

## Success Metrics

### User Experience
- [ ] Toolbar feels clean and uncluttered
- [ ] Command palette is discoverable (prominent button)
- [ ] All functionality preserved (just moved)
- [ ] No user complaints about "where did X go"
- [ ] Increased command palette usage (track analytics)

### Visual
- [ ] Toolbar height reduced (less vertical space)
- [ ] More breathing room for document title
- [ ] Professional appearance (matches Google Docs style)
- [ ] Fewer visual distractions

### Technical
- [ ] Simpler toolbar component (less code)
- [ ] Better mobile responsiveness
- [ ] Command palette comprehensive
- [ ] All keyboard shortcuts work

---

## Migration & Communication

### User Onboarding
- [ ] Toast on first load: "Actions moved to Command Palette (⌘K)"
- [ ] Highlight Command Palette button with pulse animation (first 3 visits)
- [ ] Update help documentation
- [ ] Add to keyboard shortcuts dialog

### Discoverability
- [ ] Command Palette button is prominent and labeled
- [ ] Keyboard shortcut badge visible (⌘K)
- [ ] Document menu (•••) follows familiar pattern
- [ ] Focus mode still easily accessible

---

## Testing Checklist

- [ ] All previous toolbar actions accessible via Command Palette
- [ ] Document menu shows all document-specific actions
- [ ] Command Palette opens with ⌘K
- [ ] Keyboard shortcuts still work (Undo, Redo, Save, etc.)
- [ ] Save still works (auto-save + manual via ⌘S)
- [ ] Toolbar responsive on mobile (4 buttons fit)
- [ ] No visual regressions
- [ ] Focus mode still works
- [ ] Layout switcher integrated cleanly
- [ ] Back button works

---

## Edge Cases

- [ ] Very long document titles wrap properly
- [ ] Save status updates correctly (no manual button to click)
- [ ] Command palette comprehensive enough (no "missing" actions)
- [ ] Mobile: all 4 buttons accessible
- [ ] Tablet: buttons have appropriate spacing
- [ ] Small screens: title doesn't overflow

---

## Notes

- This change makes OttoWrite feel significantly more modern
- Follows industry best practices (search-first, minimal chrome)
- Reduces decision fatigue for users
- Sets up foundation for more command palette features
- Consider adding recent commands to command palette

---

## Dependencies

- **Requires**: UX-WORKSPACE-007 (Layout Switcher) to be implemented first
- **Enhances**: Command Palette must be comprehensive

---

## Follow-up Tickets

- [ ] UX-WORKSPACE-010: Add recent commands to Command Palette
- [ ] UX-WORKSPACE-011: Command Palette AI suggestions
- [ ] UX-WORKSPACE-012: Breadcrumb navigation (since project link removed from toolbar)
