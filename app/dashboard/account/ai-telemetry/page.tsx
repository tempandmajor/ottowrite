'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AITelemetryDashboard,
  type AIRequest,
  type TelemetryStats,
} from '@/components/account/ai-telemetry-dashboard'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'

type TelemetryResponse = {
  requests: AIRequest[]
  stats: TelemetryStats
}

export default function AITelemetryPage() {
  const router = useRouter()
  const [data, setData] = useState<TelemetryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTelemetry = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/account/ai-telemetry')
      if (!response.ok) {
        throw new Error('Failed to fetch AI telemetry')
      }
      const payload = (await response.json()) as TelemetryResponse
      setData(payload)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTelemetry()
  }, [fetchTelemetry])

  if (loading && !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading AI telemetry...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? 'Unable to load AI telemetry right now.'}</p>
        <Button variant="outline" onClick={fetchTelemetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">AI Request Telemetry</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your AI usage, model selection, and request performance.
          </p>
        </div>
      </div>

      <AITelemetryDashboard requests={data.requests} stats={data.stats} />
    </div>
  )
}
