'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/number-format'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Zap,
  TrendingUp,
  BarChart3,
} from 'lucide-react'

export type AIRequest = {
  id: string
  command: string | null
  intent: string | null
  requested_model: string | null
  selected_model: string
  words_generated: number
  prompt_tokens: number
  completion_tokens: number
  latency_ms: number | null
  status: string
  error: string | null
  prompt_preview: string | null
  selection_preview: string | null
  created_at: string
  project_id: string | null
  document_id: string | null
}

export type TelemetryStats = {
  total_requests: number
  succeeded_requests: number
  failed_requests: number
  total_words_generated: number
  total_prompt_tokens: number
  total_completion_tokens: number
  avg_latency_ms: number | null
  most_used_model: string | null
  most_used_command: string | null
}

type AITelemetryDashboardProps = {
  requests: AIRequest[]
  stats: TelemetryStats
}

export function AITelemetryDashboard({ requests, stats }: AITelemetryDashboardProps) {
  const successRate =
    stats.total_requests > 0 ? ((stats.succeeded_requests / stats.total_requests) * 100).toFixed(1) : '0.0'

  const totalTokens = stats.total_prompt_tokens + stats.total_completion_tokens

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.total_requests)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.succeeded_requests)} succeeded · {formatNumber(stats.failed_requests)} failed
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Words Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.total_words_generated)}</div>
            <p className="text-xs text-muted-foreground">Across all AI requests</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.total_prompt_tokens)} prompt · {formatNumber(stats.total_completion_tokens)}{' '}
              completion
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avg_latency_ms != null ? `${stats.avg_latency_ms.toFixed(0)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">{successRate}% success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Model & Command Usage */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Most Used Model
            </CardTitle>
            <CardDescription>Primary AI model for your requests</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.most_used_model ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-mono">
                  {stats.most_used_model}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Most Used Command
            </CardTitle>
            <CardDescription>Your most common AI operation</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.most_used_command ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {stats.most_used_command}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests Table */}
      <Card className="border-none bg-card/80 shadow-card">
        <CardHeader>
          <CardTitle>Recent AI Requests</CardTitle>
          <CardDescription>Last 50 AI operations logged to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI requests recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Command</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Words</th>
                    <th className="px-4 py-3 text-left">Tokens</th>
                    <th className="px-4 py-3 text-left">Latency</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {requests.map((request) => (
                    <tr key={request.id} className="bg-background/60 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {request.command ? (
                          <Badge variant="outline" className="text-xs">
                            {request.command}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs">{request.selected_model}</code>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(request.words_generated)}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatNumber(request.prompt_tokens + request.completion_tokens)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {request.latency_ms != null ? `${request.latency_ms}ms` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'succeeded' ? (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-xs">OK</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600" title={request.error ?? undefined}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">Failed</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
