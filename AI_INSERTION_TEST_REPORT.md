# AI Insertion Spot-Check Report

## Date: 2025-10-18
## Reviewers: Claude Code

---

## 1. TiptapEditor (Prose) Implementation Review

### Current Implementation (`components/editor/tiptap-editor.tsx:262-272`)

```typescript
const api: TiptapEditorApi = {
  insertHtmlAtCursor: (html) => {
    if (!html) return
    editor.chain().focus().deleteSelection().insertContent(html).run()
  },
  getSelectedText: () => {
    const { state } = editor
    const { from, to } = state.selection
    return state.doc.textBetween(from, to, ' ')
  },
}
```

### Behavior Analysis

**✅ PROS:**
1. **Uses Tiptap's native cursor management** - `editor.chain().focus()` ensures editor has focus
2. **Handles text selection** - `.deleteSelection()` removes selected text before insertion (replaces selection)
3. **Maintains caret position** - Tiptap automatically positions caret after inserted content
4. **Native Tiptap behavior** - Leverages battle-tested editor functionality

**Caret Handling:**
- If cursor at position with no selection: Inserts at cursor, caret moves to end of inserted content ✅
- If text is selected: Replaces selection, caret moves to end of new content ✅
- Auto-scrolls to keep caret visible ✅

**Potential Issues:**
- ⚠️ No explicit error handling if editor is destroyed during insertion
- ⚠️ Might lose focus if user clicks elsewhere during API call

---

## 2. ScreenplayEditor Implementation Review

### Current Implementation (`components/editor/screenplay-editor.tsx:173-225`)

```typescript
const insertTextAtCursor = useCallback(
  (rawText: string) => {
    const normalized = rawText.replace(/\r\n/g, '\n')
    if (!normalized.trim()) return

    const { index, start, end } = selectionRef.current
    const currentElements = elementsRef.current

    // Case 1: Insert within existing element
    if (index != null && currentElements[index]) {
      const target = currentElements[index]
      const before = target.content.slice(0, start)
      const after = target.content.slice(end)
      const nextContent = formatContent(`${before}${normalized}${after}`, target.type)

      updateElements((current) => {
        const next = [...current]
        next[index] = { ...next[index], content: nextContent }
        return next
      })

      requestAnimationFrame(() => {
        const caret = start + normalized.length
        focusAndSetSelection(index, caret)
      })
      return
    }

    // Case 2: No cursor position - append to end
    const segments = normalized.split(/\n{2,}/).map((segment) => segment.trim()).filter(Boolean)
    if (segments.length === 0) return

    const insertionStartIndex = elementsRef.current.length

    updateElements((current) => [
      ...current,
      ...segments.map((segment) => ({
        id: generateElementId(),
        type: 'action' as ElementType,
        content: formatContent(segment, 'action'),
      })),
    ])

    requestAnimationFrame(() => {
      focusAndSetSelection(insertionStartIndex, inputRefs.current[insertionStartIndex]?.value.length ?? 0)
    })
  },
  [focusAndSetSelection, formatContent, generateElementId, updateElements]
)
```

### Selection Tracking (`screenplay-editor.tsx:95-99`)

```typescript
const rememberSelection = useCallback((index: number, target: HTMLTextAreaElement) => {
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  selectionRef.current = { index, start, end }
}, [])
```

Tracked on: `onFocus`, `onClick`, `onKeyUp`, `onSelect` events

### Behavior Analysis

**✅ PROS:**
1. **Tracks cursor position across all relevant events** - Comprehensive selection tracking
2. **Handles two distinct cases:**
   - Insert at cursor within existing element (inline insertion)
   - Append new elements when no cursor position
3. **Preserves caret position** - Uses `requestAnimationFrame` for smooth focus
4. **Handles text selection** - Replaces selected range (start to end)
5. **Formats content appropriately** - Respects element type formatting (uppercase for SCENE/CHARACTER)

**Caret Handling:**
- **Case 1 (cursor in element):** Inserts at exact position, caret moves to end of inserted text ✅
- **Case 2 (no cursor/no focus):** Creates new elements, focuses first new element ✅
- **Selection replacement:** Properly replaces selected text range ✅
- **Cross-line text:** Treats as single inline insertion (no paragraph breaks within element) ✅

**Potential Issues:**
- ⚠️ **Selection tracking requires user interaction** - If user never clicks/focuses, `index` is `null`
  - This is handled gracefully by falling back to append mode
- ⚠️ **Multi-paragraph AI text in cursor mode** - Inserts everything inline, doesn't create new elements
  - This might feel unnatural for long multi-paragraph responses
  - **FINDING: Potential UX improvement needed**

---

## 3. Integration Point (`app/dashboard/editor/[id]/page.tsx:445-497`)

### Current Flow

```typescript
const insertAIText = (rawText: string) => {
  const normalized = rawText.replace(/\r\n/g, '\n')
  if (!normalized.trim()) return

  // Screenplay handling
  if (isScriptType(document?.type)) {
    if (screenplayApiRef.current) {
      screenplayApiRef.current.insertTextAtCursor(normalized)
      return
    }
    // Fallback: append to end
    // ...
  }

  // Prose handling
  const paragraphs = normalized.split(/\n{2,}/).map(...)
  const htmlSnippet = paragraphs.map((paragraph) =>
    `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`
  ).join('')

  if (tiptapApiRef.current) {
    tiptapApiRef.current.insertHtmlAtCursor(htmlSnippet)
    return
  }

  // Fallback: setContent
}
```

---

## 4. Test Scenarios & Expected Behavior

### Scenario A: Prose Editor - Cursor in Middle of Paragraph

**Setup:** Cursor positioned mid-sentence: "The quick brown | jumps over the lazy dog"

**AI Response:** "fluffy cat"

**Expected:**
```
The quick brown fluffy cat jumps over the lazy dog
                          ^ cursor here
```

**Status:** ✅ Should work correctly (Tiptap native behavior)

---

### Scenario B: Prose Editor - Text Selected

**Setup:** "The quick [brown fox] jumps" (brackets = selection)

**AI Response:** "red panda"

**Expected:**
```
The quick red panda jumps
                   ^ cursor here
```

**Status:** ✅ Should work correctly (`.deleteSelection()` handles this)

---

### Scenario C: Prose Editor - Multi-Paragraph AI Response

**Setup:** Cursor at: "Chapter 1|"

**AI Response:**
```
The storm arrived without warning.

Thunder echoed across the valley.
```

**Expected:**
```html
<p>Chapter 1The storm arrived without warning.</p>
<p>Thunder echoed across the valley.</p>
         ^ cursor here (after last paragraph)
```

**Status:** ✅ Should work correctly (HTML insertion preserves structure)

---

### Scenario D: Screenplay - Cursor in ACTION Element

**Setup:** Element 3, position 15: "John walks into the room|."

**AI Response:** " He looks around nervously"

**Expected:**
```
ELEMENT 3 (ACTION): John walks into the room. He looks around nervously.
                                                                      ^ cursor here
```

**Status:** ✅ Should work correctly

---

### Scenario E: Screenplay - Multi-Paragraph AI Response at Cursor

**Setup:** Element 5, position 20: "The detective pauses|"

**AI Response:**
```
, studying the evidence.

He picks up the photograph.
```

**Expected (CURRENT BEHAVIOR):**
```
ELEMENT 5 (ACTION): The detective pauses, studying the evidence.

He picks up the photograph.
                           ^ cursor here (all inline)
```

**Status:** ⚠️ **ISSUE FOUND** - Multi-paragraph text inserted inline, preserves `\n\n` literally
- Could feel unnatural for screenplay format
- Should probably split into multiple elements instead

---

### Scenario F: Screenplay - No Cursor (User Never Clicked)

**Setup:** Fresh screenplay, user has never focused any element

**AI Response:**
```
EXT. CITY STREET - DAY

A lone figure walks through the rain.
```

**Expected:**
```
[...existing elements...]
NEW ELEMENT (ACTION): EXT. CITY STREET - DAY
NEW ELEMENT (ACTION): A lone figure walks through the rain.
^ focus and cursor at start of first new element
```

**Status:** ✅ Should work correctly (fallback append mode)

---

## 5. Findings Summary

### ✅ Working Well

1. **Tiptap (Prose)**: Rock-solid implementation using native editor APIs
2. **Screenplay inline insertion**: Accurate cursor positioning
3. **Selection replacement**: Works in both editors
4. **Fallback handling**: Graceful degradation when API not ready
5. **Line ending normalization**: Consistent `\r\n` → `\n` conversion

### ⚠️ Issues Identified

#### Issue #1: Screenplay Multi-Paragraph Inline Insertion
**Problem:** When cursor is active in screenplay element, multi-paragraph AI responses are inserted as single inline text with literal `\n\n` characters, rather than creating new screenplay elements.

**Example:**
```
// User has cursor in element
// AI returns: "Text 1\n\nText 2\n\nText 3"
// Result: All goes into one element as "Text 1\n\nText 2\n\nText 3"
// Expected: Should probably split into 3 ACTION elements
```

**Severity:** Medium - Affects UX when AI generates multi-paragraph screenplay content

**Recommendation:** Enhance `insertTextAtCursor` to detect multi-paragraph content and create new elements after cursor position

---

### Issue #2: No Error Boundaries
**Problem:** No try-catch or error handling if:
- Editor is unmounted during insertion
- Selection APIs throw errors
- `requestAnimationFrame` callbacks execute after component unmount

**Severity:** Low - Edge case, unlikely to occur in practice

**Recommendation:** Add error boundaries and null checks

---

## 6. Recommended Improvements

### High Priority

**1. Fix Screenplay Multi-Paragraph Handling**

```typescript
// In screenplay-editor.tsx insertTextAtCursor:
if (index != null && currentElements[index]) {
  const target = currentElements[index]

  // Check if normalized text contains paragraph breaks
  const hasParagraphBreaks = /\n{2,}/.test(normalized)

  if (hasParagraphBreaks) {
    // Split into segments
    const segments = normalized.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)

    // Insert first segment at cursor
    const firstSegment = segments[0]
    const before = target.content.slice(0, start)
    const after = target.content.slice(end)
    const updatedContent = formatContent(`${before}${firstSegment}${after}`, target.type)

    // Create new elements for remaining segments
    const newElements = segments.slice(1).map(segment => ({
      id: generateElementId(),
      type: 'action' as ElementType,
      content: formatContent(segment, 'action'),
    }))

    updateElements((current) => {
      const next = [...current]
      next[index] = { ...next[index], content: updatedContent }
      // Insert new elements after current
      next.splice(index + 1, 0, ...newElements)
      return next
    })

    requestAnimationFrame(() => {
      // Focus last created element
      const lastIndex = index + segments.length - 1
      focusAndSetSelection(lastIndex, inputRefs.current[lastIndex]?.value.length ?? 0)
    })
    return
  }

  // Original inline insertion logic for single-paragraph content
  // ...
}
```

---

### Medium Priority

**2. Add Error Handling**

```typescript
const insertHtmlAtCursor = (html: string) => {
  try {
    if (!html || !editor) return
    if (editor.isDestroyed) {
      console.warn('Cannot insert: editor destroyed')
      return
    }
    editor.chain().focus().deleteSelection().insertContent(html).run()
  } catch (error) {
    console.error('TiptapEditor insertHtmlAtCursor error:', error)
  }
}
```

---

### Low Priority

**3. Add Selection State Logging (Dev Mode)**

For debugging purposes:

```typescript
const rememberSelection = useCallback((index: number, target: HTMLTextAreaElement) => {
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  selectionRef.current = { index, start, end }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[ScreenplayEditor] Selection:', { index, start, end })
  }
}, [])
```

---

## 7. Manual Testing Checklist

### Prose Editor Tests
- [ ] Insert AI text with cursor mid-paragraph
- [ ] Insert AI text with text selection
- [ ] Insert multi-paragraph AI response
- [ ] Insert with cursor at start of document
- [ ] Insert with cursor at end of document
- [ ] Insert while editor doesn't have focus
- [ ] Verify scroll-to-caret behavior

### Screenplay Editor Tests
- [ ] Insert single-line text at cursor in ACTION element
- [ ] Insert single-line text at cursor in DIALOGUE element
- [ ] Insert with selection (replace mode)
- [ ] Insert multi-paragraph AI response at cursor ⚠️
- [ ] Insert when no element has focus (append mode)
- [ ] Insert at start of element
- [ ] Insert at end of element
- [ ] Verify uppercase formatting for SCENE/CHARACTER insertions

---

## 8. Conclusion

**Overall Assessment: GOOD with one medium-priority issue**

The AI insertion implementation is solid for most use cases:
- Prose editor uses native Tiptap APIs correctly
- Screenplay editor has comprehensive selection tracking
- Both handle basic insertion and selection replacement well

**Main Issue:** Screenplay multi-paragraph insertion at cursor needs enhancement to split content into multiple elements rather than inserting inline.

**Recommendation:** Implement the multi-paragraph fix for screenplay editor, then perform manual testing to verify natural UX.
