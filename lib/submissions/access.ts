/**
 * Manuscript Submissions Access Control
 *
 * Handles access control for the Studio-exclusive manuscript submissions feature.
 * Only users with an active Studio subscription can access submission functionality.
 */

import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/config'

export interface UserProfile {
  subscription_tier: string | null
  subscription_status: string | null
}

export interface SubmissionAccessResult {
  hasAccess: boolean
  reason?: 'no_studio_plan' | 'inactive_subscription' | 'no_subscription'
  currentTier?: string | null
  requiredTier: 'studio'
}

/**
 * Check if a user can access the manuscript submissions feature
 *
 * @param profile - User profile with subscription information
 * @returns Access result with reason if denied
 *
 * @example
 * ```typescript
 * const { data: profile } = await supabase
 *   .from('user_profiles')
 *   .select('subscription_tier, subscription_status')
 *   .eq('id', user.id)
 *   .single()
 *
 * const access = canAccessSubmissions(profile)
 * if (!access.hasAccess) {
 *   return <SubmissionsUpgradeRequired currentPlan={access.currentTier} />
 * }
 * ```
 */
export function canAccessSubmissions(
  profile: UserProfile | null
): SubmissionAccessResult {
  // No profile = no access
  if (!profile) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      currentTier: null,
      requiredTier: 'studio',
    }
  }

  const { subscription_tier, subscription_status } = profile

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

  // Check if subscription is active
  const isActive = subscription_status === 'active'
  if (!isActive) {
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
 * Check if a subscription tier supports submissions
 *
 * @param tier - Subscription tier to check
 * @returns True if tier supports submissions
 */
export function tierSupportsSubmissions(tier: SubscriptionTier): boolean {
  const features = SUBSCRIPTION_TIERS[tier].features
  return 'submissions' in features && features.submissions === true
}

/**
 * Get submission feature flags for a tier
 *
 * @param tier - Subscription tier
 * @returns Submission feature flags
 */
export function getSubmissionFeatures(tier: SubscriptionTier) {
  const features = SUBSCRIPTION_TIERS[tier].features
  return {
    enabled: 'submissions' in features && features.submissions === true,
    priority: 'submissionsPriority' in features && features.submissionsPriority === true,
    unlimited: 'submissionsUnlimited' in features && features.submissionsUnlimited === true,
  }
}

/**
 * Upgrade URL for submissions feature
 */
export const SUBMISSIONS_UPGRADE_URL = '/pricing?plan=studio&feature=submissions'

/**
 * User-friendly error messages for submission access denial
 */
export const SUBMISSION_ACCESS_MESSAGES = {
  no_studio_plan:
    'Manuscript submissions require a Studio plan. Upgrade to submit your work to verified agents and publishers.',
  inactive_subscription:
    'Your Studio subscription is not active. Please check your billing settings to continue using manuscript submissions.',
  no_subscription:
    'You need an active Studio subscription to access manuscript submissions.',
} as const
