/**
 * IP Protection Timeline API Endpoint
 *
 * Returns access timeline data for visualization:
 * - Daily access counts
 * - Access type breakdown
 * - Top partners by access count
 *
 * Ticket: MS-3.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }
    const days = daysMap[range] || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get user's submissions
    const { data: submissions } = await supabase
      .from('manuscript_submissions')
      .select('id')
      .eq('user_id', user.id)

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ timeline: [], topPartners: [] })
    }

    const submissionIds = submissions.map((s) => s.id)

    // Get access logs within date range
    const { data: accessLogs, error: logsError } = await supabase
      .from('manuscript_access_logs')
      .select('*')
      .in('submission_id', submissionIds)
      .gte('accessed_at', startDate.toISOString())
      .order('accessed_at', { ascending: true })

    if (logsError) {
      return errorResponses.internalError('Failed to fetch access logs', { details: logsError })
    }

    // Group by date
    const timelineMap = new Map<string, {
      totalAccesses: number
      uniquePartners: Set<string>
      queryViews: number
      synopsisViews: number
      sampleViews: number
    }>()

    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      timelineMap.set(dateKey, {
        totalAccesses: 0,
        uniquePartners: new Set(),
        queryViews: 0,
        synopsisViews: 0,
        sampleViews: 0,
      })
    }

    // Aggregate access logs
    accessLogs?.forEach((log) => {
      const dateKey = log.accessed_at.split('T')[0]
      const dayData = timelineMap.get(dateKey)

      if (dayData) {
        dayData.totalAccesses++
        if (log.partner_id) {
          dayData.uniquePartners.add(log.partner_id)
        }

        if (log.action === 'view_query') dayData.queryViews++
        if (log.action === 'view_synopsis') dayData.synopsisViews++
        if (log.action === 'view_samples') dayData.sampleViews++
      }
    })

    // Convert to array format
    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      totalAccesses: data.totalAccesses,
      uniquePartners: data.uniquePartners.size,
      queryViews: data.queryViews,
      synopsisViews: data.synopsisViews,
      sampleViews: data.sampleViews,
    }))

    // Get top partners
    const partnerAccessMap = new Map<string, {
      partnerName: string
      partnerEmail: string
      accessCount: number
      lastAccess: string
    }>()

    accessLogs?.forEach((log) => {
      if (!log.partner_id || !log.partner_name) return

      const existing = partnerAccessMap.get(log.partner_id)
      if (existing) {
        existing.accessCount++
        if (log.accessed_at > existing.lastAccess) {
          existing.lastAccess = log.accessed_at
        }
      } else {
        partnerAccessMap.set(log.partner_id, {
          partnerName: log.partner_name,
          partnerEmail: log.partner_email || '',
          accessCount: 1,
          lastAccess: log.accessed_at,
        })
      }
    })

    const topPartners = Array.from(partnerAccessMap.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5)

    return NextResponse.json({
      timeline,
      topPartners,
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    console.error('Error fetching timeline data:', error)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to fetch timeline data',
      { details: error }
    )
  }
}
