# Workspace UX Implementation Tickets

**Created:** 2025-10-24
**Project:** Ottowrite Editor Workspace Redesign
**Epic:** Professional Workspace Layout & Information Architecture
**Related:** See `EDITOR_UX_TICKETS.md` for editor component-level tickets

---

## Overview

These tickets address the **workspace layout** surrounding the editor, focusing on reducing visual clutter, improving focus, and creating a professional writing environment. While `EDITOR_UX_TICKETS.md` covers the TipTap editor component itself, these tickets address the broader workspace architecture in `editor-workspace.tsx`.

### Key Goals
- **Reduce cognitive load** by hiding non-essential UI by default
- **Improve focus** by giving the editor maximum screen real estate
- **Progressive disclosure** - show advanced features when needed
- **Professional appearance** that competes with Google Docs, Notion, Scrivener

---

## TICKET UX-WORKSPACE-001: Reset Default Workspace Layout for Focused Writing

**Priority:** P0 (Critical - Launch Blocker)
**Effort:** 3 story points (1-2 days)
**Component:** `components/editor/editor-workspace.tsx`
**Status:** 🔴 NOT STARTED

### Problem

Current default state shows all panels open (binder, outline, AI assistant), creating a cluttered, overwhelming first-time experience. New users see a busy 4-column layout instead of a clean writing surface.

**Current Behavior:**
- Binder sidebar: Open by default
- Outline sidebar: Open by default
- AI/Analytics rail: Open by default
- Editor: Squeezed into remaining space

### User Impact

> "When I create a new document, I just want to write. Why is everything open?"

- **Cognitive overload:** Too many UI elements compete for attention
- **Reduced editor space:** Content area is narrow on laptops
- **Unclear focus:** Users don't know where to start
- **Poor first impression:** Looks cluttered and unprofessional

### Acceptance Criteria

- ✅ New document loads with **editor-only view** (or single left sidebar)
- ✅ Binder starts **collapsed** (icon-only or hidden)
- ✅ Outline/widgets sidebar starts **collapsed**
- ✅ AI assistant rail starts **hidden**
- ✅ User toggle states persist in `localStorage`
- ✅ Returning users see their **last-used layout**
- ✅ Mobile view: All sidebars collapsed by default
- ✅ Smooth transitions when opening/closing panels

### Implementation Approach

```tsx
// Initial state - everything collapsed
const [showBinder, setShowBinder] = useState(() => {
  // Check localStorage for user preference
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ottowrite:workspace:showBinder')
    return saved === 'true' // Returns false by default
  }
  return false // Default: collapsed
})

const [showOutline, setShowOutline] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ottowrite:workspace:showOutline')
    return saved === 'true'
  }
  return false // Default: collapsed
})

const [showUtilitySidebar, setShowUtilitySidebar] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ottowrite:workspace:showUtilitySidebar')
    return saved === 'true'
  }
  return false // Default: hidden
})

// Persist changes
useEffect(() => {
  localStorage.setItem('ottowrite:workspace:showBinder', String(showBinder))
}, [showBinder])

useEffect(() => {
  localStorage.setItem('ottowrite:workspace:showOutline', String(showOutline))
}, [showOutline])

useEffect(() => {
  localStorage.setItem('ottowrite:workspace:showUtilitySidebar', String(showUtilitySidebar))
}, [showUtilitySidebar])
```

### Layout Modes

**Default Layout (New Users):**
```
┌─────────────────────────────────┐
│          Top Toolbar            │
├─────────────────────────────────┤
│                                 │
│          Editor Only            │
│      (Full Width/Centered)      │
│                                 │
└─────────────────────────────────┘
```

**With Left Sidebar Open (Returning Users):**
```
┌───────┬─────────────────────────┐
│ Out-  │     Top Toolbar         │
│ line  ├─────────────────────────┤
│       │                         │
│ Wid-  │      Editor             │
│ gets  │                         │
│       │                         │
└───────┴─────────────────────────┘
```

### Files to Modify

- `components/editor/editor-workspace.tsx`
  - Update default state initialization
  - Add localStorage persistence
  - Add smooth transitions

- `lib/editor/workspace-state.ts` (create new)
  ```tsx
  export function getWorkspacePreferences() {
    return {
      showBinder: localStorage.getItem('ottowrite:workspace:showBinder') === 'true',
      showOutline: localStorage.getItem('ottowrite:workspace:showOutline') === 'true',
      showUtilitySidebar: localStorage.getItem('ottowrite:workspace:showUtilitySidebar') === 'true',
    }
  }

  export function setWorkspacePreference(key: string, value: boolean) {
    localStorage.setItem(`ottowrite:workspace:${key}`, String(value))
  }
  ```

### Testing

- [ ] New document: All sidebars collapsed
- [ ] Toggle sidebar: State persists on page reload
- [ ] Multiple documents: Each can have different layout
- [ ] Mobile: All sidebars collapsed by default
- [ ] Smooth transitions (200-300ms) when toggling
- [ ] No layout shift/flicker on initial load
- [ ] Works with browser back/forward buttons

### Migration Strategy

**Existing Users:**
- Don't break existing workflows
- Read current state, save to localStorage on first visit
- Show one-time tooltip: "New focused layout! Toggle sidebars anytime"

---

## TICKET UX-WORKSPACE-002: Introduce Progressive Disclosure for Outline Widgets

**Priority:** P0 (Critical - Launch Blocker)
**Effort:** 5 story points (2-3 days)
**Component:** `components/editor/editor-workspace.tsx`
**Status:** 🔴 NOT STARTED

### Problem

Left sidebar shows all widgets simultaneously (Chapter list, Reading Time, Character Index, etc.), creating visual clutter and competing for attention. Users can't focus on one aspect of their manuscript.

**Current Issues:**
- All widgets stacked vertically
- Takes too much scrolling
- No clear hierarchy or priority
- Information overload

### Solution: Tabs/Accordion Pattern

Use **tabs** for primary navigation between widget types, with **accordion sections** within each tab for further organization.

### Acceptance Criteria

- ✅ Sidebar uses **tabbed interface** for main widget categories
- ✅ Default tab: **Chapters** (most frequently used)
- ✅ Other tabs: **Characters**, **Timeline**, **Analysis**, **Settings**
- ✅ Only one tab visible at a time
- ✅ Tabs are **keyboard accessible** (arrow keys, Enter)
- ✅ Mobile: Tabs collapse to dropdown menu
- ✅ Tab state persists in localStorage
- ✅ Clear icons and labels for each tab
- ✅ Smooth transitions between tabs

### Tab Structure

```
┌─────────────────────┐
│ [Chapters] Chars Timeline Analysis │ ← Tabs
├─────────────────────┤
│ Chapter 1           │
│ Chapter 2           │
│   └─ Scene 2.1      │
│   └─ Scene 2.2      │
│ Chapter 3           │
│                     │
│ ───────────────     │
│ Reading Time: 45min │
│ Word Count: 12,345  │
└─────────────────────┘
```

### Tab Definitions

**Tab 1: Chapters (Default)**
- Chapter list with nesting
- Scene breakdown
- Reading time estimate
- Word count per chapter
- Quick navigation

**Tab 2: Characters**
- Character index
- Quick character search
- Character relationships
- Appearance tracking

**Tab 3: Timeline**
- Story timeline
- Event markers
- Plot threads

**Tab 4: Analysis**
- Readability metrics
- Pacing analysis
- Dialogue balance
- POV tracking

**Tab 5: Settings**
- Document metadata
- Export options
- Collaboration settings

### Implementation

```tsx
type OutlineTab = 'chapters' | 'characters' | 'timeline' | 'analysis' | 'settings'

const [activeOutlineTab, setActiveOutlineTab] = useState<OutlineTab>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ottowrite:workspace:activeOutlineTab')
    return (saved as OutlineTab) || 'chapters'
  }
  return 'chapters'
})

// Persist tab selection
useEffect(() => {
  localStorage.setItem('ottowrite:workspace:activeOutlineTab', activeOutlineTab)
}, [activeOutlineTab])

// Tab navigation
<Tabs value={activeOutlineTab} onValueChange={(v) => setActiveOutlineTab(v as OutlineTab)}>
  <TabsList className="w-full grid grid-cols-5 gap-1">
    <TabsTrigger value="chapters">
      <BookOpen className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only sm:ml-2">Chapters</span>
    </TabsTrigger>
    <TabsTrigger value="characters">
      <Users className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only sm:ml-2">Characters</span>
    </TabsTrigger>
    {/* ... other tabs ... */}
  </TabsList>

  <TabsContent value="chapters">
    <ChapterListWidget />
  </TabsContent>

  <TabsContent value="characters">
    <CharacterIndexWidget />
  </TabsContent>

  {/* ... other tab contents ... */}
</Tabs>
```

### Keyboard Shortcuts

- `Cmd/Ctrl + 1-5`: Switch between tabs
- `Arrow Keys`: Navigate within TabsList
- `Enter/Space`: Activate selected tab
- `Escape`: Close sidebar

### Mobile Behavior

On mobile (< 768px):
- Tabs become dropdown select menu
- Sidebar opens as drawer from bottom
- Swipe to dismiss

### Files to Modify

- `components/editor/editor-workspace.tsx`
  - Add Tabs component from shadcn/ui
  - Reorganize widgets into tabs
  - Add keyboard navigation

- `components/editor/outline-tabs/` (create new)
  - `chapters-tab.tsx`
  - `characters-tab.tsx`
  - `timeline-tab.tsx`
  - `analysis-tab.tsx`
  - `settings-tab.tsx`

### Testing

- [ ] Only one tab visible at a time
- [ ] Default tab: Chapters
- [ ] Tab state persists on reload
- [ ] Keyboard navigation works (arrow keys, Enter)
- [ ] Mobile: Tabs become dropdown
- [ ] Smooth transitions (no flicker)
- [ ] Screen reader announces tab changes
- [ ] Icons visible, labels hide on mobile

---

## TICKET UX-WORKSPACE-003: Redesign Top Toolbar into Structured Sections

**Priority:** P0 (Critical - Launch Blocker)
**Effort:** 5 story points (2-3 days)
**Component:** `components/editor/editor-header.tsx`
**Status:** 🔴 NOT STARTED

### Problem

Top toolbar is cluttered with too many buttons, toggles, and controls all competing for attention. No clear visual hierarchy or grouping.

**Current Issues:**
- Navigation (back, breadcrumbs) mixed with actions
- Document title mixed with status indicators
- Primary actions mixed with toggles
- Metadata form toggle in main toolbar
- No clear "danger zone" for destructive actions

### Solution: Structured Sections

Divide toolbar into **3 clear zones**:
1. **Left:** Navigation (back, breadcrumbs)
2. **Center:** Document identity (title, status, last saved)
3. **Right:** Actions (save, undo/redo, share, settings menu)

### Acceptance Criteria

- ✅ Toolbar divided into 3 visual sections
- ✅ Navigation section: Back button, breadcrumbs
- ✅ Center section: Document title (editable), status badge, last saved
- ✅ Actions section: Save, Undo, Redo, Share, More (⋮)
- ✅ Metadata form opens in **modal/sheet**, not inline
- ✅ Secondary actions in **dropdown menu** (More button)
- ✅ Focus mode toggle clearly separated
- ✅ Lighthouse a11y score unchanged or higher
- ✅ Mobile: Condensed version with hamburger menu

### Layout Design

**Desktop:**
```
┌─────────────────────────────────────────────────────────┐
│ ← Projects / Novel  │  My Manuscript ●  │ Save Undo ⋮  │
│                     │  Last saved 2m ago│              │
└─────────────────────────────────────────────────────────┘
    Navigation              Document            Actions
```

**Mobile:**
```
┌────────────────────────────────┐
│ ← My Manuscript ●     ☰  Save │
└────────────────────────────────┘
```

### Section Breakdown

**Left Section: Navigation**
- Back button (← icon)
- Breadcrumbs (Projects › Category › Document)
- Tooltips on hover
- Max 3 breadcrumb levels

**Center Section: Document Identity**
- **Document title** (inline editable)
- **Status indicator** (● saved, ○ unsaved, ⟳ syncing)
- **Last saved timestamp** ("2 minutes ago")
- Auto-save indicator

**Right Section: Actions**
- **Save button** (primary, visible only if unsaved)
- **Undo** button (with count badge if > 1)
- **Redo** button (with count badge if > 1)
- **Share** button (secondary)
- **More menu** (⋮) with secondary actions:
  - Focus Mode toggle
  - Layout options
  - Document metadata
  - Export options
  - Print
  - Document settings
  - Collaboration settings

### Secondary Actions Menu

Move these to dropdown:
- Show/Hide Binder
- Show/Hide Outline
- Show/Hide AI Assistant
- Show/Hide Ruler
- Layout Mode (Page, Wide, Typewriter)
- Font Scale
- Theme (Serif, Sans)
- Document Metadata Form
- Export as PDF/DOCX
- Print
- Version History
- Document Settings

### Metadata Form Modal

Instead of expanding inline, open in a modal/sheet:

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="sm">
      <Settings className="h-4 w-4" />
      Document Settings
    </Button>
  </SheetTrigger>

  <SheetContent>
    <SheetHeader>
      <SheetTitle>Document Metadata</SheetTitle>
    </SheetHeader>

    <MetadataForm documentId={documentId} />
  </SheetContent>
</Sheet>
```

### Implementation

```tsx
// components/editor/editor-header.tsx

export function EditorHeader({ document, onSave, canUndo, canRedo, onUndo, onRedo }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>

        <Breadcrumbs
          items={[
            { label: 'Projects', href: '/projects' },
            { label: document.project?.name, href: `/projects/${document.project_id}` },
            { label: document.title, href: null },
          ]}
        />
      </div>

      {/* Center: Document Identity */}
      <div className="flex items-center gap-3 px-4">
        <DocumentTitleEditor
          title={document.title}
          onSave={handleTitleUpdate}
        />

        <StatusIndicator status={saveStatus} />

        <span className="text-xs text-muted-foreground">
          {lastSavedText}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        {isDirty && (
          <Button onClick={onSave} size="sm">
            Save
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo className="h-4 w-4" />
          <span className="sr-only">Undo</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo className="h-4 w-4" />
          <span className="sr-only">Redo</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => toggleFocusMode()}>
              Focus Mode
            </DropdownMenuItem>
            {/* ... other view options ... */}

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Document</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openMetadataModal()}>
              Document Settings
            </DropdownMenuItem>
            {/* ... other document options ... */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

### Files to Modify

- `components/editor/editor-header.tsx` (major refactor)
- `components/editor/document-title-editor.tsx` (create new)
- `components/editor/status-indicator.tsx` (create new)
- `components/editor/breadcrumbs.tsx` (create new)
- `components/editor/metadata-modal.tsx` (create new)

### Testing

- [ ] 3 sections clearly visible and separated
- [ ] Navigation breadcrumbs work correctly
- [ ] Title editor saves on blur/Enter
- [ ] Status indicator reflects save state accurately
- [ ] Save button only visible when dirty
- [ ] Undo/Redo buttons enable/disable correctly
- [ ] More menu contains all secondary actions
- [ ] Metadata opens in modal, not inline
- [ ] Mobile: Condensed to essentials
- [ ] Lighthouse a11y score ≥ previous score
- [ ] Keyboard shortcuts still work

---

## TICKET UX-WORKSPACE-004: Make AI/Analytics Rail Optional and Unobtrusive

**Priority:** P1 (High)
**Effort:** 3 story points (1-2 days)
**Component:** `components/editor/editor-workspace.tsx`
**Status:** 🔴 NOT STARTED

### Problem

AI assistant rail takes up significant horizontal space even when not in use. When hidden, the column still exists, and resize handles remain visible.

**Current Issues:**
- AI rail always reserves space
- Hiding it doesn't fully reclaim space
- No obvious way to reopen after closing
- Resize handles visible when panel closed

### Solution

Tie `showUtilitySidebar` state to actual space usage. When hidden, fully collapse the column and show a floating pill button to reopen.

### Acceptance Criteria

- ✅ Hiding AI rail fully reclaims horizontal space
- ✅ No resize handles when panel is closed
- ✅ Floating "Open AI Assistant" pill button appears when hidden
- ✅ Pill button positioned in bottom-right corner
- ✅ Clicking pill smoothly opens rail
- ✅ No layout jump on desktop/mobile
- ✅ Smooth 300ms transition when opening/closing
- ✅ State persists in localStorage

### Layout Behavior

**AI Rail Open:**
```
┌────────┬──────────────────┬──────────┐
│Outline │     Editor       │    AI    │
│        │                  │  Panel   │
└────────┴──────────────────┴──────────┘
```

**AI Rail Closed:**
```
┌────────┬──────────────────────────┐
│Outline │        Editor            │
│        │                          │ [Open AI] ← Floating pill
└────────┴──────────────────────────┘
```

### Floating Pill Design

```tsx
{!showUtilitySidebar && (
  <button
    onClick={() => setShowUtilitySidebar(true)}
    className={cn(
      'fixed bottom-6 right-6 z-50',
      'flex items-center gap-2 px-4 py-2',
      'bg-primary text-primary-foreground',
      'rounded-full shadow-lg',
      'hover:shadow-xl hover:scale-105',
      'transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
    )}
  >
    <Sparkles className="h-4 w-4" />
    <span className="text-sm font-medium">Open AI Assistant</span>
  </button>
)}
```

### Implementation

```tsx
// Conditional rendering - only render when visible
{showUtilitySidebar && (
  <ResizablePanel
    defaultSize={25}
    minSize={20}
    maxSize={40}
    className="transition-all duration-300"
  >
    <AIAssistantPanel />
  </ResizablePanel>
)}

// No ResizableHandle when panel is hidden
{showUtilitySidebar && (
  <ResizableHandle withHandle />
)}
```

### Mobile Behavior

On mobile:
- AI assistant opens as bottom sheet
- Floating pill positioned bottom-center
- Swipe down to dismiss

### Files to Modify

- `components/editor/editor-workspace.tsx`
  - Conditional rendering for AI rail
  - Add floating pill button
  - Remove resize handle when closed

- `components/editor/ai-assistant-pill.tsx` (create new)
  - Reusable floating button component

### Testing

- [ ] Closing AI rail fully removes it from layout
- [ ] Editor expands to fill space
- [ ] Floating pill appears in bottom-right
- [ ] Clicking pill opens AI rail smoothly
- [ ] No layout jump or flicker
- [ ] Resize handle only visible when panel open
- [ ] State persists on reload
- [ ] Mobile: Opens as bottom sheet
- [ ] Keyboard accessible (Focus, Enter to open)

---

## TICKET UX-WORKSPACE-005: Eliminate Dashboard Tiles Above the Editor

**Priority:** P1 (High)
**Effort:** 4 story points (2 days)
**Component:** `components/editor/editor-workspace.tsx`
**Status:** 🔴 NOT STARTED

### Problem

Editor workspace shows dashboard-style tiles ("Writing Cockpit", progress cards, etc.) above the editor, forcing users to scroll to reach the writing surface. This is a major UX issue.

**Current Issues:**
- Editor not immediately visible on page load
- Valuable vertical space wasted on metrics
- Users have to scroll to start writing
- Breaks focus and professional appearance

### User Feedback

> "Why do I have to scroll down to write? Just show me the editor!"

### Solution

Move all non-essential information to:
1. **Collapsible status bar** at the bottom
2. **Summary drawer** accessible via button
3. **Sidebar widgets** (already covered in UX-WORKSPACE-002)

### Acceptance Criteria

- ✅ Editor viewport is at the top of the page (no scrolling required)
- ✅ Word count/stats moved to **bottom status bar**
- ✅ Dashboard cards moved to **collapsible drawer**
- ✅ Drawer opens on click, shows full analytics
- ✅ Status bar shows: Word count, Character count, Reading time
- ✅ Status bar is **sticky** at bottom
- ✅ All data still accessible, just reorganized
- ✅ Regression tests confirm no data loss

### Layout Changes

**Before (Current):**
```
┌─────────────────────────────┐
│       Top Toolbar           │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │ ← Dashboard tiles
│ │ Writing Cockpit         │ │
│ │ Word count: 5,234       │ │
│ │ Progress: 45%           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│                             │
│        Editor               │ ← User has to scroll here!
│                             │
└─────────────────────────────┘
```

**After (Improved):**
```
┌─────────────────────────────┐
│       Top Toolbar           │
├─────────────────────────────┤
│                             │
│        Editor               │ ← Immediately visible!
│                             │
├─────────────────────────────┤
│ Words: 5,234 | 45min | ▲ Analytics │ ← Status bar
└─────────────────────────────┘
```

### Status Bar Design

```tsx
<footer className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur">
  <div className="flex h-8 items-center justify-between px-4 text-xs text-muted-foreground">
    {/* Left: Quick stats */}
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-1">
        <FileText className="h-3 w-3" />
        {wordCount.toLocaleString()} words
      </span>

      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {readingTime} min read
      </span>

      <span className="flex items-center gap-1">
        <Target className="h-3 w-3" />
        {Math.round((wordCount / goalWords) * 100)}% of goal
      </span>
    </div>

    {/* Right: Analytics drawer trigger */}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowAnalyticsDrawer(true)}
      className="h-6 text-xs"
    >
      <ChartBar className="h-3 w-3 mr-1" />
      View Analytics
    </Button>
  </div>
</footer>
```

### Analytics Drawer

```tsx
<Sheet open={showAnalyticsDrawer} onOpenChange={setShowAnalyticsDrawer}>
  <SheetContent side="bottom" className="h-[50vh]">
    <SheetHeader>
      <SheetTitle>Writing Analytics</SheetTitle>
      <SheetDescription>
        Track your progress and writing metrics
      </SheetDescription>
    </SheetHeader>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Word Count</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{wordCount.toLocaleString()}</p>
          <Progress value={(wordCount / goalWords) * 100} className="mt-2" />
        </CardContent>
      </Card>

      {/* Additional analytics cards */}
    </div>
  </SheetContent>
</Sheet>
```

### What to Move

**To Status Bar:**
- Word count (live)
- Character count
- Reading time estimate
- Goal progress percentage

**To Analytics Drawer:**
- Writing cockpit dashboard
- Session statistics
- Writing streaks
- Progress charts
- Time tracking
- Productivity metrics

**Keep in Main View:**
- Only the editor
- Top toolbar
- Sidebars (when toggled)

### Files to Modify

- `components/editor/editor-workspace.tsx`
  - Remove dashboard tiles section
  - Add status bar component
  - Add analytics drawer

- `components/editor/status-bar.tsx` (create new)
  - Bottom sticky bar with quick stats

- `components/editor/analytics-drawer.tsx` (create new)
  - Sheet component with full analytics

- `components/dashboard/writing-cockpit.tsx` (move/refactor)
  - Reuse inside analytics drawer

### Testing

- [ ] Editor immediately visible on page load (no scroll)
- [ ] Status bar sticky at bottom
- [ ] Status bar shows live word count
- [ ] Analytics button opens drawer
- [ ] Drawer shows all previous dashboard data
- [ ] Drawer can be dismissed (click outside, Escape, swipe)
- [ ] Mobile: Status bar collapses to essentials
- [ ] No regression in data accuracy
- [ ] Performance: Status bar updates don't lag typing

---

## TICKET UX-WORKSPACE-006: Visual Refresh + Styling Polish

**Priority:** P2 (Medium)
**Effort:** 5 story points (2-3 days)
**Component:** Multiple
**Status:** 🔴 NOT STARTED

### Problem

Workspace has visual inconsistencies:
- Inconsistent typography spacing
- Overuse of gradients and transparency
- Elements not aligned to grid
- Button variants inconsistent
- Colors don't follow design system

### Acceptance Criteria

- ✅ Consistent typography spacing (8px base grid)
- ✅ Remove gradients in favor of neutral surfaces
- ✅ Align all panels to 8px grid system
- ✅ Harmonize button variants (max 3 variants)
- ✅ Use design tokens consistently
- ✅ Updated design reviewed by design team
- ✅ Storybook snapshots updated
- ✅ No visual regressions (Percy/Chromatic)

### Design System Audit

**Typography Scale:**
- Headings: 2xl, xl, lg, base
- Body: base, sm
- Labels: sm, xs
- Spacing: 0, 1, 2, 4, 6, 8, 12, 16, 24, 32

**Color Palette:**
- Background: `bg-background` (solid white/dark)
- Surface: `bg-card` (cards, panels)
- Border: `border-border` (neutral gray)
- Muted: `bg-muted` (subtle backgrounds)
- Primary: For CTAs only
- Destructive: For delete/danger actions

**Remove:**
- All `bg-*/opacity` patterns (use solid colors)
- All `backdrop-blur` effects
- Custom gradient backgrounds
- Arbitrary color values

**Button Variants (Max 3):**
1. `default` - Primary actions (Save, Submit)
2. `ghost` - Secondary/toolbar buttons
3. `destructive` - Danger actions (Delete)

**Grid Alignment:**
- All spacing: Multiples of 8px
- Padding: 8px, 16px, 24px
- Gaps: 8px, 16px, 24px
- Border radius: 0px, 4px, 8px

### Specific Changes

**Remove Gradients:**
```tsx
// Before
className="bg-gradient-to-br from-primary/5 via-background to-muted/30"

// After
className="bg-muted"
```

**Remove Transparency:**
```tsx
// Before
className="bg-background/95 backdrop-blur"

// After
className="bg-background"
```

**Standardize Spacing:**
```tsx
// Before
className="px-3 py-2.5 gap-1.5"

// After
className="px-4 py-2 gap-2" // All multiples of 8px (4px is 0.5 rem)
```

**Harmonize Buttons:**
```tsx
// Toolbar buttons: ghost variant
<Button variant="ghost" size="sm" />

// Primary actions: default variant
<Button variant="default" size="sm" />

// Danger actions: destructive variant
<Button variant="destructive" size="sm" />
```

### Files to Modify

- `components/editor/editor-workspace.tsx`
- `components/editor/tiptap-editor.tsx`
- `components/editor/editor-header.tsx`
- `components/ui/button.tsx` (audit variants)
- `components/ui/card.tsx` (remove gradients)
- `tailwind.config.ts` (verify design tokens)

### Design Review Checklist

- [ ] Mockups approved by design team
- [ ] Typography scale follows 8px grid
- [ ] No gradients (solid colors only)
- [ ] No transparency (except modals/overlays)
- [ ] Button variants: 3 max
- [ ] Border radius: 0, 4px, or 8px only
- [ ] Spacing: All multiples of 8px
- [ ] Colors from design tokens only

### Storybook Updates

Create/update stories for:
- `EditorWorkspace.stories.tsx`
- `EditorHeader.stories.tsx`
- `StatusBar.stories.tsx`
- `OutlineTabs.stories.tsx`

### Visual Regression Testing

- [ ] Percy snapshots updated
- [ ] Chromatic baseline updated
- [ ] No unintended visual changes
- [ ] Dark mode variants tested

### Testing

- [ ] All spacing is consistent (8px grid)
- [ ] No gradients in UI
- [ ] No transparency (except necessary overlays)
- [ ] Button variants follow design system
- [ ] Typography is readable and consistent
- [ ] Design team approval
- [ ] Storybook snapshots pass
- [ ] Percy/Chromatic tests pass

---

## Implementation Order & Dependencies

### Phase 1: Foundation (Week 1)
**Dependencies:** None
**Effort:** 8 points

1. **UX-WORKSPACE-001** (Default layout) - 3 points
   - Must complete first (affects all other tickets)
   - Establishes baseline workspace behavior

2. **UX-WORKSPACE-005** (Remove dashboard tiles) - 4 points
   - Unblocks vertical space
   - Creates clean canvas for other improvements

### Phase 2: Navigation & Organization (Week 2)
**Dependencies:** Phase 1
**Effort:** 10 points

3. **UX-WORKSPACE-002** (Outline tabs) - 5 points
   - Depends on UX-WORKSPACE-001 (sidebar state)

4. **UX-WORKSPACE-003** (Top toolbar redesign) - 5 points
   - Can run parallel to UX-WORKSPACE-002

### Phase 3: Polish & Refinement (Week 3)
**Dependencies:** Phase 2
**Effort:** 8 points

5. **UX-WORKSPACE-004** (AI rail) - 3 points
   - Depends on UX-WORKSPACE-001 (sidebar state)

6. **UX-WORKSPACE-006** (Visual refresh) - 5 points
   - Should be last (applies to all previous work)
   - Ensures consistent design language

---

## Total Effort Summary

| Phase | Story Points | Days | Priority |
|-------|--------------|------|----------|
| Phase 1 | 8 | 3-4 | P0/P1 |
| Phase 2 | 10 | 4-5 | P0 |
| Phase 3 | 8 | 3-4 | P1/P2 |
| **TOTAL** | **26** | **10-13** | Mixed |

---

## Success Metrics

### Quantitative
- **Time to first edit:** < 1s (editor immediately visible)
- **Vertical scroll reduction:** 0px (editor at top)
- **Sidebar toggle performance:** < 300ms transition
- **localStorage hit rate:** > 95% (preferences persist)
- **Lighthouse performance:** No regression

### Qualitative
- **User feedback:** "I can focus on writing now"
- **A/B testing:** Increased writing session length
- **Support tickets:** Reduced "where is the editor?" questions
- **Competitive analysis:** Matches Scrivener/Ulysses simplicity

### User Testing Goals
- [ ] 9/10 new users start writing within 5 seconds
- [ ] 8/10 users discover sidebar toggles within first session
- [ ] 7/10 users prefer new layout over old (A/B test)
- [ ] < 2% users request "bring back dashboard tiles"

---

## Related Tickets

### Complementary Work
- **EDITOR_UX_TICKETS.md:** Editor component styling (toolbar, typography, layout modes)
- **WORKSPACE_UX_TICKETS.md:** Workspace layout (this document)

### Integration Points
- Both ticket sets must work together
- Coordinate on:
  - Color scheme
  - Spacing/grid
  - Typography
  - Transitions
  - Dark mode

---

## Notes for Developers

### Key Principles
1. **Focus First:** Editor should be the hero element
2. **Progressive Disclosure:** Show complexity only when needed
3. **Persistence:** Remember user preferences
4. **Performance:** Smooth transitions, no janky animations
5. **Accessibility:** Keyboard navigation, screen readers
6. **Mobile:** Touch-friendly, responsive

### Technical Considerations
- Use `localStorage` for preferences (not cookies)
- Debounce expensive updates (word count, etc.)
- Use CSS transitions for smooth animations
- Test on Safari, Chrome, Firefox, Edge
- Verify dark mode works
- Ensure SSR doesn't break initial state

### Pitfall Avoidance
- Don't over-engineer state management
- Avoid too many nested components
- Keep bundle size in check (code splitting)
- Test with large documents (10k+ words)
- Verify mobile performance

---

**Created by:** Claude (AI Assistant)
**Last Updated:** 2025-10-24
**Status:** Ready for review and implementation
**Next Step:** Design team review → Development → QA → Ship
