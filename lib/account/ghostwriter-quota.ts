import { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentBillingWindow } from './quota'

/**
 * Ghostwriter quota check result
 */
export type GhostwriterQuotaCheck = {
  allowed: boolean
  tier: string
  used: number
  limit: number | null
  available: number | null
  requested: number
  reason?: 'quota_exceeded' | 'invalid_request'
}

/**
 * Ghostwriter usage statistics for UI display
 */
export type GhostwriterUsageStats = {
  tier: string
  wordsUsed: number
  wordsLimit: number | null
  wordsAvailable: number | null
  percentageUsed: number | null
  isUnlimited: boolean
  currentPeriod: {
    start: string
    end: string
  }
  chunksGenerated: number
  chunksAccepted: number
  averageQualityScore: number | null
}

/**
 * Check if user can generate the requested number of Ghostwriter words
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param requestedWords - Number of words user wants to generate
 * @returns Quota check result indicating if generation is allowed
 *
 * @example
 * ```ts
 * const result = await checkGhostwriterQuota(supabase, userId, 500)
 * if (!result.allowed) {
 *   throw new Error(`Quota exceeded: ${result.used}/${result.limit} words used`)
 * }
 * ```
 */
export async function checkGhostwriterQuota(
  supabase: SupabaseClient,
  userId: string,
  requestedWords: number
): Promise<GhostwriterQuotaCheck> {
  // Validate input
  if (!userId || requestedWords <= 0) {
    return {
      allowed: false,
      tier: 'unknown',
      used: 0,
      limit: null,
      available: null,
      requested: requestedWords,
      reason: 'invalid_request',
    }
  }

  try {
    // Call the database function to check quota
    const { data, error } = await supabase.rpc('check_ghostwriter_word_quota', {
      p_user_id: userId,
      p_words_to_generate: requestedWords,
    })

    if (error) {
      console.error('[checkGhostwriterQuota] Database error:', error)
      throw error
    }

    // The database function returns a JSONB object
    return {
      allowed: data.allowed,
      tier: data.tier,
      used: data.used,
      limit: data.limit,
      available: data.available,
      requested: data.requested,
      reason: data.reason,
    }
  } catch (error) {
    console.error('[checkGhostwriterQuota] Error checking quota:', error)
    throw error
  }
}

/**
 * Increment Ghostwriter word usage for a user (atomic operation)
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param wordsGenerated - Number of words that were generated
 *
 * @example
 * ```ts
 * await incrementGhostwriterUsage(supabase, userId, 350)
 * ```
 */
export async function incrementGhostwriterUsage(
  supabase: SupabaseClient,
  userId: string,
  wordsGenerated: number
): Promise<void> {
  // Validate input
  if (!userId || wordsGenerated <= 0) {
    console.warn('[incrementGhostwriterUsage] Invalid input:', { userId, wordsGenerated })
    return
  }

  try {
    // Call the database function to atomically increment usage
    const { error } = await supabase.rpc('increment_ghostwriter_word_usage', {
      p_user_id: userId,
      p_word_count: wordsGenerated,
    })

    if (error) {
      console.error('[incrementGhostwriterUsage] Database error:', error)
      throw error
    }

    console.log(`[incrementGhostwriterUsage] Incremented ${wordsGenerated} words for user ${userId}`)
  } catch (error) {
    console.error('[incrementGhostwriterUsage] Error incrementing usage:', error)
    throw error
  }
}

/**
 * Get comprehensive Ghostwriter usage statistics for UI display
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Detailed usage statistics including chunks, quality scores, and quota info
 *
 * @example
 * ```ts
 * const stats = await getGhostwriterUsageStats(supabase, userId)
 * console.log(`Used ${stats.wordsUsed} of ${stats.wordsLimit} words`)
 * console.log(`Quality score: ${stats.averageQualityScore}/10`)
 * ```
 */
export async function getGhostwriterUsageStats(
  supabase: SupabaseClient,
  userId: string
): Promise<GhostwriterUsageStats> {
  try {
    const { start, end, startISO, endISO } = getCurrentBillingWindow()

    // Get user's tier
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError

    const tier = profile?.subscription_tier ?? 'free'

    // Get tier limits
    const { data: limits, error: limitsError } = await supabase
      .from('subscription_tier_limits')
      .select('ghostwriter_words_per_month')
      .eq('tier', tier)
      .maybeSingle()

    if (limitsError) throw limitsError

    const wordsLimit = limits?.ghostwriter_words_per_month ?? null
    const isUnlimited = wordsLimit === null

    // Get current month usage
    const { data: usage, error: usageError } = await supabase
      .from('user_plan_usage')
      .select('ghostwriter_words_used_month')
      .eq('user_id', userId)
      .maybeSingle()

    if (usageError) throw usageError

    const wordsUsed = usage?.ghostwriter_words_used_month ?? 0

    // Calculate available words and percentage
    const wordsAvailable = isUnlimited ? null : Math.max(0, (wordsLimit ?? 0) - wordsUsed)
    const percentageUsed = isUnlimited
      ? null
      : wordsLimit && wordsLimit > 0
        ? Math.min(100, (wordsUsed / wordsLimit) * 100)
        : 0

    // Get chunk statistics for the current period
    const { data: chunkStats, error: chunkStatsError } = await supabase
      .from('ghostwriter_chunks')
      .select('id, status, overall_quality_score')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lt('created_at', endISO)

    if (chunkStatsError) throw chunkStatsError

    const chunks = chunkStats ?? []
    const chunksGenerated = chunks.length
    const chunksAccepted = chunks.filter(c => c.status === 'accepted').length

    // Calculate average quality score (only for chunks with scores)
    const chunksWithScores = chunks.filter(c => c.overall_quality_score !== null)
    const averageQualityScore = chunksWithScores.length > 0
      ? chunksWithScores.reduce((sum, c) => sum + (c.overall_quality_score ?? 0), 0) / chunksWithScores.length
      : null

    return {
      tier,
      wordsUsed,
      wordsLimit,
      wordsAvailable,
      percentageUsed,
      isUnlimited,
      currentPeriod: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      chunksGenerated,
      chunksAccepted,
      averageQualityScore,
    }
  } catch (error) {
    console.error('[getGhostwriterUsageStats] Error fetching stats:', error)
    throw error
  }
}

/**
 * Check if user has Ghostwriter access for their tier
 *
 * @param tier - User's subscription tier
 * @returns true if user has Ghostwriter access
 */
export function hasGhostwriterAccess(tier: string): boolean {
  // All tiers have Ghostwriter access (with different limits)
  return ['free', 'hobbyist', 'professional', 'studio'].includes(tier)
}

/**
 * Get formatted quota message for UI display
 *
 * @param stats - Ghostwriter usage stats
 * @returns Formatted message string
 */
export function getQuotaMessage(stats: GhostwriterUsageStats): string {
  if (stats.isUnlimited) {
    return `Unlimited words (${stats.wordsUsed.toLocaleString()} used this month)`
  }

  const limit = stats.wordsLimit ?? 0
  const available = stats.wordsAvailable ?? 0

  if (available === 0) {
    return `Quota exhausted: ${stats.wordsUsed.toLocaleString()}/${limit.toLocaleString()} words used`
  }

  return `${available.toLocaleString()} of ${limit.toLocaleString()} words available`
}

/**
 * Check if user is approaching quota limit (>80% used)
 *
 * @param stats - Ghostwriter usage stats
 * @returns true if user has used >80% of quota
 */
export function isApproachingQuota(stats: GhostwriterUsageStats): boolean {
  if (stats.isUnlimited) return false
  return (stats.percentageUsed ?? 0) >= 80
}

/**
 * Check if user has exceeded quota
 *
 * @param stats - Ghostwriter usage stats
 * @returns true if quota is exhausted
 */
export function hasExceededQuota(stats: GhostwriterUsageStats): boolean {
  if (stats.isUnlimited) return false
  return (stats.wordsAvailable ?? 1) <= 0
}
