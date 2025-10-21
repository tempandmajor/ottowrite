# Workspace Mode Guide

**Last Updated**: January 21, 2025
**Version**: 2.0 (TICKET-WS-003 Complete)

---

## Overview

Workspace Mode is Otto Write's distraction-free writing environment designed for focused, uninterrupted writing sessions. It provides a streamlined interface with powerful keyboard shortcuts and intelligent panel management.

---

## Table of Contents

1. [Accessing Workspace Mode](#accessing-workspace-mode)
2. [Interface Overview](#interface-overview)
3. [Keyboard Shortcuts](#keyboard-shortcuts)
4. [Focus Mode](#focus-mode)
5. [Command Palette](#command-palette)
6. [Mobile Experience](#mobile-experience)
7. [Panel Management](#panel-management)
8. [Best Practices](#best-practices)
9. [QA & Testing Guide](#qa--testing-guide)

---

## Accessing Workspace Mode

### Entry Points

1. **From Dashboard**:
   - Navigate to Dashboard → Documents
   - Click "Open in Workspace" on any document
   - URL: `/workspace/{documentId}`

2. **Direct Navigation**:
   - Click "Workspace Mode" toggle in editor header
   - Workspace mode optimizes for fullscreen writing

### Visual Indicators

- **Workspace Mode Active**: Sidebars start collapsed, clean header
- **Non-Workspace Mode**: Sidebars visible by default, full header with actions

---

## Interface Overview

### Layout Components

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Document Title | Save | Actions (mobile only)       │
├────────┬──────────────────────────────────────┬─────────────┤
│        │                                      │             │
│ Outline│          Editor Area                 │ AI Assistant│
│ (opt.) │                                      │   (opt.)    │
│        │                                      │             │
│        │                                      │             │
├────────┴──────────────────────────────────────┴─────────────┤
│ Footer: Keyboard Shortcuts Help Button (Ctrl+Shift+?)       │
└─────────────────────────────────────────────────────────────┘
```

### Header (Top Bar)

- **Left**: Back arrow, Document title
- **Right**: Save button, Actions dropdown (mobile)
- **Focus Mode**: Header compresses, hides most actions

### Sidebars (Collapsible)

- **Left (Outline)**: Chapter/scene structure navigation
- **Right (AI Assistant)**: Writing suggestions, generation tools
- **Both**: Can be toggled via keyboard or buttons

### Footer (Bottom Right)

- **Keyboard Shortcuts Button**: Floating button to open help
- **Hidden in**: Focus mode

---

## Keyboard Shortcuts

### Complete Reference

All keyboard shortcuts work globally in workspace mode, even when dialogs/overlays are open.

#### Navigation

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+Shift+F** | Toggle Focus Mode | Enter/exit distraction-free writing |
| **Ctrl+K** | Open Command Palette | Quick access to all actions |
| **Ctrl+Shift+?** | Show Keyboard Shortcuts | Display this reference |

#### Panels

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+Shift+O** | Toggle Outline | Show/hide chapter/scene sidebar |
| **Ctrl+Shift+A** | Toggle AI Assistant | Show/hide AI writing panel |

#### Actions

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+Shift+H** | Version History | View/restore previous versions |
| **Ctrl+S** | Save Document | Manual save (auto-saves every 3s) |

#### Editor (Standard)

| Shortcut | Action |
|----------|--------|
| **Ctrl+B** | Bold text |
| **Ctrl+I** | Italic text |
| **Ctrl+U** | Underline text |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |
| **Ctrl+Shift+Z** | Redo (alternative) |

### Platform-Specific Notes

#### macOS
- **Most shortcuts**: Use **Cmd** instead of **Ctrl** (e.g., Cmd+B for bold)
- **Workspace shortcuts**: Use **Ctrl+Shift+[key]** as shown (not Cmd+Shift)
  - This avoids conflicts with macOS system shortcuts
  - Example: **Ctrl+Shift+F** (not Cmd+Shift+F which opens Finder)

#### Windows/Linux
- All shortcuts use **Ctrl** as documented
- **Ctrl+Shift+O**: May conflict with browser bookmarks (preventDefault blocks it)
- **Ctrl+Shift+H**: May conflict with browser history (preventDefault blocks it)

### Shortcut Behavior with Overlays

**Important**: All shortcuts work even when dialogs are open:

- ✅ Focus mode works when command palette is open
- ✅ Focus mode works when version history is open
- ✅ Focus mode works when keyboard help is open
- ✅ Command palette works when in focus mode
- ✅ Version history works when in focus mode

**Design Philosophy**: Writers should never be "locked out" of navigation due to open dialogs.

---

## Focus Mode

### What is Focus Mode?

Focus Mode is a distraction-free writing environment that:
- Hides all sidebars (outline + AI)
- Compresses header actions
- Removes UI clutter
- Shows only: Editor + minimal header + "Exit Focus" button

### Entering Focus Mode

**3 Ways to Enter**:
1. **Keyboard**: Press **Ctrl+Shift+F**
2. **Command Palette**: Press **Ctrl+K** → Type "focus" → Enter
3. **Mobile**: Tap **Actions** → **Focus mode**

### Visual Changes

**Before Focus Mode**:
```
[Header: Full actions] [Outline] [Editor] [AI Assistant] [Footer: Help button]
```

**During Focus Mode**:
```
[Header: Minimal] [Editor (full width)] [Exit Focus button]
```

### State Preservation

**Smart State Management**:

Focus mode remembers which panels were open/closed BEFORE entering:

1. **Both panels visible**:
   - Enter focus → Both hide
   - Exit focus → Both restore

2. **AI already hidden**:
   - Enter focus → Outline hides, AI stays hidden
   - Exit focus → Outline restores, AI stays hidden

3. **Both already hidden**:
   - Enter focus → No visual change (already full width)
   - Exit focus → Both stay hidden

**Example Scenario**:
```javascript
// User has AI hidden but outline visible
outline: ✅ visible
AI: ❌ hidden

// Press Ctrl+Shift+F (enter focus)
outline: ❌ hidden
AI: ❌ hidden
focusMode: ✅ true

// Press Ctrl+Shift+F again (exit focus)
outline: ✅ visible  // ← Restored
AI: ❌ hidden        // ← Stays hidden (as before)
focusMode: ❌ false
```

### Exiting Focus Mode

**3 Ways to Exit**:
1. **Keyboard**: Press **Ctrl+Shift+F** again
2. **Button**: Click "Exit Focus" in header
3. **Command Palette**: Press **Ctrl+K** → Type "focus" → Enter

### Focus Mode + Panel Toggles

**Behavior**: Toggling panels (Ctrl+Shift+O or Ctrl+Shift+A) automatically exits focus mode.

**Example**:
```
1. User in focus mode
2. Press Ctrl+Shift+O (toggle outline)
3. Result: Exit focus mode + show outline sidebar
```

**Why**: Focus mode is "all or nothing" - showing one panel defeats the purpose.

---

## Command Palette

### Overview

The Command Palette provides quick access to all workspace actions, scene navigation, and document switching via keyboard-driven search.

### Opening the Palette

**3 Ways**:
1. **Keyboard**: Press **Ctrl+K**
2. **Mobile**: Tap **Actions** → **Command palette**
3. **Footer Button**: Click keyboard shortcuts button → Select command palette

### Features

#### 1. Real-Time Search
- Type to filter commands instantly
- Searches: Command names, descriptions, categories
- Case-insensitive
- No regex required

#### 2. Keyboard Navigation
- **↑/↓ Arrows**: Navigate through commands
- **Enter**: Execute selected command
- **Escape**: Close palette
- **Mouse hover**: Updates selection

#### 3. Command Categories

**5 Categories**:

1. **Panels** (2 commands)
   - Toggle Outline Sidebar
   - Toggle AI Assistant

2. **Navigation** (1 command)
   - Toggle Focus Mode

3. **Actions** (2 commands)
   - View Version History
   - Export Document

4. **Scenes** (Dynamic)
   - Jump to any scene in document
   - Shows chapter context
   - Highlights current scene

5. **Recent Documents** (Dynamic)
   - Switch to recently edited docs
   - Shows "last edited X ago" timestamps
   - Up to 6 recent documents

#### 4. Visual Highlighting

- **Selected command**: Light blue/gray background
- **Current scene**: Blue border + "Current" badge
- **Icons**: All commands have descriptive icons

#### 5. State Management

- **Loading state**: Spinner while fetching recent documents from Supabase
- **Empty state**: "No commands found" when search has no matches
- **Auto-close**: Palette closes after executing command

### Example Workflows

#### Jump to Scene
```
1. Press Ctrl+K
2. Type "chapter 2" (or scene name)
3. Arrow down to desired scene
4. Press Enter
5. Editor scrolls to scene
```

#### Switch Documents
```
1. Press Ctrl+K
2. Type document name (or just open palette to see recents)
3. Recent documents show at bottom
4. Press Enter on document
5. Routes to document editor
```

#### Toggle Panel
```
1. Press Ctrl+K
2. Type "outline" or "ai"
3. Press Enter
4. Panel toggles
```

---

## Mobile Experience

### Mobile Optimizations

**Responsive Breakpoint**: `768px` (md in Tailwind)

**Below 768px (Mobile)**:
- Desktop action buttons → Hidden
- Mobile "Actions" dropdown → Visible
- Keyboard shortcuts → Still work (external keyboards)
- Footer help button → Compact version

### Mobile Actions Dropdown

**Complete Menu** (in priority order):

1. **💾 Save document**
   - Calls saveDocument()
   - Shows "Saving..." when active
   - Replaces hidden desktop save button

2. **⌘ Command palette**
   - Opens command palette dialog
   - Full functionality on mobile

3. **⛶ Focus mode**
   - Toggles distraction-free mode
   - Same behavior as desktop

4. **📋 Show/Hide outline**
   - Toggles outline sidebar
   - Icon changes based on state

5. **✨ Show/Hide AI panel**
   - Toggles AI assistant
   - Icon changes based on state

6. **⏰ Version history**
   - Opens version history dialog
   - Full restore functionality

7. **📥 Export document**
   - Opens export modal
   - PDF, DOCX, TXT, Markdown formats

8. **🔍 Plot analysis** (non-workspace only)
   - Links to plot analysis page
   - Feature-specific navigation

9. **👥 Share (soon)** (workspace only, disabled)
   - Future collaboration feature
   - Shown as coming soon

### Mobile-Desktop Parity

**100% Feature Parity Achieved**:

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Save Document | ✅ Button | ✅ Dropdown |
| Command Palette | ✅ Ctrl+K | ✅ Dropdown |
| Focus Mode | ✅ Ctrl+Shift+F | ✅ Dropdown |
| Toggle Panels | ✅ Buttons | ✅ Dropdown |
| Version History | ✅ Button | ✅ Dropdown |
| Export | ✅ Button | ✅ Dropdown |

**No mobile-only limitations** - all features accessible

---

## Panel Management

### Outline Sidebar (Left)

**Purpose**: Navigate document structure

**Content**:
- Chapters (collapsible)
- Scenes within chapters
- Scene metadata (word count, status)

**Controls**:
- **Desktop**: Toggle button in header
- **Keyboard**: Ctrl+Shift+O
- **Mobile**: Actions → Show/Hide outline

**Auto-hide**:
- Enters focus mode
- User explicitly closes

**Auto-show**:
- Exits focus mode (if was visible before)
- User toggles via keyboard/button

### AI Assistant (Right)

**Purpose**: Writing assistance and generation

**Content**:
- AI writing suggestions
- Text generation tools
- Style analysis
- Character dialogue help

**Controls**:
- **Desktop**: Toggle button in header
- **Keyboard**: Ctrl+Shift+A
- **Mobile**: Actions → Show/Hide AI panel

**Auto-hide**:
- Enters focus mode
- User explicitly closes
- Screen width < 1024px (initially)

**Auto-show**:
- Exits focus mode (if was visible before)
- User toggles via keyboard/button

### Resizable Panels

**Desktop Only**:
- Drag resize handles between panels
- Keyboard resize: Tab to handle + Arrow keys
- Width constraints: 220px - 400px
- Persisted in localStorage (future enhancement)

---

## Best Practices

### For Writers

1. **Start Sessions in Focus Mode**
   - Press Ctrl+Shift+F immediately
   - Eliminates distractions from start
   - Exit when you need panels

2. **Use Command Palette for Navigation**
   - Faster than clicking menus
   - Jump to scenes without scrolling
   - Switch documents without leaving keyboard

3. **Learn 3 Essential Shortcuts**
   - **Ctrl+Shift+F**: Focus mode (most important)
   - **Ctrl+K**: Command palette (second most important)
   - **Ctrl+Shift+?**: Keyboard help (when you forget)

4. **Leverage Auto-Save**
   - Document saves every 3 seconds
   - Ctrl+S for manual save
   - Version history for major milestones

### For QA/Testing

1. **Test All Shortcut Combinations**
   - Focus mode with dialogs open
   - Panel toggles in/out of focus
   - Command palette in all states
   - Version history + focus mode

2. **Test State Preservation**
   - Enter focus with AI hidden
   - Enter focus with outline hidden
   - Enter focus with both hidden
   - Enter focus with both visible

3. **Test Mobile Parity**
   - All dropdown actions work
   - Command palette opens
   - Focus mode toggles
   - Save document functions

4. **Test Edge Cases**
   - Rapid keyboard presses
   - Multiple dialogs open
   - Browser back/forward
   - Screen resize during focus

### For Product/Design

1. **Keyboard-First Philosophy**
   - All features accessible via keyboard
   - Mouse optional, not required
   - Mobile dropdown mirrors desktop actions

2. **Focus Mode is Non-Destructive**
   - Never loses user's panel preferences
   - Restores exact state on exit
   - No surprises or confusion

3. **Progressive Disclosure**
   - Footer button hints at shortcuts
   - Keyboard help accessible anytime
   - Command palette groups actions

---

## QA & Testing Guide

### Test Plan Overview

**Test Coverage Required**:
1. Keyboard shortcuts (all combinations)
2. Focus mode state management
3. Panel toggle behavior
4. Command palette functionality
5. Mobile dropdown actions
6. Cross-browser compatibility
7. Responsive breakpoints

### Critical Test Scenarios

#### TC-001: Basic Focus Mode Toggle
**Steps**:
1. Open workspace mode
2. Verify outline and AI visible
3. Press Ctrl+Shift+F
4. Verify both panels hide, focus mode active
5. Press Ctrl+Shift+F again
6. Verify both panels restore, focus mode inactive

**Expected**: ✅ Pass - Panels hide/restore correctly

---

#### TC-002: Focus Mode with Dialogs Open
**Steps**:
1. Open workspace mode
2. Press Ctrl+K (command palette)
3. Palette opens
4. Press Ctrl+Shift+F (while palette open)
5. Verify focus mode activates
6. Verify panels hide

**Expected**: ✅ Pass - Focus mode works despite open dialog

---

#### TC-003: State Preservation (AI Hidden)
**Steps**:
1. Open workspace mode
2. Press Ctrl+Shift+A (hide AI)
3. Verify AI hidden, outline visible
4. Press Ctrl+Shift+F (enter focus)
5. Verify both hidden, focus active
6. Press Ctrl+Shift+F (exit focus)
7. Verify outline restored, AI stays hidden

**Expected**: ✅ Pass - AI preference preserved

---

#### TC-004: Command Palette Search
**Steps**:
1. Open workspace mode
2. Press Ctrl+K
3. Type "focus"
4. Verify "Toggle Focus Mode" appears
5. Press Enter
6. Verify focus mode activates

**Expected**: ✅ Pass - Search filters and executes

---

#### TC-005: Mobile Save Document
**Steps**:
1. Open workspace on mobile device (<768px)
2. Tap "Actions" dropdown
3. Verify "Save document" is first item
4. Tap "Save document"
5. Verify document saves (check last_saved timestamp)

**Expected**: ✅ Pass - Mobile save works

---

#### TC-006: Mobile Command Palette
**Steps**:
1. Open workspace on mobile
2. Tap "Actions" → "Command palette"
3. Verify palette opens
4. Type search query
5. Verify filtering works
6. Tap command
7. Verify command executes

**Expected**: ✅ Pass - Mobile palette fully functional

---

#### TC-007: Keyboard Shortcuts Help
**Steps**:
1. Open workspace mode
2. Press Ctrl+Shift+?
3. Verify shortcuts dialog opens
4. Verify all categories listed
5. Verify platform detection (macOS vs Windows)
6. Press Escape
7. Verify dialog closes

**Expected**: ✅ Pass - Help displays correctly

---

#### TC-008: Panel Toggle Auto-Exit Focus
**Steps**:
1. Open workspace mode
2. Enter focus mode (Ctrl+Shift+F)
3. Press Ctrl+Shift+O (toggle outline)
4. Verify focus mode exits
5. Verify outline shows

**Expected**: ✅ Pass - Panel toggle exits focus

---

### Browser Compatibility Matrix

**Required Testing**:

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ Primary |
| Firefox | Latest | ✅ Primary |
| Safari | Latest | ✅ Primary |
| Edge | Latest | ✅ Secondary |
| Safari iOS | Latest | ✅ Mobile |
| Chrome Android | Latest | ✅ Mobile |

**Known Issues**:
- None (as of 2025-01-21)

---

### Performance Benchmarks

**Target Metrics**:

| Metric | Target | Current |
|--------|--------|---------|
| Focus mode toggle | <100ms | ~50ms |
| Command palette open | <200ms | ~150ms |
| Panel toggle | <100ms | ~50ms |
| Keyboard response | <50ms | ~20ms |

**Measurement**: Use browser DevTools Performance tab

---

## Changelog

### Version 2.0 (2025-01-21) - TICKET-WS-003

**Major Features**:
- ✅ Keyboard shortcuts help dialog (Ctrl+Shift+?)
- ✅ Fully functional command palette (search, scenes, recents)
- ✅ Mobile actions dropdown (Save, Command Palette, Focus Mode)
- ✅ Focus mode polish (state preservation, grid cleanup)
- ✅ Comprehensive test coverage
- ✅ Complete documentation

**Improvements**:
- Focus mode now hides utility sidebar correctly
- Command palette replaced static placeholder
- Mobile dropdown has 100% feature parity with desktop
- Icons added to all mobile menu items
- Menu reorganized by priority

### Version 1.0 (2024-12-15)

**Initial Release**:
- Basic workspace mode
- Manual panel toggles
- Save button
- Outline sidebar
- AI assistant panel

---

## Support & Feedback

**For Questions**:
- Internal: Slack #product-workspace
- External: support@ottowrite.com

**For Bug Reports**:
- GitHub: https://github.com/tempandmajor/ottowrite/issues
- Include: Browser, OS, steps to reproduce

**For Feature Requests**:
- Product Board: Internal link
- User feedback form: In-app

---

**End of Workspace Mode Guide**
