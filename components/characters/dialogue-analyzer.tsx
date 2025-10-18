'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Plus, Trash2, Sparkles, ClipboardCopy } from 'lucide-react'
import { cn } from '@/lib/utils'

type DialogueAnalysisRecord = {
  id: string
  created_at: string
  dialogue_samples: string[]
  target_passage: string
  analysis: {
    voiceProfile: {
      tone: string
      pacing: string
      vocabulary: string
      signatureTraits: string[]
    }
    comparison: {
      matchesVoice: boolean
      confidence: number
      overallAssessment: string
      issues: Array<{
        category: string
        severity: 'critical' | 'major' | 'minor' | 'note'
        description: string
        suggestion?: string
      }>
    }
    suggestedRevision: string
    rawText?: string
  }
  confidence: number | null
}

type DialogueAnalyzerProps = {
  projectId: string
  characterId: string
  characterName: string
  voiceDescription?: string | null
}

type SampleInput = {
  id: string
  value: string
}

const severityVariants: Record<
  'critical' | 'major' | 'minor' | 'note',
  { label: string; className: string }
> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100',
  },
  major: {
    label: 'Major',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-100',
  },
  minor: {
    label: 'Minor',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-100',
  },
  note: {
    label: 'Note',
    className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-100',
  },
}

const categories: Record<string, string> = {
  tone: 'Tone',
  vocabulary: 'Vocabulary',
  pacing: 'Pacing',
  voice_break: 'Voice Break',
  other: 'Other',
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const emptySample = (): SampleInput => ({
  id: generateId(),
  value: '',
})

export function DialogueAnalyzer({
  projectId,
  characterId,
  characterName,
  voiceDescription,
}: DialogueAnalyzerProps) {
  const [samples, setSamples] = useState<SampleInput[]>([emptySample(), emptySample()])
  const [targetPassage, setTargetPassage] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<DialogueAnalysisRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const latestAnalysis = useMemo(() => history[0] ?? null, [history])

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `/api/analysis/dialogue-voice?character_id=${characterId}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch dialogue analyses')
        }
        const data = (await response.json()) as DialogueAnalysisRecord[]
        setHistory(data)
      } catch (err) {
        console.error(err)
        setError('Unable to load previous analyses.')
      } finally {
        setLoadingHistory(false)
      }
    }

    loadHistory()
  }, [characterId])

  const handleSampleChange = (id: string, value: string) => {
    setSamples((prev) => prev.map((sample) => (sample.id === id ? { ...sample, value } : sample)))
  }

  const addSample = () => {
    setSamples((prev) => [...prev, emptySample()])
  }

  const removeSample = (id: string) => {
    setSamples((prev) => prev.filter((sample) => sample.id !== id))
  }

  const resetInputs = () => {
    setSamples([emptySample(), emptySample()])
    setTargetPassage('')
  }

  const runAnalysis = async () => {
    const preparedSamples = samples
      .map((sample) => sample.value.trim())
      .filter((sample) => sample.length > 0)

    if (preparedSamples.length === 0 || targetPassage.trim().length === 0) {
      setError('Please provide at least one dialogue sample and the passage to analyze.')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/analysis/dialogue-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          project_id: projectId,
          dialogue_samples: preparedSamples,
          target_passage: targetPassage.trim(),
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to analyze dialogue voice')
      }

      const record = (await response.json()) as DialogueAnalysisRecord

      setHistory((prev) => [record, ...prev])
      resetInputs()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyRevision = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // swallow clipboard errors silently
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Dialogue Voice Analyzer
          </CardTitle>
          <CardDescription>
            Compare new dialogue against {characterName}&rsquo;s established voice to keep tone,
            vocabulary, and rhythm consistent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {voiceDescription && (
            <div className="rounded-lg border border-dashed border-muted bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Current voice notes</p>
              <p className="mt-1 whitespace-pre-wrap">{voiceDescription}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Reference dialogue samples</Label>
              <Button type="button" size="sm" variant="outline" onClick={addSample}>
                <Plus className="mr-2 h-4 w-4" />
                Add sample
              </Button>
            </div>
            <div className="space-y-3">
              {samples.map((sample, index) => (
                <div key={sample.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`sample-${sample.id}`}>Sample {index + 1}</Label>
                    {samples.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove sample"
                        onClick={() => removeSample(sample.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id={`sample-${sample.id}`}
                    rows={3}
                    value={sample.value}
                    onChange={(event) => handleSampleChange(sample.id, event.target.value)}
                    placeholder="Paste a brief excerpt of this character speaking..."
                    className="resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Passage to check</Label>
            <Textarea
              id="target"
              rows={5}
              value={targetPassage}
              onChange={(event) => setTargetPassage(event.target.value)}
              placeholder="Paste the new passage you'd like to check for voice consistency..."
              className="resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Analysis runs on Claude Sonnet 4.5 and may take a few seconds. We store results so you
              can revisit them later.
            </p>
            <Button
              type="button"
              onClick={runAnalysis}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing voice...
                </>
              ) : (
                'Analyze voice consistency'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Latest analysis</CardTitle>
            <CardDescription>
              {latestAnalysis
                ? `Generated ${formatDistanceToNow(new Date(latestAnalysis.created_at), {
                    addSuffix: true,
                  })}`
                : 'Run an analysis to see results here.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : latestAnalysis ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Voice profile</p>
                  <div className="mt-2 space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">Tone: </span>
                      {latestAnalysis.analysis.voiceProfile.tone || '—'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Pacing: </span>
                      {latestAnalysis.analysis.voiceProfile.pacing || '—'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Vocabulary: </span>
                      {latestAnalysis.analysis.voiceProfile.vocabulary || '—'}
                    </div>
                    {latestAnalysis.analysis.voiceProfile.signatureTraits.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {latestAnalysis.analysis.voiceProfile.signatureTraits.map((trait) => (
                          <Badge key={trait} variant="outline">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px w-full bg-border" />

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        'text-xs',
                        latestAnalysis.analysis.comparison.matchesVoice
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100'
                      )}
                    >
                      {latestAnalysis.analysis.comparison.matchesVoice
                        ? 'Voice match'
                        : 'Voice drift detected'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Confidence {(latestAnalysis.analysis.comparison.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {latestAnalysis.analysis.comparison.overallAssessment}
                  </p>
                </div>

                {latestAnalysis.analysis.comparison.issues.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Notable issues</p>
                    <div className="space-y-3">
                      {latestAnalysis.analysis.comparison.issues.map((issue, index) => (
                        <div
                          key={`${issue.category}-${index}`}
                          className="rounded-lg border bg-card/80 p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline">
                              {categories[issue.category] ?? issue.category}
                            </Badge>
                            <Badge className={cn('text-xs', severityVariants[issue.severity].className)}>
                              {severityVariants[issue.severity].label}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-foreground">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Suggestion: {issue.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px w-full bg-border" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground">Suggested rewrite</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyRevision(latestAnalysis.analysis.suggestedRevision)}
                      aria-label="Copy suggested rewrite"
                    >
                      <ClipboardCopy className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <ScrollArea className="max-h-48 rounded-lg border bg-muted/40 p-3 text-sm">
                    <p className="whitespace-pre-wrap">
                      {latestAnalysis.analysis.suggestedRevision}
                    </p>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run the analyzer to evaluate a passage against {characterName}&rsquo;s voice.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Analysis history</CardTitle>
            <CardDescription>
              {loadingHistory
                ? 'Loading history...'
                : history.length === 0
                ? 'No analyses yet.'
                : 'Previous results for this character.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                When you run the analyzer, results will appear here for future reference.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-lg border bg-card/80 p-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          record.analysis.comparison.matchesVoice
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100'
                        )}
                      >
                        {record.analysis.comparison.matchesVoice ? 'Match' : 'Needs work'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-muted-foreground">
                      {record.analysis.comparison.overallAssessment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
