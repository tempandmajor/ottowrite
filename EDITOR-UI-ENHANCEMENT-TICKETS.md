# Editor Workspace UI Enhancement Tickets

**Context**: After reviewing the editor workspace (`components/editor/editor-workspace.tsx`), the current implementation has:
- ✅ **Header bar** (line 1545-1712): Contains breadcrumbs, title, word count, save status, and action buttons
- ❌ **No dedicated toolbar**: Formatting controls are embedded in the editor itself (Tiptap bubble menu)
- ❌ **No status bar**: No bottom bar showing cursor position, selection stats, or additional metadata
- ⚠️ **Toolbar overflow**: Too many buttons in header (Share, Outline, AI, History, Export, Metadata, Save, Focus) causing UX issues on smaller screens

**Current State Analysis**:

## What We Have ✅

### Header Bar (Existing - Lines 1545-1712)
- Document title (editable inline)
- Breadcrumb navigation (project link)
- Word count with target progress
- Save status ("All changes saved", "Unsaved changes")
- Autosave status indicator
- Action buttons:
  - Undo/Redo controls
  - Share (disabled/coming soon)
  - Toggle Outline sidebar
  - Toggle AI assistant
  - Version History
  - Export
  - Metadata settings
  - Save button
  - Focus Mode toggle
- Mobile: Collapsed into "Actions" dropdown menu
- Keyboard shortcuts floating button (bottom-right)

### Missing Components ❌

1. **Formatting Toolbar**: No persistent formatting bar (relies on Tiptap bubble menu)
2. **Status Bar**: No bottom bar for cursor position, selection stats, reading time
3. **Menu Bar**: No traditional File/Edit/View/Insert menu system
4. **Quick Actions Bar**: No context-aware quick actions

---

## TICKET-EDITOR-001: Status Bar with Real-time Metrics (P1 - High Value)

**Priority**: P1 (High - Improves writing experience)
**Story Points**: 3
**Status**: Not Started
**Dependencies**: None

### Problem Statement
Writers need real-time feedback while editing:
- Where is my cursor? (paragraph, scene, chapter)
- How much have I selected?
- What's my reading time estimate?
- Am I meeting my session goal?

Professional writing tools (Scrivener, Ulysses, iA Writer) all have status bars showing these metrics.

### Description
Add a persistent status bar at the bottom of the editor showing cursor position, selection stats, reading time, and session progress.

### Acceptance Criteria
- [ ] Status bar fixed to bottom of editor workspace
- [ ] Shows cursor position: "Para 42, Line 15, Col 8"
- [ ] Shows selection stats when text is selected: "124 words selected (2 min read)"
- [ ] Shows current scene/chapter name
- [ ] Shows session word count: "+342 words this session"
- [ ] Reading time estimate for document
- [ ] Reading level (optional): "Grade 8 | Flesch 65"
- [ ] Click status items to jump to sections
- [ ] Configurable visibility (toggle in settings)
- [ ] Responsive: Hides non-essential items on mobile

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         Editor Content                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ 📍 Chapter 3 › Scene 2 › Para 42, Ln 15, Col 8 │ 📖 12 min read  │
│ ✍️ +342 words this session │ 📊 12,458 / 15,000 words (83%)     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Structure

**New File**: `components/editor/status-bar.tsx`

```typescript
interface StatusBarProps {
  cursorPosition?: {
    paragraph: number
    line: number
    column: number
    scene?: string
    chapter?: string
  }
  selection?: {
    words: number
    characters: number
    readingTime: number // minutes
  }
  sessionWordCount: number
  totalWordCount: number
  targetWordCount?: number
  readingTime: number // minutes
  readingLevel?: {
    grade: number
    flesch: number
  }
  onJumpToSection?: (section: string) => void
}
```

### Integration Points

1. **Tiptap Editor Integration**:
   - Hook into Tiptap's `onSelectionUpdate` event
   - Use Tiptap's `editor.state.selection` API
   - Calculate position from ProseMirror document

2. **Screenplay Editor Integration**:
   - Track current scene/act
   - Show screenplay-specific metrics (pages, scenes)

3. **Session Tracking**:
   - Store initial word count on mount
   - Calculate session delta
   - Persist session start in localStorage

### Implementation Notes

```typescript
// components/editor/status-bar.tsx
export function StatusBar({ cursorPosition, selection, ... }: StatusBarProps) {
  return (
    <div className="border-t bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Position info */}
        <div className="flex items-center gap-4">
          {cursorPosition && (
            <button
              onClick={() => onJumpToSection?.(cursorPosition.scene)}
              className="hover:text-foreground transition-colors"
            >
              📍 {cursorPosition.chapter} › {cursorPosition.scene} ›
              Para {cursorPosition.paragraph}, Ln {cursorPosition.line}, Col {cursorPosition.column}
            </button>
          )}
          {selection && (
            <span className="text-primary">
              {selection.words} words selected ({selection.readingTime} min read)
            </span>
          )}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-4">
          <span>✍️ +{sessionWordCount} words this session</span>
          <span>📖 {readingTime} min read</span>
          {targetWordCount && (
            <span>
              📊 {totalWordCount.toLocaleString()} / {targetWordCount.toLocaleString()} words
              ({Math.round((totalWordCount / targetWordCount) * 100)}%)
            </span>
          )}
          {readingLevel && (
            <span>📚 Grade {readingLevel.grade} | Flesch {readingLevel.flesch}</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Testing Checklist
- [ ] Cursor position updates in real-time as user types
- [ ] Selection stats show when text is selected
- [ ] Session word count persists across page reloads (until session ends)
- [ ] Clicking scene/chapter jumps to that section
- [ ] Status bar responsive (hides items on mobile)
- [ ] Works with both prose and screenplay editors
- [ ] No performance impact (debounced updates)

### Success Metrics
- 80%+ of users keep status bar visible
- Avg 5+ interactions per session (clicking to jump)
- 30% increase in target word count achievement

---

## TICKET-EDITOR-002: Formatting Toolbar (P2 - Nice to Have)

**Priority**: P2 (Medium - UX improvement)
**Story Points**: 5
**Status**: Not Started
**Dependencies**: None

### Problem Statement
Currently, text formatting options are only accessible via:
1. Tiptap bubble menu (appears on text selection)
2. Keyboard shortcuts (not discoverable)

New users don't know how to format text. A persistent toolbar shows available options.

### Description
Add a formatting toolbar below the header showing text formatting options (bold, italic, headings, lists, etc.)

### Acceptance Criteria
- [ ] Toolbar positioned below header, above editor canvas
- [ ] Shows formatting buttons: Bold, Italic, Underline, Strikethrough
- [ ] Heading dropdown: H1, H2, H3, Paragraph
- [ ] List buttons: Bullet list, Numbered list, Checklist
- [ ] Alignment: Left, Center, Right, Justify
- [ ] Insert: Link, Image, Horizontal rule, Scene break
- [ ] Active state: Buttons highlight when cursor is in formatted text
- [ ] Keyboard shortcuts shown in tooltips
- [ ] Toggleable visibility (can be hidden)
- [ ] Sticky: Remains visible when scrolling (optional setting)
- [ ] Screenplay mode: Shows screenplay formatting (Scene Heading, Action, Character, Dialogue)

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│ Header (title, word count, actions)                             │
├─────────────────────────────────────────────────────────────────┤
│ [B] [I] [U] [S] │ [H▾] │ [•] [1.] [☑] │ [≡] [≣] [≢] [≡] │ [🔗]  │
│ Bold Italic...  │ H1-3  │ Lists        │ Align           │ Link  │
└─────────────────────────────────────────────────────────────────┘
│                         Editor Content                           │
```

### Component Structure

**New File**: `components/editor/formatting-toolbar.tsx`

```typescript
interface FormattingToolbarProps {
  editor: Editor | null // Tiptap editor instance
  documentType: 'novel' | 'screenplay' | 'play' | 'short_story'
  visible: boolean
  onToggleVisibility: () => void
}

export function FormattingToolbar({ editor, documentType, ... }: FormattingToolbarProps) {
  if (!visible || !editor) return null

  const isScreenplay = documentType === 'screenplay' || documentType === 'play'

  return (
    <div className="border-b bg-background px-4 py-2 sticky top-14 z-30">
      {isScreenplay ? (
        <ScreenplayFormattingToolbar editor={editor} />
      ) : (
        <ProseFormattingToolbar editor={editor} />
      )}
    </div>
  )
}
```

### Screenplay Formatting Toolbar

For screenplays, show screenplay-specific elements:

```
[Scene Heading] [Action] [Character] [Dialogue] [Parenthetical] [Transition]
```

### Testing Checklist
- [ ] All formatting buttons work correctly
- [ ] Active states reflect current cursor position
- [ ] Keyboard shortcuts work in parallel
- [ ] Toolbar hides in focus mode
- [ ] Screenplay mode shows screenplay buttons
- [ ] Tooltips show keyboard shortcuts
- [ ] No performance lag when typing

### Future Enhancements
- Color picker for text/highlight colors
- Font family selector
- Font size selector
- Custom styles dropdown
- Markdown shortcuts toggle

---

## TICKET-EDITOR-003: Menu Bar (Traditional File/Edit/View) (P3 - Low Priority)

**Priority**: P3 (Low - Nice to have for power users)
**Story Points**: 8
**Status**: Backlog
**Dependencies**: None

### Problem Statement
Traditional desktop writing apps (Scrivener, Word, Google Docs) have menu bars. Some users expect this pattern and feel lost without it.

However, web apps are moving away from menu bars in favor of:
- Command palette (Ctrl+K) - Already implemented ✅
- Context menus (right-click)
- Toolbar buttons

### Description
Add an optional traditional menu bar with File, Edit, View, Insert, Format, Tools menus.

### Acceptance Criteria
- [ ] Menu bar shows File, Edit, View, Insert, Format, Tools
- [ ] **File**: New, Open, Save, Save As, Export, Version History, Close
- [ ] **Edit**: Undo, Redo, Cut, Copy, Paste, Find, Replace, Select All
- [ ] **View**: Toggle Outline, Toggle AI, Toggle Analytics, Focus Mode, Full Screen
- [ ] **Insert**: Scene, Chapter, Character, Location, Image, Link
- [ ] **Format**: Bold, Italic, Heading, List, Alignment
- [ ] **Tools**: Word Count, Readability, Spell Check, AI Assistant, Metadata
- [ ] Keyboard shortcuts shown next to menu items
- [ ] Submenus for nested options
- [ ] Toggleable via settings (default: hidden)
- [ ] Accessible via keyboard (Alt key)

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│ File  Edit  View  Insert  Format  Tools  Help                   │
├─────────────────────────────────────────────────────────────────┤
│ Document Title │ Word Count │ Actions...                        │
└─────────────────────────────────────────────────────────────────┘
```

When "File" is clicked:
```
File ▾
├── New Document         Ctrl+N
├── Open Recent         ▸
├── Save                Ctrl+S
├── Save As...          Ctrl+Shift+S
├── ──────────────────
├── Export...           Ctrl+E
├── Version History     Ctrl+Shift+H
├── ──────────────────
├── Close Document      Ctrl+W
```

### Implementation Considerations

**Pros**:
- Familiar to desktop app users
- Discoverability of all features
- Professional appearance
- Accessibility (keyboard navigation)

**Cons**:
- Takes up vertical space
- Redundant with command palette
- Not mobile-friendly
- More to maintain

**Recommendation**: Implement as **optional feature** (disabled by default).
- Add toggle in Settings: "Show menu bar"
- Target audience: Power users, desktop users, accessibility users

### Testing Checklist
- [ ] All menu items trigger correct actions
- [ ] Keyboard shortcuts work from menu
- [ ] Alt key activates menu focus
- [ ] Submenus expand correctly
- [ ] Menu closes when clicking outside
- [ ] Disabled items shown correctly
- [ ] Works with screen readers

---

## TICKET-EDITOR-004: Header Toolbar Reorganization (P1 - Critical UX Issue)

**Priority**: P1 (High - Current header is overcrowded)
**Story Points**: 3
**Status**: Not Started
**Dependencies**: None

### Problem Statement
The current header has **10+ buttons** (Undo, Redo, Share, Outline, AI, History, Export, Metadata, Save, Focus) causing:
- Visual clutter
- Poor mobile UX (requires scrolling or dropdown)
- Difficult to find specific actions
- No clear hierarchy of importance

### Description
Reorganize header toolbar into primary and secondary action groups, reducing visual noise and improving scannability.

### Acceptance Criteria
- [ ] **Primary actions** (always visible): Save, Focus Mode, Command Palette
- [ ] **Secondary actions** (dropdown menu): History, Export, Metadata, Share
- [ ] **Panel toggles** (icon buttons): Outline, AI, Analytics
- [ ] Undo/Redo remain as icon buttons (high frequency)
- [ ] Group actions logically with visual separators
- [ ] Mobile: All actions accessible via dropdown
- [ ] Tooltips for all icon buttons
- [ ] Keyboard shortcuts remain functional

### Proposed Layout

**Desktop**:
```
┌──────────────────────────────────────────────────────────────────┐
│ [< Back] [Breadcrumbs] │ Document Title │ [🔍][↩][↪] [▨][🤖][📊]  │
│                         │ Word count, save status              │
│                         │                  [⋯] [Save] [Focus]  │
└──────────────────────────────────────────────────────────────────┘
```

**Legend**:
- `[🔍]` = Command Palette (Ctrl+K)
- `[↩][↪]` = Undo/Redo
- `[▨]` = Toggle Outline
- `[🤖]` = Toggle AI
- `[📊]` = Toggle Analytics
- `[⋯]` = More menu (History, Export, Metadata, Share)
- `[Save]` = Primary save button
- `[Focus]` = Focus Mode

**More Menu (⋯)**:
```
More ▾
├── 📜 Version History    Ctrl+Shift+H
├── 📥 Export...          Ctrl+E
├── ⚙️ Metadata
├── 👥 Share (coming soon)
```

### Implementation

```typescript
// Before: 10 separate buttons
<Button>Undo</Button>
<Button>Redo</Button>
<Button>Share</Button>
<Button>Outline</Button>
<Button>AI</Button>
<Button>History</Button>
<Button>Export</Button>
<DocumentMetadataForm />
<Button>Save</Button>
<Button>Focus</Button>

// After: Grouped with priority
<div className="flex items-center gap-2">
  {/* High-frequency actions */}
  <CommandPaletteButton />
  <UndoRedoControls />

  <Separator orientation="vertical" />

  {/* Panel toggles */}
  <IconButton icon={PanelLeft} onClick={toggleOutline} />
  <IconButton icon={Sparkles} onClick={toggleAI} />
  <IconButton icon={BarChart} onClick={toggleAnalytics} />

  <Separator orientation="vertical" />

  {/* Primary actions */}
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" size="sm">
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={openHistory}>
        <History /> Version History
      </DropdownMenuItem>
      <DropdownMenuItem onClick={openExport}>
        <FileDown /> Export
      </DropdownMenuItem>
      <DropdownMenuItem onClick={openMetadata}>
        <Settings /> Metadata
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled>
        <UserPlus /> Share (coming soon)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <Button onClick={save}>Save</Button>
  <Button variant={focusMode ? 'default' : 'outline'} onClick={toggleFocus}>
    {focusMode ? 'Exit Focus' : 'Focus'}
  </Button>
</div>
```

### Testing Checklist
- [ ] All actions remain accessible
- [ ] Keyboard shortcuts still work
- [ ] Visual hierarchy is clear
- [ ] Mobile dropdown includes all actions
- [ ] No regressions in functionality
- [ ] A/B test shows improved user satisfaction

### Success Metrics
- 30% faster action discovery (time to click)
- 50% reduction in mobile dropdown usage (better desktop layout)
- Positive user feedback on cleanliness

---

## TICKET-EDITOR-005: Writing Goals Widget (P2 - Motivational Feature)

**Priority**: P2 (Medium - Engagement driver)
**Story Points**: 5
**Status**: Not Started
**Dependencies**: TICKET-EDITOR-001 (Status Bar)

### Problem Statement
Writers struggle with motivation and procrastination. Real-time progress visualization helps maintain momentum.

### Description
Add a writing goals widget showing daily/session targets with progress bars and celebratory animations.

### Acceptance Criteria
- [ ] Widget positioned in status bar or as floating overlay
- [ ] Shows daily word count goal: "342 / 1,000 words today (34%)"
- [ ] Shows session goal: "156 / 500 words this session (31%)"
- [ ] Progress bars with gradient fill
- [ ] Celebration animation when goal reached (confetti, checkmark)
- [ ] Configurable goals in metadata or settings
- [ ] Daily streak counter: "🔥 7 day streak"
- [ ] Click to open detailed stats modal
- [ ] Optional: Pomodoro timer integration

### UI Design

**Compact Mode (in status bar)**:
```
┌─────────────────────────────────────────────────────────────────┐
│ ... status items ... │ 🎯 342 / 1,000 words (34%) │ 🔥 7 days   │
└─────────────────────────────────────────────────────────────────┘
```

**Expanded Mode (floating widget)**:
```
┌────────────────────────┐
│ Writing Goals 🎯       │
├────────────────────────┤
│ Session:  156 / 500    │
│ ████████░░░░░░ 31%     │
│                        │
│ Today:    342 / 1,000  │
│ █████░░░░░░░░░ 34%     │
│                        │
│ 🔥 7 day streak        │
│ 💪 Keep going!         │
└────────────────────────┘
```

### Implementation Notes

```typescript
interface WritingGoalsWidgetProps {
  sessionWordCount: number
  dailyWordCount: number
  sessionGoal?: number
  dailyGoal?: number
  streak: number
  onGoalReached?: (type: 'session' | 'daily') => void
}

export function WritingGoalsWidget({ sessionWordCount, dailyGoal, ... }) {
  const dailyProgress = dailyGoal ? (dailyWordCount / dailyGoal) * 100 : 0
  const sessionProgress = sessionGoal ? (sessionWordCount / sessionGoal) * 100 : 0

  // Trigger celebration when goal reached
  useEffect(() => {
    if (dailyProgress >= 100 && !celebrationShown) {
      onGoalReached?.('daily')
      showConfetti()
      setCelebrationShown(true)
    }
  }, [dailyProgress])

  return (
    <div className="space-y-2">
      <GoalProgress
        label="Session"
        current={sessionWordCount}
        target={sessionGoal}
        progress={sessionProgress}
      />
      <GoalProgress
        label="Today"
        current={dailyWordCount}
        target={dailyGoal}
        progress={dailyProgress}
      />
      <div className="text-sm text-muted-foreground">
        🔥 {streak} day streak
      </div>
    </div>
  )
}
```

### Testing Checklist
- [ ] Word counts update in real-time
- [ ] Progress bars fill smoothly
- [ ] Celebration triggers at 100%
- [ ] Streak persists across sessions
- [ ] Goals configurable per document
- [ ] Daily goals reset at midnight
- [ ] Session goals reset on document close

### Success Metrics
- 40% increase in users meeting daily goals
- 25% increase in average session length
- 60% increase in consecutive writing days

---

## Implementation Priority

Based on user value and development effort:

### Phase 1 (Ship First) - 2 weeks
1. **TICKET-EDITOR-004**: Header Toolbar Reorganization (3 SP) - *Fixes current UX issue*
2. **TICKET-EDITOR-001**: Status Bar with Metrics (3 SP) - *High user value*

**Total: 6 SP (1 sprint)**

### Phase 2 (Next) - 2 weeks
3. **TICKET-EDITOR-005**: Writing Goals Widget (5 SP) - *Engagement driver*

**Total: 5 SP (1 sprint)**

### Phase 3 (Optional) - 3 weeks
4. **TICKET-EDITOR-002**: Formatting Toolbar (5 SP) - *Nice to have*
5. **TICKET-EDITOR-003**: Menu Bar (8 SP) - *Power users only*

**Total: 13 SP (2 sprints)**

---

## Decision: Do We Need All Three?

### Recommendation

**✅ YES** to Status Bar (TICKET-EDITOR-001)
- **Why**: High value, low complexity, expected by users
- **Impact**: Improves writing experience, provides real-time feedback
- **Cost**: 3 SP
- **ROI**: ⭐⭐⭐⭐⭐

**⚠️ MAYBE** to Formatting Toolbar (TICKET-EDITOR-002)
- **Why**: Tiptap bubble menu already handles this
- **Alternative**: Improve discoverability of existing bubble menu
- **Cost**: 5 SP
- **ROI**: ⭐⭐⭐☆☆
- **Decision**: Defer until user feedback requests it

**❌ NO** to Menu Bar (TICKET-EDITOR-003)
- **Why**: Command palette (Ctrl+K) serves same purpose
- **Modern UX**: Web apps don't use menu bars
- **Cost**: 8 SP (high maintenance)
- **ROI**: ⭐⭐☆☆☆
- **Decision**: Backlog (only if many users request it)

**✅ YES** to Header Reorganization (TICKET-EDITOR-004)
- **Why**: Current header is overcrowded (UX debt)
- **Impact**: Cleaner UI, faster action discovery
- **Cost**: 3 SP
- **ROI**: ⭐⭐⭐⭐⭐

**✅ YES** to Writing Goals Widget (TICKET-EDITOR-005)
- **Why**: Motivational features drive engagement
- **Impact**: Increases writing frequency and session length
- **Cost**: 5 SP
- **ROI**: ⭐⭐⭐⭐☆

---

## Summary

**Ship Immediately**:
1. TICKET-EDITOR-004: Header Reorganization (fixes UX debt)
2. TICKET-EDITOR-001: Status Bar (high user value)

**Next Sprint**:
3. TICKET-EDITOR-005: Writing Goals Widget (engagement)

**Defer/Backlog**:
4. TICKET-EDITOR-002: Formatting Toolbar (maybe later)
5. TICKET-EDITOR-003: Menu Bar (probably never)

**Estimated Timeline**: 4 weeks for core improvements (Phases 1-2)

---

**Created**: January 22, 2025
**Author**: Claude Code
**Status**: Ready for Review
