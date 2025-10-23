# Studio Features Architecture

## Overview

Studio is Ottowrite's premium tier that provides advanced manuscript management features including:
- **Manuscript Submissions**: Submit manuscripts to verified agents and publishers
- **IP Protection & Security**: Monitor access patterns, watermarking, and security alerts
- **DMCA Takedown Management**: File and track copyright infringement claims
- **Advanced Analytics**: Track submission performance and partner engagement

This document describes the architecture and access control for Studio features.

---

## Architecture Improvements (January 2025)

### Problem Statement

The original implementation had naming issues that caused confusion:
1. Function named `canAccessSubmissions()` was used for BOTH submissions AND IP protection
2. Component named `SubmissionsUpgradeRequired` was shown for IP protection feature
3. No clear branding of "Studio Features" vs "Submissions-specific" features

### Solution

Created a unified **Studio Features** module that:
- Centralizes access control for all Studio features
- Uses clear, descriptive names (`canAccessStudioFeatures` instead of `canAccessSubmissions`)
- Provides feature-specific upgrade messaging
- Maintains backward compatibility for existing code

---

## Module Structure

```
lib/studio/
  └── access.ts          # Studio features access control

components/studio/
  └── studio-upgrade-required.tsx   # Generic Studio upgrade component

lib/submissions/access.ts            # DEPRECATED - backward compatibility wrapper
components/submissions/upgrade-required.tsx  # DEPRECATED - backward compatibility wrapper
```

---

## Access Control

### Main Function: `canAccessStudioFeatures()`

**Location**: `@/lib/studio/access`

**Purpose**: Check if a user can access any Studio feature (submissions, IP protection, DMCA, etc.)

**Usage**:
```typescript
import { canAccessStudioFeatures } from '@/lib/studio/access'

const { data: profile } = await supabase
  .from('user_profiles')
  .select('subscription_tier, subscription_status, subscription_current_period_end')
  .eq('id', user.id)
  .single()

const accessResult = canAccessStudioFeatures(profile)

if (!accessResult.hasAccess) {
  // Show upgrade prompt
  return <StudioUpgradeRequired currentPlan={accessResult.currentTier} feature="submissions" />
}

// User has access - show feature
```

**Return Type**:
```typescript
interface StudioAccessResult {
  hasAccess: boolean
  reason?: 'no_studio_plan' | 'inactive_subscription' | 'no_subscription'
  currentTier?: string | null
  requiredTier: 'studio'
}
```

**Access Rules**:
1. User must have `subscription_tier === 'studio'`
2. Subscription must be active (checked via `isSubscriptionActive()`)
3. Active statuses: `'active'`, `'trialing'`
4. Inactive statuses: `'canceled'`, `'past_due'`, `'unpaid'`, `'paused'`

---

## Upgrade Components

### `StudioUpgradeRequired`

**Location**: `@/components/studio/studio-upgrade-required`

**Purpose**: Show feature-specific upgrade messaging for Studio features

**Props**:
```typescript
interface StudioUpgradeRequiredProps {
  currentPlan?: string | null     // User's current plan (for messaging)
  feature?: 'submissions' | 'ipProtection' | 'dmca' | 'default'  // Which feature to promote
}
```

**Features**:
- Feature-specific hero sections with custom icons
- Feature-specific benefit lists
- Feature-specific preview cards
- Feature-specific upgrade URLs with tracking params
- Feature-specific social proof stats

**Usage Examples**:

**For Submissions**:
```typescript
<StudioUpgradeRequired currentPlan="professional" feature="submissions" />
```

**For IP Protection**:
```typescript
<StudioUpgradeRequired currentPlan="hobbyist" feature="ipProtection" />
```

**For DMCA**:
```typescript
<StudioUpgradeRequired currentPlan="free" feature="dmca" />
```

**Generic Studio**:
```typescript
<StudioUpgradeRequired currentPlan="professional" feature="default" />
```

---

## Page Implementation

### Submissions Page

**File**: `app/dashboard/submissions/page.tsx`

**Access Control**:
```typescript
import { canAccessStudioFeatures } from '@/lib/studio/access'
import { StudioUpgradeRequired } from '@/components/studio/studio-upgrade-required'

const accessResult = canAccessStudioFeatures(profile)

if (!accessResult.hasAccess) {
  return <StudioUpgradeRequired currentPlan={accessResult.currentTier} feature="submissions" />
}

// Show submissions dashboard
return <SubmissionsDashboard userId={user.id} />
```

**Cross-Links**:
- Header button to IP Protection Dashboard

### IP Protection Page

**File**: `app/dashboard/ip-protection/page.tsx`

**Access Control**:
```typescript
import { canAccessStudioFeatures } from '@/lib/studio/access'
import { StudioUpgradeRequired } from '@/components/studio/studio-upgrade-required'

const accessResult = canAccessStudioFeatures(profile)

if (!accessResult.hasAccess) {
  return <StudioUpgradeRequired currentPlan={accessResult.currentTier} feature="ipProtection" />
}

// Show IP protection dashboard with tabs
return (
  <Tabs defaultValue="overview">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="access-logs">Access Logs</TabsTrigger>
      <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
      <TabsTrigger value="dmca">DMCA Takedowns</TabsTrigger>
    </TabsList>
    ...
  </Tabs>
)
```

**Cross-Links**:
- Header button to Submissions Dashboard

---

## Helper Functions

### `isStudioTier(tier)`

Check if a tier is Studio:
```typescript
import { isStudioTier } from '@/lib/studio/access'

if (isStudioTier(userTier)) {
  // Enable Studio features
}
```

### `tierSupportsStudioFeatures(tier)`

Check if a tier supports Studio features:
```typescript
import { tierSupportsStudioFeatures } from '@/lib/studio/access'

if (tierSupportsStudioFeatures(tier)) {
  // Show Studio features in UI
}
```

### `getStudioFeatures(tier)`

Get all Studio feature flags for a tier:
```typescript
import { getStudioFeatures } from '@/lib/studio/access'

const features = getStudioFeatures('studio')
// {
//   submissions: true,
//   submissionsPriority: true,
//   submissionsUnlimited: true,
//   ipProtection: true,
//   advancedWatermarking: true,
//   accessAuditLogs: true,
//   securityAlerts: true,
//   dmcaTakedowns: true,
//   submissionAnalytics: true,
//   partnerAnalytics: true,
// }
```

---

## Constants

### `STUDIO_FEATURES`

Feature names for consistent messaging:
```typescript
import { STUDIO_FEATURES } from '@/lib/studio/access'

console.log(STUDIO_FEATURES.SUBMISSIONS)      // "Manuscript Submissions"
console.log(STUDIO_FEATURES.IP_PROTECTION)   // "IP Protection & Security"
console.log(STUDIO_FEATURES.DMCA)            // "DMCA Takedown Management"
```

### `STUDIO_UPGRADE_URLS`

Upgrade URLs with tracking parameters:
```typescript
import { STUDIO_UPGRADE_URLS } from '@/lib/studio/access'

console.log(STUDIO_UPGRADE_URLS.default)        // "/pricing?plan=studio"
console.log(STUDIO_UPGRADE_URLS.submissions)    // "/pricing?plan=studio&feature=submissions"
console.log(STUDIO_UPGRADE_URLS.ipProtection)   // "/pricing?plan=studio&feature=ip-protection"
console.log(STUDIO_UPGRADE_URLS.dmca)           // "/pricing?plan=studio&feature=dmca"
```

### `STUDIO_ACCESS_MESSAGES`

User-friendly error messages:
```typescript
import { STUDIO_ACCESS_MESSAGES } from '@/lib/studio/access'

if (accessResult.reason === 'no_studio_plan') {
  toast.error(STUDIO_ACCESS_MESSAGES.no_studio_plan)
}
```

---

## Migration Guide

### For Existing Code

If you have code using the old `@/lib/submissions/access` module:

**Before**:
```typescript
import { canAccessSubmissions } from '@/lib/submissions/access'
import { SubmissionsUpgradeRequired } from '@/components/submissions/upgrade-required'

const accessResult = canAccessSubmissions(profile)
if (!accessResult.hasAccess) {
  return <SubmissionsUpgradeRequired currentPlan={accessResult.currentTier} />
}
```

**After**:
```typescript
import { canAccessStudioFeatures } from '@/lib/studio/access'
import { StudioUpgradeRequired } from '@/components/studio/studio-upgrade-required'

const accessResult = canAccessStudioFeatures(profile)
if (!accessResult.hasAccess) {
  return <StudioUpgradeRequired currentPlan={accessResult.currentTier} feature="submissions" />
}
```

### Backward Compatibility

The old modules are still available but deprecated:
- `@/lib/submissions/access` → Wrapper around `@/lib/studio/access`
- `@/components/submissions/upgrade-required` → Wrapper around `@/components/studio/studio-upgrade-required`

**All existing code continues to work** via these wrappers.

**Timeline**: Deprecated modules will be removed in a future major version (with advance notice).

---

## Testing

### Unit Tests

**New Tests**: `__tests__/lib/studio/access.test.ts`
- 27 tests covering all Studio access control logic
- Tests for all helper functions
- Tests for constants and URLs

**Backward Compatibility Tests**: `__tests__/lib/submissions/access.test.ts`
- 18 tests ensuring backward compatibility
- All tests pass using deprecated wrappers

### Running Tests

```bash
# Run Studio access tests
npm test -- __tests__/lib/studio/access.test.ts

# Run backward compatibility tests
npm test -- __tests__/lib/submissions/access.test.ts

# Run all tests
npm test
```

---

## Feature Comparison

### Why Submissions and IP Protection Are Separate Pages

| Aspect | Submissions | IP Protection |
|--------|-------------|---------------|
| **Primary Purpose** | Workflow management | Security monitoring |
| **User Intent** | "I want to submit my manuscript" | "I want to monitor access to my work" |
| **Main Actions** | Create, submit, track responses | Monitor, investigate, takedown |
| **Data Model** | Manuscripts, partners, responses | Access logs, alerts, DMCA requests |
| **UI Pattern** | List view with actions | Dashboard with tabs |

**Decision**: Keep pages separate but add cross-links for easy navigation.

---

## Future Enhancements

### Potential Improvements

1. **Tab-Based Navigation** (Optional):
   ```
   /dashboard/studio
     ├── /submissions (default tab)
     ├── /ip-protection (security tab)
     └── /analytics (analytics tab)
   ```

2. **Submission-Specific IP Protection**:
   - Add "View Security" button on each submission card
   - Links to IP protection page with pre-filtered data for that submission

3. **Feature Usage Tracking**:
   - Track which Studio features are used most
   - Provide insights on upgrade conversions by feature

---

## Related Documentation

- [Subscription Naming Conventions](./SUBSCRIPTION_NAMING.md)
- [Trial Period Messaging](./TRIAL_PERIOD_MESSAGING.md)
- [Manuscript Submissions Access Control](../MANUSCRIPT_SUBMISSIONS_ACCESS_CONTROL.md)
- [IP Protection Dashboard](../IP_PROTECTION_DASHBOARD.md)

---

## Support

For questions or issues related to Studio architecture:
1. Check this documentation first
2. Review test files for usage examples
3. Check deprecated module comments for migration help
4. Contact the development team
