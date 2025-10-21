'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  Target,
  Flame,
  Calendar,
  BarChart3,
  Clock,
  FileText,
  Award,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AnalyticsData = {
  summary: {
    totalWords: number
    wordsThisWeek: number
    averagePerSession: number
    totalSessions: number
    totalHours: number
    streak: number
  }
  heatmap: Array<{ date: string; words: number }>
  goals: Array<{
    id: string
    title: string
    target_words: number
    goal_type: 'daily' | 'weekly' | 'monthly' | 'project'
    achieved: number
    progressPercent: number
    deadline?: string
  }>
  sessions: Array<{
    id: string
    session_start: string | null
    net_words: number
    session_duration_seconds: number | null
    project_id?: string | null
  }>
  projectProgress?: Array<{
    projectId: string
    projectName: string
    totalWords: number
    sessions: number
    lastActive: string
  }>
}

export default function WritingAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analytics/sessions')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const payload = await response.json()
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading && !data) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error || 'Failed to load analytics'}</p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate productivity insights
  const avgWordsPerDay = data.heatmap.reduce((sum, day) => sum + day.words, 0) / data.heatmap.length
  const mostProductiveDay = data.heatmap.reduce(
    (max, day) => (day.words > max.words ? day : max),
    data.heatmap[0]
  )
  const activeDays = data.heatmap.filter((day) => day.words > 0).length

  const streakStatus = (() => {
    if (data.summary.streak >= 7) return { label: 'On Fire!', color: 'text-orange-500', icon: '🔥' }
    if (data.summary.streak >= 3) return { label: 'Great Streak!', color: 'text-green-500', icon: '⚡' }
    if (data.summary.streak >= 1) return { label: 'Keep Going!', color: 'text-blue-500', icon: '👍' }
    return { label: 'Start Writing!', color: 'text-muted-foreground', icon: '✍️' }
  })()

  const wordsPerHour = data.summary.totalHours > 0 ? Math.round(data.summary.totalWords / data.summary.totalHours) : 0

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Writing Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your writing progress, streaks, and productivity insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Writing Streak */}
        <Card className={cn(data.summary.streak >= 7 && 'border-orange-500')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Writing Streak</CardTitle>
            <Flame className={cn('h-4 w-4', streakStatus.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-baseline gap-2">
              {data.summary.streak}
              <span className="text-lg font-normal text-muted-foreground">
                day{data.summary.streak !== 1 ? 's' : ''}
              </span>
            </div>
            <p className={cn('text-xs mt-1', streakStatus.color)}>
              {streakStatus.icon} {streakStatus.label}
            </p>
          </CardContent>
        </Card>

        {/* Total Words */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Words</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalWords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{data.summary.wordsThisWeek.toLocaleString()} this week
            </p>
          </CardContent>
        </Card>

        {/* Total Hours */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Writing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              {wordsPerHour.toLocaleString()} words/hour avg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Writing Goals */}
      {data.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Writing Goals
            </CardTitle>
            <CardDescription>Track progress towards your writing targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{goal.title}</span>
                    <Badge variant="outline" className="capitalize">
                      {goal.goal_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {goal.achieved.toLocaleString()} / {goal.target_words.toLocaleString()} words
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={goal.progressPercent} className="flex-1" />
                  <span className="text-sm font-medium tabular-nums w-12 text-right">
                    {goal.progressPercent}%
                  </span>
                </div>
                {goal.progressPercent >= 100 && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Goal achieved!
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 30-Day Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            30-Day Writing Activity
          </CardTitle>
          <CardDescription>Words written per day over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-15 gap-1">
            {data.heatmap.map((day) => {
              const intensity = day.words === 0 ? 0 : Math.min(4, Math.ceil((day.words / 1000) * 4))
              const colors = [
                'bg-muted',
                'bg-green-200 dark:bg-green-900',
                'bg-green-300 dark:bg-green-700',
                'bg-green-400 dark:bg-green-600',
                'bg-green-500 dark:bg-green-500',
              ]
              return (
                <div
                  key={day.date}
                  className={cn('h-8 rounded-sm', colors[intensity])}
                  title={`${day.date}: ${day.words} words`}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 bg-muted rounded-sm" />
              <div className="h-3 w-3 bg-green-200 dark:bg-green-900 rounded-sm" />
              <div className="h-3 w-3 bg-green-300 dark:bg-green-700 rounded-sm" />
              <div className="h-3 w-3 bg-green-400 dark:bg-green-600 rounded-sm" />
              <div className="h-3 w-3 bg-green-500 dark:bg-green-500 rounded-sm" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Productivity Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Productivity Insights
          </CardTitle>
          <CardDescription>Your writing patterns and achievements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Average Daily Output</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(avgWordsPerDay).toLocaleString()} words per day over 30 days
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Award className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Most Productive Day</p>
                <p className="text-sm text-muted-foreground">
                  {mostProductiveDay.words.toLocaleString()} words on{' '}
                  {new Date(mostProductiveDay.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Active Days</p>
                <p className="text-sm text-muted-foreground">
                  {activeDays} out of 30 days ({Math.round((activeDays / 30) * 100)}% consistency)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Average Per Session</p>
                <p className="text-sm text-muted-foreground">
                  {data.summary.averagePerSession.toLocaleString()} words across{' '}
                  {data.summary.totalSessions} sessions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Writing Sessions</CardTitle>
          <CardDescription>Your last 10 writing sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {data.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No writing sessions recorded yet. Start writing to see your progress here!
            </p>
          ) : (
            <div className="space-y-2">
              {data.sessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {session.session_start
                          ? new Date(session.session_start).toLocaleString()
                          : 'Unknown time'}
                      </p>
                      {session.session_duration_seconds && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(session.session_duration_seconds / 60)} minutes
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{session.net_words.toLocaleString()} words</p>
                    {session.session_duration_seconds && session.session_duration_seconds > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round((session.net_words / (session.session_duration_seconds / 3600))).toLocaleString()}{' '}
                        words/hr
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
