/**
 * Tests for Studio Features Access Control
 */

import { describe, it, expect } from 'vitest'
import {
  canAccessStudioFeatures,
  isStudioTier,
  tierSupportsStudioFeatures,
  getStudioFeatures,
  STUDIO_ACCESS_MESSAGES,
  STUDIO_UPGRADE_URLS,
  type UserProfile,
} from '@/lib/studio/access'

describe('canAccessStudioFeatures', () => {
  it('should allow access for active Studio users', () => {
    const profile: UserProfile = {
      subscription_tier: 'studio',
      subscription_status: 'active',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(true)
    expect(result.reason).toBeUndefined()
    expect(result.requiredTier).toBe('studio')
  })

  it('should deny access for users without Studio plan', () => {
    const profile: UserProfile = {
      subscription_tier: 'professional',
      subscription_status: 'active',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('no_studio_plan')
    expect(result.currentTier).toBe('professional')
    expect(result.requiredTier).toBe('studio')
  })

  it('should deny access for inactive Studio subscription', () => {
    const profile: UserProfile = {
      subscription_tier: 'studio',
      subscription_status: 'canceled',
      subscription_current_period_end: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('inactive_subscription')
    expect(result.currentTier).toBe('studio')
    expect(result.requiredTier).toBe('studio')
  })

  it('should deny access for null profile', () => {
    const result = canAccessStudioFeatures(null)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('no_subscription')
    expect(result.currentTier).toBeNull()
    expect(result.requiredTier).toBe('studio')
  })

  it('should deny access for free tier users', () => {
    const profile: UserProfile = {
      subscription_tier: 'free',
      subscription_status: 'active',
      subscription_current_period_end: null,
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('no_studio_plan')
    expect(result.currentTier).toBe('free')
  })

  it('should deny access for hobbyist tier users', () => {
    const profile: UserProfile = {
      subscription_tier: 'hobbyist',
      subscription_status: 'active',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('no_studio_plan')
    expect(result.currentTier).toBe('hobbyist')
  })

  it('should allow access for trialing Studio subscription', () => {
    const profile: UserProfile = {
      subscription_tier: 'studio',
      subscription_status: 'trialing',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days trial
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('should deny access for past_due subscription status', () => {
    const profile: UserProfile = {
      subscription_tier: 'studio',
      subscription_status: 'past_due',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 5).toISOString(),
    }

    const result = canAccessStudioFeatures(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('inactive_subscription')
  })
})

describe('isStudioTier', () => {
  it('should return true for studio tier', () => {
    expect(isStudioTier('studio')).toBe(true)
  })

  it('should return false for free tier', () => {
    expect(isStudioTier('free')).toBe(false)
  })

  it('should return false for hobbyist tier', () => {
    expect(isStudioTier('hobbyist')).toBe(false)
  })

  it('should return false for professional tier', () => {
    expect(isStudioTier('professional')).toBe(false)
  })

  it('should return false for null', () => {
    expect(isStudioTier(null)).toBe(false)
  })
})

describe('tierSupportsStudioFeatures', () => {
  it('should return true for studio tier', () => {
    expect(tierSupportsStudioFeatures('studio')).toBe(true)
  })

  it('should return false for free tier', () => {
    expect(tierSupportsStudioFeatures('free')).toBe(false)
  })

  it('should return false for hobbyist tier', () => {
    expect(tierSupportsStudioFeatures('hobbyist')).toBe(false)
  })

  it('should return false for professional tier', () => {
    expect(tierSupportsStudioFeatures('professional')).toBe(false)
  })
})

describe('getStudioFeatures', () => {
  it('should return all features enabled for studio tier', () => {
    const features = getStudioFeatures('studio')

    expect(features.submissions).toBe(true)
    expect(features.submissionsPriority).toBe(true)
    expect(features.submissionsUnlimited).toBe(true)
    expect(features.ipProtection).toBe(true)
    expect(features.advancedWatermarking).toBe(true)
    expect(features.accessAuditLogs).toBe(true)
    expect(features.securityAlerts).toBe(true)
    expect(features.dmcaTakedowns).toBe(true)
    expect(features.submissionAnalytics).toBe(true)
    expect(features.partnerAnalytics).toBe(true)
  })

  it('should return all features disabled for free tier', () => {
    const features = getStudioFeatures('free')

    expect(features.submissions).toBe(false)
    expect(features.submissionsPriority).toBe(false)
    expect(features.submissionsUnlimited).toBe(false)
    expect(features.ipProtection).toBe(false)
    expect(features.advancedWatermarking).toBe(false)
    expect(features.accessAuditLogs).toBe(false)
    expect(features.securityAlerts).toBe(false)
    expect(features.dmcaTakedowns).toBe(false)
    expect(features.submissionAnalytics).toBe(false)
    expect(features.partnerAnalytics).toBe(false)
  })

  it('should return all features disabled for professional tier', () => {
    const features = getStudioFeatures('professional')

    expect(features.submissions).toBe(false)
    expect(features.ipProtection).toBe(false)
    expect(features.dmcaTakedowns).toBe(false)
  })
})

describe('STUDIO_ACCESS_MESSAGES', () => {
  it('should have message for no_studio_plan', () => {
    expect(STUDIO_ACCESS_MESSAGES.no_studio_plan).toBeDefined()
    expect(STUDIO_ACCESS_MESSAGES.no_studio_plan).toContain('Studio plan')
  })

  it('should have message for inactive_subscription', () => {
    expect(STUDIO_ACCESS_MESSAGES.inactive_subscription).toBeDefined()
    expect(STUDIO_ACCESS_MESSAGES.inactive_subscription).toContain('not active')
  })

  it('should have message for no_subscription', () => {
    expect(STUDIO_ACCESS_MESSAGES.no_subscription).toBeDefined()
    expect(STUDIO_ACCESS_MESSAGES.no_subscription).toContain('Studio subscription')
  })
})

describe('STUDIO_UPGRADE_URLS', () => {
  it('should have default upgrade URL', () => {
    expect(STUDIO_UPGRADE_URLS.default).toBe('/pricing?plan=studio')
  })

  it('should have submissions-specific URL', () => {
    expect(STUDIO_UPGRADE_URLS.submissions).toBe('/pricing?plan=studio&feature=submissions')
  })

  it('should have IP protection-specific URL', () => {
    expect(STUDIO_UPGRADE_URLS.ipProtection).toBe('/pricing?plan=studio&feature=ip-protection')
  })

  it('should have DMCA-specific URL', () => {
    expect(STUDIO_UPGRADE_URLS.dmca).toBe('/pricing?plan=studio&feature=dmca')
  })
})
