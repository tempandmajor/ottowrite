'use client'

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Chapter } from '@/components/editor/chapter-sidebar'
import { stripHtml, splitSentences } from '@/lib/utils/text-diff'

type ReadingPacingPanelProps = {
  contentHtml: string
  structure: Chapter[]
  wordCount: number
}

type ReadingCategory = {
  label: string
  description: string
  minutes: number
  progress: number
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'muted'
}

type PacingCategory = {
  label: string
  description: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'muted'
  progress: number
}

const WORDS_PER_MINUTE = 230
export function ReadingPacingPanel({ contentHtml, structure, wordCount }: ReadingPacingPanelProps) {
  const metrics = useMemo(() => computeMetrics(contentHtml, structure, wordCount), [
    contentHtml,
    structure,
    wordCount,
  ])

  return (
    <Card className="border-none bg-card/80 shadow-card">
      <CardHeader>
        <CardTitle>Reading time & pacing</CardTitle>
        <CardDescription>
          Estimate how long the current draft takes to read and spot pacing trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated reading time</p>
              <p className="text-2xl font-semibold text-foreground">{metrics.readingCategory.minutes} min</p>
            </div>
            <Badge variant={metrics.readingCategory.badgeVariant}>{metrics.readingCategory.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{metrics.readingCategory.description}</p>
          <Progress value={metrics.readingCategory.progress} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scene pacing</p>
              <p className="text-lg font-semibold text-foreground">
                {Math.round(metrics.averageWordsPerScene).toLocaleString()} words / scene
              </p>
            </div>
            <Badge variant={metrics.pacingCategory.badgeVariant}>{metrics.pacingCategory.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{metrics.pacingCategory.description}</p>
          <Progress value={metrics.pacingCategory.progress} />
        </section>

        <section className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Scenes</p>
            <p className="mt-1 font-semibold text-foreground">{metrics.totalScenes}</p>
          </div>
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg sentence length</p>
            <p className="mt-1 font-semibold text-foreground">{metrics.averageSentenceLength.toFixed(1)} words</p>
          </div>
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pacing balance</p>
            <p className="mt-1 font-semibold text-foreground">
              {metrics.pacingBreakdown.fast} fast · {metrics.pacingBreakdown.balanced} balanced ·{' '}
              {metrics.pacingBreakdown.slow} slow
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

function computeMetrics(contentHtml: string, chapters: Chapter[], wordCount: number) {
  const plainText = stripHtml(contentHtml)
  const sentences = splitSentences(plainText)
  const totalScenes = chapters.reduce((total, chapter) => total + (chapter.scenes?.length ?? 0), 0)
  const averageWordsPerScene = totalScenes > 0 ? wordCount / totalScenes : wordCount

  const readingCategory = categorizeReadingTime(wordCount)
  const pacingCategory = categorizePacing(averageWordsPerScene, totalScenes)
  const pacingBreakdown = countScenePacing(chapters)

  return {
    readingCategory,
    pacingCategory,
    averageWordsPerScene,
    totalScenes,
    averageSentenceLength: sentences.length > 0 ? wordCount / sentences.length : wordCount,
    pacingBreakdown,
  }
}

function categorizeReadingTime(wordCount: number): ReadingCategory {
  const minutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))
  if (minutes <= 8) {
    return {
      label: 'Quick read',
      description: 'Readers can finish this draft in a single short sitting.',
      minutes,
      progress: Math.min(100, (minutes / 8) * 100),
      badgeVariant: 'secondary',
    }
  }
  if (minutes <= 25) {
    return {
      label: 'Moderate',
      description: 'Comfortable length for a chapter—keep momentum high.',
      minutes,
      progress: Math.min(100, (minutes / 25) * 100),
      badgeVariant: 'default',
    }
  }
  return {
    label: 'Long session',
    description: 'Consider splitting or tightening pacing to reduce fatigue.',
    minutes,
    progress: 100,
    badgeVariant: 'destructive',
  }
}

function categorizePacing(averageWordsPerScene: number, totalScenes: number): PacingCategory {
  if (totalScenes === 0) {
    return {
      label: 'No scenes',
      description: 'Add chapters/scenes to map pacing.',
      badgeVariant: 'muted',
      progress: 0,
    }
  }

  if (averageWordsPerScene <= 350) {
    return {
      label: 'Fast paced',
      description: 'Scenes are concise—ensure emotional beats still land.',
      badgeVariant: 'secondary',
      progress: Math.min(100, (averageWordsPerScene / 350) * 100),
    }
  }

  if (averageWordsPerScene <= 900) {
    return {
      label: 'Balanced',
      description: 'Scene length sits in the sweet spot. Maintain variety to avoid monotony.',
      badgeVariant: 'default',
      progress: Math.min(100, (averageWordsPerScene / 900) * 100),
    }
  }

  return {
    label: 'Leaning slow',
    description: 'Scenes run long—tighten dialogue or break into smaller beats.',
    badgeVariant: 'destructive',
    progress: 100,
  }
}

function countScenePacing(chapters: Chapter[]) {
  const counts = { fast: 0, balanced: 0, slow: 0 }
  chapters.forEach((chapter) => {
    chapter.scenes?.forEach((scene) => {
      const pacing = scene.metadata?.pacing ?? 'balanced'
      if (pacing === 'fast') counts.fast += 1
      else if (pacing === 'slow') counts.slow += 1
      else counts.balanced += 1
    })
  })
  return counts
}
