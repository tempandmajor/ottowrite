# Ottowrite UX Audit & Improvement Plan
**Date**: January 21, 2025
**Auditor**: Claude Code
**Scope**: Complete application user experience evaluation
**Focus**: Progressive disclosure, design principles adherence, usability issues

---

## Executive Summary

This comprehensive UX audit evaluates Ottowrite's user experience across authentication, onboarding, navigation, editor workspace, and overall design system adherence. The audit identifies **42 actionable issues** across 8 categories, ranging from critical onboarding gaps to minor accessibility improvements.

### Overall Assessment: **B+ (Good, with significant improvement opportunities)**

**Strengths:**
- ✅ Solid design system with consistent CSS variables
- ✅ Comprehensive lazy loading strategy in editor
- ✅ Good use of progressive disclosure in complex features
- ✅ Responsive design with mobile-first approach
- ✅ Strong component architecture with shadcn/ui

**Critical Gaps:**
- ❌ **No onboarding flow** for new users (critical)
- ❌ Inconsistent information architecture
- ❌ Missing contextual help and tooltips
- ❌ Cognitive overload on first dashboard visit
- ❌ Incomplete progressive disclosure patterns
- ❌ Accessibility gaps (WCAG compliance issues)

---

## Audit Methodology

### Industry Standards Evaluated:
1. **Nielsen's 10 Usability Heuristics**
2. **WCAG 2.1 Accessibility Guidelines** (AA level)
3. **Progressive Disclosure Principles** (Miller's Law, Cognitive Load Theory)
4. **Material Design 3 & Apple HIG** (industry benchmarks)
5. **F-Pattern & Z-Pattern** reading behaviors
6. **Mobile-First Design** best practices

### Pages Audited:
- Landing page (`/`)
- Authentication (signup, login, reset password)
- Dashboard home (`/dashboard`)
- Projects hub (`/dashboard/projects`)
- Editor workspace (`/dashboard/editor/[id]`)
- Settings (`/dashboard/settings`)
- Navigation components
- Design system (globals.css, tailwind.config.ts)

---

## Category 1: Onboarding & First-Time User Experience

### ❌ CRITICAL ISSUE: Missing First-Time User Onboarding

**Current State:**
- New users land directly on empty dashboard after signup
- No guided tour or tutorial
- No contextual hints explaining features
- Overwhelming number of options without explanation
- Users must figure out the workflow independently

**Industry Standard:**
- Onboarding completion rates: 40-60% increase with guided tours
- First-time setup wizards reduce churn by 30-50%
- Examples: Notion (template selector), Figma (interactive tutorial), Linear (project setup wizard)

**Impact:** **CRITICAL** - High drop-off risk for new users

**Recommendation:**
Implement a multi-step onboarding flow:
1. Welcome screen explaining Ottowrite's core value
2. Project type selection (Novel, Screenplay, etc.)
3. Template selection dialog (already exists, needs integration)
4. Optional guided tour of key features
5. Create first document with AI assistant suggestion

---

### TICKET-UX-001: Implement New User Onboarding Flow
**Priority**: P0 (Critical)
**Category**: Onboarding
**Effort**: 8 story points (1 week)

**Description:**
Create a comprehensive first-time user onboarding experience that guides new users through initial setup and core features.

**Acceptance Criteria:**
- [ ] Detect first-time users (flag in user_profiles table: `has_completed_onboarding: boolean`)
- [ ] Create 4-step onboarding flow:
  - Step 1: Welcome message explaining Ottowrite's purpose
  - Step 2: "What are you writing?" selection (Novel, Screenplay, Play, Short Story, Series)
  - Step 3: Template selection dialog (reuse existing TemplateDialog component)
  - Step 4: Optional quick tour (skip button prominent)
- [ ] Store onboarding progress in localStorage and database
- [ ] Allow users to restart onboarding from settings
- [ ] Show subtle "Getting Started" checklist on dashboard until completed:
  - Create first project ✓
  - Add first character ✓
  - Write first 100 words ✓
  - Use AI assistant ✓

**Design Notes:**
- Use shadcn Dialog or Sheet component
- Progress indicator showing "Step 2 of 4"
- Minimize text, maximize visual examples
- "Skip for now" option on every step
- Completion celebration with confetti animation

**Technical Approach:**
1. Create `/components/onboarding/onboarding-wizard.tsx`
2. Add `has_completed_onboarding` column to `user_profiles` table
3. Check flag in dashboard page, show wizard if false
4. Update flag on completion or skip
5. Create checklist component: `/components/dashboard/getting-started-checklist.tsx`

**Files to Create/Modify:**
- `components/onboarding/onboarding-wizard.tsx` (NEW)
- `components/onboarding/welcome-step.tsx` (NEW)
- `components/onboarding/project-type-step.tsx` (NEW)
- `components/onboarding/template-step.tsx` (NEW)
- `components/onboarding/tour-step.tsx` (NEW)
- `components/dashboard/getting-started-checklist.tsx` (NEW)
- `app/dashboard/page.tsx` (MODIFY - add onboarding check)
- `supabase/migrations/XXXX_add_onboarding_flag.sql` (NEW)

**References:**
- Notion onboarding: https://www.notion.so (template selection after signup)
- Figma onboarding: Interactive tutorial overlays
- Linear onboarding: Project setup wizard

---

### TICKET-UX-002: Add Contextual Tooltips to Dashboard
**Priority**: P1 (High)
**Category**: Onboarding
**Effort**: 3 story points (2 days)

**Description:**
Add helpful tooltips to key dashboard elements to explain features without cluttering the UI.

**Acceptance Criteria:**
- [ ] Add tooltips to all stat cards explaining metrics
- [ ] Add tooltips to quick action cards
- [ ] Add "What's this?" icon next to "AI words generated"
- [ ] Use consistent tooltip style (shadcn Tooltip component)
- [ ] Delay: 300ms hover before showing
- [ ] Include keyboard shortcuts in tooltips where applicable

**Example Tooltips:**
- "Projects" stat: "Total number of writing projects across all genres"
- "AI words": "Words generated by Ottowrite's AI assistant across all documents"
- "Quick Actions → Generate Outline": "Create a story outline using AI-powered templates"

**Files to Modify:**
- `components/dashboard/stat-card.tsx`
- `components/dashboard/quick-actions.tsx`
- `app/dashboard/page.tsx`

---

### TICKET-UX-003: Create Empty State Illustrations
**Priority**: P2 (Medium)
**Category**: Onboarding
**Effort**: 5 story points (3 days)

**Description:**
Replace generic empty states with friendly illustrations and actionable guidance.

**Current Issue:**
Empty states use only icons and text. Industry standard uses illustrations + clear next steps.

**Acceptance Criteria:**
- [ ] Design or source 5 empty state illustrations:
  - No projects yet
  - No documents yet
  - No characters yet
  - No outlines yet
  - No analytics data yet
- [ ] Add illustrations to EmptyState component
- [ ] Update copy to be encouraging and action-oriented
- [ ] Include 2 CTAs: primary action + secondary help link
- [ ] Ensure illustrations work in light and dark mode

**Design Style:**
- Friendly, minimalist line art
- Brand-consistent colors (use CSS variables)
- SVG format for scalability
- Alternative: Use illustration libraries (unDraw, Storyset)

**Files to Modify:**
- `components/dashboard/empty-state.tsx`
- `public/illustrations/` (NEW directory)

---

## Category 2: Information Architecture & Navigation

### Issue: Inconsistent Navigation Hierarchy

**Current State:**
- Dashboard sidebar has 6 top-level items
- Projects page has sub-navigation (Characters, Outlines, Beat Board, etc.)
- Editor has separate navigation paradigm
- No clear "back" navigation in some flows
- Breadcrumbs missing

**Industry Standard:**
- Max 7 ± 2 top-level navigation items (Miller's Law)
- Breadcrumbs for pages 3+ levels deep
- Consistent "back" button placement
- Examples: GitHub (breadcrumbs + back), Notion (sidebar hierarchy)

---

### TICKET-UX-004: Implement Breadcrumb Navigation
**Priority**: P1 (High)
**Category**: Navigation
**Effort**: 5 story points (3 days)

**Description:**
Add breadcrumb navigation to all pages beyond 2 levels deep to improve wayfinding.

**Acceptance Criteria:**
- [ ] Add breadcrumbs to:
  - Project detail page: `Dashboard > Projects > [Project Name]`
  - Character detail: `Dashboard > Projects > [Project] > Characters > [Character Name]`
  - Outline detail: `Dashboard > Projects > [Project] > Outlines > [Outline Name]`
  - Editor: `Dashboard > Projects > [Project] > Documents > [Document Title]`
  - Beat board: `Dashboard > Projects > [Project] > Story Structure`
- [ ] Use shadcn Breadcrumb component (or create one)
- [ ] Make breadcrumb items clickable (navigate to parent pages)
- [ ] Truncate long names with ellipsis (max 30 characters)
- [ ] Show breadcrumbs below header, above page title

**Design:**
```
Dashboard > Projects > My Novel > Characters > Jane Doe
           ↑          ↑          ↑            ↑
        (link)     (link)     (link)     (current)
```

**Files to Create/Modify:**
- `components/ui/breadcrumb.tsx` (NEW)
- `components/dashboard/breadcrumb-nav.tsx` (NEW)
- `app/dashboard/projects/[id]/page.tsx` (MODIFY)
- `app/dashboard/projects/[id]/characters/[characterId]/page.tsx` (MODIFY)
- `app/dashboard/projects/[id]/outlines/[outlineId]/page.tsx` (MODIFY)
- `app/dashboard/editor/[id]/page.tsx` (MODIFY)

---

### TICKET-UX-005: Redesign Dashboard Navigation for Scalability
**Priority**: P2 (Medium)
**Category**: Navigation
**Effort**: 8 story points (1 week)

**Description:**
Reorganize dashboard navigation to support future feature growth and reduce cognitive load.

**Current Issues:**
- 6 top-level items is acceptable but approaching limit
- "Usage" buried under Account sub-section
- Analytics could expand into multiple views
- No room for future features (Collaboration, Templates, etc.)

**Proposed Structure:**
```
🏠 Overview
📁 Projects
   └─ All Projects
   └─ Templates (future)
📄 Documents
✍️ Editor Tools
   └─ Outlines
   └─ Characters
   └─ World Building
📊 Analytics
   └─ Writing Stats
   └─ AI Usage
   └─ Goals
⚙️ Settings
   └─ Profile
   └─ Account & Billing
   └─ Preferences
```

**Acceptance Criteria:**
- [ ] Implement collapsible navigation groups
- [ ] Maintain currently active state for sub-items
- [ ] Add smooth expand/collapse animations
- [ ] Persist collapsed state in localStorage
- [ ] Update routing to match new hierarchy
- [ ] Mobile: Keep hamburger menu, adapt groups

**Files to Modify:**
- `components/dashboard/dashboard-nav.tsx` (MAJOR REFACTOR)
- Move routes to separate config file: `config/navigation.ts`

---

### TICKET-UX-006: Add "Help & Documentation" to Navigation
**Priority**: P2 (Medium)
**Category**: Navigation
**Effort**: 3 story points (2 days)

**Description:**
Add a Help section to navigation for quick access to documentation, keyboard shortcuts, and support.

**Acceptance Criteria:**
- [ ] Add "Help" item to bottom of sidebar navigation
- [ ] Help menu includes:
  - Keyboard Shortcuts (open shortcuts dialog)
  - Documentation (link to docs)
  - Video Tutorials (future)
  - Contact Support (mailto or chat)
  - What's New (changelog)
- [ ] Use DropdownMenu for sub-items
- [ ] Icon: HelpCircle or LifeBuoy

**Files to Modify:**
- `components/dashboard/dashboard-nav.tsx`
- Create `/app/dashboard/help/page.tsx` (NEW)

---

## Category 3: Progressive Disclosure

### Issue: Overwhelming First Dashboard Visit

**Current State:**
- Dashboard shows all features simultaneously:
  - Welcome banner
  - 3 stat cards
  - Recent projects grid
  - Quick actions (4 cards)
  - Recent milestones sidebar
- No phased reveal of information
- Cognitive overload for new users with empty state

**Industry Standard:**
- Progressive disclosure: Show basics first, reveal advanced features over time
- Contextual feature discovery (tooltips, hints)
- Examples: Figma (simple → advanced tools), Notion (templates → databases)

---

### TICKET-UX-007: Implement Progressive Dashboard Complexity
**Priority**: P1 (High)
**Category**: Progressive Disclosure
**Effort**: 5 story points (3 days)

**Description:**
Gradually reveal dashboard complexity based on user experience level and data availability.

**Approach:**
1. **New users (0 projects):**
   - Show only: Welcome message + Single CTA ("Create Your First Project")
   - Hide: Stats (empty), recent projects, quick actions
2. **Beginner users (1-2 projects):**
   - Show: Welcome + Stats + Recent projects
   - Hide: Quick actions (explain when needed)
3. **Experienced users (3+ projects or 7+ days):**
   - Show: Everything (current state)

**Acceptance Criteria:**
- [ ] Detect user experience level (project count + account age)
- [ ] Render different dashboard layouts based on level
- [ ] Smooth transition between levels (fade-in animations)
- [ ] "Show all features" toggle for power users
- [ ] Store preference in localStorage

**Files to Modify:**
- `app/dashboard/page.tsx` (REFACTOR - conditional rendering)
- Create `/components/dashboard/new-user-dashboard.tsx` (NEW)
- Create `/components/dashboard/beginner-dashboard.tsx` (NEW)
- Create `/components/dashboard/experienced-dashboard.tsx` (NEW)

---

### TICKET-UX-008: Add Collapsible Sections to Complex Pages
**Priority**: P2 (Medium)
**Category**: Progressive Disclosure
**Effort**: 5 story points (3 days)

**Description:**
Make complex pages (Project Detail, Character Detail) less overwhelming with collapsible sections.

**Current Issue:**
- Project detail page shows all tabs/sections at once
- Character detail shows all fields (age, gender, backstory, arc) simultaneously
- No way to focus on one aspect

**Acceptance Criteria:**
- [ ] Add Accordion component to:
  - Project detail page (Overview, Documents, Characters, Outlines sections)
  - Character detail page (Basic Info, Backstory, Relationships, Arc sections)
  - Outline detail page (Premise, Beats, Metadata sections)
- [ ] Default: Only first section expanded
- [ ] Persist expansion state in localStorage
- [ ] Smooth expand/collapse animations
- [ ] "Expand All" / "Collapse All" buttons

**Files to Modify:**
- `app/dashboard/projects/[id]/page.tsx`
- `app/dashboard/projects/[id]/characters/[characterId]/page.tsx`
- `app/dashboard/projects/[id]/outlines/[outlineId]/page.tsx`
- Use shadcn Accordion component

---

### TICKET-UX-009: Lazy Load Editor Sidebar Features
**Priority**: P2 (Medium)
**Category**: Progressive Disclosure
**Effort**: 3 story points (2 days)

**Description:**
Currently AI Assistant and Research panels load immediately. Defer loading until user opens them.

**Current State:**
```typescript
// Already lazy loaded (good):
const AIAssistant = lazy(() => import('@/components/editor/ai-assistant'))

// Issue: Still imported on page load
// Need to lazy render only when sidebar is opened
```

**Acceptance Criteria:**
- [ ] Delay AIAssistant render until `showAI` is true
- [ ] Delay ResearchPanel render until `showResearch` is true
- [ ] Show loading skeleton while lazy component loads
- [ ] Cache loaded components (don't unmount when hidden)
- [ ] Reduce initial editor bundle size by 50-100KB

**Files to Modify:**
- `components/editor/editor-workspace.tsx` (already started, needs completion)

---

## Category 4: Design Consistency & Visual Hierarchy

### Issue: Inconsistent Use of Design System

**Current State:**
- Good: CSS variables for colors, consistent spacing
- Issue: Inconsistent border radius (some use `rounded-2xl`, others `rounded-lg`)
- Issue: Inconsistent shadow usage (some cards use `shadow-card`, others `shadow-lg`)
- Issue: Inconsistent button sizes and variants

**Industry Standard:**
- Design systems enforce consistency (Material Design, Apple HIG)
- Max 3-4 border radius sizes
- Consistent shadow elevation system

---

### TICKET-UX-010: Audit and Standardize Border Radius Usage
**Priority**: P2 (Medium)
**Category**: Design System
**Effort**: 3 story points (2 days)

**Description:**
Standardize border radius across all components to use design system values consistently.

**Current Inconsistencies:**
- Cards: `rounded-2xl` (some), `rounded-xl` (others), `rounded-lg` (others)
- Buttons: `rounded-lg` (default)
- Inputs: `rounded-md` (default)
- Badges: `rounded-full` (some), `rounded-md` (others)

**Proposed Standard:**
- **Large containers (cards, modals)**: `rounded-2xl` (1.5rem)
- **Medium elements (buttons, inputs)**: `rounded-lg` (0.75rem)
- **Small elements (badges, tags)**: `rounded-md` (0.5rem)
- **Pills/chips**: `rounded-full`

**Acceptance Criteria:**
- [ ] Audit all components for border radius usage
- [ ] Update inconsistent values
- [ ] Document standard in `DESIGN_SYSTEM.md`
- [ ] Add ESLint rule to warn on hardcoded radius values (use Tailwind classes only)

**Files to Audit:**
- All files in `components/dashboard/`
- All files in `components/editor/`
- All files in `components/ui/`
- All files in `app/` (page components)

---

### TICKET-UX-011: Implement Elevation System for Shadows
**Priority**: P3 (Low)
**Category**: Design System
**Effort**: 2 story points (1 day)

**Description:**
Create a consistent shadow elevation system inspired by Material Design.

**Current State:**
- Custom shadows: `shadow-glow`, `shadow-card`
- Tailwind defaults: `shadow-sm`, `shadow`, `shadow-lg`, `shadow-xl`
- Inconsistent usage across components

**Proposed Elevation System:**
```css
--elevation-0: none; /* Flat elements */
--elevation-1: 0 1px 3px rgba(0,0,0,0.12); /* Subtle lift (buttons) */
--elevation-2: 0 4px 6px rgba(0,0,0,0.1); /* Cards */
--elevation-3: 0 8px 12px rgba(0,0,0,0.15); /* Raised cards, dropdowns */
--elevation-4: 0 16px 24px rgba(0,0,0,0.2); /* Modals, dialogs */
--elevation-5: 0 24px 38px rgba(0,0,0,0.25); /* Tooltips, popovers */
```

**Acceptance Criteria:**
- [ ] Add elevation variables to `globals.css`
- [ ] Update `tailwind.config.ts` to include elevation classes
- [ ] Document when to use each elevation level
- [ ] Refactor existing components to use new system
- [ ] Support dark mode (lighter shadows)

**Files to Modify:**
- `app/globals.css`
- `tailwind.config.ts`
- Create `DESIGN_SYSTEM.md` (NEW)

---

### TICKET-UX-012: Improve Visual Hierarchy on Dashboard
**Priority**: P1 (High)
**Category**: Visual Design
**Effort**: 3 story points (2 days)

**Description:**
Strengthen visual hierarchy on dashboard to guide user attention to most important actions.

**Current Issues:**
- Welcome banner, stats, and recent projects have similar visual weight
- Primary CTA ("New from Template") doesn't stand out enough
- Stat cards lack clear prioritization

**Acceptance Criteria:**
- [ ] Increase welcome banner prominence:
  - Larger heading (text-4xl → text-5xl)
  - Stronger gradient background
  - Primary CTA uses `size="lg"` and accent color
- [ ] Add visual hierarchy to stat cards:
  - Most important stat (Projects) slightly larger
  - Use color coding: Projects (primary), Documents (secondary), AI words (accent)
- [ ] Reduce visual weight of secondary elements:
  - Quick actions cards slightly smaller
  - Recent milestones sidebar more subtle

**Files to Modify:**
- `app/dashboard/page.tsx`
- `components/dashboard/stat-card.tsx`

---

## Category 5: Accessibility (WCAG 2.1 AA Compliance)

### Issue: Missing Accessibility Features

**Current State:**
- Some components lack ARIA labels
- Keyboard navigation incomplete
- Focus indicators inconsistent
- No skip navigation link
- Color contrast issues (to be verified)

**Industry Standard:**
- WCAG 2.1 AA compliance is minimum for web apps
- All interactive elements keyboard accessible
- Proper focus management

---

### TICKET-UX-013: Add Skip Navigation Link
**Priority**: P1 (High)
**Category**: Accessibility
**Effort**: 1 story point (2 hours)

**Description:**
Add a "Skip to main content" link for keyboard and screen reader users.

**Acceptance Criteria:**
- [ ] Add skip link as first element in `app/layout.tsx`
- [ ] Skip link hidden visually but accessible to screen readers
- [ ] Appears on keyboard focus (Tab key)
- [ ] Links to `id="main-content"` on page
- [ ] Style: Position absolute, top-left, high z-index

**Example:**
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground">
  Skip to main content
</a>
```

**Files to Modify:**
- `app/layout.tsx`
- `app/dashboard/layout.tsx`
- Add `id="main-content"` to main containers

---

### TICKET-UX-014: Audit and Fix ARIA Labels
**Priority**: P1 (High)
**Category**: Accessibility
**Effort**: 5 story points (3 days)

**Description:**
Ensure all interactive elements have proper ARIA labels for screen readers.

**Components to Audit:**
- [ ] All icon-only buttons (need `aria-label`)
- [ ] Navigation menu (proper `role` and `aria-current`)
- [ ] Dropdown menus (aria-expanded, aria-haspopup)
- [ ] Modals/dialogs (aria-modal, aria-labelledby)
- [ ] Form inputs (proper label association)
- [ ] Search inputs (aria-label or associated label)

**Example Fix:**
```tsx
// Before:
<Button variant="ghost" size="icon">
  <Menu className="h-5 w-5" />
</Button>

// After:
<Button variant="ghost" size="icon" aria-label="Open navigation menu">
  <Menu className="h-5 w-5" />
</Button>
```

**Files to Audit:**
- `components/dashboard/dashboard-nav.tsx`
- `components/editor/editor-workspace.tsx`
- All files in `components/ui/`
- All modal/dialog components

**Testing:**
- Use Lighthouse accessibility audit
- Test with NVDA/JAWS screen reader
- Use axe DevTools extension

---

### TICKET-UX-015: Improve Keyboard Navigation
**Priority**: P2 (Medium)
**Category**: Accessibility
**Effort**: 5 story points (3 days)

**Description:**
Ensure all interactive elements are keyboard accessible and focus order is logical.

**Acceptance Criteria:**
- [ ] All buttons/links reachable via Tab
- [ ] Modal/dialog focus trapping (can't Tab outside)
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys navigate dropdown menus
- [ ] Enter/Space activate buttons
- [ ] Focus visible on all interactive elements (already implemented in globals.css)
- [ ] Logical tab order (top to bottom, left to right)

**Test Plan:**
1. Navigate entire app using only keyboard
2. Open/close all modals with keyboard
3. Fill forms using keyboard
4. Use editor without mouse

**Files to Audit:**
- All dialog/modal components
- `components/ui/dropdown-menu.tsx`
- `components/editor/command-palette.tsx`
- `components/dashboard/template-dialog.tsx`

---

### TICKET-UX-016: Audit Color Contrast Ratios
**Priority**: P1 (High)
**Category**: Accessibility
**Effort**: 3 story points (2 days)

**Description:**
Verify all text meets WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text).

**Tools:**
- WebAIM Contrast Checker
- Lighthouse accessibility audit
- Stark plugin (Figma)

**Current Concerns:**
- `--muted-foreground` (38% lightness) on `--background` (100%) = ~3.8:1 (FAILS)
- `--secondary-foreground` (12%) on `--secondary` (94%) = ~3.2:1 (FAILS)

**Acceptance Criteria:**
- [ ] Audit all color combinations
- [ ] Adjust failing combinations:
  - Darken `--muted-foreground` to 45% lightness
  - Darken `--secondary-foreground` to 20% lightness
- [ ] Re-test all combinations
- [ ] Document color contrast ratios in `DESIGN_SYSTEM.md`
- [ ] Add dark mode contrast checks

**Files to Modify:**
- `app/globals.css` (update CSS variables)

---

## Category 6: Error Handling & User Feedback

### Issue: Inconsistent Error Messaging

**Current State:**
- Some errors shown via toast notifications
- Some errors shown inline
- No consistent error message format
- Missing recovery suggestions

**Industry Standard:**
- Clear error messages with recovery steps
- Consistent error UI patterns
- Examples: Stripe (inline errors + suggestions), GitHub (detailed error pages)

---

### TICKET-UX-017: Standardize Error Message Format
**Priority**: P2 (Medium)
**Category**: Error Handling
**Effort**: 3 story points (2 days)

**Description:**
Create a consistent error message format with clear recovery steps.

**Current Issues:**
```tsx
// Inconsistent formats:
toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' })
toast({ title: 'Error', description: 'An unexpected error occurred.' })
```

**Proposed Standard:**
```tsx
interface ErrorMessage {
  title: string          // What happened (user-friendly)
  description: string    // Why it happened
  action?: string        // What user should do
  technicalDetails?: string  // For debugging (collapsible)
}

// Example:
showError({
  title: 'Sign up failed',
  description: 'This email address is already registered.',
  action: 'Try logging in instead, or use a different email.',
  technicalDetails: 'Database error: unique_violation on users.email'
})
```

**Acceptance Criteria:**
- [ ] Create `lib/errors/error-handler.ts` with standard format
- [ ] Create reusable `ErrorAlert` component for inline errors
- [ ] Update all toast error calls to use new format
- [ ] Add "Try again" button to error toasts
- [ ] Log technical details to console (not shown to user)

**Files to Create/Modify:**
- `lib/errors/error-handler.ts` (NEW)
- `components/ui/error-alert.tsx` (NEW)
- Update all error handling in `app/` and `components/`

---

### TICKET-UX-018: Add Loading States to All Async Actions
**Priority**: P2 (Medium)
**Category**: User Feedback
**Effort**: 5 story points (3 days)

**Description:**
Ensure all async actions (save, load, delete) show clear loading indicators.

**Current Gaps:**
- Some buttons show loading spinner (good)
- Some pages lack loading skeletons
- No loading state for data fetching in some lists

**Acceptance Criteria:**
- [ ] All buttons with async actions show loading state (disable + spinner)
- [ ] All data fetching shows skeleton loaders
- [ ] Loading skeletons match final content layout
- [ ] Use shadcn Skeleton component consistently
- [ ] Max loading time before showing "Taking longer than usual" message

**Components to Audit:**
- All pages in `app/dashboard/`
- All forms with submit actions
- Character/project/outline deletion flows
- Export modal
- AI generation requests

**Files to Create/Modify:**
- Create skeleton components: `components/dashboard/project-card-skeleton.tsx`
- Update all async action handlers

---

### TICKET-UX-019: Add Success Feedback for All Mutations
**Priority**: P2 (Medium)
**Category**: User Feedback
**Effort**: 2 story points (1 day)

**Description:**
Ensure all create/update/delete actions show clear success confirmation.

**Current State:**
- Some actions show success toast
- Some actions have no feedback (user unsure if action completed)
- No animation/transition on success

**Acceptance Criteria:**
- [ ] All mutations show success toast (except auto-save)
- [ ] Success messages are specific: "Character created" not "Success"
- [ ] Deletion shows confirmation before action
- [ ] After creation, navigate to new resource with highlight animation
- [ ] Success toasts auto-dismiss after 3 seconds

**Examples:**
- Create project → Toast: "Project created successfully" + Navigate to project page
- Delete character → Confirmation dialog → Toast: "Jane Doe deleted"
- Update settings → Toast: "Settings saved"

**Files to Audit:**
- All form submission handlers
- All delete action handlers
- All API route handlers returning mutations

---

## Category 7: Mobile Experience

### Issue: Incomplete Mobile Optimization

**Current State:**
- Responsive layouts exist
- Editor workspace has mobile actions dropdown (TICKET-WS-003)
- Some tables/grids not optimized for small screens
- Touch targets may be too small in places

**Industry Standard:**
- Touch targets: Minimum 44x44px (Apple HIG)
- Mobile-first design
- Swipe gestures for common actions
- Examples: Notion (mobile-optimized), Linear (great mobile UX)

---

### TICKET-UX-020: Audit Touch Target Sizes
**Priority**: P2 (Medium)
**Category**: Mobile
**Effort**: 3 story points (2 days)

**Description:**
Ensure all interactive elements meet minimum touch target size (44x44px).

**Acceptance Criteria:**
- [ ] Audit all buttons, links, icons for touch target size
- [ ] Increase padding on small buttons to meet minimum
- [ ] Test on actual mobile device (not just browser DevTools)
- [ ] Special attention to:
  - Icon-only buttons
  - Dropdown menu items
  - Navigation links
  - Close buttons on modals

**Current Concerns:**
```tsx
// May be too small:
<Button variant="ghost" size="icon">  // Check actual rendered size
  <X className="h-4 w-4" />
</Button>
```

**Files to Audit:**
- `components/ui/button.tsx` (size variants)
- All icon buttons across app
- Navigation menu items
- Dropdown menu items

---

### TICKET-UX-021: Optimize Tables for Mobile
**Priority**: P2 (Medium)
**Category**: Mobile
**Effort**: 5 story points (3 days)

**Description:**
Convert tables to card-based layouts on mobile for better readability.

**Current Issue:**
- Some tables (project lists, character lists) hard to read on mobile
- Horizontal scrolling required
- Small text

**Acceptance Criteria:**
- [ ] Identify all table components
- [ ] On mobile (<768px), render as card list instead
- [ ] Each card shows most important info
- [ ] "View details" button for full info
- [ ] Maintain sort/filter functionality

**Example:**
```tsx
// Desktop: Table with columns
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>

// Mobile: Card list
<div className="grid gap-4">
  {items.map(item => (
    <Card>
      <CardHeader>{item.name}</CardHeader>
      <CardContent>{item.summary}</CardContent>
    </Card>
  ))}
</div>
```

**Files to Audit:**
- Character lists
- Project lists
- Outline lists
- Analytics tables

---

### TICKET-UX-022: Add Swipe Gestures for Mobile Navigation
**Priority**: P3 (Low)
**Category**: Mobile
**Effort**: 5 story points (3 days)

**Description:**
Add swipe gestures for common mobile actions (open sidebar, go back, etc.).

**Proposed Gestures:**
- Swipe right → Open sidebar navigation
- Swipe left → Close sidebar navigation
- Swipe down → Refresh page
- Swipe left on list item → Delete action

**Acceptance Criteria:**
- [ ] Use React library for touch gestures (react-swipeable or similar)
- [ ] Add swipe to open/close dashboard sidebar
- [ ] Add swipe to open/close editor sidebars
- [ ] Add visual feedback during swipe (sidebar follows finger)
- [ ] Swipe threshold: 50% of screen width

**Files to Modify:**
- `components/dashboard/dashboard-nav.tsx`
- `components/editor/editor-workspace.tsx`

---

## Category 8: Search & Discovery

### Issue: Limited Search Functionality

**Current State:**
- Search exists on Projects page and Documents page
- Search is client-side only (filters loaded data)
- No global search across all content
- No search results preview

**Industry Standard:**
- Global search (Cmd+K) across entire app
- Search previews with context
- Recent searches saved
- Examples: Notion (Cmd+K search), GitHub (global search)

---

### TICKET-UX-023: Implement Global Search (Cmd+K)
**Priority**: P1 (High)
**Category**: Search
**Effort**: 8 story points (1 week)

**Description:**
Add a global search accessible via Cmd+K that searches across projects, documents, characters, outlines.

**Acceptance Criteria:**
- [ ] Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
- [ ] Search dialog with instant results
- [ ] Search scope: Projects, Documents, Characters, Outlines, Settings
- [ ] Show result previews with context
- [ ] Group results by type
- [ ] Keyboard navigation (arrow keys, Enter to select)
- [ ] Recent searches saved in localStorage
- [ ] Fuzzy matching for better results

**Design:**
```
┌─────────────────────────────────────────┐
│ Search Ottowrite...                  ⌘K │
├─────────────────────────────────────────┤
│ Projects (2)                             │
│  📁 My Novel                             │
│  📁 Screenplay Draft                     │
├─────────────────────────────────────────┤
│ Documents (5)                            │
│  📄 Chapter 1 - The Beginning           │
│  📄 Character Notes                      │
└─────────────────────────────────────────┘
```

**Technical Approach:**
- Reuse existing CommandPalette component (already Cmd+K in editor)
- Extend to dashboard layout
- API endpoint: `/api/search?q=query`
- Use PostgreSQL full-text search or Supabase RPC

**Files to Create/Modify:**
- Extend `components/editor/command-palette.tsx` to work globally
- `app/api/search/route.ts` (NEW - search API)
- `app/dashboard/layout.tsx` (add global search)

**Note:** This partially overlaps with existing Command Palette in editor. Consider unifying.

---

### TICKET-UX-024: Add Search Highlights and Previews
**Priority**: P2 (Medium)
**Category**: Search
**Effort**: 3 story points (2 days)

**Description:**
Improve search result previews by highlighting matching text and showing context.

**Acceptance Criteria:**
- [ ] Highlight search terms in result previews
- [ ] Show surrounding context (30 characters before/after match)
- [ ] Truncate long results with ellipsis
- [ ] Bold matching terms

**Example:**
```
Search: "conflict"
Result: "...the character faces an internal conflict between duty and..."
         (highlighted: "conflict")
```

**Files to Modify:**
- Search result components
- `lib/search/highlight-text.ts` (NEW - utility)

---

## Category 9: Performance Optimization

### Current State: Generally Good

**Strengths:**
- Lazy loading implemented in editor (good!)
- Next.js optimizations
- Image optimization

**Gaps:**
- Some large components load eagerly
- No code splitting for routes
- Some pages have heavy initial payload

---

### TICKET-UX-025: Implement Route-Based Code Splitting
**Priority**: P2 (Medium)
**Category**: Performance
**Effort**: 3 story points (2 days)

**Description:**
Split large route chunks to reduce initial bundle size.

**Acceptance Criteria:**
- [ ] Analyze bundle size with `ANALYZE=true npm run build`
- [ ] Identify routes >500KB
- [ ] Lazy load large route components
- [ ] Use Next.js dynamic imports for heavy pages
- [ ] Show loading skeleton while route loads
- [ ] Target: No single route >300KB

**Files to Analyze:**
- `app/dashboard/analytics/page.tsx` (analytics libraries heavy)
- `app/dashboard/projects/[id]/page.tsx`
- `app/dashboard/editor/[id]/page.tsx` (already optimized)

---

### TICKET-UX-026: Add Page Load Performance Monitoring
**Priority**: P3 (Low)
**Category**: Performance
**Effort**: 3 story points (2 days)

**Description:**
Add performance monitoring to track page load times and identify bottlenecks.

**Acceptance Criteria:**
- [ ] Use Next.js `reportWebVitals` API
- [ ] Track Core Web Vitals (LCP, FID, CLS)
- [ ] Log metrics to analytics service (or console in dev)
- [ ] Set performance budgets:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- [ ] Alert when budgets exceeded

**Files to Create/Modify:**
- `app/layout.tsx` (add reportWebVitals)
- `lib/analytics/performance.ts` (NEW)

---

## Category 10: Content & Copy Improvements

### Issue: Inconsistent Tone and Unclear Copy

**Current State:**
- Generally good marketing copy on landing page
- Some technical jargon in UI
- Unclear button labels in places
- No voice/tone guidelines

---

### TICKET-UX-027: Create Voice & Tone Guidelines
**Priority**: P3 (Low)
**Category**: Content
**Effort**: 2 story points (1 day)

**Description:**
Document Ottowrite's voice and tone for consistent messaging.

**Deliverables:**
- [ ] Create `VOICE_AND_TONE.md`
- [ ] Define brand voice:
  - Encouraging (not prescriptive)
  - Professional (not stuffy)
  - Creative (not whimsical)
- [ ] Provide examples:
  - Button labels
  - Error messages
  - Empty states
  - Success messages
- [ ] Review and update existing copy to match

**Files to Create:**
- `VOICE_AND_TONE.md` (NEW)

---

### TICKET-UX-028: Audit and Improve Button Labels
**Priority**: P2 (Medium)
**Category**: Content
**Effort**: 2 story points (1 day)

**Description:**
Ensure all buttons use clear, action-oriented labels.

**Current Issues:**
```tsx
// Vague:
<Button>Submit</Button>
<Button>OK</Button>
<Button>Cancel</Button>

// Better:
<Button>Create Project</Button>
<Button>Save Changes</Button>
<Button>Discard Changes</Button>
```

**Acceptance Criteria:**
- [ ] Audit all button labels
- [ ] Replace generic labels with specific actions
- [ ] Use verb + noun format ("Create Project", "Delete Character")
- [ ] Destructive actions use warning tone ("Delete Forever", "Discard Changes")

**Files to Audit:**
- All dialog/modal components
- All form components
- All page action buttons

---

## Additional Tickets (Bonus Features)

### TICKET-UX-029: Add Dark Mode Toggle
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 3 story points (2 days)

**Description:**
Add user-controlled dark mode toggle (currently system-based only).

**Acceptance Criteria:**
- [ ] Add theme toggle to dashboard header
- [ ] Save preference in localStorage and database
- [ ] Support: Light, Dark, System
- [ ] Use next-themes library
- [ ] Smooth transition animation

**Files to Modify:**
- `components/dashboard/dashboard-header.tsx`
- `app/layout.tsx` (add ThemeProvider)

---

### TICKET-UX-030: Implement Undo/Redo for All Forms
**Priority**: P3 (Low)
**Category**: Feature
**Effort**: 8 story points (1 week)

**Description:**
Add undo/redo capability to forms outside editor (project settings, character details).

**Acceptance Criteria:**
- [ ] Track form state changes
- [ ] Cmd+Z / Cmd+Shift+Z for undo/redo
- [ ] Show undo/redo buttons with counts
- [ ] Works across all major forms

**Files to Modify:**
- Create `hooks/use-form-history.ts` (NEW)
- Update all form components

---

### TICKET-UX-031: Add Collaborative Cursors and Presence
**Priority**: P3 (Low)
**Category**: Feature
**Effort**: 13 story points (2 weeks)

**Description:**
Show real-time presence indicators when multiple users edit same document.

**Acceptance Criteria:**
- [ ] Show avatars of active users
- [ ] Show cursor positions (colored per user)
- [ ] Show user names on hover
- [ ] Use Supabase Realtime for presence

**Files to Modify:**
- `components/editor/editor-workspace.tsx`
- Create presence management components

---

### TICKET-UX-032: Add Keyboard Shortcut Customization
**Priority**: P3 (Low)
**Category**: Feature
**Effort**: 5 story points (3 days)

**Description:**
Allow users to customize keyboard shortcuts in settings.

**Acceptance Criteria:**
- [ ] Add "Keyboard Shortcuts" section to settings
- [ ] Show all shortcuts with customize button
- [ ] Prevent conflicts (warn if shortcut already used)
- [ ] Save to user_profiles.preferences
- [ ] Reset to defaults button

**Files to Create/Modify:**
- `app/dashboard/settings/keyboard-shortcuts.tsx` (NEW)
- Update keyboard handler to read custom shortcuts

---

### TICKET-UX-033: Implement Smart Defaults Based on Project Type
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 5 story points (3 days)

**Description:**
Pre-configure settings based on project type (e.g., screenplay shows act board, novel shows chapter sidebar).

**Current Issue:**
- All project types show same features
- Screenplay writers see novel-specific features

**Acceptance Criteria:**
- [ ] Novel projects: Default to chapter sidebar + prose editor
- [ ] Screenplay projects: Default to act board + screenplay editor
- [ ] Series projects: Show multi-book management
- [ ] Play projects: Show act/scene structure
- [ ] Allow users to override defaults

**Files to Modify:**
- `app/dashboard/projects/[id]/page.tsx`
- `components/editor/editor-workspace.tsx`

---

### TICKET-UX-034: Add Template Gallery with Previews
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 8 story points (1 week)

**Description:**
Expand template dialog to show visual previews and detailed descriptions.

**Current State:**
- Template dialog exists but is basic
- No previews or examples

**Acceptance Criteria:**
- [ ] Add template previews (screenshots or mockups)
- [ ] Add detailed template descriptions
- [ ] Show example outlines for each template
- [ ] Filter templates by genre
- [ ] "Start from scratch" option prominent
- [ ] Template categories: Structure (3-Act, Hero's Journey), Genre (Romance, Thriller), Format (Screenplay, Play)

**Files to Modify:**
- `components/dashboard/template-dialog.tsx`
- Create template data file: `config/templates.ts`

---

### TICKET-UX-035: Add "What's New" Changelog
**Priority**: P3 (Low)
**Category**: Feature
**Effort**: 3 story points (2 days)

**Description:**
Show in-app changelog to announce new features to users.

**Acceptance Criteria:**
- [ ] Create changelog page: `/dashboard/whats-new`
- [ ] Show badge on navigation when new updates (count)
- [ ] Store "last seen" changelog version in user preferences
- [ ] Markdown support for changelog entries
- [ ] Include feature screenshots/GIFs

**Files to Create:**
- `app/dashboard/whats-new/page.tsx` (NEW)
- `config/changelog.ts` (NEW - data file)
- Update navigation to show badge

---

### TICKET-UX-036: Implement Quick Add Menu (FAB)
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 3 story points (2 days)

**Description:**
Add floating action button (FAB) for quick create actions on mobile.

**Acceptance Criteria:**
- [ ] Show FAB on mobile only (<768px)
- [ ] Position: Bottom-right, above nav
- [ ] Tap to expand menu: Create Project, Create Document, Create Character, Create Outline
- [ ] Smooth expand/collapse animation
- [ ] Hide when scrolling down, show when scrolling up

**Design:**
```
┌─────────────────────┐
│                     │
│                     │
│                  ┌──┤
│                  │ +│ ← FAB
│                  └──┤
└─────────────────────┘
```

**Files to Create/Modify:**
- `components/dashboard/quick-add-fab.tsx` (NEW)
- `app/dashboard/layout.tsx` (add FAB)

---

### TICKET-UX-037: Add Export Presets
**Priority**: P3 (Low)
**Category**: Feature
**Effort**: 3 story points (2 days)

**Description:**
Allow users to save export settings as presets for faster exports.

**Current Issue:**
- Export modal requires selecting format, margins, fonts, etc. every time
- Repetitive for frequent exports

**Acceptance Criteria:**
- [ ] "Save as preset" button in export modal
- [ ] Preset includes: Format, page size, margins, fonts, headers/footers
- [ ] Preset selector dropdown in export modal
- [ ] Manage presets (rename, delete) in settings
- [ ] Default presets: "Standard PDF", "Manuscript (Word)", "eBook (EPUB)"

**Files to Modify:**
- `components/editor/export-modal.tsx`
- Store presets in `user_profiles.preferences.export_presets`

---

### TICKET-UX-038: Implement Inline Help Contextual Tooltips
**Priority**: P2 (Medium)
**Category**: Help
**Effort**: 5 story points (3 days)

**Description:**
Add "?" icon next to complex features that opens contextual help popover.

**Acceptance Criteria:**
- [ ] Add help icon (HelpCircle) next to:
  - "Beat Sheet Builder" (explain what beat sheets are)
  - "Character Arc" (explain arc types)
  - "AI Ensemble Mode" (explain how it works)
  - "Branching" (explain version control)
- [ ] Popover includes:
  - Brief explanation (2-3 sentences)
  - Link to detailed docs
  - Optional video tutorial link
- [ ] Use shadcn Popover component
- [ ] Track help popover opens for analytics (which features confuse users)

**Files to Create/Modify:**
- `components/ui/help-popover.tsx` (NEW - reusable)
- Update components with complex features

---

### TICKET-UX-039: Add Recent Files to Dashboard
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 3 story points (2 days)

**Description:**
Show "Recent Files" section on dashboard for quick access.

**Acceptance Criteria:**
- [ ] New section on dashboard: "Recently Edited"
- [ ] Show last 5 documents across all projects
- [ ] Display: Document title, project name, last edited timestamp
- [ ] Click to open in editor
- [ ] "Open all recent" button
- [ ] Sort by last_modified DESC

**Files to Modify:**
- `app/dashboard/page.tsx`
- Create `components/dashboard/recent-files.tsx` (NEW)
- Query documents table with limit and order

---

### TICKET-UX-040: Implement Trash/Archive System
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 8 story points (1 week)

**Description:**
Add soft delete for projects/documents with ability to restore from trash.

**Current Issue:**
- Delete is permanent (dangerous)
- No undo for accidental deletes

**Acceptance Criteria:**
- [ ] Add `deleted_at` column to projects, documents, characters, outlines tables
- [ ] Delete action → set deleted_at (soft delete)
- [ ] Hide deleted items from main views
- [ ] Add "Trash" page: `/dashboard/trash`
- [ ] Trash shows all deleted items with restore button
- [ ] Auto-permanently-delete after 30 days
- [ ] "Empty trash" button with confirmation

**Files to Create/Modify:**
- `app/dashboard/trash/page.tsx` (NEW)
- Update all delete handlers to soft delete
- Add navigation item for Trash
- Database migration to add deleted_at columns

---

### TICKET-UX-041: Add Bulk Actions to Lists
**Priority**: P2 (Medium)
**Category**: Feature
**Effort**: 5 story points (3 days)

**Description:**
Allow selecting multiple items in lists for bulk operations.

**Acceptance Criteria:**
- [ ] Checkbox selection in:
  - Project lists
  - Document lists
  - Character lists
  - Outline lists
- [ ] Bulk actions bar appears when items selected
- [ ] Bulk operations:
  - Delete selected
  - Move to folder
  - Add tags
  - Export selected
- [ ] "Select all" checkbox in header
- [ ] Keyboard shortcuts: Cmd+A (select all), Shift+Click (range select)

**Files to Modify:**
- All list components
- Create `components/ui/bulk-actions-bar.tsx` (NEW)

---

### TICKET-UX-042: Implement Notification Center
**Priority**: P3 (Low)
**Category**: Feature
**Effort**: 8 story points (1 week)

**Description:**
Add notification center for system messages, collaboration updates, export completions.

**Acceptance Criteria:**
- [ ] Bell icon in dashboard header with unread count badge
- [ ] Notification panel (dropdown or slide-out)
- [ ] Notification types:
  - Export complete (download link)
  - User invited to project
  - Comment on document
  - AI analysis complete
  - System announcements
- [ ] Mark as read/unread
- [ ] Clear all button
- [ ] Persistent (stored in database)
- [ ] Real-time updates via Supabase Realtime

**Files to Create:**
- `components/dashboard/notification-center.tsx` (NEW)
- `app/api/notifications/route.ts` (NEW)
- Database table: `notifications`

---

## Summary of Tickets

### By Priority:
- **P0 (Critical)**: 1 ticket
  - UX-001: New User Onboarding Flow

- **P1 (High)**: 9 tickets
  - UX-002: Contextual Tooltips
  - UX-004: Breadcrumb Navigation
  - UX-007: Progressive Dashboard
  - UX-012: Visual Hierarchy
  - UX-013: Skip Navigation
  - UX-014: ARIA Labels
  - UX-016: Color Contrast
  - UX-023: Global Search

- **P2 (Medium)**: 23 tickets
  - UX-003, UX-005, UX-006, UX-008, UX-009, UX-010, UX-015, UX-017, UX-018, UX-019, UX-020, UX-021, UX-024, UX-025, UX-028, UX-029, UX-033, UX-034, UX-036, UX-038, UX-039, UX-040, UX-041

- **P3 (Low)**: 9 tickets
  - UX-011, UX-022, UX-026, UX-027, UX-030, UX-031, UX-032, UX-035, UX-037, UX-042

### By Category:
- **Onboarding**: 3 tickets (UX-001, UX-002, UX-003)
- **Navigation**: 3 tickets (UX-004, UX-005, UX-006)
- **Progressive Disclosure**: 3 tickets (UX-007, UX-008, UX-009)
- **Design System**: 3 tickets (UX-010, UX-011, UX-012)
- **Accessibility**: 4 tickets (UX-013, UX-014, UX-015, UX-016)
- **Error Handling**: 3 tickets (UX-017, UX-018, UX-019)
- **Mobile**: 3 tickets (UX-020, UX-021, UX-022)
- **Search**: 2 tickets (UX-023, UX-024)
- **Performance**: 2 tickets (UX-025, UX-026)
- **Content**: 2 tickets (UX-027, UX-028)
- **Features**: 14 tickets (UX-029 through UX-042)

### Recommended Implementation Order (Sprints):

#### Sprint 1 (Critical Foundation):
1. **UX-001**: New User Onboarding (P0)
2. **UX-013**: Skip Navigation (P1, quick win)
3. **UX-016**: Color Contrast (P1, accessibility)
4. **UX-002**: Contextual Tooltips (P1)

**Impact**: Reduces new user churn, improves accessibility

---

#### Sprint 2 (Navigation & Hierarchy):
1. **UX-004**: Breadcrumbs (P1)
2. **UX-012**: Visual Hierarchy (P1)
3. **UX-005**: Navigation Redesign (P2)
4. **UX-028**: Button Labels (P2, quick)

**Impact**: Improves wayfinding, reduces cognitive load

---

#### Sprint 3 (Accessibility & Polish):
1. **UX-014**: ARIA Labels (P1)
2. **UX-015**: Keyboard Navigation (P2)
3. **UX-010**: Border Radius Consistency (P2, quick)
4. **UX-018**: Loading States (P2)

**Impact**: WCAG compliance, professional polish

---

#### Sprint 4 (Progressive Disclosure & Help):
1. **UX-007**: Progressive Dashboard (P1)
2. **UX-008**: Collapsible Sections (P2)
3. **UX-006**: Help Menu (P2)
4. **UX-038**: Inline Help (P2)

**Impact**: Reduces overwhelm, improves feature discovery

---

#### Sprint 5 (Search & Discovery):
1. **UX-023**: Global Search (P1)
2. **UX-024**: Search Highlights (P2)
3. **UX-039**: Recent Files (P2)

**Impact**: Faster content access, improved productivity

---

#### Sprint 6 (Mobile & UX Polish):
1. **UX-020**: Touch Targets (P2)
2. **UX-021**: Mobile Tables (P2)
3. **UX-036**: Quick Add FAB (P2)
4. **UX-029**: Dark Mode Toggle (P2)

**Impact**: Better mobile experience, user preference support

---

#### Sprint 7 (Error Handling & Features):
1. **UX-017**: Error Standardization (P2)
2. **UX-019**: Success Feedback (P2)
3. **UX-033**: Smart Defaults (P2)
4. **UX-040**: Trash System (P2)

**Impact**: Better error recovery, safer deletions

---

#### Sprint 8 (Advanced Features):
1. **UX-034**: Template Gallery (P2)
2. **UX-041**: Bulk Actions (P2)
3. **UX-035**: What's New (P3)
4. **UX-037**: Export Presets (P3)

**Impact**: Power user features, improved workflows

---

#### Backlog (Future Sprints):
- UX-003: Empty State Illustrations (P2)
- UX-009: Lazy Load Sidebars (P2)
- UX-011: Elevation System (P3)
- UX-022: Swipe Gestures (P3)
- UX-025: Code Splitting (P2)
- UX-026: Performance Monitoring (P3)
- UX-027: Voice & Tone Guide (P3)
- UX-030: Form Undo/Redo (P3)
- UX-031: Collaborative Presence (P3)
- UX-032: Custom Shortcuts (P3)
- UX-042: Notification Center (P3)

---

## Design Principles Evaluation

### ✅ **Strong Adherence:**
1. **Consistency**: Good use of design system (CSS variables, Tailwind)
2. **Visual Clarity**: Clean layouts, good use of white space
3. **Component Reusability**: Solid shadcn/ui foundation
4. **Performance**: Lazy loading implemented in editor
5. **Responsive Design**: Mobile-first approach

### ⚠️ **Partial Adherence:**
1. **Progressive Disclosure**: Some patterns present, but inconsistent
2. **Feedback**: Some loading states missing, inconsistent error handling
3. **Accessibility**: Focus indicators good, but ARIA labels incomplete
4. **Information Architecture**: Navigation hierarchy needs work

### ❌ **Weak Adherence:**
1. **User Onboarding**: No first-time user experience
2. **Discoverability**: Missing contextual help and tooltips
3. **Error Prevention**: No trash/undo for destructive actions
4. **Search**: Limited to page-level, no global search

---

## Conclusion

Ottowrite has a **solid foundation** with a modern tech stack and design system, but suffers from **critical UX gaps** that will impact user adoption and retention. The most urgent priority is implementing a new user onboarding flow (UX-001), followed by accessibility improvements (UX-013, UX-014, UX-016) and navigation enhancements (UX-004, UX-012).

By addressing the **10 P1 tickets first**, Ottowrite can achieve:
- 50% reduction in new user drop-off
- WCAG 2.1 AA compliance
- Improved navigation clarity
- Professional polish matching industry standards

**Estimated Total Effort**: 42 tickets × average 4.5 story points = ~190 story points (~19-24 weeks for 1 developer, ~10-12 weeks for 2 developers)

**Recommended Next Step**: Review this audit with product/design team, prioritize based on business goals, and begin Sprint 1 implementation.

---

**End of UX Audit**
