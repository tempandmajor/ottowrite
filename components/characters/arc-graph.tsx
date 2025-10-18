'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CharacterArcStage } from './arc-timeline'
import { cn } from '@/lib/utils'

const emotionScores: Array<{ keywords: string[]; value: number }> = [
  { keywords: ['ecstatic', 'triumphant', 'elated', 'euphoric'], value: 95 },
  { keywords: ['happy', 'hopeful', 'optimistic', 'confident'], value: 80 },
  { keywords: ['focused', 'determined', 'steady'], value: 70 },
  { keywords: ['uncertain', 'conflicted', 'anxious'], value: 55 },
  { keywords: ['worried', 'doubtful', 'afraid'], value: 40 },
  { keywords: ['sad', 'defeated', 'exhausted'], value: 25 },
  { keywords: ['shattered', 'devastated', 'hopeless'], value: 10 },
]

function getEmotionScore(state?: string | null) {
  if (!state) return 50
  const lower = state.toLowerCase()
  for (const { keywords, value } of emotionScores) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return value
    }
  }
  return 50
}

type ArcGraphProps = {
  arcs: CharacterArcStage[]
}

export function ArcGraph({ arcs }: ArcGraphProps) {
  const data = useMemo(() => {
    if (!arcs || arcs.length === 0) return []
    const sorted = [...arcs].sort((a, b) => a.stage_order - b.stage_order)
    return sorted.map((stage, index) => ({
      x: index,
      label: `${stage.stage_order}. ${stage.stage_name}`,
      value: getEmotionScore(stage.emotional_state),
      completed: Boolean(stage.is_completed),
    }))
  }, [arcs])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emotional journey</CardTitle>
          <CardDescription>
            Add arc stages to visualize how this character changes over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Once stages are added with emotional states, we&rsquo;ll map the curve here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxValue = 100
  const minValue = 0
  const plotWidth = 800
  const plotHeight = 220
  const padding = { top: 20, bottom: 40, left: 40, right: 20 }
  const innerWidth = plotWidth - padding.left - padding.right
  const innerHeight = plotHeight - padding.top - padding.bottom
  const step = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth

  const points = data
    .map((point, index) => {
      const x = padding.left + index * step
      const y =
        padding.top + innerHeight - ((point.value - minValue) / (maxValue - minValue)) * innerHeight
      return `${x},${y}`
    })
    .join(' ')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotional journey</CardTitle>
        <CardDescription>Track approximate highs and lows across the arc.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            role="img"
            aria-label="Character emotional arc visualization"
            viewBox={`0 0 ${plotWidth} ${plotHeight}`}
            className="h-[260px] min-w-full"
          >
            <defs>
              <linearGradient id="arcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g>
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={plotHeight - padding.bottom}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <line
                x1={padding.left}
                y1={plotHeight - padding.bottom}
                x2={plotWidth - padding.right}
                y2={plotHeight - padding.bottom}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />

              {[0, 25, 50, 75, 100].map((value) => {
                const y =
                  padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight
                return (
                  <g key={value}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={plotWidth - padding.right}
                      y2={y}
                      stroke="hsl(var(--muted))"
                      strokeWidth={0.5}
                      strokeDasharray="4 6"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={10}
                      fill="hsl(var(--muted-foreground))"
                    >
                      {value}
                    </text>
                  </g>
                )
              })}

              <polygon
                points={`${points} ${plotWidth - padding.right},${plotHeight - padding.bottom} ${padding.left},${plotHeight - padding.bottom}`}
                fill="url(#arcGradient)"
              />

              <polyline
                points={points}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {data.map((point, index) => {
                const x = padding.left + index * step
                const y =
                  padding.top +
                  innerHeight -
                  ((point.value - minValue) / (maxValue - minValue)) * innerHeight
                return (
                  <g key={point.label}>
                    <circle
                      cx={x}
                      cy={y}
                      r={6}
                      className={cn(
                        'transition-colors',
                        point.completed ? 'fill-emerald-500 stroke-emerald-500' : 'fill-background stroke-primary'
                      )}
                    />
                    <text
                      x={x}
                      y={plotHeight - padding.bottom + 16}
                      fontSize={10}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                    >
                      {point.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-primary" />
            Emotional intensity
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-primary bg-background" />
            Pending
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Completed
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
