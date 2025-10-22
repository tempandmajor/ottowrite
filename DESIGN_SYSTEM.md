# OttoWrite Design System

**Version**: 1.0
**Last Updated**: January 21, 2025
**Status**: Standardized

---

## Overview

This document defines the design system standards for OttoWrite, ensuring consistency across all components and pages. Following these guidelines maintains visual coherence and improves maintainability.

---

## Border Radius Standards

### 📏 Standard Scale

Border radius values follow a consistent scale for different component sizes:

| Size | Tailwind Class | CSS Value | Use Case |
|------|---------------|-----------|----------|
| **Extra Large** | `rounded-2xl` | `16px` (1rem) | Large containers (cards, modals, sections) |
| **Large** | `rounded-lg` | `8px` (0.5rem) | Medium elements (buttons, inputs, navigation items) |
| **Medium** | `rounded-md` | `6px` (0.375rem) | Small elements (badges, tags) |
| **Small** | `rounded-sm` | `4px` (0.25rem) | Tiny elements (grid items, heatmap squares) |
| **Full** | `rounded-full` | `9999px` | Circular elements (avatars, pills, status indicators) |

### ❌ Deprecated Classes

The following classes should **NOT** be used in new components:

- `rounded-3xl` - Too large, lacks consistent usage pattern
- `rounded-xl` - Inconsistent with new standard, use `rounded-2xl` or `rounded-lg` instead
- `rounded` (without size) - Ambiguous, always specify a size

---

## Component-Specific Guidelines

### Large Containers (`rounded-2xl`)

Use for primary content containers that need visual prominence:

```tsx
// ✅ Correct Usage
<Card className="rounded-2xl">...</Card>
<Dialog>...</Dialog>  // Dialog component uses rounded-2xl by default
<section className="rounded-2xl bg-background p-8">...</section>

// Components
- Card (base component)
- Dialog/Modal containers
- Page hero sections
- Feature cards
- Project/Document cards
- Character cards
- Large content sections
```

### Medium Elements (`rounded-lg`)

Use for interactive elements and medium-sized components:

```tsx
// ✅ Correct Usage
<Button className="rounded-lg">...</Button>
<Input className="rounded-lg" />
<nav className="rounded-lg">...</nav>

// Components
- Buttons (all sizes)
- Form inputs (text, email, password)
- Textarea
- Select dropdowns
- Navigation items
- List items
- Dropdown menu items
- Template selection cards
```

### Small Elements (`rounded-md`)

Use for small UI elements and accessories:

```tsx
// ✅ Correct Usage
<Badge className="rounded-md">...</Badge>
<kbd className="rounded-md">...</kbd>
<div className="rounded-md bg-secondary">...</div>

// Components
- Small badges (type, status)
- Tags
- Keyboard shortcuts (kbd)
- Small info boxes
- Tooltip containers
```

### Tiny Elements (`rounded-sm`)

Use for very small grid items:

```tsx
// ✅ Correct Usage
<div className="rounded-sm w-3 h-3">...</div>

// Components
- Heatmap squares
- Mini grid items
- Small icons/indicators
```

### Circular Elements (`rounded-full`)

Use for perfectly circular elements:

```tsx
// ✅ Correct Usage
<Avatar className="rounded-full">...</Avatar>
<Badge className="rounded-full">...</Badge>
<div className="rounded-full">...</div>

// Components
- Avatars
- Pill badges
- Status indicators (online/offline dots)
- Icon containers (circular)
- Profile images
```

---

## Implementation Examples

### Cards

```tsx
// ✅ Standard Card
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>  {/* Inherits rounded-2xl from base component */}
  <CardHeader>
    <CardTitle>Project Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here...
  </CardContent>
</Card>

// ❌ Don't override with smaller radius
<Card className="rounded-lg">...</Card>  // Inconsistent
```

### Buttons

```tsx
// ✅ Standard Button
import { Button } from '@/components/ui/button'

<Button>Click Me</Button>  {/* Uses rounded-lg by default */}

// ✅ All button variants use rounded-lg
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Forms

```tsx
// ✅ Standard Form Elements
<Input type="text" className="rounded-lg" />
<Textarea className="rounded-lg" />
<Select>...</Select>  {/* Uses rounded-lg */}

// ❌ Don't use smaller radius for form fields
<Input className="rounded-md" />  // Too small
```

### Navigation

```tsx
// ✅ Standard Navigation
<nav>
  <Link className="rounded-lg px-3 py-2">Dashboard</Link>
  <Link className="rounded-lg px-3 py-2">Projects</Link>
</nav>

// ❌ Don't use larger radius for nav items
<Link className="rounded-xl">...</Link>  // Inconsistent
```

---

## Color System

### CSS Variables

OttoWrite uses CSS custom properties for theming:

```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 0 0% 6%;
--muted: 0 0% 94%;
--muted-foreground: 0 0% 45%;  /* WCAG AA compliant */
--card: 0 0% 100%;
--card-foreground: 0 0% 6%;
--primary: 0 0% 15%;
--primary-foreground: 0 0% 98%;
--secondary: 0 0% 94%;
--secondary-foreground: 0 0% 12%;
--accent: 0 0% 94%;
--accent-foreground: 0 0% 15%;

/* Dark Mode */
--background: 0 0% 0%;
--foreground: 0 0% 96%;
--muted-foreground: 0 0% 70%;  /* WCAG AA compliant */
```

### Color Contrast

All color combinations meet **WCAG 2.1 AA** standards:

- Normal text: minimum 4.5:1 contrast ratio
- Large text (18pt+): minimum 3:1 contrast ratio
- UI components: minimum 3:1 contrast ratio

---

## Accessibility Standards

### Focus Indicators

All interactive elements must have visible focus states:

```tsx
// ✅ Standard focus ring
className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

// For buttons specifically
className="focus-visible:ring-2 focus-visible:ring-primary"
```

### ARIA Labels

All icon-only buttons require aria-label:

```tsx
// ✅ Correct
<Button variant="ghost" size="icon" aria-label="Open navigation menu">
  <Menu className="h-5 w-5" />
</Button>

// ❌ Missing accessibility
<Button variant="ghost" size="icon">
  <Menu className="h-5 w-5" />
</Button>
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Tab order should be logical (top to bottom, left to right)
- Escape key closes modals/dropdowns
- Arrow keys navigate lists/menus where appropriate

---

## Component Composition

### Consistent Patterns

Use established shadcn/ui patterns:

```tsx
// ✅ Use shadcn/ui primitives
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

// ✅ Extend with Tailwind utilities
<Dialog>
  <DialogContent className="max-w-2xl">
    ...
  </DialogContent>
</Dialog>
```

### Component Hierarchy

```
ui/           - Base shadcn/ui components
dashboard/    - Dashboard-specific components
editor/       - Editor-specific components
```

---

## Spacing Scale

Follow Tailwind's spacing scale for consistency:

| Class | Value | Use Case |
|-------|-------|----------|
| `gap-1` | 4px | Tight spacing |
| `gap-2` | 8px | Close spacing |
| `gap-4` | 16px | Standard spacing |
| `gap-6` | 24px | Comfortable spacing |
| `gap-8` | 32px | Loose spacing |

---

## Typography

### Font Weights

```tsx
font-normal    // 400 - Body text
font-medium    // 500 - Emphasis
font-semibold  // 600 - Headings
font-bold      // 700 - Strong emphasis
```

### Text Sizes

```tsx
text-xs    // 12px - Small labels
text-sm    // 14px - Body text
text-base  // 16px - Standard text
text-lg    // 18px - Large text
text-xl    // 20px - Small headings
text-2xl   // 24px - Medium headings
text-3xl   // 30px - Large headings
text-4xl   // 36px - Extra large headings
```

---

## Shadows

### Shadow Scale

```tsx
shadow-sm    // Subtle lift
shadow       // Default shadow
shadow-md    // Medium elevation
shadow-lg    // High elevation
shadow-xl    // Very high elevation
```

---

## Migration Guide

### Updating Existing Components

If you encounter deprecated patterns:

1. **`rounded-3xl` → `rounded-2xl`**
   ```diff
   - <section className="rounded-3xl">
   + <section className="rounded-2xl">
   ```

2. **`rounded-xl` (for cards) → `rounded-2xl`**
   ```diff
   - <Card className="rounded-xl">
   + <Card>  {/* Uses rounded-2xl by default */}
   ```

3. **`rounded-xl` (for nav) → `rounded-lg`**
   ```diff
   - <Link className="rounded-xl px-3 py-2">
   + <Link className="rounded-lg px-3 py-2">
   ```

4. **Generic `rounded` → Specific size**
   ```diff
   - <Badge className="rounded">
   + <Badge className="rounded-md">
   ```

---

## ESLint Rules (Future)

Planned ESLint rules to enforce standards:

```js
// .eslintrc.js (future implementation)
rules: {
  'no-deprecated-border-radius': 'warn',  // Warn on rounded-3xl, rounded-xl
  'require-specific-border-radius': 'warn',  // Warn on generic 'rounded'
}
```

---

## References

- [Tailwind CSS Border Radius Documentation](https://tailwindcss.com/docs/border-radius)
- [shadcn/ui Component Library](https://ui.shadcn.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-21 | Initial standardization of border radius system |

---

**Maintained by**: OttoWrite Design System Team
**Questions?**: Open an issue on GitHub or consult this document first.
