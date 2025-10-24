import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { PerformanceTimer } from '@/lib/monitoring/performance'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY_MS = 24 * 60 * 60 * 1000

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export async function GET(request: NextRequest) {
  const timer = new PerformanceTimer('get_analytics_sessions', 'api')

  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      timer.end(false)
      return errorResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    logger.analytics({
      event: 'fetch_analytics',
      userId: user.id,
      projectId: projectId || undefined,
    })

    const sessionsQuery = supabase
      .from('writing_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_start', { ascending: false })
      .limit(500)

    const { data: sessions, error: sessionsError } = projectId
      ? await sessionsQuery.eq('project_id', projectId)
      : await sessionsQuery

    if (sessionsError) {
      logger.error('Error fetching writing sessions', {
        userId: user.id,
        projectId: projectId ?? undefined,
        operation: 'analytics:fetch_sessions',
      }, sessionsError)
      timer.end(false)
      return errorResponses.internalError('Failed to fetch analytics', {
        details: sessionsError,
        userId: user.id,
      })
    }

    const { data: goals, error: goalsError } = await supabase
      .from('writing_goals')
      .select('*')
      .eq('user_id', user.id)

    if (goalsError) {
      logger.error('Error fetching writing goals', {
        userId: user.id,
        operation: 'analytics:fetch_goals',
      }, goalsError)
      timer.end(false)
      return errorResponses.internalError('Failed to fetch goals', {
        details: goalsError,
        userId: user.id,
      })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)

    let totalWords = 0
    let wordsThisWeek = 0
    let sessionDurations = 0

    const dailyMap = new Map<string, number>()

    sessions?.forEach((session) => {
      const words = session.net_words ?? 0
      totalWords += words
      if (session.session_duration_seconds) {
        sessionDurations += session.session_duration_seconds
      }

      const start = session.session_start ? new Date(session.session_start) : null
      if (start && start >= sevenDaysAgo) {
        wordsThisWeek += words
      }

      if (start && start >= thirtyDaysAgo) {
        const dayKey = startOfDay(start).toISOString().split('T')[0]
        dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + words)
      }
    })

    const streak = (() => {
      const streakMap = new Set<string>()
      sessions?.forEach((session) => {
        if (!session.session_start) return
        const day = startOfDay(new Date(session.session_start))
        streakMap.add(day.toISOString().split('T')[0])
      })
      let current = 0
      let cursor = startOfDay(now)
      while (streakMap.has(cursor.toISOString().split('T')[0])) {
        current += 1
        cursor = new Date(cursor.getTime() - DAY_MS)
      }
      return current
    })()

    const heatmap = Array.from({ length: 30 }).map((_, index) => {
      const day = new Date(now.getTime() - (29 - index) * DAY_MS)
      const key = startOfDay(day).toISOString().split('T')[0]
      return {
        date: key,
        words: dailyMap.get(key) ?? 0,
      }
    })

    const averagePerSession = sessions && sessions.length > 0 ? Math.round(totalWords / sessions.length) : 0
    const totalDurationHours = sessionDurations / 3600

    const goalsProgress = goals?.map((goal) => {
      let achieved = 0
      const deadline = goal.deadline ? new Date(goal.deadline) : null
      const rangeStart = (() => {
        switch (goal.goal_type) {
          case 'daily':
            return startOfDay(now)
          case 'weekly':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
          case 'monthly':
            return new Date(now.getFullYear(), now.getMonth(), 1)
          case 'project':
          default:
            return new Date(0)
        }
      })()

      sessions?.forEach((session) => {
        if (!session.session_start) return
        const start = new Date(session.session_start)
        if (start >= rangeStart && (!deadline || start <= deadline)) {
          achieved += session.net_words ?? 0
        }
      })

      const progressPercent = Math.min(100, Math.round((achieved / goal.target_words) * 100))

      return {
        ...goal,
        achieved,
        progressPercent,
      }
    }) ?? []

    timer.end(true, {
      sessionCount: sessions?.length ?? 0,
      totalWords,
    })

    return successResponse({
      summary: {
        totalWords,
        wordsThisWeek,
        averagePerSession,
        totalSessions: sessions?.length ?? 0,
        totalHours: Number(totalDurationHours.toFixed(1)),
        streak,
      },
      heatmap,
      goals: goalsProgress,
      sessions: sessions ?? [],
    })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error fetching analytics summary', {
      operation: 'analytics:get_sessions',
    }, error instanceof Error ? error : undefined)
    timer.end(false)
    return errorResponses.internalError('Failed to fetch analytics', { details: error })
  }
}

export async function POST(request: NextRequest) {
  const timer = new PerformanceTimer('record_writing_session', 'database')

  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      timer.end(false)
      return errorResponses.unauthorized()
    }

    const body = await request.json()
    const {
      document_id,
      project_id,
      words_added = 0,
      words_deleted = 0,
      session_duration_seconds = 0,
      session_start,
      session_end,
    } = body ?? {}

    const net_words = words_added - words_deleted

    const { data, error } = await supabase
      .from('writing_sessions')
      .insert({
        user_id: user.id,
        document_id: document_id ?? null,
        project_id: project_id ?? null,
        words_added,
        words_deleted,
        net_words,
        session_duration_seconds,
        session_start: session_start ?? new Date().toISOString(),
        session_end: session_end ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error('Error recording writing session', {
        userId: user.id,
        projectId: project_id ?? undefined,
        documentId: document_id ?? undefined,
        operation: 'analytics:record_session',
      }, error)
      timer.end(false)
      return errorResponses.internalError('Failed to record session', {
        details: error,
        userId: user.id,
      })
    }

    logger.analytics({
      event: 'session_recorded',
      userId: user.id,
      projectId: project_id || undefined,
      documentId: document_id || undefined,
      value: session_duration_seconds,
      metadata: {
        wordsAdded: words_added,
        wordsDeleted: words_deleted,
        netWords: net_words,
      },
    })

    timer.end(true, {
      wordsAdded: words_added,
      netWords: net_words,
    })

    return successResponse({ session: data })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error recording session', {
      operation: 'analytics:post_sessions',
    }, error instanceof Error ? error : undefined)
    timer.end(false)
    return errorResponses.internalError('Failed to record session', { details: error })
  }
}
