import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  checkGhostwriterQuota,
  incrementGhostwriterUsage,
  getGhostwriterUsageStats,
  hasGhostwriterAccess,
  getQuotaMessage,
  isApproachingQuota,
  hasExceededQuota,
  type GhostwriterQuotaCheck,
  type GhostwriterUsageStats,
} from '@/lib/account/ghostwriter-quota'
import { createQueryBuilder } from '@/tests/utils/supabase-mock'

// Mock getCurrentBillingWindow
vi.mock('@/lib/account/quota', () => ({
  getCurrentBillingWindow: vi.fn(() => ({
    start: new Date('2025-01-01T00:00:00.000Z'),
    end: new Date('2025-02-01T00:00:00.000Z'),
    startISO: '2025-01-01T00:00:00.000Z',
    endISO: '2025-02-01T00:00:00.000Z',
  })),
}))

function createSupabaseStubForQuotaCheck(quotaCheckResult: any) {
  return {
    rpc: vi.fn((functionName: string) => {
      if (functionName === 'check_ghostwriter_word_quota') {
        return Promise.resolve({
          data: quotaCheckResult,
          error: null,
        })
      }
      throw new Error(`Unexpected RPC function: ${functionName}`)
    }),
  }
}

function createSupabaseStubForIncrement(error: any = null) {
  return {
    rpc: vi.fn(() => Promise.resolve({ error })),
  }
}

function createSupabaseStubForStats({
  tier = 'professional',
  limit = 1000,
  used = 500,
  chunks = [],
}: {
  tier?: string
  limit?: number | null
  used?: number
  chunks?: Array<{ id: string; status: string; overall_quality_score: number | null }>
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        return createQueryBuilder({
          maybeSingle: {
            data: { subscription_tier: tier },
            error: null,
          },
        })
      }

      if (table === 'subscription_tier_limits') {
        return createQueryBuilder({
          maybeSingle: {
            data: { ghostwriter_words_per_month: limit },
            error: null,
          },
        })
      }

      if (table === 'user_plan_usage') {
        return createQueryBuilder({
          maybeSingle: {
            data: { ghostwriter_words_used_month: used },
            error: null,
          },
        })
      }

      if (table === 'ghostwriter_chunks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn(() =>
                  Promise.resolve({
                    data: chunks,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('checkGhostwriterQuota', () => {
  it('allows request when user is under quota', async () => {
    const supabase = createSupabaseStubForQuotaCheck({
      allowed: true,
      tier: 'professional',
      used: 500,
      limit: 1000,
      available: 500,
      requested: 300,
    })

    const result = await checkGhostwriterQuota(supabase as any, 'user-1', 300)

    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('professional')
    expect(result.used).toBe(500)
    expect(result.limit).toBe(1000)
    expect(result.available).toBe(500)
    expect(result.requested).toBe(300)
    expect(supabase.rpc).toHaveBeenCalledWith('check_ghostwriter_word_quota', {
      p_user_id: 'user-1',
      p_words_to_generate: 300,
    })
  })

  it('blocks request when quota would be exceeded', async () => {
    const supabase = createSupabaseStubForQuotaCheck({
      allowed: false,
      tier: 'hobbyist',
      used: 950,
      limit: 1000,
      available: 50,
      requested: 100,
      reason: 'quota_exceeded',
    })

    const result = await checkGhostwriterQuota(supabase as any, 'user-2', 100)

    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('hobbyist')
    expect(result.used).toBe(950)
    expect(result.limit).toBe(1000)
    expect(result.available).toBe(50)
    expect(result.reason).toBe('quota_exceeded')
  })

  it('allows unlimited words for Studio tier', async () => {
    const supabase = createSupabaseStubForQuotaCheck({
      allowed: true,
      tier: 'studio',
      used: 50000,
      limit: null,
      available: null,
      requested: 5000,
    })

    const result = await checkGhostwriterQuota(supabase as any, 'user-3', 5000)

    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('studio')
    expect(result.limit).toBeNull()
    expect(result.available).toBeNull()
  })

  it('returns invalid_request for zero words', async () => {
    const supabase = createSupabaseStubForQuotaCheck({})

    const result = await checkGhostwriterQuota(supabase as any, 'user-4', 0)

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('invalid_request')
  })

  it('returns invalid_request for negative words', async () => {
    const supabase = createSupabaseStubForQuotaCheck({})

    const result = await checkGhostwriterQuota(supabase as any, 'user-5', -100)

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('invalid_request')
  })

  it('returns invalid_request for empty userId', async () => {
    const supabase = createSupabaseStubForQuotaCheck({})

    const result = await checkGhostwriterQuota(supabase as any, '', 500)

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('invalid_request')
  })

  it('allows request at exact quota boundary', async () => {
    const supabase = createSupabaseStubForQuotaCheck({
      allowed: true,
      tier: 'free',
      used: 0,
      limit: 1000,
      available: 1000,
      requested: 1000,
    })

    const result = await checkGhostwriterQuota(supabase as any, 'user-6', 1000)

    expect(result.allowed).toBe(true)
    expect(result.available).toBe(1000)
  })

  it('throws error when database function fails', async () => {
    const supabase = {
      rpc: vi.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' },
        })
      ),
    }

    await expect(
      checkGhostwriterQuota(supabase as any, 'user-7', 500)
    ).rejects.toThrow()
  })
})

describe('incrementGhostwriterUsage', () => {
  it('increments usage successfully', async () => {
    const supabase = createSupabaseStubForIncrement()

    await incrementGhostwriterUsage(supabase as any, 'user-1', 350)

    expect(supabase.rpc).toHaveBeenCalledWith('increment_ghostwriter_word_usage', {
      p_user_id: 'user-1',
      p_word_count: 350,
    })
  })

  it('does nothing for zero words', async () => {
    const supabase = createSupabaseStubForIncrement()

    await incrementGhostwriterUsage(supabase as any, 'user-2', 0)

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('does nothing for negative words', async () => {
    const supabase = createSupabaseStubForIncrement()

    await incrementGhostwriterUsage(supabase as any, 'user-3', -100)

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('does nothing for empty userId', async () => {
    const supabase = createSupabaseStubForIncrement()

    await incrementGhostwriterUsage(supabase as any, '', 500)

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('throws error when database function fails', async () => {
    const supabase = createSupabaseStubForIncrement({
      message: 'Update failed',
    })

    await expect(
      incrementGhostwriterUsage(supabase as any, 'user-4', 500)
    ).rejects.toThrow()
  })

  it('handles large word counts', async () => {
    const supabase = createSupabaseStubForIncrement()

    await incrementGhostwriterUsage(supabase as any, 'user-5', 10000)

    expect(supabase.rpc).toHaveBeenCalledWith('increment_ghostwriter_word_usage', {
      p_user_id: 'user-5',
      p_word_count: 10000,
    })
  })
})

describe('getGhostwriterUsageStats', () => {
  it('returns complete stats for professional user', async () => {
    const chunks = [
      { id: '1', status: 'accepted', overall_quality_score: 8.5 },
      { id: '2', status: 'accepted', overall_quality_score: 9.0 },
      { id: '3', status: 'draft', overall_quality_score: 7.5 },
    ]

    const supabase = createSupabaseStubForStats({
      tier: 'professional',
      limit: 1000,
      used: 600,
      chunks,
    })

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-1')

    expect(stats.tier).toBe('professional')
    expect(stats.wordsUsed).toBe(600)
    expect(stats.wordsLimit).toBe(1000)
    expect(stats.wordsAvailable).toBe(400)
    expect(stats.percentageUsed).toBe(60)
    expect(stats.isUnlimited).toBe(false)
    expect(stats.chunksGenerated).toBe(3)
    expect(stats.chunksAccepted).toBe(2)
    expect(stats.averageQualityScore).toBeCloseTo(8.33, 1)
  })

  it('returns unlimited stats for Studio user', async () => {
    const supabase = createSupabaseStubForStats({
      tier: 'studio',
      limit: null,
      used: 50000,
      chunks: [],
    })

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-2')

    expect(stats.tier).toBe('studio')
    expect(stats.wordsUsed).toBe(50000)
    expect(stats.wordsLimit).toBeNull()
    expect(stats.wordsAvailable).toBeNull()
    expect(stats.percentageUsed).toBeNull()
    expect(stats.isUnlimited).toBe(true)
  })

  it('handles user with no usage', async () => {
    const supabase = createSupabaseStubForStats({
      tier: 'free',
      limit: 1000,
      used: 0,
      chunks: [],
    })

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-3')

    expect(stats.wordsUsed).toBe(0)
    expect(stats.wordsAvailable).toBe(1000)
    expect(stats.percentageUsed).toBe(0)
    expect(stats.chunksGenerated).toBe(0)
    expect(stats.chunksAccepted).toBe(0)
    expect(stats.averageQualityScore).toBeNull()
  })

  it('handles chunks without quality scores', async () => {
    const chunks = [
      { id: '1', status: 'accepted', overall_quality_score: null },
      { id: '2', status: 'draft', overall_quality_score: null },
    ]

    const supabase = createSupabaseStubForStats({
      tier: 'hobbyist',
      limit: 1000,
      used: 200,
      chunks,
    })

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-4')

    expect(stats.chunksGenerated).toBe(2)
    expect(stats.averageQualityScore).toBeNull()
  })

  it('calculates correct percentage at quota limit', async () => {
    const supabase = createSupabaseStubForStats({
      tier: 'professional',
      limit: 1000,
      used: 1000,
      chunks: [],
    })

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-5')

    expect(stats.wordsAvailable).toBe(0)
    expect(stats.percentageUsed).toBe(100)
  })

  it('handles exceeded quota gracefully', async () => {
    const supabase = createSupabaseStubForStats({
      tier: 'free',
      limit: 1000,
      used: 1050,
      chunks: [],
    })

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-6')

    expect(stats.wordsAvailable).toBe(0) // Should be max(0, limit - used)
    expect(stats.percentageUsed).toBe(100) // Capped at 100
  })

  it('includes current billing period dates', async () => {
    const supabase = createSupabaseStubForStats({})

    const stats = await getGhostwriterUsageStats(supabase as any, 'user-7')

    expect(stats.currentPeriod.start).toBe('2025-01-01T00:00:00.000Z')
    expect(stats.currentPeriod.end).toBe('2025-02-01T00:00:00.000Z')
  })
})

describe('hasGhostwriterAccess', () => {
  it('returns true for all standard tiers', () => {
    expect(hasGhostwriterAccess('free')).toBe(true)
    expect(hasGhostwriterAccess('hobbyist')).toBe(true)
    expect(hasGhostwriterAccess('professional')).toBe(true)
    expect(hasGhostwriterAccess('studio')).toBe(true)
  })

  it('returns false for unknown tiers', () => {
    expect(hasGhostwriterAccess('unknown')).toBe(false)
    expect(hasGhostwriterAccess('enterprise')).toBe(false)
    expect(hasGhostwriterAccess('')).toBe(false)
  })
})

describe('getQuotaMessage', () => {
  it('formats unlimited quota message', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'studio',
      wordsUsed: 5000,
      wordsLimit: null,
      wordsAvailable: null,
      percentageUsed: null,
      isUnlimited: true,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(getQuotaMessage(stats)).toBe('Unlimited words (5,000 used this month)')
  })

  it('formats available quota message', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'professional',
      wordsUsed: 400,
      wordsLimit: 1000,
      wordsAvailable: 600,
      percentageUsed: 40,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(getQuotaMessage(stats)).toBe('600 of 1,000 words available')
  })

  it('formats exhausted quota message', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'free',
      wordsUsed: 1000,
      wordsLimit: 1000,
      wordsAvailable: 0,
      percentageUsed: 100,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(getQuotaMessage(stats)).toBe('Quota exhausted: 1,000/1,000 words used')
  })
})

describe('isApproachingQuota', () => {
  it('returns false for unlimited quota', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'studio',
      wordsUsed: 50000,
      wordsLimit: null,
      wordsAvailable: null,
      percentageUsed: null,
      isUnlimited: true,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(isApproachingQuota(stats)).toBe(false)
  })

  it('returns true when usage is above 80%', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'professional',
      wordsUsed: 850,
      wordsLimit: 1000,
      wordsAvailable: 150,
      percentageUsed: 85,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(isApproachingQuota(stats)).toBe(true)
  })

  it('returns false when usage is below 80%', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'hobbyist',
      wordsUsed: 500,
      wordsLimit: 1000,
      wordsAvailable: 500,
      percentageUsed: 50,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(isApproachingQuota(stats)).toBe(false)
  })

  it('returns true at exactly 80%', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'free',
      wordsUsed: 800,
      wordsLimit: 1000,
      wordsAvailable: 200,
      percentageUsed: 80,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(isApproachingQuota(stats)).toBe(true)
  })
})

describe('hasExceededQuota', () => {
  it('returns false for unlimited quota', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'studio',
      wordsUsed: 100000,
      wordsLimit: null,
      wordsAvailable: null,
      percentageUsed: null,
      isUnlimited: true,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(hasExceededQuota(stats)).toBe(false)
  })

  it('returns true when quota is exhausted', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'free',
      wordsUsed: 1000,
      wordsLimit: 1000,
      wordsAvailable: 0,
      percentageUsed: 100,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(hasExceededQuota(stats)).toBe(true)
  })

  it('returns false when quota is available', () => {
    const stats: GhostwriterUsageStats = {
      tier: 'professional',
      wordsUsed: 999,
      wordsLimit: 1000,
      wordsAvailable: 1,
      percentageUsed: 99.9,
      isUnlimited: false,
      currentPeriod: { start: '', end: '' },
      chunksGenerated: 0,
      chunksAccepted: 0,
      averageQualityScore: null,
    }

    expect(hasExceededQuota(stats)).toBe(false)
  })
})
