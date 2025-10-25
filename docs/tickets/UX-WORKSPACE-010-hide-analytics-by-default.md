# UX-WORKSPACE-010: Hide Analytics by Default, Add On-Demand Access

**Priority**: MEDIUM
**Effort**: Small (2 hours)
**Impact**: Medium - Cleaner interface, less distraction
**Status**: Not Started

---

## Problem Statement

**Current State:**
- Sticky bottom status bar always visible (cursor position, word count, reading time)
- Analytics drawer accessible via status bar button
- Status bar takes permanent vertical space
- Constant visibility creates minor distraction while writing

**Professional Standard:**
- **Google Docs**: No visible analytics by default, word count accessible via Tools menu
- **Microsoft Word**: Status bar can be hidden, word count in footer (optional)
- **Scrivener**: Statistics in Project → Statistics (modal)
- **Final Draft**: Page count in footer, detailed stats in Reports menu

**User Pain:**
"The status bar at the bottom is always there, showing stats I don't need while writing. I'd rather have a clean canvas and check stats when I want to."

---

## Proposed Solution

Remove sticky bottom status bar, add on-demand analytics access:

### Changes

1. **Remove Sticky Status Bar**
   - No persistent bottom bar
   - Reclaim vertical space for writing
   - Cleaner visual hierarchy

2. **Add Analytics Button to Toolbar**
   - Small button in right zone (near Focus Mode)
   - Icon: BarChart or Activity
   - Tooltip: "Analytics (⌘I)"
   - Opens analytics drawer on click

3. **Keep Analytics Drawer**
   - Same Sheet component as before
   - Shows comprehensive analytics when opened
   - Keyboard shortcut: `Cmd+I` (Info)

4. **Add to Command Palette**
   - "View Analytics" command
   - Searchable by "stats", "word count", "analytics"

---

## Implementation Details

### Files to Modify

**1. `components/editor/editor-workspace.tsx`**

Remove sticky status bar section:

```typescript
// REMOVE this entire section
{!focusMode && (
  <div className="sticky bottom-0 z-40 border-t bg-background">
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <StatusBar
        cursorPosition={editorStatus.cursorPosition}
        selectionStats={editorStatus.selectionStats}
        wordCount={wordCount}
        targetWordCount={metadata?.targetWordCount ?? undefined}
        readingTime={Math.max(1, Math.ceil(wordCount / 225))}
        className="flex-1 border-none bg-transparent p-0"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAnalyticsDrawer(true)}
        className="gap-2"
      >
        <Activity className="h-4 w-4" />
        Analytics
      </Button>
    </div>
  </div>
)}
```

Add Analytics button to toolbar instead:

```typescript
{/* Right Zone: Essential Actions */}
<div className="flex items-center justify-end gap-2">
  <LayoutSwitcher onLayoutChange={handleLayoutChange} />

  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Command className="h-4 w-4" />
        <span className="hidden md:inline ml-2">Commands</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>Command Palette (⌘K)</TooltipContent>
  </Tooltip>

  {/* NEW: Analytics Button */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAnalyticsDrawer(true)}
      >
        <Activity className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Analytics (⌘I)</TooltipContent>
  </Tooltip>

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

  <DocumentMenu /* ... */ />
</div>
```

Add keyboard shortcut for analytics:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Analytics: Cmd+I
    if ((e.metaKey || e.ctrlKey) && e.key === 'i' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      setShowAnalyticsDrawer(true)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**2. `components/editor/command-palette.tsx`**

Add analytics command:

```typescript
{
  id: 'view-analytics',
  title: 'View Analytics',
  description: 'Open document statistics and analytics',
  keywords: ['analytics', 'stats', 'statistics', 'word count', 'reading time', 'info'],
  icon: Activity,
  shortcut: 'mod+i',
  onSelect: () => setShowAnalyticsDrawer(true),
}
```

**3. `components/editor/keyboard-shortcuts-dialog.tsx`**

Add analytics shortcut:

```typescript
{
  category: 'View',
  shortcuts: [
    // ... existing shortcuts
    { keys: ['⌘', 'I'], description: 'View analytics' },
  ],
}
```

**4. Update Analytics Drawer**

Enhance analytics drawer content to compensate for removed status bar:

```typescript
<Sheet open={showAnalyticsDrawer} onOpenChange={setShowAnalyticsDrawer}>
  <SheetContent side="bottom" className="h-[80vh]">
    <SheetHeader>
      <SheetTitle>Document Analytics</SheetTitle>
      <SheetDescription>
        Comprehensive statistics and insights for your document
      </SheetDescription>
    </SheetHeader>

    <div className="mt-6 space-y-6 overflow-y-auto">
      {/* Quick Stats Cards - ENHANCED */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Words</CardDescription>
            <CardTitle className="text-3xl">{wordCount.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reading Time</CardDescription>
            <CardTitle className="text-3xl">
              {Math.max(1, Math.ceil(wordCount / 225))} min
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cursor Position</CardDescription>
            <CardTitle className="text-3xl">
              Line {editorStatus.cursorPosition.line}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progress</CardDescription>
            <CardTitle className="text-3xl">
              {wordProgress ? `${wordProgress}%` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Existing Analytics Panels */}
      <InlineAnalyticsPanel initialText={content} wordCount={wordCount} />

      {/* Document Information */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ... existing document info */}
        </CardContent>
      </Card>
    </div>
  </SheetContent>
</Sheet>
```

---

## Visual Comparison

### Before
```
┌─────────────────────────────────────┐
│ Toolbar                             │
├─────────────────────────────────────┤
│                                     │
│ Editor Content                      │
│                                     │
├─────────────────────────────────────┤
│ Status: Line 45 | 1,234 words | ... │ ← Always visible
└─────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────┐
│ Toolbar [Analytics button]          │
├─────────────────────────────────────┤
│                                     │
│ Editor Content                      │
│ (more vertical space)               │
│                                     │
└─────────────────────────────────────┘
```

**Result**: ~40px more vertical space for writing

---

## Success Metrics

### User Experience
- [ ] Analytics accessible when needed (not intrusive)
- [ ] More vertical space for editor content
- [ ] Cleaner visual experience
- [ ] Analytics drawer comprehensive (doesn't lose functionality)
- [ ] Keyboard shortcut discoverable (Cmd+I)

### Visual
- [ ] No persistent bottom bar
- [ ] Cleaner canvas appearance
- [ ] More immersive writing environment
- [ ] Analytics drawer feels polished

### Technical
- [ ] StatusBar component can be removed (or kept for drawer only)
- [ ] Simpler workspace layout
- [ ] No z-index conflicts with sticky bar
- [ ] Analytics drawer performs well

---

## Analytics Drawer Enhancement

Since we're removing the always-visible status bar, the analytics drawer should be more comprehensive:

### Quick Stats (4 cards at top)
1. **Total Words**: Large number, target progress bar
2. **Reading Time**: Calculated from word count
3. **Cursor Position**: Line and column
4. **Characters**: With/without spaces

### Detailed Analytics (existing)
- Readability score
- Dialogue percentage
- Passive voice percentage
- Sentence complexity
- Paragraph stats

### Document Info (existing)
- Document type
- Created date
- Last modified
- Target word count

---

## Testing Checklist

- [ ] Bottom status bar removed
- [ ] Analytics button in toolbar works
- [ ] Keyboard shortcut (Cmd+I) opens drawer
- [ ] Analytics drawer shows all stats from old status bar
- [ ] Command palette has "View Analytics" command
- [ ] More vertical space for editor (verify visually)
- [ ] No layout shift when opening/closing drawer
- [ ] Mobile responsive (drawer works on small screens)
- [ ] Focus mode unaffected
- [ ] No console errors

---

## Edge Cases

- [ ] Empty document (0 words) - analytics still accessible
- [ ] Very long document - analytics calculate correctly
- [ ] Analytics drawer on mobile - still 80vh height
- [ ] Rapid open/close of drawer - no visual glitches
- [ ] Analytics while typing - real-time updates

---

## Migration Notes

### User Communication
- [ ] No migration needed (purely additive/subtractive)
- [ ] Consider in-app announcement: "Analytics moved to toolbar for cleaner workspace"
- [ ] Update keyboard shortcuts help
- [ ] Update any onboarding/tours that mention status bar

### Analytics Tracking
- Track how often users open analytics drawer
- Compare to how often they looked at status bar (if we had analytics)
- Measure if users prefer on-demand analytics

---

## Notes

- This change aligns with Google Docs' philosophy (clean canvas, stats on demand)
- Reduces visual noise during writing
- Makes analytics more intentional (users seek them out)
- Complements focus mode (both aim for distraction-free writing)
- Can be enhanced with analytics caching (don't recalculate on every open)

---

## Future Enhancements

- [ ] Analytics panel pinnable (keep open while writing)
- [ ] Export analytics as PDF report
- [ ] Historical analytics (track progress over time)
- [ ] Goal tracking (daily word count goals)
- [ ] Writing streaks and achievements

---

## Dependencies

- **Requires**: Analytics drawer must be comprehensive enough to replace status bar
- **Enhances**: UX-WORKSPACE-009 (Clean Toolbar) - analytics button fits in new toolbar

---

## Related Tickets

- UX-WORKSPACE-005: Eliminate Dashboard Tiles ✅ (removed analytics above editor)
- UX-WORKSPACE-009: Clean Toolbar (works together)
