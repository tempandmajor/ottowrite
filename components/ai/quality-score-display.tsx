'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getQualityRating, type QualityScores } from '@/lib/ai/quality-scorer'
import { CheckCircle2, Sparkles, Target, BookOpen, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QualityScoreDisplayProps {
  scores: QualityScores
  modelName?: string
  compact?: boolean
  className?: string
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getOverallBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default'
  if (score >= 60) return 'secondary'
  return 'outline'
}

export function QualityScoreDisplay({
  scores,
  modelName,
  compact = false,
  className,
}: QualityScoreDisplayProps) {
  const metrics = [
    { label: 'Coherence', value: scores.coherence, icon: CheckCircle2, description: 'Logical flow and consistency' },
    { label: 'Creativity', value: scores.creativity, icon: Sparkles, description: 'Originality and inventiveness' },
    { label: 'Accuracy', value: scores.accuracy, icon: Target, description: 'Factual correctness' },
    { label: 'Grammar', value: scores.grammar, icon: BookOpen, description: 'Language quality and style' },
  ]

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Quality:</span>
        </div>
        <Badge variant={getOverallBadgeVariant(scores.overall)} className="font-semibold">
          {scores.overall}/100 • {getQualityRating(scores.overall)}
        </Badge>
        <div className="flex gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center gap-1 text-xs text-muted-foreground">
              <metric.icon className="h-3 w-3" />
              <span className={getScoreColor(metric.value)}>{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Quality Score
              {modelName && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {modelName}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Multi-dimensional quality assessment
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={cn('text-3xl font-bold', getScoreColor(scores.overall))}>
              {scores.overall}
            </div>
            <div className="text-xs text-muted-foreground">
              {getQualityRating(scores.overall)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{metric.label}</span>
                <span className="text-xs text-muted-foreground">
                  {metric.description}
                </span>
              </div>
              <span className={cn('font-semibold tabular-nums', getScoreColor(metric.value))}>
                {metric.value}/100
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor(metric.value))}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface QualityComparisonProps {
  suggestions: Array<{
    model: string
    scores: QualityScores
  }>
  className?: string
}

export function QualityComparison({ suggestions, className }: QualityComparisonProps) {
  // Find best score for each metric
  const bestScores = {
    coherence: Math.max(...suggestions.map(s => s.scores.coherence)),
    creativity: Math.max(...suggestions.map(s => s.scores.creativity)),
    accuracy: Math.max(...suggestions.map(s => s.scores.accuracy)),
    grammar: Math.max(...suggestions.map(s => s.scores.grammar)),
    overall: Math.max(...suggestions.map(s => s.scores.overall)),
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Quality Comparison
      </h3>
      <div className="grid gap-3">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.model} className="border-l-4" style={{
            borderLeftColor: suggestion.scores.overall === bestScores.overall
              ? 'rgb(34 197 94)' // green-500
              : undefined
          }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {suggestion.model}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={getOverallBadgeVariant(suggestion.scores.overall)}>
                    {suggestion.scores.overall}/100
                  </Badge>
                  {suggestion.scores.overall === bestScores.overall && (
                    <Badge variant="default" className="bg-green-500">
                      Best Overall
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: 'Coherence', value: suggestion.scores.coherence, best: bestScores.coherence },
                  { label: 'Creativity', value: suggestion.scores.creativity, best: bestScores.creativity },
                  { label: 'Accuracy', value: suggestion.scores.accuracy, best: bestScores.accuracy },
                  { label: 'Grammar', value: suggestion.scores.grammar, best: bestScores.grammar },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{metric.label}</span>
                      {metric.value === metric.best && metric.best > 0 && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <div className={cn('font-semibold tabular-nums', getScoreColor(metric.value))}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
