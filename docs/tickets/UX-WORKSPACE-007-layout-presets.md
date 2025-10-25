# UX-WORKSPACE-007: Add Quick Layout Presets for Workspace Switching

**Priority**: HIGH
**Effort**: Medium (3-4 hours)
**Impact**: High - Dramatically improves discoverability and ease of use
**Status**: Not Started

---

## Problem Statement

**Current State:**
- Users must manually toggle 3 different sidebars individually to achieve desired layout
- No quick way to switch between common workspace configurations
- Hidden discoverability - users don't know what layouts are possible
- Cognitive overhead of remembering which sidebars to show/hide

**Professional Standard:**
- **Scrivener**: 7 preset layouts with one-click switching (Window > Layout)
- **Final Draft**: Draggable panels with saved workspace states
- **Notion**: Sidebar templates and quick switchers
- **VS Code**: Multiple layout presets via keyboard shortcuts

**User Pain:**
"I want to focus on writing, but have to click 3 different buttons to hide all the sidebars. Then when I want to plan, I have to toggle them all back on individually."

---

## Proposed Solution

Add 4 preset workspace layouts with keyboard shortcuts and toolbar menu:

### Layout Presets

1. **Writer** (Default) - Pure writing focus
   - Binder: Hidden
   - Outline: Hidden
   - AI: Hidden
   - Shortcut: `Cmd+1` / `Ctrl+1`

2. **Planner** - Structure and organization
   - Binder: Visible
   - Outline: Visible
   - AI: Hidden
   - Shortcut: `Cmd+2` / `Ctrl+2`

3. **Assistant** - AI-powered writing
   - Binder: Hidden
   - Outline: Hidden
   - AI: Visible
   - Shortcut: `Cmd+3` / `Ctrl+3`

4. **Studio** - Full workspace
   - Binder: Visible
   - Outline: Visible
   - AI: Visible
   - Shortcut: `Cmd+4` / `Ctrl+4`

### UI Components

1. **Toolbar Layout Switcher**
   - Dropdown menu in top toolbar (left of "More" menu)
   - Icon: Layout (Grid2x2)
   - Shows current layout name
   - Visual preview icons for each layout

2. **Keyboard Shortcuts**
   - Register in command palette
   - Show in keyboard shortcuts dialog
   - Toast notification on layout change

3. **Persistence**
   - Save last-used layout to localStorage
   - Restore on document open
   - Per-user preference (not per-document)

---

## Implementation Details

### Files to Create

**1. `lib/editor/workspace-layouts.ts`**
```typescript
/**
 * Workspace Layout Presets
 *
 * Defines common workspace configurations for quick switching
 */

export const WORKSPACE_LAYOUTS = {
  writer: {
    id: 'writer',
    name: 'Writer',
    description: 'Pure writing focus - no distractions',
    icon: 'FileText',
    shortcut: 'mod+1',
    config: {
      showBinder: false,
      showOutline: false,
      showUtilitySidebar: false,
    },
  },
  planner: {
    id: 'planner',
    name: 'Planner',
    description: 'Structure and organization tools',
    icon: 'LayoutList',
    shortcut: 'mod+2',
    config: {
      showBinder: true,
      showOutline: true,
      showUtilitySidebar: false,
    },
  },
  assistant: {
    id: 'assistant',
    name: 'Assistant',
    description: 'AI-powered writing support',
    icon: 'Sparkles',
    shortcut: 'mod+3',
    config: {
      showBinder: false,
      showOutline: false,
      showUtilitySidebar: true,
    },
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    description: 'Full workspace with all tools',
    icon: 'Grid2x2',
    shortcut: 'mod+4',
    config: {
      showBinder: true,
      showOutline: true,
      showUtilitySidebar: true,
    },
  },
} as const

export type WorkspaceLayoutId = keyof typeof WORKSPACE_LAYOUTS

export function getLayoutConfig(layoutId: WorkspaceLayoutId) {
  return WORKSPACE_LAYOUTS[layoutId].config
}

export function saveCurrentLayout(layoutId: WorkspaceLayoutId) {
  if (typeof window === 'undefined') return
  localStorage.setItem('ottowrite:workspace:currentLayout', layoutId)
}

export function getCurrentLayout(): WorkspaceLayoutId {
  if (typeof window === 'undefined') return 'writer'
  return (localStorage.getItem('ottowrite:workspace:currentLayout') as WorkspaceLayoutId) || 'writer'
}
```

**2. `components/editor/layout-switcher.tsx`**
```typescript
/**
 * Layout Switcher Component
 *
 * Dropdown menu for switching between workspace layout presets
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Layout, FileText, LayoutList, Sparkles, Grid2x2 } from 'lucide-react'
import { WORKSPACE_LAYOUTS, type WorkspaceLayoutId, saveCurrentLayout, getCurrentLayout } from '@/lib/editor/workspace-layouts'
import { useToast } from '@/hooks/use-toast'

interface LayoutSwitcherProps {
  onLayoutChange: (config: {
    showBinder: boolean
    showOutline: boolean
    showUtilitySidebar: boolean
  }) => void
}

const ICONS = {
  FileText,
  LayoutList,
  Sparkles,
  Grid2x2,
}

export function LayoutSwitcher({ onLayoutChange }: LayoutSwitcherProps) {
  const [currentLayout, setCurrentLayout] = useState<WorkspaceLayoutId>(getCurrentLayout())
  const { toast } = useToast()

  const handleLayoutChange = (layoutId: WorkspaceLayoutId) => {
    const layout = WORKSPACE_LAYOUTS[layoutId]

    // Apply layout configuration
    onLayoutChange(layout.config)

    // Save to state and localStorage
    setCurrentLayout(layoutId)
    saveCurrentLayout(layoutId)

    // Show toast notification
    toast({
      title: `${layout.name} Layout`,
      description: layout.description,
      duration: 2000,
    })
  }

  const currentLayoutData = WORKSPACE_LAYOUTS[currentLayout]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layout className="h-4 w-4" />
          <span className="hidden md:inline">{currentLayoutData.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(WORKSPACE_LAYOUTS).map(([id, layout]) => {
          const Icon = ICONS[layout.icon as keyof typeof ICONS]
          return (
            <DropdownMenuItem
              key={id}
              onClick={() => handleLayoutChange(id as WorkspaceLayoutId)}
              className="flex items-start gap-3"
            >
              <Icon className="h-4 w-4 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{layout.name}</span>
                  {currentLayout === id && (
                    <span className="text-xs text-muted-foreground">(active)</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{layout.description}</span>
                <span className="text-xs text-muted-foreground opacity-60">
                  {layout.shortcut.replace('mod', '⌘')}
                </span>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Files to Modify

**3. `components/editor/editor-workspace.tsx`**

Add layout switcher to toolbar:
```typescript
// Import
import { LayoutSwitcher } from '@/components/editor/layout-switcher'
import { WORKSPACE_LAYOUTS, getCurrentLayout } from '@/lib/editor/workspace-layouts'

// In component, initialize state with saved layout
const [currentLayout, setCurrentLayout] = useState(() => getCurrentLayout())

// Add handler
const handleLayoutChange = useCallback((config: {
  showBinder: boolean
  showOutline: boolean
  showUtilitySidebar: boolean
}) => {
  setShowBinder(config.showBinder)
  setShowStructureSidebar(config.showOutline)
  setShowAI(config.showUtilitySidebar)
}, [])

// Add keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const layoutKeys = ['1', '2', '3', '4']
      const index = layoutKeys.indexOf(e.key)

      if (index !== -1) {
        e.preventDefault()
        const layoutIds: WorkspaceLayoutId[] = ['writer', 'planner', 'assistant', 'studio']
        const layout = WORKSPACE_LAYOUTS[layoutIds[index]]
        handleLayoutChange(layout.config)
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [handleLayoutChange])

// Add to toolbar (before "More" menu)
<LayoutSwitcher onLayoutChange={handleLayoutChange} />
```

**4. `components/editor/keyboard-shortcuts-dialog.tsx`**

Add layout shortcuts to shortcuts list:
```typescript
{
  category: 'Workspace Layouts',
  shortcuts: [
    { keys: ['⌘', '1'], description: 'Switch to Writer layout' },
    { keys: ['⌘', '2'], description: 'Switch to Planner layout' },
    { keys: ['⌘', '3'], description: 'Switch to Assistant layout' },
    { keys: ['⌘', '4'], description: 'Switch to Studio layout' },
  ],
}
```

**5. `components/editor/command-palette.tsx`**

Add layout commands:
```typescript
{
  id: 'layout-writer',
  title: 'Switch to Writer Layout',
  description: 'Pure writing focus - no distractions',
  keywords: ['layout', 'writer', 'focus', 'clean'],
  shortcut: 'mod+1',
  icon: FileText,
  onSelect: () => handleLayoutChange('writer'),
},
// ... repeat for planner, assistant, studio
```

---

## Success Metrics

### User Experience
- [ ] Users can switch layouts with single click
- [ ] Keyboard shortcuts work (Cmd+1, Cmd+2, Cmd+3, Cmd+4)
- [ ] Toast notification shows on layout change
- [ ] Layout persists across page refreshes
- [ ] Layout switcher shows current active layout
- [ ] Visual previews make layouts discoverable

### Technical
- [ ] No layout state conflicts
- [ ] Smooth transitions (no flashing)
- [ ] localStorage properly persists choice
- [ ] Keyboard shortcuts registered in command palette
- [ ] Mobile-responsive (dropdown works on small screens)

### Performance
- [ ] No re-renders on layout switch (use callbacks)
- [ ] Layout change < 100ms

---

## Testing Checklist

- [ ] Click each layout preset - verify correct sidebars show/hide
- [ ] Test keyboard shortcuts (Cmd+1, Cmd+2, Cmd+3, Cmd+4)
- [ ] Refresh page - verify layout persists
- [ ] Switch layouts multiple times - no bugs
- [ ] Test on mobile - dropdown accessible
- [ ] Test in focus mode - layouts still work when exiting focus
- [ ] Check command palette - layout commands appear
- [ ] Verify toast notifications show correct layout name
- [ ] Test with different document types (novel, screenplay, etc.)

---

## Notes

- Consider adding visual preview icons in dropdown (mini grid representations)
- Future enhancement: Per-document layout memory
- Future enhancement: Custom layouts (user-defined)
- Future enhancement: Layout animations (slide in/out)

---

## Related Tickets

- UX-WORKSPACE-001: Reset Default Workspace Layout ✅
- UX-WORKSPACE-002: Progressive Disclosure for Outline Widgets ✅
- UX-WORKSPACE-004: Make AI/Analytics Rail Optional ✅
- UX-WORKSPACE-008: Consolidate Sidebars (blocks this)
