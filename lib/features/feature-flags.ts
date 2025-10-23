/**
 * Feature Flag System
 *
 * Centralized feature flag management for gating incomplete features.
 * Supports database-driven flags and environment overrides.
 *
 * Usage:
 * ```ts
 * const canAccess = await checkFeatureAccess('ghostwriter', userId)
 * const status = getFeatureStatus('manuscript_submission')
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Feature status values
 */
export type FeatureStatus =
  | 'disabled'        // Feature hidden from users
  | 'coming_soon'     // Feature visible but not accessible (shows coming soon page)
  | 'beta'            // Feature accessible to beta users only
  | 'limited'         // Feature accessible to specific tiers (Professional+)
  | 'enabled'         // Feature fully available to all

/**
 * Feature configuration
 */
export interface FeatureConfig {
  id: string
  name: string
  description: string
  status: FeatureStatus
  minTier?: 'free' | 'hobbyist' | 'professional' | 'studio' // Minimum tier required
  betaUsers?: string[]  // User IDs with beta access
  launchDate?: string   // Expected launch date (ISO string)
}

/**
 * Core features in the application
 */
export const FEATURES = {
  // Studio Features
  COLLABORATION: 'collaboration',
  VERSION_CONTROL: 'version_control',
  ADVANCED_ANALYTICS: 'advanced_analytics',

  // New Features (In Development)
  GHOSTWRITER: 'ghostwriter',
  MANUSCRIPT_SUBMISSION: 'manuscript_submission',

  // Future Features
  AI_STORY_PLANNER: 'ai_story_planner',
  CHARACTER_GENERATOR: 'character_generator',
} as const

/**
 * Default feature configurations
 * These can be overridden by database values
 */
const DEFAULT_FEATURE_CONFIG: Record<string, FeatureConfig> = {
  [FEATURES.GHOSTWRITER]: {
    id: FEATURES.GHOSTWRITER,
    name: 'Ghostwriter',
    description: 'AI-powered writing assistant that generates story chunks with context awareness',
    status: 'coming_soon',
    minTier: 'free',
    launchDate: '2025-02-15T00:00:00Z',
  },
  [FEATURES.MANUSCRIPT_SUBMISSION]: {
    id: FEATURES.MANUSCRIPT_SUBMISSION,
    name: 'Manuscript Submission',
    description: 'Submit your manuscripts to agents and publishers with tracking and analytics',
    status: 'coming_soon',
    minTier: 'professional',
    launchDate: '2025-03-01T00:00:00Z',
  },
  [FEATURES.COLLABORATION]: {
    id: FEATURES.COLLABORATION,
    name: 'Collaboration',
    description: 'Real-time collaboration with other writers',
    status: 'enabled',
    minTier: 'professional',
  },
  [FEATURES.VERSION_CONTROL]: {
    id: FEATURES.VERSION_CONTROL,
    name: 'Version Control',
    description: 'Track changes and manage document versions',
    status: 'enabled',
    minTier: 'free',
  },
  [FEATURES.ADVANCED_ANALYTICS]: {
    id: FEATURES.ADVANCED_ANALYTICS,
    name: 'Advanced Analytics',
    description: 'Detailed insights into your writing patterns and progress',
    status: 'enabled',
    minTier: 'professional',
  },
  [FEATURES.AI_STORY_PLANNER]: {
    id: FEATURES.AI_STORY_PLANNER,
    name: 'AI Story Planner',
    description: 'AI-powered story structure and plot planning tools',
    status: 'disabled',
    minTier: 'hobbyist',
    launchDate: '2025-04-01T00:00:00Z',
  },
  [FEATURES.CHARACTER_GENERATOR]: {
    id: FEATURES.CHARACTER_GENERATOR,
    name: 'Character Generator',
    description: 'Generate detailed character profiles with AI',
    status: 'disabled',
    minTier: 'free',
    launchDate: '2025-04-15T00:00:00Z',
  },
}

/**
 * Get feature configuration from defaults or database
 */
export function getFeatureConfig(featureId: string): FeatureConfig | null {
  return DEFAULT_FEATURE_CONFIG[featureId] || null
}

/**
 * Get all features with their configurations
 */
export function getAllFeatures(): FeatureConfig[] {
  return Object.values(DEFAULT_FEATURE_CONFIG)
}

/**
 * Get feature status
 */
export function getFeatureStatus(featureId: string): FeatureStatus {
  const config = getFeatureConfig(featureId)
  return config?.status || 'disabled'
}

/**
 * Check if a feature is enabled for all users
 */
export function isFeatureEnabled(featureId: string): boolean {
  return getFeatureStatus(featureId) === 'enabled'
}

/**
 * Check if a feature is in coming soon state
 */
export function isFeatureComingSoon(featureId: string): boolean {
  return getFeatureStatus(featureId) === 'coming_soon'
}

/**
 * Check if a feature is in beta
 */
export function isFeatureBeta(featureId: string): boolean {
  return getFeatureStatus(featureId) === 'beta'
}

/**
 * Check if user has access to a feature based on:
 * - Feature status (disabled, coming_soon, beta, limited, enabled)
 * - User subscription tier
 * - Beta access list
 *
 * @param supabase - Supabase client
 * @param featureId - Feature identifier
 * @param userId - User ID to check access for
 * @returns Object with access info
 */
export async function checkFeatureAccess(
  supabase: SupabaseClient,
  featureId: string,
  userId: string
): Promise<{
  hasAccess: boolean
  reason?: 'disabled' | 'coming_soon' | 'insufficient_tier' | 'not_beta_user'
  config: FeatureConfig | null
  userTier?: string
}> {
  const config = getFeatureConfig(featureId)

  if (!config) {
    return {
      hasAccess: false,
      reason: 'disabled',
      config: null,
    }
  }

  // Feature is disabled - no one has access
  if (config.status === 'disabled') {
    return {
      hasAccess: false,
      reason: 'disabled',
      config,
    }
  }

  // Feature is coming soon - no one has access yet
  if (config.status === 'coming_soon') {
    return {
      hasAccess: false,
      reason: 'coming_soon',
      config,
    }
  }

  // Get user's subscription tier
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching user profile:', error)
    return {
      hasAccess: false,
      reason: 'disabled',
      config,
    }
  }

  const userTier = profile?.subscription_tier || 'free'

  // Feature is in beta - check beta access list
  if (config.status === 'beta') {
    const hasBetaAccess = config.betaUsers?.includes(userId) || false
    return {
      hasAccess: hasBetaAccess,
      reason: hasBetaAccess ? undefined : 'not_beta_user',
      config,
      userTier,
    }
  }

  // Feature is limited or enabled - check tier requirement
  if (config.minTier) {
    const tierOrder = ['free', 'hobbyist', 'professional', 'studio']
    const userTierIndex = tierOrder.indexOf(userTier)
    const minTierIndex = tierOrder.indexOf(config.minTier)

    if (userTierIndex < minTierIndex) {
      return {
        hasAccess: false,
        reason: 'insufficient_tier',
        config,
        userTier,
      }
    }
  }

  // User has access
  return {
    hasAccess: true,
    config,
    userTier,
  }
}

/**
 * Get user's accessible features
 */
export async function getUserFeatures(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  accessible: FeatureConfig[]
  comingSoon: FeatureConfig[]
  locked: FeatureConfig[]
}> {
  const allFeatures = getAllFeatures()
  const results = await Promise.all(
    allFeatures.map(f => checkFeatureAccess(supabase, f.id, userId))
  )

  const accessible: FeatureConfig[] = []
  const comingSoon: FeatureConfig[] = []
  const locked: FeatureConfig[] = []

  results.forEach((result, index) => {
    const feature = allFeatures[index]
    if (result.hasAccess) {
      accessible.push(feature)
    } else if (result.reason === 'coming_soon') {
      comingSoon.push(feature)
    } else if (result.reason !== 'disabled') {
      locked.push(feature)
    }
  })

  return { accessible, comingSoon, locked }
}

/**
 * Get human-readable reason for blocked access
 */
export function getAccessDeniedMessage(
  reason: 'disabled' | 'coming_soon' | 'insufficient_tier' | 'not_beta_user',
  config: FeatureConfig | null,
  userTier?: string
): string {
  switch (reason) {
    case 'disabled':
      return 'This feature is currently unavailable.'

    case 'coming_soon':
      if (config?.launchDate) {
        const date = new Date(config.launchDate)
        return `This feature is coming soon! Expected launch: ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      }
      return 'This feature is coming soon! We\'re working hard to bring it to you.'

    case 'insufficient_tier':
      if (config?.minTier) {
        const tierNames: Record<string, string> = {
          free: 'Free',
          hobbyist: 'Hobbyist',
          professional: 'Professional',
          studio: 'Studio',
        }
        return `This feature requires ${tierNames[config.minTier]} plan or higher. You're currently on the ${tierNames[userTier || 'free']} plan.`
      }
      return 'This feature requires a higher subscription tier.'

    case 'not_beta_user':
      return 'This feature is currently in beta and only available to selected users.'

    default:
      return 'You don\'t have access to this feature.'
  }
}

/**
 * Environment variable override for development
 * Set ENABLE_ALL_FEATURES=true to bypass feature flags
 */
export function shouldBypassFeatureFlags(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ALL_FEATURES === 'true'
}
