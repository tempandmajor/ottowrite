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
    price: 12,
    priceId: process.env.STRIPE_PRICE_HOBBYIST,
    features: {
      aiWordsPerMonth: 100000,
      maxDocuments: -1, // unlimited
      models: ['claude-sonnet-4.5', 'gpt-5', 'deepseek-v3'],
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
    price: 24,
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL,
    features: {
      aiWordsPerMonth: 500000,
      maxDocuments: -1,
      models: ['claude-sonnet-4.5', 'gpt-5', 'deepseek-v3'],
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
    price: 49,
    priceId: process.env.STRIPE_PRICE_STUDIO,
    features: {
      aiWordsPerMonth: 2000000,
      maxDocuments: -1,
      models: ['claude-sonnet-4.5', 'gpt-5', 'deepseek-v3'],
      exports: ['pdf', 'docx', 'markdown', 'txt', 'epub', 'fdx', 'fountain'],
      versionHistory: -1,
      collaboration: true,
      teamSeats: 5,
      advancedFeatures: true,
      screenplayTools: true,
      apiAccess: true,
      apiRequestsPerDay: 1000,
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
