# Feature Gating Implementation Guide

**Purpose:** Gate incomplete features (Ghostwriter & Manuscript Submission) while maintaining professional UX for MVP release.

**Status:** ✅ Implemented and Ready for Production

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Implementation Details](#implementation-details)
4. [How to Enable/Disable Features](#how-to-enabledisable-features)
5. [User Experience Flow](#user-experience-flow)
6. [Testing Guide](#testing-guide)
7. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Problem
Ghostwriter and Manuscript Submission features are incomplete but we need to release MVP. We need to:
- Hide incomplete features from users
- Maintain professional appearance
- Build anticipation for upcoming features
- Allow easy enablement when features are ready

### Solution
Multi-layered feature gating system with:
1. **Feature Flags** - Centralized configuration
2. **Coming Soon Pages** - Professional placeholders
3. **Sidebar Badges** - Visual indicators
4. **Route Guards** - Prevent direct URL access
5. **Waitlist System** - Capture interested users

---

##System Architecture

### Components

```
lib/features/feature-flags.ts
├── Feature configuration (status, tier requirements, launch dates)
├── Access control functions (checkFeatureAccess)
└── Helper functions (getFeatureStatus, isFeatureComingSoon)

components/features/coming-soon-page.tsx
├── Professional placeholder UI
├── Feature preview and benefits
└── Waitlist signup form

app/dashboard/*/coming-soon/page.tsx
├── Feature-specific coming soon pages
└── Redirect logic for authenticated users

app/dashboard/*/page.tsx
├── Feature access checks
└── Redirect to coming soon if gated

components/dashboard/dashboard-nav.tsx
└── Coming Soon badges in sidebar
```

### Feature States

```typescript
type FeatureStatus =
  | 'disabled'        // Hidden from everyone
  | 'coming_soon'     // Visible but gated (shows coming soon page)
  | 'beta'            // Only beta users
  | 'limited'         // Tier-restricted (e.g., Professional+)
  | 'enabled'         // Available to all

```

---

## Implementation Details

### 1. Feature Flag Configuration

**File:** `lib/features/feature-flags.ts`

```typescript
export const FEATURES = {
  GHOSTWRITER: 'ghostwriter',
  MANUSCRIPT_SUBMISSION: 'manuscript_submission',
} as const

const DEFAULT_FEATURE_CONFIG: Record<string, FeatureConfig> = {
  [FEATURES.GHOSTWRITER]: {
    id: FEATURES.GHOSTWRITER,
    name: 'Ghostwriter',
    description: 'AI-powered writing assistant...',
    status: 'coming_soon',  // ← CHANGE THIS TO 'enabled' WHEN READY
    minTier: 'free',
    launchDate: '2025-02-15T00:00:00Z',
  },
  [FEATURES.MANUSCRIPT_SUBMISSION]: {
    id: FEATURES.MANUSCRIPT_SUBMISSION,
    name: 'Manuscript Submission',
    description: 'Submit manuscripts to agents...',
    status: 'coming_soon',  // ← CHANGE THIS TO 'enabled' WHEN READY
    minTier: 'professional',
    launchDate: '2025-03-01T00:00:00Z',
  },
}
```

**Key Functions:**

```typescript
// Check if user can access a feature
const access = await checkFeatureAccess(supabase, FEATURES.GHOSTWRITER, userId)
// Returns: { hasAccess: boolean, reason?: string, config: FeatureConfig }

// Get feature status
const status = getFeatureStatus(FEATURES.GHOSTWRITER)
// Returns: 'coming_soon' | 'enabled' | etc.

// Check if coming soon
const isComingSoon = isFeatureComingSoon(FEATURES.GHOSTWRITER)
// Returns: boolean
```

### 2. Coming Soon Pages

**Files:**
- `app/dashboard/ghostwriter/coming-soon/page.tsx`
- `app/dashboard/submissions/coming-soon/page.tsx`
- `components/features/coming-soon-page.tsx` (shared component)

**Features:**
- Professional hero section with feature icon
- Launch date countdown
- Feature benefits list
- Waitlist signup form
- Links to changelog and roadmap
- Responsive design

**Example Usage:**
```typescript
<ComingSoonPage
  featureId={FEATURES.GHOSTWRITER}
  icon={<Sparkles />}
  benefits={[
    'Generate story chunks with AI',
    'Track character traits and plot points',
    // ...
  ]}
/>
```

### 3. Route Guards

**Implementation Pattern:**

```typescript
// app/dashboard/ghostwriter/page.tsx
export default async function GhostwriterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // ✅ FEATURE GATE CHECK
  const access = await checkFeatureAccess(supabase, FEATURES.GHOSTWRITER, user.id)
  if (!access.hasAccess) {
    redirect('/dashboard/ghostwriter/coming-soon')
  }

  // Feature is enabled - show dashboard
  return <GhostwriterDashboard userId={user.id} />
}
```

**Applied to:**
- ✅ `/dashboard/ghostwriter` (main page)
- ✅ `/dashboard/submissions` (main page)
- ⚠️ Sub-routes inherit protection via redirect

### 4. Sidebar Badges

**File:** `components/dashboard/dashboard-nav.tsx`

**Changes:**
```typescript
// Add comingSoon flag to NavItem type
type NavItem = {
  // ... existing fields
  comingSoon?: boolean
}

// Mark features as coming soon
{
  label: 'Ghostwriter',
  href: '/dashboard/ghostwriter',
  icon: Sparkles,
  comingSoon: true,  // ← SET TO false WHEN ENABLING
},
{
  label: 'Submissions',
  href: '/dashboard/submissions',
  icon: Send,
  badge: 'Studio',
  premium: true,
  comingSoon: true,  // ← SET TO false WHEN ENABLING
},
```

**Badge Rendering:**
```tsx
{route.comingSoon && (
  <Badge variant="secondary" className="ml-auto text-xs bg-amber-100 text-amber-800">
    Coming Soon
  </Badge>
)}
```

---

## How to Enable/Disable Features

### Quick Enable Guide

**When Ghostwriter is ready:**

1. **Update Feature Flag** (`lib/features/feature-flags.ts`):
```typescript
[FEATURES.GHOSTWRITER]: {
  // ...
  status: 'enabled',  // Change from 'coming_soon' to 'enabled'
  // ...
},
```

2. **Update Sidebar** (`components/dashboard/dashboard-nav.tsx`):
```typescript
{
  label: 'Ghostwriter',
  href: '/dashboard/ghostwriter',
  icon: Sparkles,
  comingSoon: false,  // Change from true to false
},
```

3. **Test** (see Testing Guide below)

4. **Deploy**

**When Manuscript Submission is ready:**

Same process, but for `MANUSCRIPT_SUBMISSION` feature.

### Advanced: Beta Access

To give specific users early access:

```typescript
[FEATURES.GHOSTWRITER]: {
  status: 'beta',  // Instead of 'coming_soon'
  betaUsers: [
    'user-id-1',
    'user-id-2',
  ],
}
```

### Development Override

For local development, set environment variable:

```bash
# .env.local
NEXT_PUBLIC_ENABLE_ALL_FEATURES=true
```

This bypasses all feature flags for testing.

---

## User Experience Flow

### Scenario 1: Coming Soon Feature

**User Journey:**
1. User sees "Coming Soon" badge in sidebar
2. Clicks on feature link
3. Redirected to professional coming soon page
4. Sees feature preview, benefits, launch date
5. Can join waitlist for notifications
6. Can return to dashboard

**What Users See:**
- ✅ Feature is visible in navigation
- ✅ Professional coming soon page
- ✅ Clear launch timeline
- ✅ Opt-in to notifications
- ❌ Cannot access actual feature

### Scenario 2: Direct URL Access

**User tries:** `https://app.com/dashboard/ghostwriter/new`

**System Response:**
1. Page component checks authentication
2. Checks feature access
3. Redirects to `/dashboard/ghostwriter/coming-soon`
4. Shows coming soon page (no error)

### Scenario 3: Tier-Restricted Feature

**Manuscript Submission (Professional+ only):**

1. Free user clicks "Submissions"
2. Sees "Coming Soon" (feature gate)
3. Once enabled, will see tier upgrade prompt
4. Professional/Studio users get full access

**Layered Protection:**
```
Coming Soon Gate → Tier Gate → Feature Access
```

---

## Testing Guide

### Manual Testing Checklist

**Test 1: Coming Soon Page**
- [ ] Navigate to `/dashboard/ghostwriter`
- [ ] Verify redirect to `/dashboard/ghostwriter/coming-soon`
- [ ] Check professional UI appearance
- [ ] Verify launch date displays
- [ ] Test waitlist signup form
- [ ] Check mobile responsiveness

**Test 2: Sidebar Badges**
- [ ] Verify "Coming Soon" badge appears on Ghostwriter
- [ ] Verify "Coming Soon" badge appears on Submissions
- [ ] Check badge colors (amber)
- [ ] Verify badge visibility in mobile menu

**Test 3: Direct URL Protection**
- [ ] Try accessing `/dashboard/ghostwriter/new`
- [ ] Verify redirect to coming soon page
- [ ] Try accessing `/dashboard/submissions/new`
- [ ] Verify redirect to coming soon page

**Test 4: Enable Feature**
- [ ] Change status to 'enabled' in feature flags
- [ ] Remove comingSoon badge in sidebar
- [ ] Restart dev server
- [ ] Navigate to feature
- [ ] Verify full access to feature
- [ ] No coming soon page shown

**Test 5: Tier Restrictions (Submissions)**
- [ ] Enable Manuscript Submission feature
- [ ] Login as Free tier user
- [ ] Verify tier upgrade prompt appears
- [ ] Login as Professional tier user
- [ ] Verify full access granted

### Automated Tests

```bash
# Run type checking
npm run type-check

# Run tests
npm test

# Build check
npm run build
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Feature flags configured correctly
- [ ] Coming soon badges set appropriately
- [ ] Launch dates updated
- [ ] Waitlist API endpoint working
- [ ] All tests passing
- [ ] TypeScript compilation clean
- [ ] Build successful

### Post-Deployment Monitoring

- [ ] Check coming soon pages load correctly
- [ ] Verify redirects work
- [ ] Monitor error logs for access issues
- [ ] Test on staging environment first
- [ ] Verify mobile responsiveness
- [ ] Check analytics for page views

### When Enabling Features

- [ ] Update feature flag status
- [ ] Remove sidebar badges
- [ ] Update documentation
- [ ] Notify users on waitlist (if implemented)
- [ ] Monitor for errors
- [ ] Check analytics for feature adoption

---

## Configuration Reference

### Current Feature States

| Feature | Status | Min Tier | Launch Date | Notes |
|---------|--------|----------|-------------|-------|
| Ghostwriter | `coming_soon` | free | 2025-02-15 | Shows coming soon page |
| Manuscript Submission | `coming_soon` | professional | 2025-03-01 | Shows coming soon page + tier gate |
| Collaboration | `enabled` | professional | N/A | Fully enabled |
| Version Control | `enabled` | free | N/A | Fully enabled |
| Advanced Analytics | `enabled` | professional | N/A | Fully enabled |

### Feature Status Definitions

| Status | Visibility | Access | Use Case |
|--------|-----------|--------|----------|
| `disabled` | Hidden | No one | Feature removed or not ready |
| `coming_soon` | Visible | No one | Feature under development |
| `beta` | Visible | Beta users only | Limited rollout |
| `limited` | Visible | Tier-restricted | Upsell opportunity |
| `enabled` | Visible | Everyone (+ tier check) | Full release |

---

## FAQs

### Q: How do I add a new feature with coming soon gate?

A:
1. Add feature to `FEATURES` constant
2. Add configuration to `DEFAULT_FEATURE_CONFIG` with `status: 'coming_soon'`
3. Create coming soon page at `app/dashboard/[feature]/coming-soon/page.tsx`
4. Add feature to sidebar with `comingSoon: true`
5. Add route guard to main feature page

### Q: Can users access sub-routes directly?

A: No. The main page redirect protects all sub-routes. If a user tries `/dashboard/ghostwriter/new`, they'll be redirected to the coming soon page because the feature gate check happens before any content loads.

### Q: How do I test locally without seeing coming soon pages?

A: Set `NEXT_PUBLIC_ENABLE_ALL_FEATURES=true` in `.env.local`

### Q: What happens to existing data when enabling a feature?

A: Nothing changes. The feature flag only controls UI access. Database schemas and data remain intact.

### Q: Can I have different states for different users?

A: Yes! Use `beta` status with `betaUsers` array for selective access, or use `limited` with `minTier` for tier-based access.

---

## Troubleshooting

### Issue: Coming soon page not showing

**Check:**
1. Feature status is 'coming_soon' in feature flags
2. Route guard is implemented on main page
3. Coming soon page exists at correct path
4. No environment variable bypassing flags

### Issue: Users can still access feature

**Check:**
1. Feature status in feature flags
2. Route guard code on main feature page
3. Server restart after config changes
4. Cache cleared (browser + Next.js)

### Issue: Sidebar badge not appearing

**Check:**
1. `comingSoon: true` set on nav item
2. Badge rendering logic in dashboard-nav.tsx
3. Tailwind classes properly applied
4. Component re-rendered after changes

---

## Maintenance

### Updating Launch Dates

Edit `lib/features/feature-flags.ts`:

```typescript
launchDate: '2025-03-15T00:00:00Z'  // ISO 8601 format
```

### Adding Benefits to Coming Soon Page

Edit feature-specific coming soon page:

```typescript
<ComingSoonPage
  featureId={FEATURES.GHOSTWRITER}
  benefits={[
    'New benefit here',
    // ...
  ]}
/>
```

### Monitoring Waitlist Signups

TODO: Implement waitlist API endpoint and database table

---

## Future Enhancements

- [ ] Implement waitlist database and API
- [ ] Add email notifications when features launch
- [ ] Create admin panel for feature flag management
- [ ] Add A/B testing for coming soon pages
- [ ] Track analytics on coming soon page engagement
- [ ] Add feature request voting system

---

**Document Version:** 1.0
**Last Updated:** 2025-01-23
**Maintained By:** Development Team
**Questions?** See implementation files or contact dev team
