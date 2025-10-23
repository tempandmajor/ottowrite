'use client'

/**
 * Analytics Dashboard Component
 *
 * Main analytics dashboard showing submission performance insights.
 *
 * Ticket: MS-4.3
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, TrendingUp, Users, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { AnalyticsTimelineChart } from './analytics-timeline-chart'
import { AnalyticsFunnelChart } from './analytics-funnel-chart'
import { TopPartnersList } from './top-partners-list'
import { GenrePerformanceChart } from './genre-performance-chart'

interface AnalyticsSummary {
  totalSubmissions: number
  activeSubmissions: number
  draftSubmissions: number
  pausedSubmissions: number
  closedSubmissions: number
  totalPartnersContacted: number
  totalViews: number
  totalRequests: number
  totalAcceptances: number
  totalRejections: number
  acceptanceRate: number
  viewRate: number
  requestRate: number
  firstSubmissionDate: string | null
  latestSubmissionDate: string | null
}

interface AnalyticsDashboardProps {
  userId: string
}

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    if (!userId) {
      setSummary(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/submissions/analytics/summary')

      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching analytics summary:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activeSubmissions} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partners Contacted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPartnersContacted}</div>
            <p className="text-xs text-muted-foreground">
              {summary.viewRate.toFixed(1)}% view rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views Received</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              {summary.requestRate.toFixed(1)}% request rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptances</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.totalAcceptances}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.acceptanceRate.toFixed(1)}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejections</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.totalRejections}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRequests} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="partners">Top Partners</TabsTrigger>
          <TabsTrigger value="genres">By Genre</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AnalyticsTimelineChart userId={userId} />

          {summary.totalSubmissions === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Start creating submissions and contacting partners to see your analytics here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <AnalyticsFunnelChart userId={userId} />
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <TopPartnersList userId={userId} />
        </TabsContent>

        <TabsContent value="genres" className="space-y-4">
          <GenrePerformanceChart userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
