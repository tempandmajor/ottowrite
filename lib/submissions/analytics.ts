/**
 * Analytics Utilities
 *
 * Helper functions for submission analytics calculations and formatting.
 *
 * Ticket: MS-4.3
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Refreshes all analytics materialized views.
 * Should be called periodically (e.g., via cron job) or after significant data changes.
 */
export async function refreshAnalytics(): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('refresh_submission_analytics')

    if (error) {
      console.error('Error refreshing analytics:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error refreshing analytics:', error)
    return false
  }
}

/**
 * Calculates conversion rate between two funnel stages.
 */
export function calculateConversionRate(
  fromCount: number,
  toCount: number
): number {
  if (fromCount === 0) return 0
  return (toCount / fromCount) * 100
}

/**
 * Formats acceptance rate for display.
 */
export function formatAcceptanceRate(rate: number): string {
  if (rate === 0) return '0%'
  if (rate < 1) return '<1%'
  return `${rate.toFixed(1)}%`
}

/**
 * Gets color class based on acceptance rate.
 */
export function getAcceptanceRateColor(rate: number): string {
  if (rate >= 20) return 'text-green-600'
  if (rate >= 10) return 'text-amber-600'
  if (rate >= 5) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Gets color class based on view rate.
 */
export function getViewRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600'
  if (rate >= 60) return 'text-cyan-600'
  if (rate >= 40) return 'text-amber-600'
  return 'text-red-600'
}

/**
 * Gets color class based on request rate (from views).
 */
export function getRequestRateColor(rate: number): string {
  if (rate >= 30) return 'text-green-600'
  if (rate >= 20) return 'text-cyan-600'
  if (rate >= 10) return 'text-amber-600'
  return 'text-red-600'
}

/**
 * Formats average response time in days.
 */
export function formatResponseTime(days: number): string {
  if (days === 0) return 'No data'
  if (days < 1) return '<1 day'
  if (days === 1) return '1 day'
  return `${Math.round(days)} days`
}

/**
 * Calculates performance score (0-100) based on key metrics.
 */
export function calculatePerformanceScore(metrics: {
  viewRate: number
  requestRate: number
  acceptanceRate: number
}): number {
  // Weighted average: view rate (30%), request rate (30%), acceptance rate (40%)
  const score =
    metrics.viewRate * 0.3 +
    metrics.requestRate * 0.3 +
    metrics.acceptanceRate * 0.4

  return Math.round(Math.min(score, 100))
}

/**
 * Gets performance grade (A-F) based on score.
 */
export function getPerformanceGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

/**
 * Generates insights based on analytics data.
 */
export interface AnalyticsInsight {
  type: 'success' | 'warning' | 'info'
  title: string
  message: string
}

export function generateInsights(summary: {
  totalSubmissions: number
  totalPartnersContacted: number
  totalViews: number
  totalRequests: number
  totalAcceptances: number
  viewRate: number
  requestRate: number
  acceptanceRate: number
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = []

  // Check if user has enough data
  if (summary.totalSubmissions === 0) {
    insights.push({
      type: 'info',
      title: 'Get Started',
      message: 'Create your first submission to start tracking analytics.',
    })
    return insights
  }

  // View rate insights
  if (summary.totalPartnersContacted > 0) {
    if (summary.viewRate < 30) {
      insights.push({
        type: 'warning',
        title: 'Low View Rate',
        message: `Only ${summary.viewRate.toFixed(1)}% of partners are viewing your submissions. Consider improving your query letter or targeting more relevant partners.`,
      })
    } else if (summary.viewRate >= 70) {
      insights.push({
        type: 'success',
        title: 'Great View Rate',
        message: `${summary.viewRate.toFixed(1)}% of partners are viewing your submissions! Your targeting is working well.`,
      })
    }
  }

  // Request rate insights
  if (summary.totalViews > 10) {
    if (summary.requestRate < 15) {
      insights.push({
        type: 'warning',
        title: 'Low Request Rate',
        message: `Only ${summary.requestRate.toFixed(1)}% of views result in material requests. Your synopsis or sample pages may need refinement.`,
      })
    } else if (summary.requestRate >= 25) {
      insights.push({
        type: 'success',
        title: 'Strong Request Rate',
        message: `${summary.requestRate.toFixed(1)}% of views result in requests! Your materials are compelling.`,
      })
    }
  }

  // Acceptance rate insights
  if (summary.totalRequests > 5) {
    if (summary.acceptanceRate < 5) {
      insights.push({
        type: 'warning',
        title: 'Low Acceptance Rate',
        message: `Only ${summary.acceptanceRate.toFixed(1)}% acceptance rate. Consider seeking feedback on your full manuscript or adjusting your targeting.`,
      })
    } else if (summary.acceptanceRate >= 15) {
      insights.push({
        type: 'success',
        title: 'Excellent Acceptance Rate',
        message: `${summary.acceptanceRate.toFixed(1)}% acceptance rate! This is well above industry average.`,
      })
    }
  }

  // Activity insights
  if (summary.totalAcceptances > 0) {
    insights.push({
      type: 'success',
      title: 'Congratulations!',
      message: `You have ${summary.totalAcceptances} acceptance${summary.totalAcceptances === 1 ? '' : 's'}! Great work on your submissions.`,
    })
  }

  // Targeting insights
  if (summary.totalPartnersContacted > 50 && summary.viewRate < 40) {
    insights.push({
      type: 'info',
      title: 'Refine Your Targeting',
      message: 'You\'ve contacted many partners but have a low view rate. Try focusing on partners who specialize in your genre.',
    })
  }

  return insights
}

/**
 * Formats a large number for display (e.g., 1,234 -> 1.2K).
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Gets trend indicator based on comparison.
 */
export function getTrendIndicator(current: number, previous: number): {
  direction: 'up' | 'down' | 'neutral'
  percentage: number
} {
  if (previous === 0) {
    return { direction: 'neutral', percentage: 0 }
  }

  const percentage = ((current - previous) / previous) * 100

  if (Math.abs(percentage) < 5) {
    return { direction: 'neutral', percentage: 0 }
  }

  return {
    direction: percentage > 0 ? 'up' : 'down',
    percentage: Math.abs(percentage),
  }
}
