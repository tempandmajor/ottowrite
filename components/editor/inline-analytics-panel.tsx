'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

import { stripHtml } from '@/lib/utils/text-diff'
import { analyzeSnapshot } from '@/lib/analytics/metrics-calculator'
import type { DocumentSnapshot } from '@/lib/snapshots/snapshot-manager'
import type { Chapter } from '@/components/editor/chapter-sidebar'
import type { ScreenplayElement } from '@/components/editor/screenplay-editor'
import { computeReadabilityMetrics } from '@/components/analysis/readability-utils'

type InlineAnalyticsPanelProps = {
  documentType: string | undefined
  contentHtml: string
  structure?: Chapter[]
  screenplayElements?: ScreenplayElement[]
  wordCount: number
}

const DIALOGUE_WARNING_THRESHOLD = 65
const PASSIVE_WARNING_THRESHOLD = 6

function createSnapshotForAnalytics(params: {
  documentType: string | undefined
  contentHtml: string
  screenplayElements?: ScreenplayElement[]
  structure?: Chapter[]
  wordCount: number
}): DocumentSnapshot | null {
  const { documentType, contentHtml, screenplayElements = [], structure, wordCount } = params
  let html = contentHtml
  let sceneCount = 0

  if (documentType === 'screenplay') {
    if (!screenplayElements.length) {
      return null
    }
    html = screenplayElements
      .map((element) => {
        const escaped = element.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return `<p data-type="${element.type}">${escaped}</p>`
      })
      .join('\n')
    sceneCount = screenplayElements.filter((element) => element.type === 'scene').length
  } else {
    sceneCount = Array.isArray(structure)
      ? structure.reduce((total, chapter) => total + (chapter.scenes?.length ?? 0), 0)
      : 0
  }

  return {
    metadata: {
      id: 'inline',
      timestamp: new Date(),
      source: 'analytics',
      label: 'Inline analytics snapshot',
      hash: 'inline',
      wordCount,
      sceneCount,
    },
    content: {
      html,
      structure: documentType === 'screenplay' ? undefined : structure,
    },
    sceneAnchors: [],
  }
}

function formatReadingEase(score: number | undefined): { label: string; variant: 'secondary' | 'default' | 'destructive' } {
  if (score === undefined) {
    return { label: 'n/a', variant: 'secondary' }
  }
  if (score >= 70) {
    return { label: 'Easy', variant: 'secondary' }
  }
  if (score >= 50) {
    return { label: 'Standard', variant: 'default' }
  }
  return { label: 'Dense', variant: 'destructive' }
}

function formatPassiveVoice(percent: number | undefined): { label: string; variant: 'default' | 'destructive' } {
  if (percent === undefined) {
    return { label: 'n/a', variant: 'default' }
  }
  return percent >= PASSIVE_WARNING_THRESHOLD ? { label: 'High', variant: 'destructive' } : { label: 'Healthy', variant: 'default' }
}

function formatDialogue(percent: number | undefined): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (percent === undefined) {
    return { label: 'n/a', variant: 'default' }
  }
  if (percent > DIALOGUE_WARNING_THRESHOLD) {
    return { label: 'Dialogue heavy', variant: 'destructive' }
  }
  if (percent >= 25) {
    return { label: 'Balanced', variant: 'default' }
  }
  return { label: 'Narration heavy', variant: 'secondary' }
}

export function InlineAnalyticsPanel({
  documentType,
  contentHtml,
  structure,
  screenplayElements,
  wordCount,
}: InlineAnalyticsPanelProps) {
  const [expanded, setExpanded] = useState(true)

  const { snapshotMetrics, readabilityMetrics, plainText } = useMemo(() => {
    const snapshot = createSnapshotForAnalytics({
      documentType,
      contentHtml,
      screenplayElements,
      structure,
      wordCount,
    })

    const baselineHtml =
      documentType === 'screenplay'
        ? screenplayElements?.map((element) => element.content).join('\n') ?? ''
        : contentHtml

    const text = documentType === 'screenplay' ? (screenplayElements ?? []).map((el) => el.content).join('\n') : stripHtml(baselineHtml)

    const readability = text.trim().length > 0 ? computeReadabilityMetrics(text) : null

    const metrics = snapshot ? analyzeSnapshot(snapshot) : null

    return {
      snapshotMetrics: metrics,
      readabilityMetrics: readability,
      plainText: text,
    }
  }, [contentHtml, documentType, screenplayElements, structure, wordCount])

  const readingEase = snapshotMetrics?.readabilityScore
  const dialoguePercent = readabilityMetrics?.dialoguePercent ?? snapshotMetrics?.dialoguePercentage
  const passivePercent = readabilityMetrics?.passiveVoicePercent
  const avgSentenceLength = readabilityMetrics?.avgSentenceLength ?? snapshotMetrics?.averageWordsPerSentence

  const readingEaseDisplay = formatReadingEase(readingEase)
  const passiveDisplay = formatPassiveVoice(passivePercent)
  const dialogueDisplay = formatDialogue(dialoguePercent)

  const infoBlocks = [
    {
      title: 'Word count',
      value: wordCount.toLocaleString(),
      description: 'Live total words in this document',
    },
    {
      title: 'Reading ease',
      value: readingEase !== undefined ? Math.round(readingEase).toString() : '—',
      badge: readingEaseDisplay,
      description: 'Flesch Reading Ease score (0–100)',
    },
    {
      title: 'Passive voice',
      value: passivePercent !== undefined ? `${passivePercent.toFixed(1)}%` : '—',
      badge: passiveDisplay,
      description: 'Percent of sentences in passive constructions',
    },
    {
      title: 'Dialogue ratio',
      value: dialoguePercent !== undefined ? `${dialoguePercent.toFixed(1)}%` : '—',
      badge: dialogueDisplay,
      description: 'Share of words inside dialogue',
    },
    {
      title: 'Avg sentence length',
      value: avgSentenceLength !== undefined ? `${avgSentenceLength.toFixed(1)} words` : '—',
      description: 'Helps spot long, winding sentences',
    },
  ]

  const noContent = plainText.trim().length === 0

  return (
    <Card className="border-none bg-card/80 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Live analytics
          </CardTitle>
          <CardDescription>Watch readability and voice metrics update as you write.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? 'Collapse analytics panel' : 'Expand analytics panel'}
        >
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {noContent ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Start writing to view live analytics. Metrics update automatically as you type.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {infoBlocks.map((block) => (
                <div key={block.title} className="rounded-lg border bg-background/80 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{block.title}</p>
                    {block.badge && (
                      <Badge variant={block.badge.variant}>{block.badge.label}</Badge>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-foreground">{block.value}</p>
                  <p className="text-xs text-muted-foreground">{block.description}</p>
                  {block.title === 'Passive voice' && passivePercent !== undefined && (
                    <Progress value={Math.min(100, passivePercent)} />
                  )}
                  {block.title === 'Dialogue ratio' && dialoguePercent !== undefined && (
                    <Progress value={Math.min(100, Math.max(0, dialoguePercent))} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
