'use client'

/**
 * Analytics Timeline Chart Component
 *
 * Displays submission activity over time with multiple metrics.
 *
 * Ticket: MS-4.3
 */

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface TimelineData {
  date: string
  submissionsCreated: number
  partnersContacted: number
  viewsReceived: number
  requestsReceived: number
  responsesReceived: number
}

interface AnalyticsTimelineChartProps {
  userId: string
}

export function AnalyticsTimelineChart({ userId }: AnalyticsTimelineChartProps) {
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [loading, setLoading] = useState(true)
  const [daysBack, setDaysBack] = useState('30')

  const fetchTimeline = useCallback(async () => {
    if (!userId) {
      setTimeline([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/submissions/analytics/timeline?daysBack=${daysBack}`)

      if (!response.ok) {
        throw new Error('Failed to fetch timeline')
      }

      const data = await response.json()
      setTimeline(data.timeline)
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
    }
  }, [daysBack, userId])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...timeline.map((d) =>
      Math.max(
        d.submissionsCreated,
        d.partnersContacted,
        d.viewsReceived,
        d.requestsReceived,
        d.responsesReceived
      )
    ),
    1
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Track your submission activity over time</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const hasData = timeline.some((d) => d.partnersContacted > 0 || d.submissionsCreated > 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Track your submission activity over time</CardDescription>
          </div>
          <Select value={daysBack} onValueChange={setDaysBack}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No activity data yet. Start submitting to see your timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Submissions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">Partners Contacted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-muted-foreground">Views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Requests</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Responses</span>
              </div>
            </div>

            {/* Chart */}
            <div className="space-y-2">
              {timeline.map((day) => {
                const hasActivity =
                  day.submissionsCreated > 0 ||
                  day.partnersContacted > 0 ||
                  day.viewsReceived > 0 ||
                  day.requestsReceived > 0 ||
                  day.responsesReceived > 0

                if (!hasActivity && parseInt(daysBack) > 30) {
                  // Skip empty days for longer time ranges
                  return null
                }

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground w-24 flex-shrink-0">
                        {format(new Date(day.date), 'MMM d')}
                      </div>
                      <div className="flex-1 flex gap-0.5 h-6">
                        {/* Submissions Created */}
                        {day.submissionsCreated > 0 && (
                          <div
                            className="bg-blue-500 rounded-sm flex items-center justify-center text-xs text-white font-medium"
                            style={{
                              width: `${(day.submissionsCreated / maxValue) * 100}%`,
                              minWidth: '24px',
                            }}
                            title={`${day.submissionsCreated} submission(s) created`}
                          >
                            {day.submissionsCreated}
                          </div>
                        )}
                        {/* Partners Contacted */}
                        {day.partnersContacted > 0 && (
                          <div
                            className="bg-purple-500 rounded-sm flex items-center justify-center text-xs text-white font-medium ml-0.5"
                            style={{
                              width: `${(day.partnersContacted / maxValue) * 100}%`,
                              minWidth: '24px',
                            }}
                            title={`${day.partnersContacted} partner(s) contacted`}
                          >
                            {day.partnersContacted}
                          </div>
                        )}
                        {/* Views Received */}
                        {day.viewsReceived > 0 && (
                          <div
                            className="bg-cyan-500 rounded-sm flex items-center justify-center text-xs text-white font-medium ml-0.5"
                            style={{
                              width: `${(day.viewsReceived / maxValue) * 100}%`,
                              minWidth: '24px',
                            }}
                            title={`${day.viewsReceived} view(s) received`}
                          >
                            {day.viewsReceived}
                          </div>
                        )}
                        {/* Requests Received */}
                        {day.requestsReceived > 0 && (
                          <div
                            className="bg-amber-500 rounded-sm flex items-center justify-center text-xs text-white font-medium ml-0.5"
                            style={{
                              width: `${(day.requestsReceived / maxValue) * 100}%`,
                              minWidth: '24px',
                            }}
                            title={`${day.requestsReceived} request(s) received`}
                          >
                            {day.requestsReceived}
                          </div>
                        )}
                        {/* Responses Received */}
                        {day.responsesReceived > 0 && (
                          <div
                            className="bg-green-500 rounded-sm flex items-center justify-center text-xs text-white font-medium ml-0.5"
                            style={{
                              width: `${(day.responsesReceived / maxValue) * 100}%`,
                              minWidth: '24px',
                            }}
                            title={`${day.responsesReceived} response(s) received`}
                          >
                            {day.responsesReceived}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
