'use client'

/**
 * Analytics Funnel Chart Component
 *
 * Displays conversion funnel from submission to acceptance.
 *
 * Ticket: MS-4.3
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface FunnelStage {
  stage: string
  count: number
  percentage: number
}

interface AnalyticsFunnelChartProps {
  userId: string
}

export function AnalyticsFunnelChart({ userId }: AnalyticsFunnelChartProps) {
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFunnel = useCallback(async () => {
    if (!userId) {
      setFunnel([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/submissions/analytics/funnel')

      if (!response.ok) {
        throw new Error('Failed to fetch funnel')
      }

      const data = await response.json()
      setFunnel(data.funnel)
    } catch (error) {
      console.error('Error fetching funnel:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchFunnel()
  }, [fetchFunnel])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Track your submission journey from contact to acceptance</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const hasData = funnel.length > 0 && funnel[0].count > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Track your submission journey from contact to acceptance</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No funnel data yet. Start contacting partners to see your conversion rates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {funnel.map((stage, index) => {
              const maxCount = funnel[0]?.count || 1
              const widthPercentage = (stage.count / maxCount) * 100

              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="text-muted-foreground">
                      {stage.count} ({stage.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 flex items-center justify-center text-sm font-medium text-white transition-all ${
                        index === 0
                          ? 'bg-blue-500'
                          : index === 1
                          ? 'bg-purple-500'
                          : index === 2
                          ? 'bg-cyan-500'
                          : index === 3
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${widthPercentage}%` }}
                    >
                      {stage.count}
                    </div>
                  </div>
                  {index < funnel.length - 1 && (
                    <div className="flex justify-center">
                      <div className="text-xs text-muted-foreground">↓</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
