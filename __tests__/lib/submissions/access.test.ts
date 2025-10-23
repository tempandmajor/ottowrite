/**
 * Tests for Manuscript Submissions Access Control
 */

import { describe, it, expect } from 'vitest'
import {
  canAccessSubmissions,
  tierSupportsSubmissions,
  getSubmissionFeatures,
  SUBMISSION_ACCESS_MESSAGES,
  type UserProfile,
} from '@/lib/submissions/access'

describe('canAccessSubmissions', () => {
  it('should allow access for active Studio users', () => {
    const profile: UserProfile = {
      subscription_tier: 'studio',
      subscription_status: 'active',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    }

    const result = canAccessSubmissions(profile)

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

    const result = canAccessSubmissions(profile)

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

    const result = canAccessSubmissions(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('inactive_subscription')
    expect(result.currentTier).toBe('studio')
    expect(result.requiredTier).toBe('studio')
  })

  it('should deny access for null profile', () => {
    const result = canAccessSubmissions(null)

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

    const result = canAccessSubmissions(profile)

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

    const result = canAccessSubmissions(profile)

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

    const result = canAccessSubmissions(profile)

    expect(result.hasAccess).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('should deny access for past_due subscription status', () => {
    const profile: UserProfile = {
      subscription_tier: 'studio',
      subscription_status: 'past_due',
      subscription_current_period_end: new Date(Date.now() + 86400000 * 5).toISOString(),
    }

    const result = canAccessSubmissions(profile)

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('inactive_subscription')
  })
})

describe('tierSupportsSubmissions', () => {
  it('should return true for studio tier', () => {
    expect(tierSupportsSubmissions('studio')).toBe(true)
  })

  it('should return false for free tier', () => {
    expect(tierSupportsSubmissions('free')).toBe(false)
  })

  it('should return false for hobbyist tier', () => {
    expect(tierSupportsSubmissions('hobbyist')).toBe(false)
  })

  it('should return false for professional tier', () => {
    expect(tierSupportsSubmissions('professional')).toBe(false)
  })
})

describe('getSubmissionFeatures', () => {
  it('should return all features enabled for studio tier', () => {
    const features = getSubmissionFeatures('studio')

    expect(features.enabled).toBe(true)
    expect(features.priority).toBe(true)
    expect(features.unlimited).toBe(true)
  })

  it('should return all features disabled for free tier', () => {
    const features = getSubmissionFeatures('free')

    expect(features.enabled).toBe(false)
    expect(features.priority).toBe(false)
    expect(features.unlimited).toBe(false)
  })

  it('should return all features disabled for professional tier', () => {
    const features = getSubmissionFeatures('professional')

    expect(features.enabled).toBe(false)
    expect(features.priority).toBe(false)
    expect(features.unlimited).toBe(false)
  })
})

describe('SUBMISSION_ACCESS_MESSAGES', () => {
  it('should have message for no_studio_plan', () => {
    expect(SUBMISSION_ACCESS_MESSAGES.no_studio_plan).toBeDefined()
    expect(SUBMISSION_ACCESS_MESSAGES.no_studio_plan).toContain('Studio plan')
  })

  it('should have message for inactive_subscription', () => {
    expect(SUBMISSION_ACCESS_MESSAGES.inactive_subscription).toBeDefined()
    expect(SUBMISSION_ACCESS_MESSAGES.inactive_subscription).toContain('not active')
  })

  it('should have message for no_subscription', () => {
    expect(SUBMISSION_ACCESS_MESSAGES.no_subscription).toBeDefined()
    expect(SUBMISSION_ACCESS_MESSAGES.no_subscription).toContain('Studio subscription')
  })
})
