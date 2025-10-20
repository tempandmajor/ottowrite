'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, BookOpen, Gauge } from 'lucide-react'
import type { Chapter } from './chapter-sidebar'

type ReadingTimeWidgetProps = {
  content: string
  wordCount: number
  structure: Chapter[]
}

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(words: number): number {
  const wordsPerMinute = 250
  return words / wordsPerMinute
}

/**
 * Format reading time into human-readable string
 */
function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min'
  } else if (minutes < 60) {
    return `${Math.round(minutes)} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
}

/**
 * Calculate pacing level based on words per chapter
 */
function calculatePacing(wordsPerChapter: number): {
  level: 'slow' | 'balanced' | 'fast'
  label: string
  color: string
} {
  if (wordsPerChapter < 2000) {
    return {
      level: 'fast',
      label: 'Fast',
      color: 'bg-orange-500',
    }
  } else if (wordsPerChapter < 4000) {
    return {
      level: 'balanced',
      label: 'Balanced',
      color: 'bg-green-500',
    }
  } else {
    return {
      level: 'slow',
      label: 'Slow',
      color: 'bg-blue-500',
    }
  }
}

/**
 * Strip HTML tags to get plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

export function ReadingTimeWidget({ content, wordCount, structure }: ReadingTimeWidgetProps) {
  const metrics = useMemo(() => {
    const plainText = stripHtml(content)
    const calculatedWordCount = countWords(plainText)
    const words = wordCount || calculatedWordCount

    const readingMinutes = calculateReadingTime(words)
    const chapterCount = structure.length
    const wordsPerChapter = chapterCount > 0 ? words / chapterCount : 0

    const pacing = calculatePacing(wordsPerChapter)

    return {
      readingTime: formatReadingTime(readingMinutes),
      readingMinutes,
      chapterCount,
      wordsPerChapter: Math.round(wordsPerChapter),
      pacing,
    }
  }, [content, wordCount, structure])

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Reading & Pacing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Reading Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Reading Time</span>
          </div>
          <span className="text-sm font-semibold">{metrics.readingTime}</span>
        </div>

        {/* Words per Chapter */}
        {metrics.chapterCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Words/Chapter</span>
            </div>
            <span className="text-sm font-semibold">
              {metrics.wordsPerChapter.toLocaleString()}
            </span>
          </div>
        )}

        {/* Pacing Gauge */}
        {metrics.chapterCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" />
              <span>Pacing</span>
            </div>
            <Badge
              variant="secondary"
              className={`${metrics.pacing.color} border-0 text-white`}
            >
              {metrics.pacing.label}
            </Badge>
          </div>
        )}

        {/* Progress Bar */}
        {metrics.readingMinutes > 0 && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Estimated read</span>
              <span>
                {metrics.readingMinutes < 60
                  ? `${Math.round(metrics.readingMinutes)} minutes`
                  : `${(metrics.readingMinutes / 60).toFixed(1)} hours`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full ${metrics.pacing.color} transition-all duration-300`}
                style={{
                  width: `${Math.min(100, (metrics.readingMinutes / 120) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
