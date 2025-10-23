/**
 * Studio Features Access Control
 *
 * Handles access control for Studio-exclusive features including:
 * - Manuscript Submissions
 * - IP Protection & Security Monitoring
 * - DMCA Takedown Management
 * - Advanced Analytics
 *
 * Only users with an active Studio subscription can access these features.
 */

import { SUBSCRIPTION_TIERS, type SubscriptionTier, isSubscriptionActive } from '@/lib/stripe/config'

export interface UserProfile {
  subscription_tier: string | null
  subscription_status: string | null
  subscription_current_period_end: string | null
}

export interface StudioAccessResult {
  hasAccess: boolean
  reason?: 'no_studio_plan' | 'inactive_subscription' | 'no_subscription'
  currentTier?: string | null
  requiredTier: 'studio'
}

/**
 * Check if a user can access Studio features
 *
 * @param profile - User profile with subscription information
 * @returns Access result with reason if denied
 *
 * @example
 * ```typescript
 * const { data: profile } = await supabase
 *   .from('user_profiles')
 *   .select('subscription_tier, subscription_status, subscription_current_period_end')
 *   .eq('id', user.id)
 *   .single()
 *
 * const access = canAccessStudioFeatures(profile)
 * if (!access.hasAccess) {
 *   return <StudioUpgradeRequired currentPlan={access.currentTier} />
 * }
 * ```
 */
export function canAccessStudioFeatures(
  profile: UserProfile | null
): StudioAccessResult {
  // No profile = no access
  if (!profile) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      currentTier: null,
      requiredTier: 'studio',
    }
  }

  const { subscription_tier } = profile

  // Check if user has Studio tier
  const isStudioTier = subscription_tier === 'studio'
  if (!isStudioTier) {
    return {
      hasAccess: false,
      reason: 'no_studio_plan',
      currentTier: subscription_tier,
      requiredTier: 'studio',
    }
  }

  // Check if subscription is active (includes trialing and expiration check)
  const hasActiveSubscription = isSubscriptionActive(profile)
  if (!hasActiveSubscription) {
    return {
      hasAccess: false,
      reason: 'inactive_subscription',
      currentTier: subscription_tier,
      requiredTier: 'studio',
    }
  }

  // All checks passed
  return {
    hasAccess: true,
    requiredTier: 'studio',
  }
}

/**
 * Check if a subscription tier is Studio
 *
 * @param tier - Subscription tier to check
 * @returns True if tier is Studio
 */
export function isStudioTier(tier: SubscriptionTier | string | null): boolean {
  return tier === 'studio'
}

/**
 * Check if a subscription tier supports Studio features
 *
 * @param tier - Subscription tier to check
 * @returns True if tier supports Studio features
 */
export function tierSupportsStudioFeatures(tier: SubscriptionTier): boolean {
  return tier === 'studio'
}

/**
 * Get Studio feature flags for a tier
 *
 * @param tier - Subscription tier
 * @returns Studio feature flags
 */
export function getStudioFeatures(tier: SubscriptionTier) {
  const isStudio = tier === 'studio'
  const features = SUBSCRIPTION_TIERS[tier].features

  return {
    // Core Studio features
    submissions: isStudio && 'submissions' in features && features.submissions === true,
    submissionsPriority: isStudio && 'submissionsPriority' in features && features.submissionsPriority === true,
    submissionsUnlimited: isStudio && 'submissionsUnlimited' in features && features.submissionsUnlimited === true,

    // IP Protection features
    ipProtection: isStudio,
    advancedWatermarking: isStudio,
    accessAuditLogs: isStudio,
    securityAlerts: isStudio,
    dmcaTakedowns: isStudio,

    // Analytics features
    submissionAnalytics: isStudio,
    partnerAnalytics: isStudio,
  }
}

/**
 * Studio feature names for consistent messaging
 */
export const STUDIO_FEATURES = {
  SUBMISSIONS: 'Manuscript Submissions',
  IP_PROTECTION: 'IP Protection & Security',
  DMCA: 'DMCA Takedown Management',
  ANALYTICS: 'Advanced Analytics',
  WATERMARKING: 'Advanced Watermarking',
  AUDIT_LOGS: 'Access Audit Logs',
  SECURITY_ALERTS: 'Security Alerts',
} as const

/**
 * Upgrade URLs for Studio features
 */
export const STUDIO_UPGRADE_URLS = {
  default: '/pricing?plan=studio',
  submissions: '/pricing?plan=studio&feature=submissions',
  ipProtection: '/pricing?plan=studio&feature=ip-protection',
  dmca: '/pricing?plan=studio&feature=dmca',
} as const

/**
 * User-friendly error messages for Studio access denial
 */
export const STUDIO_ACCESS_MESSAGES = {
  no_studio_plan:
    'This feature requires a Studio plan. Upgrade to access manuscript submissions, IP protection, and advanced analytics.',
  inactive_subscription:
    'Your Studio subscription is not active. Please check your billing settings to continue using Studio features.',
  no_subscription:
    'You need an active Studio subscription to access this feature.',
} as const
