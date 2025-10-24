# Editor UX Implementation Tickets

**Created:** 2025-10-23
**Project:** Ottowrite Document Editor Redesign
**Epic:** Professional Editor UX Overhaul

---

## TICKET UX-EDITOR-001: Redesign Toolbar to Standard Rectangular Layout
**Priority:** P0 (Critical - Launch Blocker)
**Effort:** 3 story points (1-2 days)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Toolbar uses rounded-full pill design with semi-transparent background, making it look like a floating widget instead of an integrated editor toolbar. This violates standard word processor patterns (Google Docs, Word, Notion all use flat rectangular toolbars).

### Current Code (Lines 371-378)
```tsx
const toolbarWrapperClass = useMemo(
  () =>
    cn(
      'mx-auto flex w-full flex-wrap items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm sm:gap-1.5 sm:px-4',
      maxWidthClass
    ),
  [maxWidthClass]
)
```

### Acceptance Criteria
- ✅ Remove `rounded-full`, replace with `rounded-md` (4-6px max)
- ✅ Remove `bg-muted/40` transparency, use solid `bg-background`
- ✅ Increase button spacing from `gap-1` to `gap-2`
- ✅ Add clear visual button groups with separators
- ✅ Toolbar should span full width of editor canvas
- ✅ Remove `backdrop-blur` effects
- ✅ Use standard border color `border-border` (not border-border/60)

### Design Reference
```tsx
const toolbarWrapperClass = useMemo(
  () =>
    cn(
      'mx-auto flex w-full flex-wrap items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 shadow-sm',
      maxWidthClass
    ),
  [maxWidthClass]
)
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 371-378, 420-601)

### Testing
- [ ] Visual regression test: toolbar appears rectangular
- [ ] Spacing: buttons have adequate space (gap-2)
- [ ] Background: solid color, no transparency
- [ ] Compare side-by-side with Google Docs toolbar

---

## TICKET UX-EDITOR-002: Implement Proper Page/Canvas Visual Separation
**Priority:** P0 (Critical - Launch Blocker)
**Effort:** 5 story points (2-3 days)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Editor content doesn't have clear visual distinction between "page" (writing surface) and "canvas" (background). Everything blends together with muted colors and similar styling.

### Current Issues
- No background color contrast between page and canvas
- Over-reliance on border-radius (28-36px)
- Dramatic shadows that look unrealistic
- Content doesn't "pop" as the focal point

### Acceptance Criteria
- ✅ Page content background: solid white (`bg-white`)
- ✅ Canvas/chrome background: light gray (`bg-gray-50` or `bg-slate-50`)
- ✅ Border radius: 0-8px maximum (currently 36px)
- ✅ Shadow: subtle and realistic (`shadow-lg` instead of custom)
- ✅ Page should look like actual paper/document
- ✅ Strong visual hierarchy: content > chrome

### Design Spec

**Page Mode:**
```tsx
// Page frame (the "paper")
pageFrameClass: 'rounded-lg border border-border bg-white px-12 py-14 shadow-lg'

// Canvas (background around paper)
className: 'bg-slate-50/50'
```

**Wide Mode:**
```tsx
// No rounded corners, full bleed
pageFrameClass: 'border-t border-b border-border bg-white px-10 py-12'
```

**Typewriter Mode:**
```tsx
// Centered, no decorative effects
pageFrameClass: 'rounded-lg border border-border bg-white px-8 py-12 shadow-md'
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 360-369)
- `components/editor/editor-workspace.tsx` (background colors)

### Testing
- [ ] High contrast between page (white) and canvas (gray)
- [ ] Page looks like a document, not a card
- [ ] Shadows are subtle and professional
- [ ] Works in all 3 layout modes

---

## TICKET UX-EDITOR-003: Fix Over-Use of Rounded Corners Throughout Editor
**Priority:** P0 (Critical - Launch Blocker)
**Effort:** 2 story points (1 day)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Excessive and inconsistent use of rounded corners:
- Toolbar: `rounded-full` (infinite radius)
- Page: `rounded-[36px]` (36px radius)
- Typewriter: `rounded-[28px]` (28px radius)
- Ruler: `rounded-full`
- Buttons: `rounded-full`

Standard word processors use minimal rounding (0-8px).

### Acceptance Criteria
- ✅ Toolbar: `rounded-md` (6px)
- ✅ Page frame: `rounded-lg` (8px) or `rounded-md` (6px)
- ✅ Ruler: `rounded` (4px) or `rounded-none` (0px)
- ✅ Buttons: `rounded-md` (6px)
- ✅ Consistent radius values throughout
- ✅ Remove all arbitrary values (`rounded-[28px]`, `rounded-[36px]`)

### Find & Replace Operations
```tsx
// Search for:
rounded-full
rounded-\[36px\]
rounded-\[28px\]

// Replace with:
rounded-md  // or rounded-lg for larger elements
```

### Files to Modify
- `components/editor/tiptap-editor.tsx`
- Review all button components in editor

### Testing
- [ ] No elements have rounded-full
- [ ] No custom radius values above 8px
- [ ] Visual consistency across all editor elements
- [ ] Looks more like Google Docs/Word

---

## TICKET UX-EDITOR-004: Make Toolbar Sticky on Scroll
**Priority:** P1 (High)
**Effort:** 3 story points (1-2 days)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Toolbar scrolls away with content, forcing users to scroll back up to access formatting options. Standard word processors keep toolbar always visible.

### Acceptance Criteria
- ✅ Toolbar uses `position: sticky` and stays at top during scroll
- ✅ Toolbar has proper z-index to stay above content
- ✅ Smooth transition when toolbar becomes sticky
- ✅ Toolbar width matches content width when sticky
- ✅ Works in all layout modes (page, wide, typewriter)
- ✅ Doesn't overlap with header/navigation

### Implementation Approach
```tsx
<div className={cn(
  'sticky top-0 z-40 bg-background pb-2',
  // Add backdrop blur when sticky for better contrast
  'supports-[backdrop-filter]:backdrop-blur-sm'
)}>
  <div className={toolbarWrapperClass}>
    {/* Toolbar buttons */}
  </div>
</div>
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 418-602)

### Testing
- [ ] Toolbar remains visible when scrolling down
- [ ] Toolbar width stays correct when sticky
- [ ] No layout shift when toolbar becomes sticky
- [ ] Works on mobile and desktop
- [ ] Doesn't interfere with editor header

---

## TICKET UX-EDITOR-005: Improve Prose Typography and Content Styling
**Priority:** P1 (High)
**Effort:** 3 story points (1-2 days)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Editor content uses generic prose styling with insufficient refinement:
- `max-w-none` breaks Tailwind Typography's optimal line length
- Line height not optimized for reading
- Paragraph spacing too tight
- No proper focus indicators

### Current Code (Lines 101-117)
```tsx
const computedEditorClass = useMemo(() => {
  const scaleClass = fontScale === 'sm' ? 'prose-base sm:prose-lg'
    : fontScale === 'lg' ? 'prose-xl sm:prose-2xl'
    : 'prose-lg sm:prose-xl'

  return cn(
    'editor-body prose max-w-none focus:outline-none leading-relaxed...',
    scaleClass,
    theme === 'serif' ? 'font-serif...' : 'font-sans',
    'prose-headings:font-semibold...'
  )
}, [fontScale, theme])
```

### Acceptance Criteria
- ✅ Remove `max-w-none`, respect prose default max-width
- ✅ Optimize line-height: `prose-relaxed` or custom 1.7-1.8
- ✅ Improve paragraph spacing: `prose-p:mb-6`
- ✅ Better focus indicators on editable content
- ✅ Refined heading scale and spacing
- ✅ Proper list indentation and spacing
- ✅ Blockquote styling with left border
- ✅ Code block styling distinct from inline code

### Improved Styling
```tsx
const computedEditorClass = useMemo(() => {
  const scaleClass = fontScale === 'sm' ? 'prose-base'
    : fontScale === 'lg' ? 'prose-xl'
    : 'prose-lg'

  return cn(
    'editor-body prose prose-slate',
    scaleClass,
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',

    // Optimal reading experience
    'leading-relaxed prose-p:leading-relaxed prose-p:mb-6',

    // Typography
    theme === 'serif'
      ? 'font-serif prose-headings:font-serif'
      : 'font-sans prose-headings:font-sans',

    // Headings
    'prose-headings:font-bold prose-headings:tracking-tight',
    'prose-h1:text-4xl prose-h1:mb-8',
    'prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6',
    'prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4',

    // Lists
    'prose-li:leading-relaxed prose-li:mb-2',
    'prose-ul:my-6 prose-ol:my-6',

    // Blockquotes
    'prose-blockquote:border-l-4 prose-blockquote:border-primary',
    'prose-blockquote:bg-muted/30 prose-blockquote:pl-6 prose-blockquote:py-2',
    'prose-blockquote:italic prose-blockquote:text-muted-foreground',

    // Code
    'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
    'prose-pre:bg-muted prose-pre:border',

    // Links
    'prose-a:text-primary prose-a:underline prose-a:decoration-primary/30',
    'prose-a:underline-offset-2 hover:prose-a:decoration-primary',

    // Strong/em
    'prose-strong:font-semibold prose-strong:text-foreground',
    'prose-em:italic'
  )
}, [fontScale, theme])
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 101-117)
- Ensure proper prose plugin configuration

### Testing
- [ ] Line length feels comfortable (60-75 characters)
- [ ] Paragraph spacing creates clear visual chunks
- [ ] Headings have proper hierarchy and breathing room
- [ ] Lists are properly indented and spaced
- [ ] Blockquotes stand out but don't dominate
- [ ] Focus state is visible but not intrusive

---

## TICKET UX-EDITOR-006: Redesign Typewriter Mode for True Focus
**Priority:** P1 (High)
**Effort:** 3 story points (1-2 days)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Current typewriter mode uses complex pseudo-elements, unnecessary transparency, and doesn't feel significantly different from other modes.

### Current Code (Lines 364-366, 386-388)
```tsx
case 'typewriter':
  return 'rounded-[28px] border border-primary/20 bg-background/98 px-8 py-12 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] backdrop-blur-sm'

// Pseudo-element glow (lines 386-388)
before:absolute before:inset-y-6 before:left-1/2 before:w-[min(680px,calc(100%-2rem))] before:-translate-x-1/2 before:rounded-[30px] before:border before:border-primary/10 before:bg-primary/5 before:opacity-40 before:blur-sm before:content-['']
```

### Issues
- `bg-background/98` creates 2% transparency - why?
- Complex pseudo-element is performance-heavy
- Doesn't feel distinct from page mode
- Arbitrary rounded-[28px] radius

### Acceptance Criteria
- ✅ Solid background (`bg-white`), no transparency
- ✅ Remove complex pseudo-element glow
- ✅ Narrower column: `max-w-[680px]` (currently 760px)
- ✅ Minimal border radius: `rounded-lg` (8px max)
- ✅ Subtle focus cue without distraction
- ✅ Smooth, fast rendering
- ✅ Clear centering in viewport

### Redesigned Typewriter Mode
```tsx
case 'typewriter':
  return cn(
    'rounded-lg',
    'border border-border/50',
    'bg-white',
    'px-8 py-12',
    'shadow-md',
    // Subtle focus indicator
    'ring-1 ring-primary/5'
  )

// Max width
case 'typewriter':
  return 'max-w-[680px]'  // Down from 760px
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 350-369, 380-392)

### Testing
- [ ] Content is centered with comfortable narrow column
- [ ] Solid background, no transparency
- [ ] No pseudo-element effects
- [ ] Smooth rendering, no performance issues
- [ ] Feels focused and distraction-free
- [ ] Still works with all font scales

---

## TICKET UX-EDITOR-007: Make Ruler Functional or Remove It
**Priority:** P2 (Medium)
**Effort:** 5 story points (3 days) OR 1 point (remove)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Ruler is purely decorative with no functionality. It:
- Uses `rounded-full` (rulers aren't round!)
- Shows arbitrary numbers 1-12 (not inches/cm)
- Can't be used to set margins or indents
- Uses dashed borders with transparency (looks unfinished)

### Current Code (Lines 604-622)
```tsx
{showRuler && (
  <div className={cn(
    'mx-auto hidden w-full items-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:flex',
    maxWidthClass
  )}>
    <div className="flex w-full overflow-hidden rounded-full border border-dashed border-border/60 bg-muted/40 px-4 py-1">
      {rulerMarks.map((mark) => (
        <div key={mark} className="flex-1 border-l border-border/40 text-center first:border-0">
          {mark}
        </div>
      ))}
    </div>
  </div>
)}
```

### Option A: Make Functional (5 points)
**Features:**
- Show actual measurements (inches or cm, user preference)
- Draggable margin indicators
- Set left/right margins
- Set first-line indent
- Visual feedback on drag
- Persist settings per document

**Reference:** Google Docs ruler implementation

**Acceptance Criteria:**
- ✅ Displays real measurements (inches/cm)
- ✅ Draggable left and right margin indicators
- ✅ Draggable first-line indent indicator
- ✅ Visual feedback during drag
- ✅ Margins apply to editor content
- ✅ Settings persist in document metadata
- ✅ Flat, rectangular ruler (not rounded)

### Option B: Remove It (1 point - RECOMMENDED)
**Rationale:**
- Most modern editors don't have rulers (Notion, Dropbox Paper, iA Writer)
- Margins can be set in document settings instead
- Focus on core writing experience
- Reduces visual clutter

**Acceptance Criteria:**
- ✅ Remove `showRuler` state and toggle
- ✅ Remove ruler rendering code
- ✅ Remove ruler from toolbar options menu
- ✅ Add margin settings to document metadata form instead

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 404-622)
- `components/editor/editor-workspace.tsx` (remove ruler toggle)

### Recommendation
**Remove the ruler** (Option B) and add margin settings to document preferences. This is more aligned with modern editor UX and avoids the complexity of building a functional ruler.

---

## TICKET UX-EDITOR-008: Refine Button Group Styling in Toolbar
**Priority:** P1 (High)
**Effort:** 2 story points (1 day)
**Component:** `components/editor/tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Toolbar buttons lack clear visual grouping:
- All buttons use `gap-1` (too tight)
- Separators are inconsistent
- Button active state not prominent enough
- Buttons use `rounded-full` (too playful)

### Current Button Style (Lines 422-472)
```tsx
<Button
  type="button"
  variant="ghost"
  size="sm"
  aria-label="Bold"
  onClick={() => editor.chain().focus().toggleBold().run()}
  className={cn('rounded-full', editor.isActive('bold') && 'bg-muted')}
>
  <Bold className="h-4 w-4" />
</Button>
```

### Issues
- `rounded-full` on buttons
- Active state `bg-muted` too subtle
- No button padding customization
- Separators hidden on mobile (`hidden sm:block`)

### Acceptance Criteria
- ✅ Buttons use `rounded-md` instead of `rounded-full`
- ✅ Stronger active state: `bg-primary text-primary-foreground`
- ✅ Consistent button groups with visible separators
- ✅ Improved hover states
- ✅ Better spacing between button groups
- ✅ Separators visible on mobile (just shorter)

### Redesigned Button Styling
```tsx
<Button
  type="button"
  variant="ghost"
  size="sm"
  aria-label="Bold"
  onClick={() => editor.chain().focus().toggleBold().run()}
  className={cn(
    'rounded-md h-8 w-8 p-0',
    'hover:bg-accent hover:text-accent-foreground',
    'transition-colors',
    editor.isActive('bold') && 'bg-primary text-primary-foreground hover:bg-primary/90'
  )}
>
  <Bold className="h-4 w-4" />
</Button>

// Button groups
<div className="flex items-center gap-1.5">
  {/* Text formatting buttons */}
</div>

// Separator
<div className="h-6 w-px bg-border" aria-hidden="true" />

<div className="flex items-center gap-1.5">
  {/* Heading buttons */}
</div>
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (lines 420-601)

### Testing
- [ ] Buttons have rounded-md corners (not full)
- [ ] Active state is clearly visible (primary color)
- [ ] Hover states provide good feedback
- [ ] Button groups are visually distinct
- [ ] Separators help create hierarchy
- [ ] Mobile toolbar still usable

---

## TICKET UX-EDITOR-009: Add Subtle Paper Texture to Editor Background
**Priority:** P2 (Medium)
**Effort:** 2 story points (1 day)
**Component:** `components/editor/tiptap-editor.tsx` + CSS
**Status:** 🔴 NOT STARTED

### Problem
Editor background is flat solid white with no depth or warmth. Professional writing tools often add subtle texture to create a more tactile, paper-like feel.

### Examples
- **Ulysses:** Subtle noise/grain on background
- **iA Writer:** Very light texture
- **Scrivener:** Customizable paper texture

### Acceptance Criteria
- ✅ Very subtle texture/noise (barely visible)
- ✅ Only visible in light mode
- ✅ No impact on performance
- ✅ Can be toggled in preferences
- ✅ Doesn't interfere with text readability

### Implementation Options

**Option A: CSS Pattern (Lightweight)**
```css
.editor-paper-texture {
  background-image:
    repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,0,0,0.008) 2px, rgba(0,0,0,0.008) 4px
    );
}
```

**Option B: SVG Pattern (Better Quality)**
```tsx
<svg className="absolute inset-0 pointer-events-none opacity-[0.015]">
  <filter id="paper-texture">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
  </filter>
  <rect width="100%" height="100%" filter="url(#paper-texture)" />
</svg>
```

**Option C: Data URL (Best Performance)**
```tsx
// Create 4x4 noise pattern as data URL
const paperTexture = 'data:image/png;base64,iVBORw0KG...'
className="bg-white" style={{ backgroundImage: `url(${paperTexture})` }}
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (add texture option)
- Create new component `components/editor/paper-texture.tsx`
- Add toggle to editor preferences

### Testing
- [ ] Texture is barely visible but adds warmth
- [ ] No performance impact (< 1ms render time)
- [ ] Works in page mode only (not wide/typewriter)
- [ ] Doesn't reduce text contrast
- [ ] Can be disabled in preferences

---

## TICKET UX-EDITOR-010: Implement Smooth Layout Mode Transitions
**Priority:** P2 (Medium)
**Effort:** 2 story points (1 day)
**Component:** `components/editor/editor-workspace.tsx`, `tiptap-editor.tsx`
**Status:** 🔴 NOT STARTED

### Problem
Switching between layout modes (page/wide/typewriter) causes jarring layout shifts with no transition animations.

### Acceptance Criteria
- ✅ Smooth CSS transitions when switching modes
- ✅ Max-width changes animate smoothly
- ✅ Padding changes animate smoothly
- ✅ No layout thrashing or flicker
- ✅ Transition duration: 200-300ms
- ✅ Use appropriate easing function

### Implementation
```tsx
// Add to pageOuterClass
'transition-all duration-300 ease-in-out'

// Add to pageFrameClass
'transition-all duration-300 ease-in-out'

// Ensure width changes are smooth
const maxWidthClass = useMemo(() => {
  const widths = {
    wide: 'max-w-[1200px]',
    typewriter: 'max-w-[680px]',
    page: 'max-w-[960px]',
  }
  return cn(widths[layoutMode], 'transition-all duration-300 ease-in-out')
}, [layoutMode])
```

### Files to Modify
- `components/editor/tiptap-editor.tsx` (add transitions)
- Test with React 19 concurrent features

### Testing
- [ ] Smooth animation when switching page → wide
- [ ] Smooth animation when switching page → typewriter
- [ ] Smooth animation when switching wide → typewriter
- [ ] No janky layout shifts
- [ ] Transition feels responsive, not sluggish
- [ ] Works on mobile and desktop

---

## Implementation Order & Roadmap

### Phase 1: Critical UX Fixes (P0 - Launch Blockers)
**Timeline:** Week 1 (5 days)
**Effort:** 10 story points

1. **Day 1-2:** UX-EDITOR-001 (Toolbar redesign) - 3 points
2. **Day 2-4:** UX-EDITOR-002 (Page/canvas separation) - 5 points
3. **Day 5:** UX-EDITOR-003 (Fix rounded corners) - 2 points

**Goal:** Editor looks professional and polished, no longer resembles a text area.

---

### Phase 2: High-Priority Improvements (P1)
**Timeline:** Week 2 (5 days)
**Effort:** 14 story points

1. **Day 1-2:** UX-EDITOR-004 (Sticky toolbar) - 3 points
2. **Day 3-4:** UX-EDITOR-005 (Typography refinement) - 3 points
3. **Day 4-5:** UX-EDITOR-006 (Typewriter mode redesign) - 3 points
4. **Day 5:** UX-EDITOR-008 (Button group styling) - 2 points
5. **Day 5:** UX-EDITOR-007 (Remove ruler) - 1 point
   *(Recommend Option B: remove it)*

**Goal:** Editor provides excellent writing experience with refined typography and focus modes.

---

### Phase 3: Polish & Refinements (P2)
**Timeline:** Week 3 (3 days)
**Effort:** 6 story points

1. **Day 1-2:** UX-EDITOR-009 (Paper texture) - 2 points
2. **Day 2-3:** UX-EDITOR-010 (Smooth transitions) - 2 points
3. **Day 3:** Final polish, bug fixes, testing - 2 points

**Goal:** Editor feels premium and delightful to use.

---

## Total Effort Summary

| Phase | Story Points | Days | Priority |
|-------|--------------|------|----------|
| Phase 1 | 10 | 5 | P0 |
| Phase 2 | 14 | 5 | P1 |
| Phase 3 | 6 | 3 | P2 |
| **TOTAL** | **30** | **13** | Mixed |

---

## Success Metrics

### Quantitative
- **Toolbar click accuracy:** > 95% (buttons easier to hit)
- **Time to first edit:** < 2s (faster visual recognition)
- **Scrolling performance:** Consistent 60fps with sticky toolbar
- **Lighthouse score:** No regression in performance

### Qualitative
- **User feedback:** "Looks more professional"
- **A/B testing:** Increased session time in editor
- **Support tickets:** Reduced "where do I write?" questions
- **Competitive analysis:** Matches Google Docs/Notion quality

---

## Design Review Checklist

Before implementation, verify:
- [ ] Mockups approved by design team
- [ ] Accessibility standards met (WCAG AA minimum)
- [ ] Mobile responsive designs confirmed
- [ ] Dark mode variants designed (if applicable)
- [ ] Performance impact assessed
- [ ] Browser compatibility tested (Chrome, Safari, Firefox, Edge)

---

## Notes for Developers

1. **Avoid Over-Engineering:** Keep implementations simple and maintainable
2. **Performance First:** Test render times, especially for sticky toolbar
3. **Accessibility:** Ensure keyboard navigation still works
4. **Mobile Testing:** Editor must work on tablets and phones
5. **Browser Testing:** Test on Safari (Mac), Chrome, Firefox, Edge
6. **Dark Mode:** Verify all changes work in dark mode
7. **Conflict Resolution:** Changes may conflict with each other - coordinate

---

**Created by:** Claude (AI Assistant)
**Last Updated:** 2025-10-23
**Status:** Ready for review and implementation
**Next Step:** Design team review → Development → QA → Ship
