# Ottowrite Style Guide v1.0 (Phase 5 Release)

Last updated: 2025-10-18  
Maintainer: Codex (ChatGPT)  
Release scope: Phases 0‑5 (dashboard shell → advanced tools)

## 1. Brand & Layout Principles
- **Voice**: Confident, collaborative, inspiring; pair bold headlines with supportive body copy.
- **Rhythm**: Favor generous white space but maintain consistent vertical rhythm (4px base grid, 8px increments).
- **Hierarchy**: Hero → Key actions → Supporting info. Every page should surface a primary CTA above the fold.
- **Responsiveness**: Breakpoints align with Tailwind defaults (`sm`, `md`, `lg`, `xl`). Content must remain accessible on ≤360px width.

## 2. Design Tokens

### 2.1 Typography Scale
| Token | Tailwind | Usage |
|-------|----------|-------|
| `display` | `text-5xl md:text-6xl` | Marketing hero headlines |
| `headline` | `text-4xl md:text-5xl` | Dashboard hero, section headers |
| `title` | `text-2xl md:text-3xl` | Card/section titles |
| `subtitle` | `text-xl` | Supportive statements |
| `body-lg` | `text-base md:text-lg` | Primary body copy |
| `body` | `text-base` | Standard text |
| `body-sm` | `text-sm` | Secondary text, helper copy |
| `caption` | `text-xs` | Meta labels, table headers |

Typeface: Inter (default). Set `font-semibold` for headers, `font-medium` for button labels.

### 2.2 Spacing Scale
- Base unit: 4px (`0.25rem`).
- Core spacing tokens:
  - `space-xs`: 8px (`gap-2`, `py-2`)
  - `space-sm`: 12px
  - `space-md`: 16px (`p-4`)
  - `space-lg`: 24px (`p-6`)
  - `space-xl`: 32px (`p-8`)
  - `space-2xl`: 48px (`p-12`)
  - `space-hero`: 80px+ for marketing hero padding (`py-20`)

### 2.3 Radii & Elevation
- Radius: `rounded-lg` default, `rounded-2xl` for hero cards, `rounded-full` for pills.
- Shadow levels:
  - `shadow-sm`: form cards
  - `shadow-md`: popovers/dialogs
  - `shadow-lg`: hero feature highlights
  - `shadow-glow`: custom class for promotional CTA (box-shadow `0 20px 45px -20px rgba(66, 153, 225, 0.45)`)

### 2.4 Color Roles
- Extend Tailwind theme:
  - `primary`: #4F46E5 (Indigo 600) → main CTA, accents.
  - `primary-foreground`: #FFFFFF.
  - `secondary`: #F97316 (Orange 500) → highlights, charts.
  - `muted`: background surfaces (use `bg-muted/60` for subtle sections).
  - `success`: #16A34A, `warning`: #F59E0B, `destructive`: #DC2626.
- Neutral palette:
  - Text primary: `text-foreground`.
  - Secondary: `text-muted-foreground` but ensure contrast ratio ≥ 4.5:1 (pair with `bg-card` not `bg-muted`).

### 2.5 Layout Grid
- **Max content width**: 1280px (`max-w-6xl`).
- **Marketing pages**: `max-w-6xl`, with `px-6 sm:px-8 md:px-12`.
- **Dashboard**: `grid-cols-[280px_1fr]` for `lg` and above (sidebar + content). Use `flex-col` stack on small viewports.

## 3. Component Guidelines

### 3.1 Navigation
- Desktop: topbar with logo, primary nav, secondary actions on right.
- Mobile: hamburger > slide-in drawer. Include `Skip to content` link positioned top-left.
- Active link style: `text-foreground font-medium`, bottom border indicator.

### 3.2 Cards & Sections
- **StatCard**: icon badge, label (`caption`), value (`headline`), optional delta pill.
- **SectionHeader**: title + subtitle + action cluster (buttons/pills).
- **EmptyState**: icon (lucide), title, supporting text, primary & secondary actions.

### 3.3 Forms
- Two-column layout for dense editors (`grid-cols-1 md:grid-cols-2`).
- Group sections inside `Card` + `CardHeader`.
- Add inline validation with `aria-invalid`, `aria-describedby`.
- Include sticky save bar at bottom when form dirty.

### 3.4 Buttons & Links
- Default button `size="md"` with `px-4 py-2.5`. Large actions `size="lg"` for hero areas.
- Add icon spacing using `className="h-4 w-4 mr-2"`.
- Secondary link style: `text-sm font-medium text-primary hover:text-primary/80`.

### 3.5 Feedback & States
- Toast variants: success (green), error (red), info (blue). Include icon + action `Undo` for destructive operations.
- Loading: use `Skeleton` for list/table loads, `Spinner` for button-level waits.
- Confirmation: replace `confirm()` with `AlertDialog` component.

## 4. Accessibility Checklist
- Keyboard navigation across navigation, modals, forms.
- Visible focus ring (`outline-none focus-visible:ring-2 focus-visible:ring-primary/60`).
- ARIA labels for icon-only buttons (e.g., delete).
- Provide alt text for decorative imagery; set `aria-live="polite"` for toast container.

## 5. Implementation Roadmap Tie-in
- **Phase 1**: Apply tokens to dashboard shell, build nav, stat cards, empty states.
- **Phase 2**: Update data lists/tables with filter pills & empty states.
- **Phase 3**: Refactor editors with two-column layouts & sticky section nav.
- **Phase 4**: Extend with visualization palette & interactive components.
- **Phase 5**: Final QA, documentation, component parity in Storybook-equivalent.

## 6. Pattern Library (Phase 3–5 Additions)

### 6.1 Outline Workspace
- **Filter Card**: Primary filters live inside a `Card` with `Filter` icon heading, search input with leading icon, select pairs for format + sort. Keep reset action aligned right using `variant="link"`.
- **Active State Badges**: Surface current sort + format via `Badge` components directly under filters; destructive color reserved for unsaved notes indicators.
- **Card Grid**: `md:grid-cols-2 lg:grid-cols-3`. Use `OutlineCard` component — ensure metadata badges follow `format → count → timestamps`.
- **Empty States**: Differentiate dataset vs filter-empty with tailored copy and a dedicated reset button.

### 6.2 Outline Detail
- **Sticky Aside**: `lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]` with `aside` using `lg:sticky lg:top-24`. Keep summary metrics concise (format, sections, target totals).
- **Notes Editor**: Enforce `NOTE_MAX_LENGTH = 2000`. Dirty badge displayed via `Badge variant="destructive"` with sticky note icon. Button disabled while saving or over limit.
- **Metadata Chips**: Genres, characters, locations rendered with `Badge variant="outline"`; keep consistent casing (`capitalize` when derived from enums).

### 6.3 Plot Analysis
- **Run Controls**: Analysis select + run button share a responsive grid. Disable run button if word count < 100 or request inflight.
- **Summary vs History Tabs**: Use `Tabs` with lucide icons (`ListChecks`, `History`) for clarity. Summary displays metric cards using bordered flex containers; history cards highlight active selection with `border-primary/50`.
- **Pending Runs**: Provide spinner card until Supabase job completes; ensure toast copy indicates expected wait.

### 6.4 Shared Patterns
- **Skeletons**: Prefer `Skeleton` components for grid placeholders while fetching.
- **Badges**: Use `Badge` variants consistently: `secondary` for neutral context, `outline` for informational tags, `destructive` reserved for error/dirty states.
- **Accessibility**: All additions must preserve focus states (`focus-visible:ring-2 focus-visible:ring-primary/60`) and include icon labels where needed.

## 7. Handoff Checklist
- [x] Style guide updated (this document).
- [x] Regression guide (`docs/UI_QA_REPORT.md`) captured with burn-down.
- [ ] Storybook stories (see `docs/STORYBOOK_COVERAGE.md`) — implement for next sprint.

Keep this document updated as tokens/components evolve. All new UI work should reference these foundations before adding custom styles.
