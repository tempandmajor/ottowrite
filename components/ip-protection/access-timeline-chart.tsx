/**
 * Access Timeline Chart Component
 *
 * Visualizes manuscript access patterns over time with:
 * - Daily/weekly access trends
 * - Partner access breakdown
 * - Peak access times
 *
 * Ticket: MS-3.4
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Eye } from 'lucide-react'

interface AccessDataPoint {
  date: string
  totalAccesses: number
  uniquePartners: number
  queryViews: number
  synopsisViews: number
  sampleViews: number
}

interface TopPartner {
  partnerName: string
  partnerEmail: string
  accessCount: number
  lastAccess: string
}

export function AccessTimelineChart({ userId }: { userId: string }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [accessData, setAccessData] = useState<AccessDataPoint[]>([])
  const [topPartners, setTopPartners] = useState<TopPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/ip-protection/timeline?range=${timeRange}`)
        if (!response.ok) {
          throw new Error('Failed to fetch timeline data')
        }
        const data = await response.json()
        setAccessData(data.timeline)
        setTopPartners(data.topPartners)
      } catch (err) {
        console.error('Failed to fetch timeline data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId, timeRange])

  const totalAccesses = accessData.reduce((sum, day) => sum + day.totalAccesses, 0)
  const avgDaily = accessData.length > 0 ? totalAccesses / accessData.length : 0
  const peakDay = accessData.reduce(
    (max, day) => (day.totalAccesses > max.totalAccesses ? day : max),
    accessData[0] || { date: '', totalAccesses: 0 }
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Timeline Summary */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Access Timeline</CardTitle>
              <CardDescription>Manuscript access patterns over time</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading timeline...</div>
            </div>
          ) : accessData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No access data for this period</p>
              <p className="text-sm text-muted-foreground mt-2">
                Access logs will appear here when partners view your submissions
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 pb-4 border-b">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Accesses</div>
                  <div className="text-2xl font-bold">{totalAccesses}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Daily Average</div>
                  <div className="text-2xl font-bold">{avgDaily.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Peak Day</div>
                  <div className="text-2xl font-bold">{peakDay.totalAccesses}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(peakDay.date).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Simple Bar Chart */}
              <div className="space-y-2">
                <div className="text-sm font-medium mb-4">Daily Access Pattern</div>
                {accessData.map((day) => {
                  const maxAccess = Math.max(...accessData.map((d) => d.totalAccesses))
                  const barWidth = maxAccess > 0 ? (day.totalAccesses / maxAccess) * 100 : 0

                  return (
                    <div key={day.date} className="flex items-center gap-2">
                      <div className="w-20 text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-xs font-medium">
                            {day.totalAccesses} {day.totalAccesses === 1 ? 'access' : 'accesses'}
                          </span>
                        </div>
                      </div>
                      <div className="w-16 text-xs text-muted-foreground text-right">
                        {day.uniquePartners} partner{day.uniquePartners !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Access Type Breakdown */}
              <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-3">Access Type Breakdown</div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Query Letters</div>
                    <div className="text-lg font-semibold">
                      {accessData.reduce((sum, day) => sum + day.queryViews, 0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Synopses</div>
                    <div className="text-lg font-semibold">
                      {accessData.reduce((sum, day) => sum + day.synopsisViews, 0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Sample Pages</div>
                    <div className="text-lg font-semibold">
                      {accessData.reduce((sum, day) => sum + day.sampleViews, 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Partners */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Most Active Partners</CardTitle>
          <CardDescription>Partners who accessed your submissions most frequently</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : topPartners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No partner access yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topPartners.map((partner, index) => (
                <div
                  key={partner.partnerEmail}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{partner.partnerName}</div>
                      <div className="text-sm text-muted-foreground">{partner.partnerEmail}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{partner.accessCount}</div>
                    <div className="text-xs text-muted-foreground">
                      {partner.accessCount === 1 ? 'access' : 'accesses'}
                    </div>
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
