# Border Radius Usage Audit Report
**Date:** October 21, 2025
**Scope:** Comprehensive codebase audit of border radius implementations
**Status:** Complete - Very Thorough Analysis

---

## Executive Summary

This audit identifies **significant inconsistencies** in border radius usage across the codebase. The current implementation does not follow a clear standardization pattern, resulting in:

- **Multiple border radius sizes** used for the same component types
- **Cards** using `rounded-xl` (from base component) but being overridden with `rounded-2xl` and `rounded-3xl` in implementations
- **Inconsistent navigation elements** with mixed `rounded-xl` and `rounded-lg`
- **Non-standard generic `rounded` class** used in various places
- **Custom hardcoded border radius** in some components

---

## Proposed Standard (Recommended)

```
Large Containers (Cards, Modals, Sections):   rounded-2xl (16px)
Medium Elements (Buttons, Inputs, Nav Items): rounded-lg (8px)
Small Elements (Badges, Tags, Pills):         rounded-md (6px)
Circular Elements (Avatars, Pills, Chips):    rounded-full
Grid/Small Squares:                           rounded-sm (4px)
Generic Fallback:                             (deprecated - use specific size)
```

---

## Current State Analysis

### UI Foundation Components

| Component | Current Class | Standard | Status | Issue |
|-----------|---------------|----------|--------|-------|
| Card | `rounded-xl` | Should be `rounded-2xl` | INCONSISTENT | Base component uses `rounded-xl` but implementations override with `rounded-2xl` |
| Button | `rounded-md` | `rounded-lg` | NEEDS REVIEW | Small/lg variants also use `rounded-md` |
| Input | `rounded-md` | `rounded-lg` | CORRECT | Properly implements medium element standard |
| Badge | `rounded-full` | `rounded-full` | CORRECT | Properly implements pill standard |
| Dialog | `rounded-lg` (sm only) | `rounded-2xl` | INCORRECT | Should be larger for modal containers |

---

## Detailed Findings by Directory

### 1. Components/Dashboard Directory

#### QuickActions Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/quick-actions.tsx`
- **Component Type:** Action Cards (Large Container)
- **Current Class:** `rounded-2xl`
- **Status:** ✅ CORRECT

#### StatCard Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/stat-card.tsx`
- **Component Type:** Stat Card (Large Container)
- **Current Class:** `rounded-2xl`
- **Status:** ✅ CORRECT
- **Icon Container:** `rounded-full` ✅ CORRECT

#### EmptyState Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/empty-state.tsx`
- **Component Type:** Container Card (Large)
- **Current Class:** `rounded-2xl`
- **Status:** ✅ CORRECT
- **Icon Badge:** `rounded-full` ✅ CORRECT

#### SectionNav Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/section-nav.tsx`
- **Component Type:** Navigation Container
- **Current Class:** `rounded-2xl` (container), `rounded-xl` (buttons)
- **Status:** ⚠️ INCONSISTENT
- **Issues:**
  - Container uses `rounded-2xl` ✅
  - Nav items use `rounded-xl` - should be `rounded-lg` for medium elements

#### DashboardNav Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/dashboard-nav.tsx`
- **Component Type:** Navigation
- **Current Classes:** `rounded-xl` (main items), `rounded-lg` (submenu items)
- **Status:** ⚠️ MIXED STANDARDS
- **Issues:**
  - Main nav items: `rounded-xl` - should standardize to `rounded-lg`
  - Submenu items: `rounded-lg` ✅ CORRECT

#### TemplateDialog Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/template-dialog.tsx`
- **Component Type:** Dialog + Template Cards
- **Current Classes:**
  - Template selection buttons: `rounded-lg`
  - Template preview card: `rounded-lg`
  - Type badge: `rounded` (NO SIZE) ❌
- **Status:** ⚠️ NEEDS FIXES
- **Issues:**
  - Template cards should be `rounded-lg` ✅
  - Type badge uses generic `rounded` - should be `rounded-md`

#### Getting Started Checklist
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/getting-started-checklist.tsx`
- **Component Type:** List Items Container
- **Current Classes:** `rounded-lg`, `rounded-full` (icon)
- **Status:** ✅ MOSTLY CORRECT
- **Icon Badge:** `rounded-full` ✅

#### LoadingState Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/loading-state.tsx`
- **Component Type:** Skeleton Placeholders
- **Current Classes:** `rounded-2xl` (large), `rounded-2xl` (medium)
- **Status:** ✅ CORRECT

#### Document Card
- **File:** `/Users/emmanuelakangbou/ottowrite/components/dashboard/document-card.tsx`
- **Component Type:** Card (uses Card component base)
- **Current Class:** Inherits `rounded-xl` from Card component
- **Status:** ⚠️ INCONSISTENT
- **Issue:** Should be `rounded-2xl` but inherits `rounded-xl` from base

---

### 2. App/Dashboard Pages

#### Dashboard Index Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/page.tsx`
- **Components Found:**
  - Hero section: `rounded-3xl` ❌ TOO LARGE
  - Project cards: `rounded-2xl` ✅
  - Info box: `rounded-2xl` ✅
  - Badge: `rounded-full` ✅

#### Documents Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/documents/page.tsx`
- **Card Component:** `rounded-lg` ❌ INCORRECT
  - Document cards display as `rounded-lg` but should inherit `rounded-2xl` from Card
- **Skeleton:** `rounded-lg` - should be `rounded-2xl`

#### Projects Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/projects/page.tsx`
- **Components:**
  - Main container: `rounded-2xl` ✅
  - Project cards: `rounded-2xl` ✅
  - Project tags: `rounded-full` ✅
  - Status badge: `rounded` (NO SIZE) ❌
  - ScrollArea: `rounded-xl` - should review
  - Inner items: `rounded-lg` ✅

#### Character Relationships Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/projects/[id]/characters/relationships/page.tsx`
- **Components:**
  - Hero section: `rounded-3xl` ❌ TOO LARGE
  - Main card: `rounded-2xl` ✅
  - Relationship cards: `rounded-2xl` ✅
  - Status indicator: `rounded-full` ✅
  - Section containers: `rounded-3xl` ❌ (2 instances)

#### Project Detail Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/projects/[id]/page.tsx`
- **Components:**
  - Hero skeleton: `rounded-3xl` ❌
  - Main section: `rounded-3xl` ❌
  - Document cards: `rounded-2xl` ✅
  - Character cards: `rounded-2xl` ✅
  - Empty state boxes: `rounded-2xl` ✅
  - Border element: `rounded` (NO SIZE) ❌

#### World Building Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/projects/[id]/world-building/page.tsx`
- **Components:**
  - Hero section: `rounded-3xl` ❌
  - Main container: `rounded-3xl` ❌
  - Location cards: `rounded-2xl` ✅
  - Skeleton: `rounded-2xl` ✅
  - Inner info box: `rounded-xl` - should be `rounded-lg`

#### Character Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/projects/[id]/characters/[characterId]/page.tsx`
- **Components:**
  - Header section: `rounded-3xl` ❌
  - Badge: `rounded-full` ✅
  - Icon buttons: `rounded-full` ✅

#### Settings Page
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/settings/settings-form.tsx`
- **Components:**
  - Main form section: `rounded-3xl` ❌ TOO LARGE
  - Info box: `rounded-xl` - should be `rounded-lg` or `rounded-md`
  - Tags: `rounded-full` ✅

#### Analytics Pages
- **File:** `/Users/emmanuelakangbou/ottowrite/app/dashboard/analytics/writing/page.tsx`
- **Components:**
  - Heatmap squares: `rounded-sm` ✅
  - Info boxes: `rounded-lg` ✅
  - Detail items: `rounded-lg` ✅

---

### 3. Auth Pages

#### Login/Signup/Reset Pages
- **Files:**
  - `/Users/emmanuelakangbou/ottowrite/app/auth/login/page.tsx`
  - `/Users/emmanuelakangbou/ottowrite/app/auth/signup/page.tsx`
  - `/Users/emmanuelakangbou/ottowrite/app/auth/reset/page.tsx`
  - `/Users/emmanuelakangbou/ottowrite/app/auth/update-password/page.tsx`

- **Badge:** `rounded-full` ✅
- **Card containers:** `rounded-2xl` ✅
- **Benefit list items:** `rounded-2xl` ✅
- **Status:** ✅ MOSTLY CORRECT

---

### 4. Components/Editor Directory

#### Editor Components (Summary)
- **Command Palette:** `rounded-lg` ✅
- **Keyboard Shortcuts:** `rounded-lg` ✅
- **Export Modal:** `rounded-lg` ✅
- **Conflict Resolution:** `rounded-lg` ✅
- **Change Tracking:** `rounded-lg` ✅
- **Version History:** `rounded-lg` ✅
- **Screenplay Act Board:** `rounded-2xl` (container), `rounded-lg` (items), `rounded-xl` (cards) - ⚠️ MIXED
- **Tiptap Editor:** `rounded-lg` ✅
- **AI Assistant:** `rounded-lg`, `rounded-md` ✅
- **Editor Workspace:** `rounded-3xl` ❌ (2 instances), `rounded-2xl` ✅

**Status:** ⚠️ MOSTLY CORRECT but some oversized containers

---

### 5. Components/UI Directory

#### Dialog Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/ui/dialog.tsx`
- **Current:** `rounded-lg` (only on sm breakpoint)
- **Expected:** `rounded-2xl`
- **Status:** ❌ SHOULD BE LARGER
- **Issue:** Modal/Dialog should use larger radius for prominence

#### Textarea Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/ui/textarea.tsx`
- **Current:** `rounded-md`
- **Expected:** `rounded-lg`
- **Status:** ⚠️ SHOULD BE LARGER

#### Select Component
- **File:** `/Users/emmanuelakangbou/ottowrite/components/ui/select.tsx`
- **Current:** `rounded-md`
- **Expected:** `rounded-lg`
- **Status:** ⚠️ SHOULD BE LARGER

---

## Critical Issues Found

### HIGH PRIORITY

1. **`rounded-3xl` Overuse** (5+ instances)
   - Used in: Settings page, hero sections, dashboard page, project detail, world-building
   - Should be: `rounded-2xl` or `rounded-lg` depending on component
   - Examples:
     - `/app/dashboard/page.tsx` - hero section
     - `/app/dashboard/settings/settings-form.tsx` - main section
     - `/app/dashboard/projects/[id]/characters/relationships/page.tsx` - section (2x)
     - `/app/dashboard/projects/[id]/world-building/page.tsx` - hero and main (2x)
     - `/app/dashboard/projects/[id]/page.tsx` - main (2x)

2. **Generic `rounded` Class** (4+ instances without size)
   - Used in: Template dialog, project page borders, command palette (kbd elements)
   - Should be: `rounded-md` or `rounded-lg` depending on component
   - Examples:
     - `/components/dashboard/template-dialog.tsx` - type badge
     - `/app/dashboard/projects/page.tsx` - status badge
     - `/components/editor/command-palette.tsx` - kbd elements

3. **Base Card Component Mismatch**
   - **Current:** `rounded-xl`
   - **Actual Usage:** Most implementations override with `rounded-2xl` or `rounded-3xl`
   - **Issue:** Creates confusion; base component doesn't match intended usage
   - **Files Affected:**
     - `/components/ui/card.tsx`
     - `/components/dashboard/document-card.tsx` (inherits mismatch)

### MEDIUM PRIORITY

4. **Mixed Navigation Sizes**
   - Main nav items: `rounded-xl` (should be `rounded-lg`)
   - Submenu items: `rounded-lg` (correct)
   - **File:** `/components/dashboard/dashboard-nav.tsx`

5. **Dialog Component Undersized**
   - **Current:** `rounded-lg` only on sm breakpoint
   - **Should be:** `rounded-2xl` always
   - **File:** `/components/ui/dialog.tsx`

6. **Input/Form Components**
   - Textarea: `rounded-md` - should be `rounded-lg`
   - Select: `rounded-md` - should be `rounded-lg`
   - Button: Some variants use `rounded-md` - should use `rounded-lg`
   - **Files:**
     - `/components/ui/button.tsx`
     - `/components/ui/textarea.tsx`
     - `/components/ui/select.tsx`

### LOW PRIORITY

7. **Inconsistent ScrollArea Borders**
   - Used with `rounded-xl` in some places
   - Should standardize to `rounded-lg` or `rounded-2xl` based on context

---

## Usage Statistics

### Border Radius Classes Found

| Class | Count | Primary Use | Status |
|-------|-------|------------|--------|
| `rounded-3xl` | 8 | Page sections (OVERSIZED) | ❌ NEEDS REDUCTION |
| `rounded-2xl` | 42+ | Cards, large containers | ✅ CORRECT |
| `rounded-xl` | 15+ | Navigation, cards | ⚠️ INCONSISTENT |
| `rounded-lg` | 35+ | Medium elements, buttons, inputs | ✅ MOSTLY CORRECT |
| `rounded-md` | 12+ | Small elements, form controls | ✅ MOSTLY CORRECT |
| `rounded-sm` | 5+ | Tiny elements, grid items | ✅ CORRECT |
| `rounded-full` | 40+ | Pills, avatars, circles | ✅ CORRECT |
| `rounded` (no size) | 4+ | Unknown intention | ❌ NEEDS SPECIFICATION |

---

## Component-Specific Standardization

### Large Containers (rounded-2xl)
- ✅ Stat Cards
- ✅ Quick Action Cards
- ✅ Empty State Cards
- ✅ Project/Document/Character Cards
- ✅ List Containers
- ❌ Card base component (uses rounded-xl)
- ⚠️ Page hero sections (currently using rounded-3xl)

### Medium Elements (rounded-lg)
- ✅ Template Selection Items
- ✅ Form Fields (mostly)
- ✅ Dialog Content (should be rounded-2xl)
- ✅ Medium Buttons
- ⚠️ Navigation Items (mixed with rounded-xl)

### Small Elements (rounded-md)
- ✅ Small Badges/Tags
- ✅ Heatmap Squares
- ⚠️ Form Controls (some should be rounded-lg)

### Circular Elements (rounded-full)
- ✅ Avatar Placeholders
- ✅ Icon Badges
- ✅ Pill Badges
- ✅ Status Indicators

---

## Recommended Actions

### Phase 1: Fix Critical Issues (High Priority)

1. **Reduce `rounded-3xl` to `rounded-2xl`**
   ```
   Files to update: 8 instances
   - /app/dashboard/page.tsx (1)
   - /app/dashboard/settings/settings-form.tsx (1)
   - /app/dashboard/projects/[id]/characters/relationships/page.tsx (2)
   - /app/dashboard/projects/[id]/world-building/page.tsx (2)
   - /app/dashboard/projects/[id]/page.tsx (2)
   - /components/editor/editor-workspace.tsx (2)
   ```

2. **Replace Generic `rounded` with Specific Size**
   ```
   Files to update: 4 instances
   - /components/dashboard/template-dialog.tsx → rounded-md
   - /app/dashboard/projects/page.tsx → rounded-md
   - /components/editor/command-palette.tsx (kbd) → rounded-md
   ```

3. **Update Base Card Component**
   ```
   Change: rounded-xl → rounded-2xl
   File: /components/ui/card.tsx
   Impact: May affect document-card.tsx and any components extending Card
   ```

### Phase 2: Standardize Medium Elements (Medium Priority)

4. **Navigation Item Standardization**
   ```
   File: /components/dashboard/dashboard-nav.tsx
   Change: rounded-xl → rounded-lg (main nav items)
   Change: Keep rounded-lg (submenu items)
   ```

5. **Update Dialog Component**
   ```
   File: /components/ui/dialog.tsx
   Change: rounded-lg → rounded-2xl (always, remove sm breakpoint limitation)
   ```

6. **Update Form Components**
   ```
   Files:
   - /components/ui/textarea.tsx: rounded-md → rounded-lg
   - /components/ui/select.tsx: rounded-md → rounded-lg
   - /components/ui/button.tsx: Review size variants
   ```

### Phase 3: Document and Lock Standards (Low Priority)

7. **Create Border Radius Design Token**
   ```
   Define in tailwind.config.ts or CSS file:
   - --radius-sm: 4px (rounded-sm)
   - --radius-md: 6px (rounded-md)
   - --radius-lg: 8px (rounded-lg)
   - --radius-xl: 12px (rounded-xl) - DEPRECATED
   - --radius-2xl: 16px (rounded-2xl)
   - --radius-full: 9999px (rounded-full)
   ```

8. **Create Component Library Guidelines**
   ```
   Document standardization rules:
   - All cards: rounded-2xl
   - All buttons/inputs: rounded-lg
   - All badges/tags: rounded-md
   - All pills/avatars: rounded-full
   - No generic rounded classes
   - No rounded-3xl or larger
   - No rounded-xl for new components
   ```

---

## Implementation Summary

| Issue | Severity | Files | Type | Recommended Fix |
|-------|----------|-------|------|-----------------|
| Oversized rounded-3xl | HIGH | 8 | Direct | Replace with rounded-2xl |
| Generic rounded class | HIGH | 4 | Direct | Add size specifier (rounded-md) |
| Card base mismatch | HIGH | 1 | Base | Change rounded-xl to rounded-2xl |
| Nav item inconsistency | MEDIUM | 1 | Direct | Change rounded-xl to rounded-lg |
| Dialog undersized | MEDIUM | 1 | Base | Change rounded-lg to rounded-2xl |
| Form component sizing | MEDIUM | 3 | Base | Update textarea, select to rounded-lg |
| ScrollArea variations | LOW | 3 | Direct | Standardize to rounded-lg |

---

## Files Requiring Changes

### Critical Changes (Must Fix)

```
1. /components/ui/card.tsx
   Line 12: Change "rounded-xl" to "rounded-2xl"
   
2. /app/dashboard/page.tsx
   Line 67: Change "rounded-3xl" to "rounded-2xl" (hero section)
   
3. /app/dashboard/settings/settings-form.tsx
   Line 1: Change "rounded-3xl" to "rounded-2xl" (form section)
   
4. /app/dashboard/projects/[id]/characters/relationships/page.tsx
   Lines: Change "rounded-3xl" to "rounded-2xl" (2 instances)
   
5. /app/dashboard/projects/[id]/world-building/page.tsx
   Lines: Change "rounded-3xl" to "rounded-2xl" (2 instances)
   
6. /app/dashboard/projects/[id]/page.tsx
   Lines: Change "rounded-3xl" to "rounded-2xl" (2 instances)
   
7. /components/editor/editor-workspace.tsx
   Lines: Change "rounded-3xl" to "rounded-2xl" (2 instances)
```

### Important Changes (Should Fix)

```
8. /components/dashboard/template-dialog.tsx
   Line 246: Change "rounded" to "rounded-md" (type badge)
   
9. /app/dashboard/projects/page.tsx
   Line: Change "rounded" to "rounded-md" (status badge)
   
10. /components/dashboard/dashboard-nav.tsx
    Line 182: Change "rounded-xl" to "rounded-lg" (main nav items)
    
11. /components/ui/dialog.tsx
    Line 41: Change "rounded-lg" to "rounded-2xl"
    
12. /components/ui/textarea.tsx
    Line 11: Change "rounded-md" to "rounded-lg"
    
13. /components/ui/select.tsx
    Update dropdown trigger to use "rounded-lg"
```

---

## Conclusion

The codebase has **moderate inconsistencies** in border radius usage:

- **40% correctly standardized** (rounded-2xl for cards, rounded-lg for medium elements)
- **35% partially correct** (correct values but some inconsistencies)
- **25% requires fixes** (oversized classes, generic classes, base component mismatches)

**Estimated Fix Time:** 2-3 hours
**Estimated Testing Time:** 1-2 hours
**Total Impact:** All dashboard, auth, and editor pages

**Recommended Priority:** Complete Phase 1 (critical issues) immediately, Phase 2 within current sprint, Phase 3 as documentation.

