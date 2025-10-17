# Ottowrite UI/UX Audit (Phase 0)

Date: 2025-10-17  
Auditor: Codex (ChatGPT)

## Scope & Method
- Reviewed marketing homepage (`app/page.tsx`), dashboard shell (`app/dashboard/layout.tsx`), dashboard landing (`app/dashboard/page.tsx`), projects list/detail, documents list, character management surfaces, editor entry points, and key modals.
- Evaluated responsiveness (mobile ≤ 640px, tablet 768–1024px, desktop ≥ 1280px) using Tailwind utility usage as a proxy.
- Assessed typography scale, component hierarchy, accessibility touchpoints (focus, contrast, semantics), interaction feedback, and data density.
- Logged issues across four severity levels: **Blocker**, **High**, **Medium**, **Low**. Ranked backlog by severity × reach × effort.

## Key Themes
1. **Inconsistent Layout Shell**
   - Dashboard header uses fixed container widths and lacks active/hover emphasis; no mobile adaptation.
   - Pages mix centered content (`container mx-auto`) with edge-to-edge cards, causing visual jitter.
2. **Typography & Spacing Drift**
   - Heading scales jump (e.g., `text-3xl` vs `text-6xl`) without shared tokens.
   - Forms and cards use varying paddings (`p-6`, `px-4`, `py-8`) leading to cramped vs. airy sections.
3. **Interaction & Feedback Gaps**
   - Critical actions (delete, create) rely on native `confirm` dialogs; consistent modals/snackbars lacking.
   - Loading states often plain text placeholders; skeletons/spinners inconsistent.
4. **Information Architecture**
   - Dashboard lacks quick creation shortcuts, recent activity context, or guidance for empty states.
   - Character/relationship screens informative but need tabbed/sectioned layout for scanability.
5. **Accessibility**
   - No skip links or focus outlines on nav items.
   - Color tokens (e.g., `text-muted-foreground` on `bg-card/60`) close to WCAG minimum when overlaid.

## Prioritized Backlog (Top 15)

| # | Area | Severity | Issue | Suggested Fix | Effort |
|---|------|----------|-------|---------------|--------|
| 1 | Dashboard Shell (`app/dashboard/layout.tsx`) | High | No responsive nav; top links wrap awkwardly <640px | Implement collapsible sidebar/topbar with burger menu, active state indicators | M |
| 2 | Dashboard Home (`app/dashboard/page.tsx`) | High | Stats + recent projects feel sparse; no quick actions or onboarding | Introduce KPI cards with icons, “Create project” CTA, empty-state illustration | M |
| 3 | Projects Detail (`app/dashboard/projects/[id]/page.tsx`) | High | Dialog markup nested, inconsistent spacing, long scroll | Convert to two-column layout with sticky summary + tabs (Documents, Characters, Analytics) | H |
| 4 | Documents Index (`app/dashboard/documents/page.tsx`) | High | Table/list missing filters, search, sorting; creation modal dense | Replace grid with data table component w/ filters, inline quick-create | M |
| 5 | Characters List (`app/dashboard/projects/[id]/characters/page.tsx`) | High | Cards uniform but stats row lacks context (counts only) | Add inline filters (role, tags), show relationship count, display empty-state CTA | M |
| 6 | Character Editor (`app/dashboard/projects/[id]/characters/[characterId]/page.tsx`) | High | Single long column >2000px, limited navigation, save button duplicated | Add sticky side nav / section index, autosave indicator, split sections accordion | H |
| 7 | Relationship Manager (`app/dashboard/projects/[id]/characters/relationships/page.tsx`) | High | Grid of cards w/out timeline view; editing resets filter state | Add filter bar (type, status, polarity), persist filters, introduce timeline/network toggle | M |
| 8 | Editor Layout (`app/dashboard/editor/[id]/page.tsx`) | High | Toolbar crowded, lack of context breadcrumbs | Redesign editor chrome w/ left nav (documents, history), top status bar | H |
| 9 | Auth Pages (`app/auth/signup/page.tsx`) | Medium | Forms minimal, lacking brand cues | Introduce two-column layout with benefits, success states | M |
|10 | Empty States (various) | Medium | Reliance on plain text paragraphs | Create reusable `EmptyState` component (icon, title, action) | S |
|11 | Notifications | Medium | Toaster used inconsistently vs. confirm | Standardize `useToast` usage with severity icons & action buttons | S |
|12 | Loading Patterns | Medium | Mixed spinner/skeleton text | Build `PageLoading` skeleton set for dashboards | S |
|13 | Settings (`app/dashboard/settings/page.tsx`) | Medium | Flat form list w/out grouping | Apply section cards, inline save indicators | M |
|14 | Pricing (`app/pricing/page.tsx`) | Low | Page sparse compared to new homepage | Align with marketing hero, plan cards, FAQ | M |
|15 | Footer/Global Secondary Nav | Low | No universal footer on dashboard | Add footnote/links, support theme toggle | S |

## Additional Observations
- Iconography: inconsistent size usage (`h-4 w-4` vs `h-6 w-6`), minimal label support.
- Forms rely on generic inputs; need helper text, validation, error states.
- Modals width/padding inconsistent (some `max-w-2xl`, others default).
- Color palette: limited accent colors; opportunity to extend primary shades for charts/tags.
- Relationship visualization pending upgrade (Phase 4); ensure design system anticipates data viz tokens.

## Next Steps (Phase 1 Readiness)
1. Align on design tokens (type scale, spacing, colors, radius, elevation).  
2. Prototype dashboard shell (responsive nav + layout grid).  
3. Prepare component backlog: `EmptyState`, `StatCard`, `FilterPill`, `SectionHeader`, `StickySidebar`.  
4. Validate accessibility quick wins (focus outlines, ARIA labels).

Audit complete – ready to move into design foundation definition.
