# UX-WORKSPACE-011: Simplify Grid Layout with Flexbox

**Priority**: MEDIUM
**Effort**: Medium (3-4 hours)
**Impact**: Medium - Better maintainability, smoother UX
**Status**: Not Started

---

## Problem Statement

**Current State:**
- Complex CSS Grid with 9 different conditional configurations
- Hard-coded column widths in grid template
- Difficult to maintain and reason about
- No drag-to-resize panels (fixed widths)
- Long className conditionals (300+ character strings)

**Code Example (Current):**
```typescript
className={cn(
  'mx-auto w-full max-w-[1800px]',
  // Enable grid layout when sidebars are present
  (showBinderSidebar || showStructureSidebar || showUtilitySidebar) && 'lg:grid',
  // Focus mode: single column only
  focusMode && 'lg:grid-cols-[minmax(0,1fr)]',
  // All three sidebars visible
  !focusMode && showBinderSidebar && showStructureSidebar && showUtilitySidebar &&
    'lg:grid-cols-[minmax(200px,280px)_minmax(220px,280px)_minmax(0,1fr)_minmax(280px,340px)]',
  // Binder + Outline (no utility)
  !focusMode && showBinderSidebar && showStructureSidebar && !showUtilitySidebar &&
    'lg:grid-cols-[minmax(200px,280px)_minmax(220px,280px)_minmax(0,1fr)]',
  // ... 6 more configurations
)}
```

**Professional Standard:**
- **VS Code**: Flexbox with draggable panel resizers
- **Figma**: Resizable panels with smooth transitions
- **Notion**: Flexbox with collapsible sidebars
- **Scrivener**: Draggable splitters between panels

**Developer Pain:**
"Adding or modifying sidebar layouts requires updating 9 different grid configurations. The code is brittle and hard to test."

---

## Proposed Solution

Replace CSS Grid with Flexbox and optional drag-to-resize:

### New Layout System

1. **Flexbox Container**
   - Simple `flex` container instead of complex grid
   - Sidebars use `flex-shrink-0` for fixed width
   - Editor uses `flex-1` to fill remaining space

2. **Draggable Resize Handles** (Optional Enhancement)
   - React-based resize handles between panels
   - Persist widths to localStorage
   - Smooth resize with `requestAnimationFrame`

3. **Simplified Conditionals**
   - Only 3 states instead of 9
   - Easier to reason about
   - Less code duplication

---

## Implementation Details

### Phase 1: Convert Grid to Flexbox (Required)

**1. `components/editor/editor-workspace.tsx`**

Replace complex grid with simple flexbox:

```typescript
<main
  className={cn(
    'mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 xl:px-8',
    'flex gap-6',
    'bg-background'
  )}
>
  {/* Outline Sidebar (conditionally rendered) */}
  {showStructureSidebar && !focusMode && (
    <aside
      className="flex-shrink-0 overflow-y-auto"
      style={{ width: `${outlineSidebarWidth}px` }}
    >
      <TabbedOutlineSidebar {...props} />
    </aside>
  )}

  {/* Editor (always present, fills remaining space) */}
  <div className="flex-1 min-w-0 overflow-hidden">
    <div className="rounded-lg border bg-card shadow-card">
      <div className="p-4 sm:p-6 lg:p-8">
        {editorElement}
      </div>
    </div>
  </div>

  {/* AI Sidebar (conditionally rendered) */}
  {showUtilitySidebar && !focusMode && (
    <aside
      className="flex-shrink-0 overflow-y-auto"
      style={{ width: `${aiSidebarWidth}px` }}
    >
      <AIAssistant {...props} />
      {/* ... other AI components */}
    </aside>
  )}
</main>
```

**State for sidebar widths:**
```typescript
// Default widths
const DEFAULT_OUTLINE_WIDTH = 320
const DEFAULT_AI_WIDTH = 340

// State
const [outlineSidebarWidth, setOutlineSidebarWidth] = useState(
  () => {
    if (typeof window === 'undefined') return DEFAULT_OUTLINE_WIDTH
    const saved = localStorage.getItem('ottowrite:workspace:outlineWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_OUTLINE_WIDTH
  }
)

const [aiSidebarWidth, setAiSidebarWidth] = useState(
  () => {
    if (typeof window === 'undefined') return DEFAULT_AI_WIDTH
    const saved = localStorage.getItem('ottowrite:workspace:aiWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_AI_WIDTH
  }
)

// Persist on change
useEffect(() => {
  localStorage.setItem('ottowrite:workspace:outlineWidth', String(outlineSidebarWidth))
}, [outlineSidebarWidth])

useEffect(() => {
  localStorage.setItem('ottowrite:workspace:aiWidth', String(aiSidebarWidth))
}, [aiSidebarWidth])
```

**Result:**
- No more complex grid-cols conditionals
- Clean 3-state logic (outline only, AI only, both)
- Easy to modify and extend

### Phase 2: Add Drag-to-Resize (Optional Enhancement)

**2. Create `components/editor/resize-handle.tsx`**

Reusable resize handle component:

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  className?: string
  ariaLabel: string
}

export function ResizeHandle({ onResize, className, ariaLabel }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      startXRef.current = e.clientX
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onResize])

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      className={cn(
        'w-1 cursor-col-resize select-none transition-colors',
        'bg-border hover:bg-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isDragging && 'bg-primary',
        className
      )}
    />
  )
}
```

**3. Integrate resize handles:**

```typescript
<main className="flex gap-0">
  {/* Outline Sidebar */}
  {showStructureSidebar && !focusMode && (
    <>
      <aside style={{ width: `${outlineSidebarWidth}px` }}>
        <TabbedOutlineSidebar {...props} />
      </aside>

      <ResizeHandle
        ariaLabel="Resize outline sidebar"
        onResize={(delta) => {
          setOutlineSidebarWidth((prev) =>
            Math.max(200, Math.min(500, prev + delta))
          )
        }}
      />
    </>
  )}

  {/* Editor */}
  <div className="flex-1 min-w-0">
    {editorElement}
  </div>

  {/* AI Sidebar */}
  {showUtilitySidebar && !focusMode && (
    <>
      <ResizeHandle
        ariaLabel="Resize AI sidebar"
        onResize={(delta) => {
          setAiSidebarWidth((prev) =>
            Math.max(280, Math.min(500, prev - delta))
          )
        }}
      />

      <aside style={{ width: `${aiSidebarWidth}px` }}>
        <AIAssistant {...props} />
      </aside>
    </>
  )}
</main>
```

---

## Code Comparison

### Before (Complex Grid)
```typescript
className={cn(
  'mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:gap-8 xl:px-8',
  'flex flex-col gap-8 xl:gap-20 bg-background',
  'transition-all duration-300 ease-in-out',
  // Enable grid layout when sidebars are present
  (showBinderSidebar || showStructureSidebar || showUtilitySidebar) && 'lg:grid',
  // Focus mode: single column only
  focusMode && 'lg:grid-cols-[minmax(0,1fr)]',
  // All three sidebars visible (4 columns)
  !focusMode && showBinderSidebar && showStructureSidebar && showUtilitySidebar &&
    'lg:grid-cols-[minmax(200px,280px)_minmax(220px,280px)_minmax(0,1fr)_minmax(280px,340px)]',
  // Binder + Outline (3 columns)
  !focusMode && showBinderSidebar && showStructureSidebar && !showUtilitySidebar &&
    'lg:grid-cols-[minmax(200px,280px)_minmax(220px,280px)_minmax(0,1fr)]',
  // ... 6 more configurations
)}
```
**Lines of code**: ~25 lines
**Configurations**: 9 different grid templates
**Complexity**: O(2^n) where n = number of sidebars

### After (Simple Flexbox)
```typescript
className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 xl:px-8 flex gap-6 bg-background"
```
**Lines of code**: 1 line
**Configurations**: 3 conditional renders
**Complexity**: O(n) where n = number of sidebars

**Reduction**: 96% less code for layout logic

---

## Benefits

### Developer Experience
- [ ] Easier to understand layout logic
- [ ] Simpler to add/remove sidebars
- [ ] Less prone to bugs
- [ ] Easier to test (fewer states)
- [ ] Better TypeScript inference

### User Experience
- [ ] Draggable panel resizing (Phase 2)
- [ ] Smoother transitions
- [ ] More control over workspace
- [ ] Persisted panel widths

### Performance
- [ ] Fewer className calculations
- [ ] Less re-rendering on sidebar toggle
- [ ] Simpler CSS (browser can optimize better)

---

## Success Metrics

### Code Quality
- [ ] Layout className reduced from 300+ chars to ~50 chars
- [ ] Grid configurations reduced from 9 to 0
- [ ] Sidebar rendering logic simplified
- [ ] No layout bugs introduced

### User Experience
- [ ] Sidebars show/hide smoothly
- [ ] Panel widths persist across sessions
- [ ] Draggable resize handles work smoothly (Phase 2)
- [ ] No visual regressions

### Performance
- [ ] No layout shift during sidebar toggle
- [ ] Resize handles smooth (60fps)
- [ ] localStorage reads/writes optimized

---

## Testing Checklist

- [ ] Toggle outline sidebar - works smoothly
- [ ] Toggle AI sidebar - works smoothly
- [ ] Both sidebars visible - layout correct
- [ ] Focus mode - sidebars hidden
- [ ] Resize outline sidebar (Phase 2) - width changes
- [ ] Resize AI sidebar (Phase 2) - width changes
- [ ] Refresh page - widths persist
- [ ] Min/max width constraints work (200px - 500px)
- [ ] Mobile responsive - sidebars stack or hide
- [ ] No horizontal scrolling
- [ ] Editor always fills remaining space

---

## Edge Cases

- [ ] Very narrow viewport - sidebars collapse
- [ ] Very wide viewport - max-width container works
- [ ] Rapid sidebar toggling - no visual glitches
- [ ] Drag resize beyond constraints - stops at min/max
- [ ] localStorage quota exceeded - graceful fallback
- [ ] Multiple rapid resizes - no performance issues

---

## Migration Notes

### Data Migration
```typescript
// Migrate old grid-based preferences to new width-based preferences
function migrateLayoutPreferences() {
  if (typeof window === 'undefined') return

  // Check if migration already done
  const migrated = localStorage.getItem('ottowrite:workspace:layoutMigrated')
  if (migrated) return

  // No specific data to migrate (grid didn't store widths)
  // Just set defaults
  localStorage.setItem('ottowrite:workspace:outlineWidth', String(DEFAULT_OUTLINE_WIDTH))
  localStorage.setItem('ottowrite:workspace:aiWidth', String(DEFAULT_AI_WIDTH))
  localStorage.setItem('ottowrite:workspace:layoutMigrated', 'true')
}
```

### Rollback Plan
- Keep old grid code in git history
- If issues found, can revert with single commit
- No data loss (localStorage keys different)

---

## Performance Considerations

### Resize Performance (Phase 2)
```typescript
// Throttle resize updates for better performance
const handleResize = useCallback(
  throttle((delta: number) => {
    setOutlineSidebarWidth((prev) =>
      Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, prev + delta))
    )
  }, 16), // ~60fps
  []
)
```

### Persisting Widths
```typescript
// Debounce localStorage writes
useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem('ottowrite:workspace:outlineWidth', String(outlineSidebarWidth))
  }, 500)

  return () => clearTimeout(timer)
}, [outlineSidebarWidth])
```

---

## Notes

- This is a foundational change that makes future layout modifications easier
- Sets up for advanced features like:
  - Split editor (side-by-side documents)
  - Detachable panels (future)
  - Layout presets with custom widths
- Aligns with industry standards (VS Code, Figma, etc.)

---

## Dependencies

- **Requires**: UX-WORKSPACE-008 (Consolidate Sidebars) to reduce complexity first
- **Blocks**: Any future sidebar features (easier to implement after this)

---

## Future Enhancements

- [ ] Split editor (two documents side-by-side)
- [ ] Detachable panels (pop out to separate window)
- [ ] Panel stacking (tabs within sidebars)
- [ ] Keyboard shortcuts for resize (Cmd+[ to shrink, Cmd+] to grow)
- [ ] Double-click resize handle to reset to default width

---

## Related Tickets

- UX-WORKSPACE-008: Consolidate Sidebars (simplifies to 2 sidebars max)
- UX-WORKSPACE-007: Layout Presets (can include custom widths)
