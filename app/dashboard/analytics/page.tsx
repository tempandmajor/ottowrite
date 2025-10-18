'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionStats } from '@/components/analytics/session-stats'
import { WritingHeatmap, type HeatmapDay } from '@/components/analytics/writing-heatmap'
import { GoalTracker, type Goal } from '@/components/analytics/goal-tracker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'

interface AnalyticsResponse {
  summary: {
    totalWords: number
    wordsThisWeek: number
    averagePerSession: number
    totalSessions: number
    totalHours: number
    streak: number
  }
  heatmap: HeatmapDay[]
  goals: Goal[]
  sessions: Array<{
    id: string
    session_start: string | null
    net_words: number
    session_duration_seconds: number | null
  }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/analytics/sessions')
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const payload = (await response.json()) as AnalyticsResponse
      setData(payload)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  if (loading && !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading analytics...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Unable to load analytics right now.</p>
        <Button variant="outline" onClick={fetchAnalytics}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Writing analytics</h1>
          <p className="text-sm text-muted-foreground">
            Track productivity, streaks, and goal progress across your projects.
          </p>
        </div>
      </div>

      <SessionStats summary={data.summary} />
      <WritingHeatmap data={data.heatmap} />
      <GoalTracker goals={data.goals} />

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
          <CardDescription>Last 10 sessions logged to this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {data.sessions.slice(0, 10).map((session) => (
            <div
              key={session.id}
              className="flex justify-between border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
            >
              <span>{session.session_start ? new Date(session.session_start).toLocaleString() : 'Unknown'}</span>
              <span className="font-medium text-foreground">{session.net_words.toLocaleString()} words</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
