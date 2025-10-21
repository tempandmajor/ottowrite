/**
 * Model Comparison Analytics
 * Aggregates and analyzes AI model performance data
 */

import { createClient } from '@/lib/supabase/server'

export type ModelStats = {
  model: string
  totalGenerations: number
  totalCost: number
  avgLatency: number
  avgQualityScore: number
  totalTokens: number
  avgPromptTokens: number
  avgCompletionTokens: number
  successRate: number
  userPreferences: number // How many times users selected this model
  costPerGeneration: number
  tokensPerGeneration: number
}

export type ModelPerformanceMetrics = {
  model: string
  date: string
  generations: number
  cost: number
  avgQuality: number
  avgLatency: number
}

export type UserPreference = {
  model: string
  selectionCount: number
  percentage: number
}

/**
 * Get aggregate statistics for all models
 */
export async function getModelStatistics(
  userId?: string,
  dateRange?: { start: Date; end: Date }
): Promise<ModelStats[]> {
  const supabase = await createClient()

  // Build query for ai_usage table
  let query = supabase
    .from('ai_usage')
    .select('model, total_cost, prompt_tokens, completion_tokens, created_at')

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
  }

  const { data: usageData, error } = await query

  if (error || !usageData) {
    console.error('Error fetching model usage data:', error)
    return []
  }

  // Get ensemble feedback for user preferences
  let feedbackQuery = supabase
    .from('ensemble_feedback')
    .select('selected_model')

  if (userId) {
    feedbackQuery = feedbackQuery.eq('user_id', userId)
  }

  if (dateRange) {
    feedbackQuery = feedbackQuery
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
  }

  const { data: feedbackData } = await feedbackQuery

  // Aggregate by model
  const modelMap = new Map<string, {
    generations: number
    totalCost: number
    totalPromptTokens: number
    totalCompletionTokens: number
    preferences: number
  }>()

  usageData.forEach((record) => {
    const model = record.model || 'unknown'
    const existing = modelMap.get(model) || {
      generations: 0,
      totalCost: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      preferences: 0,
    }

    modelMap.set(model, {
      generations: existing.generations + 1,
      totalCost: existing.totalCost + (record.total_cost || 0),
      totalPromptTokens: existing.totalPromptTokens + (record.prompt_tokens || 0),
      totalCompletionTokens: existing.totalCompletionTokens + (record.completion_tokens || 0),
      preferences: existing.preferences,
    })
  })

  // Count user preferences
  feedbackData?.forEach((record) => {
    const model = record.selected_model
    if (modelMap.has(model)) {
      const existing = modelMap.get(model)!
      modelMap.set(model, {
        ...existing,
        preferences: existing.preferences + 1,
      })
    }
  })

  // Convert to ModelStats array
  const stats: ModelStats[] = []

  modelMap.forEach((data, model) => {
    const totalTokens = data.totalPromptTokens + data.totalCompletionTokens

    stats.push({
      model,
      totalGenerations: data.generations,
      totalCost: data.totalCost,
      avgLatency: 0, // Would need separate latency tracking
      avgQualityScore: 0, // Would need to join with quality scores
      totalTokens,
      avgPromptTokens: data.totalPromptTokens / data.generations,
      avgCompletionTokens: data.totalCompletionTokens / data.generations,
      successRate: 100, // Would need error tracking
      userPreferences: data.preferences,
      costPerGeneration: data.totalCost / data.generations,
      tokensPerGeneration: totalTokens / data.generations,
    })
  })

  return stats.sort((a, b) => b.totalGenerations - a.totalGenerations)
}

/**
 * Get model performance over time
 */
export async function getModelPerformanceOverTime(
  userId?: string,
  days: number = 30
): Promise<ModelPerformanceMetrics[]> {
  const supabase = await createClient()
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let query = supabase
    .from('ai_usage')
    .select('model, total_cost, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching performance data:', error)
    return []
  }

  // Group by model and date
  const metricsMap = new Map<string, {
    generations: number
    cost: number
  }>()

  data.forEach((record) => {
    const model = record.model || 'unknown'
    const date = new Date(record.created_at).toISOString().split('T')[0]
    const key = `${model}:${date}`

    const existing = metricsMap.get(key) || {
      generations: 0,
      cost: 0,
    }

    metricsMap.set(key, {
      generations: existing.generations + 1,
      cost: existing.cost + (record.total_cost || 0),
    })
  })

  const metrics: ModelPerformanceMetrics[] = []

  metricsMap.forEach((data, key) => {
    const [model, date] = key.split(':')
    metrics.push({
      model,
      date,
      generations: data.generations,
      cost: data.cost,
      avgQuality: 0, // Placeholder
      avgLatency: 0, // Placeholder
    })
  })

  return metrics.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get user preference distribution
 */
export async function getUserPreferences(
  userId?: string,
  dateRange?: { start: Date; end: Date }
): Promise<UserPreference[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ensemble_feedback')
    .select('selected_model')

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching user preferences:', error)
    return []
  }

  // Count preferences
  const preferenceMap = new Map<string, number>()

  data.forEach((record) => {
    const model = record.selected_model
    preferenceMap.set(model, (preferenceMap.get(model) || 0) + 1)
  })

  const total = data.length

  const preferences: UserPreference[] = []

  preferenceMap.forEach((count, model) => {
    preferences.push({
      model,
      selectionCount: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    })
  })

  return preferences.sort((a, b) => b.selectionCount - a.selectionCount)
}

/**
 * Get cost breakdown by model
 */
export async function getCostBreakdown(
  userId?: string,
  dateRange?: { start: Date; end: Date }
): Promise<Array<{ model: string; cost: number; percentage: number }>> {
  const stats = await getModelStatistics(userId, dateRange)

  const totalCost = stats.reduce((sum, s) => sum + s.totalCost, 0)

  return stats.map((s) => ({
    model: s.model,
    cost: s.totalCost,
    percentage: totalCost > 0 ? (s.totalCost / totalCost) * 100 : 0,
  }))
}

/**
 * Get model comparison summary
 */
export async function getModelComparison(userId?: string) {
  const stats = await getModelStatistics(userId)
  const preferences = await getUserPreferences(userId)
  const costBreakdown = await getCostBreakdown(userId)

  return {
    stats,
    preferences,
    costBreakdown,
    totalModels: stats.length,
    totalGenerations: stats.reduce((sum, s) => sum + s.totalGenerations, 0),
    totalCost: stats.reduce((sum, s) => sum + s.totalCost, 0),
  }
}
