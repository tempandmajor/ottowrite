import Stripe from 'stripe'

// Lazy singleton pattern - only instantiate when actually used at runtime
let stripeInstance: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      aiWordsPerMonth: 25000,
      maxDocuments: 5,
      maxProjects: 5,
      models: ['claude-sonnet-4.5'],
      exports: ['pdf', 'markdown', 'txt'],
      versionHistory: 30, // days
      collaboration: false,
      advancedFeatures: false,
      screenplayTools: false,
      apiAccess: false,
    },
  },
  hobbyist: {
    name: 'Hobbyist',
    price: 20,
    priceId: process.env.STRIPE_PRICE_HOBBYIST,
    features: {
      aiWordsPerMonth: 100000,
      maxDocuments: -1, // unlimited
      maxProjects: -1, // unlimited
      models: ['claude-sonnet-4.5', 'gpt-5', 'deepseek-chat'],
      exports: ['pdf', 'docx', 'markdown', 'txt', 'epub'],
      versionHistory: -1, // unlimited
      collaboration: false,
      advancedFeatures: true,
      screenplayTools: true,
      apiAccess: false,
    },
  },
  professional: {
    name: 'Professional',
    price: 60,
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL,
    features: {
      aiWordsPerMonth: 500000,
      maxDocuments: -1,
      maxProjects: -1,
      models: ['claude-sonnet-4.5', 'gpt-5', 'deepseek-chat'],
      exports: ['pdf', 'docx', 'markdown', 'txt', 'epub', 'fdx', 'fountain'],
      versionHistory: -1,
      collaboration: false,
      advancedFeatures: true,
      screenplayTools: true,
      apiAccess: true,
      apiRequestsPerDay: 50,
    },
  },
  studio: {
    name: 'Studio',
    price: 100,
    priceId: process.env.STRIPE_PRICE_STUDIO,
    features: {
      aiWordsPerMonth: 2000000,
      maxDocuments: -1,
      maxProjects: -1,
      models: ['claude-sonnet-4.5', 'gpt-5', 'deepseek-chat'],
      exports: ['pdf', 'docx', 'markdown', 'txt', 'epub', 'fdx', 'fountain'],
      versionHistory: -1,
      collaboration: true,
      teamSeats: 5,
      advancedFeatures: true,
      screenplayTools: true,
      apiAccess: true,
      apiRequestsPerDay: 1000,
      // Manuscript Submissions (Studio-exclusive)
      submissions: true,
      submissionsPriority: true,
      submissionsUnlimited: true,
    },
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

export function getTierFeatures(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier].features
}

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof (typeof SUBSCRIPTION_TIERS)['free']['features']
): boolean {
  const tierFeatures = SUBSCRIPTION_TIERS[tier].features
  return !!tierFeatures[feature as keyof typeof tierFeatures]
}

export function getMonthlyAIWordLimit(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier].features.aiWordsPerMonth
}

export function getMaxDocuments(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier].features.maxDocuments
}

export function getTierByPriceId(priceId?: string | null): SubscriptionTier | null {
  if (!priceId) return null

  for (const [tierKey, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId && config.priceId === priceId) {
      return tierKey as SubscriptionTier
    }
  }

  return null
}

export function getAllowedPriceIds(): string[] {
  return Object.values(SUBSCRIPTION_TIERS)
    .map(({ priceId }) => priceId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

/**
 * Check if a user's subscription is active and valid.
 *
 * Returns true only if:
 * 1. Subscription status is 'active' or 'trialing'
 * 2. Subscription has not expired (current_period_end is in the future)
 *
 * This prevents users with past_due, canceled, or expired subscriptions
 * from accessing paid features.
 *
 * @param profile - User profile with subscription fields
 * @returns boolean - true if subscription is active and valid
 */
export function isSubscriptionActive(profile: {
  subscription_status: string | null
  subscription_tier: string | null
  subscription_current_period_end: string | null
}): boolean {
  // Free tier is always "active" (no subscription required)
  if (!profile.subscription_tier || profile.subscription_tier === 'free') {
    return true
  }

  // Valid subscription statuses that allow feature access
  const validStatuses = ['active', 'trialing']
  const hasValidStatus = profile.subscription_status &&
    validStatuses.includes(profile.subscription_status)

  // Check if subscription hasn't expired
  const periodEnd = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end)
    : null
  const isExpired = periodEnd && periodEnd < new Date()

  return !!(hasValidStatus && !isExpired)
}

/**
 * Get the appropriate error response for an inactive subscription.
 * Returns a 402 Payment Required error with upgrade/reactivate information.
 */
export function getInactiveSubscriptionError(profile: {
  subscription_status: string | null
  subscription_tier: string | null
}) {
  const status = profile.subscription_status

  let message = 'Your subscription is not active.'
  let action = 'upgrade'

  if (status === 'past_due') {
    message = 'Your subscription payment is past due. Please update your payment method to continue using paid features.'
    action = 'update-payment'
  } else if (status === 'canceled') {
    message = 'Your subscription has been canceled. Please reactivate your subscription to continue using paid features.'
    action = 'reactivate'
  } else if (status === 'incomplete' || status === 'incomplete_expired') {
    message = 'Your subscription setup is incomplete. Please complete your subscription to access paid features.'
    action = 'complete-setup'
  } else if (status === 'unpaid') {
    message = 'Your subscription is unpaid. Please update your payment method to continue.'
    action = 'update-payment'
  }

  return {
    error: message,
    code: 'SUBSCRIPTION_INACTIVE',
    status: profile.subscription_status,
    tier: profile.subscription_tier,
    action,
    upgradeUrl: '/dashboard/settings/billing',
  }
}
