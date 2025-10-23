/**
 * Feature Gate Component
 *
 * Wraps features and shows upgrade badges/prompts when user doesn't have access.
 * Can optionally block the feature entirely or just show a badge.
 */

'use client'

import { ReactNode } from 'react'
import { UpgradePrompt, type UpgradePromptReason, type UpgradePromptPlan, type UpgradePromptVariant } from './upgrade-prompt'
import { canAccessFeature, SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/config'

// Union of all possible features across all tiers
type FeatureName = keyof typeof SUBSCRIPTION_TIERS.free.features |
  keyof typeof SUBSCRIPTION_TIERS.professional.features |
  keyof typeof SUBSCRIPTION_TIERS.studio.features

interface FeatureGateProps {
  feature: FeatureName
  currentPlan: string
  children: ReactNode
  fallback?: ReactNode
  showBadge?: boolean
  badgeOnly?: boolean
  variant?: UpgradePromptVariant
  reason?: UpgradePromptReason
}

const featureToReason: Partial<Record<FeatureName, UpgradePromptReason>> = {
  aiWordsPerMonth: 'ai_words_limit',
  maxDocuments: 'document_limit',
  maxProjects: 'project_limit',
  models: 'generic',
  exports: 'generic',
  versionHistory: 'generic',
  collaboration: 'collaboration',
  advancedFeatures: 'generic',
  screenplayTools: 'generic',
  apiAccess: 'api_access',
  apiRequestsPerDay: 'api_access',
  teamSeats: 'team_seats',
  submissions: 'generic',
  submissionsPriority: 'generic',
  submissionsUnlimited: 'generic',
}

const featureToRecommendedPlan: Partial<Record<FeatureName, UpgradePromptPlan>> = {
  aiWordsPerMonth: 'hobbyist',
  maxDocuments: 'hobbyist',
  maxProjects: 'hobbyist',
  models: 'hobbyist',
  exports: 'professional',
  versionHistory: 'hobbyist',
  collaboration: 'studio',
  advancedFeatures: 'hobbyist',
  screenplayTools: 'hobbyist',
  apiAccess: 'professional',
  apiRequestsPerDay: 'professional',
  teamSeats: 'studio',
  submissions: 'studio',
  submissionsPriority: 'studio',
  submissionsUnlimited: 'studio',
}

export function FeatureGate({
  feature,
  currentPlan,
  children,
  fallback,
  showBadge = true,
  badgeOnly = false,
  variant = 'inline',
  reason,
}: FeatureGateProps) {
  const hasAccess = canAccessFeature(currentPlan as SubscriptionTier, feature as keyof typeof SUBSCRIPTION_TIERS.free.features)

  // If user has access, just show the feature
  if (hasAccess) {
    return <>{children}</>
  }

  // If badge only, show badge alongside the feature
  if (badgeOnly && showBadge) {
    return (
      <div className="relative">
        {children}
        <div className="mt-2">
          <UpgradePrompt
            reason={reason ?? featureToReason[feature] ?? 'generic'}
            currentPlan={currentPlan}
            recommendedPlan={featureToRecommendedPlan[feature] ?? 'professional'}
            variant="badge"
          />
        </div>
      </div>
    )
  }

  // If fallback provided, show fallback
  if (fallback) {
    return <>{fallback}</>
  }

  // Otherwise show upgrade prompt
  return (
    <UpgradePrompt
      reason={reason ?? featureToReason[feature] ?? 'generic'}
      currentPlan={currentPlan}
      recommendedPlan={featureToRecommendedPlan[feature] ?? 'professional'}
      variant={variant}
    />
  )
}

/**
 * Inline wrapper for showing a badge next to text
 */
export function FeatureBadge({ feature, currentPlan }: { feature: FeatureName; currentPlan: string }) {
  const hasAccess = canAccessFeature(currentPlan as SubscriptionTier, feature as keyof typeof SUBSCRIPTION_TIERS.free.features)

  if (hasAccess) return null

  return (
    <UpgradePrompt
      reason={featureToReason[feature] ?? 'generic'}
      currentPlan={currentPlan}
      recommendedPlan={featureToRecommendedPlan[feature] ?? 'professional'}
      variant="badge"
    />
  )
}
