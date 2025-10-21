'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  Star,
  Clock,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ModelStats = {
  model: string
  totalGenerations: number
  totalCost: number
  avgLatency: number
  avgQualityScore: number
  totalTokens: number
  avgPromptTokens: number
  avgCompletionTokens: number
  successRate: number
  userPreferences: number
  costPerGeneration: number
  tokensPerGeneration: number
}

type ModelComparison = {
  stats: ModelStats[]
  preferences: Array<{ model: string; selectionCount: number; percentage: number }>
  costBreakdown: Array<{ model: string; cost: number; percentage: number }>
  totalModels: number
  totalGenerations: number
  totalCost: number
}

function getModelDisplayName(model: string): string {
  const names: Record<string, string> = {
    'claude-sonnet-4.5': 'Claude Sonnet 4.5',
    'claude-sonnet-4.5-20250929': 'Claude Sonnet 4.5',
    'gpt-5': 'GPT-5',
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek-v3': 'DeepSeek V3',
    'blend': 'Blended',
  }
  return names[model] || model
}

function getModelColor(model: string): string {
  const colors: Record<string, string> = {
    'claude-sonnet-4.5': 'bg-purple-500',
    'claude-sonnet-4.5-20250929': 'bg-purple-500',
    'gpt-5': 'bg-green-500',
    'deepseek-chat': 'bg-blue-500',
    'deepseek-v3': 'bg-blue-500',
    'blend': 'bg-orange-500',
  }
  return colors[model] || 'bg-gray-500'
}

export default function ModelAnalyticsPage() {
  const [data, setData] = useState<ModelComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/analytics/models')
        if (!response.ok) throw new Error('Failed to load analytics')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
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
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Analytics</CardTitle>
            <CardDescription>{error || 'No data available'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const topModel = data.stats[0]
  const mostPreferred = data.preferences[0]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          AI Model Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Compare performance, cost, and quality across AI models
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalGenerations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {data.totalModels} models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(data.totalCost / data.totalGenerations).toFixed(4)} per generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Most Preferred</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostPreferred ? getModelDisplayName(mostPreferred.model) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mostPreferred ? `${mostPreferred.percentage.toFixed(1)}% user preference` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Model Performance Comparison
          </CardTitle>
          <CardDescription>
            Side-by-side comparison of cost, usage, and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-left p-3 font-medium">Model</th>
                  <th className="text-right p-3 font-medium">Generations</th>
                  <th className="text-right p-3 font-medium">Total Cost</th>
                  <th className="text-right p-3 font-medium">Cost/Gen</th>
                  <th className="text-right p-3 font-medium">Avg Tokens</th>
                  <th className="text-right p-3 font-medium">User Prefs</th>
                </tr>
              </thead>
              <tbody>
                {data.stats.map((model, index) => {
                  const isTop = index === 0
                  return (
                    <tr key={model.model} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-3 w-3 rounded-full', getModelColor(model.model))} />
                          <span className="font-medium">{getModelDisplayName(model.model)}</span>
                          {isTop && (
                            <Badge variant="default" className="ml-2">
                              Most Used
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right p-3 tabular-nums">{model.totalGenerations.toLocaleString()}</td>
                      <td className="text-right p-3 tabular-nums">${model.totalCost.toFixed(2)}</td>
                      <td className="text-right p-3 tabular-nums text-sm">
                        <div className="flex items-center justify-end gap-1">
                          ${model.costPerGeneration.toFixed(4)}
                          {index > 0 && model.costPerGeneration < data.stats[0].costPerGeneration && (
                            <ArrowDownRight className="h-3 w-3 text-green-500" />
                          )}
                          {index > 0 && model.costPerGeneration > data.stats[0].costPerGeneration && (
                            <ArrowUpRight className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="text-right p-3 tabular-nums">{Math.round(model.tokensPerGeneration)}</td>
                      <td className="text-right p-3">
                        <Badge variant="outline">{model.userPreferences}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Preferences */}
      {data.preferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              User Preferences
            </CardTitle>
            <CardDescription>
              Which models users choose when given multiple options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.preferences.map((pref) => (
              <div key={pref.model} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-3 w-3 rounded-full', getModelColor(pref.model))} />
                    <span className="font-medium">{getModelDisplayName(pref.model)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{pref.selectionCount} selections</span>
                    <span className="font-semibold tabular-nums">{pref.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', getModelColor(pref.model))}
                    style={{ width: `${pref.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Distribution
            </CardTitle>
            <CardDescription>
              Spending breakdown by model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.costBreakdown.map((item) => (
              <div key={item.model} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', getModelColor(item.model))} />
                  <span className="text-sm">{getModelDisplayName(item.model)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">${item.cost.toFixed(2)}</span>
                  <Badge variant="outline" className="tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
              <div>
                <p className="text-sm font-medium">Most Efficient</p>
                <p className="text-xs text-muted-foreground">
                  {topModel && `${getModelDisplayName(topModel.model)} has the lowest cost per generation`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
              <div>
                <p className="text-sm font-medium">Most Popular</p>
                <p className="text-xs text-muted-foreground">
                  {mostPreferred && `${getModelDisplayName(mostPreferred.model)} is chosen ${mostPreferred.percentage.toFixed(0)}% of the time`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <p className="text-sm font-medium">Total Usage</p>
                <p className="text-xs text-muted-foreground">
                  {data.totalGenerations.toLocaleString()} generations across {data.totalModels} models
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
