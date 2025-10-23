/**
 * Manuscript Submissions Access Control
 *
 * @deprecated This module is deprecated. Use @/lib/studio/access instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 *
 * Migration guide:
 * - Replace canAccessSubmissions() with canAccessStudioFeatures() from @/lib/studio/access
 * - Replace SubmissionsUpgradeRequired with StudioUpgradeRequired from @/components/studio/studio-upgrade-required
 * - Update imports from @/lib/submissions/access to @/lib/studio/access
 */

import {
  canAccessStudioFeatures,
  tierSupportsStudioFeatures,
  getStudioFeatures,
  STUDIO_UPGRADE_URLS,
  STUDIO_ACCESS_MESSAGES,
  type UserProfile as StudioUserProfile,
  type StudioAccessResult,
} from '@/lib/studio/access'
import { type SubscriptionTier } from '@/lib/stripe/config'

// Re-export types for backward compatibility
export type UserProfile = StudioUserProfile

/**
 * @deprecated Use StudioAccessResult from @/lib/studio/access instead
 */
export type SubmissionAccessResult = StudioAccessResult

/**
 * Check if a user can access the manuscript submissions feature
 *
 * @deprecated Use canAccessStudioFeatures() from @/lib/studio/access instead
 * @param profile - User profile with subscription information
 * @returns Access result with reason if denied
 */
export function canAccessSubmissions(
  profile: UserProfile | null
): SubmissionAccessResult {
  return canAccessStudioFeatures(profile)
}

/**
 * Check if a subscription tier supports submissions
 *
 * @deprecated Use tierSupportsStudioFeatures() from @/lib/studio/access instead
 * @param tier - Subscription tier to check
 * @returns True if tier supports submissions
 */
export function tierSupportsSubmissions(tier: SubscriptionTier): boolean {
  return tierSupportsStudioFeatures(tier)
}

/**
 * Get submission feature flags for a tier
 *
 * @deprecated Use getStudioFeatures() from @/lib/studio/access instead
 * @param tier - Subscription tier
 * @returns Submission feature flags
 */
export function getSubmissionFeatures(tier: SubscriptionTier) {
  const features = getStudioFeatures(tier)
  return {
    enabled: features.submissions,
    priority: features.submissionsPriority,
    unlimited: features.submissionsUnlimited,
  }
}

/**
 * Upgrade URL for submissions feature
 *
 * @deprecated Use STUDIO_UPGRADE_URLS.submissions from @/lib/studio/access instead
 */
export const SUBMISSIONS_UPGRADE_URL = STUDIO_UPGRADE_URLS.submissions

/**
 * User-friendly error messages for submission access denial
 *
 * @deprecated Use STUDIO_ACCESS_MESSAGES from @/lib/studio/access instead
 */
export const SUBMISSION_ACCESS_MESSAGES = STUDIO_ACCESS_MESSAGES
