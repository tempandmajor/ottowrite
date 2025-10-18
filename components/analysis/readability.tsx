'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { computeReadabilityMetrics, type ReadabilityMetrics } from '@/components/analysis/readability-utils'
import { Sparkles } from 'lucide-react'

type ReadabilityProps = {
  initialText?: string
}

const GRADE_GUIDE = `Flesch-Kincaid Guide:\n90-100: Very easy (5th grade)\n60-70: Plain English (8-9th grade)\n0-30: Academic/technical`

export function ReadabilityPanel({ initialText = '' }: ReadabilityProps) {
  const [text, setText] = useState(initialText)
  const [metrics, setMetrics] = useState<ReadabilityMetrics | null>(null)

  const analyze = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      setMetrics(null)
      return
    }
    setMetrics(computeReadabilityMetrics(trimmed))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Readability check
        </CardTitle>
        <CardDescription>
          Estimate grade level, passive voice, dialogue ratio, and flag common clichés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="readability-text">Paste excerpt</Label>
          <Textarea
            id="readability-text"
            rows={6}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste text to analyze..."
          />
        </div>
        <Button onClick={analyze} disabled={text.trim().length === 0}>
          Analyze readability
        </Button>

        {metrics && (
          <div className="space-y-4 rounded-xl border bg-card/60 p-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Flesch-Kincaid grade<br />
                  <span className="text-[10px] text-muted-foreground" title={GRADE_GUIDE}>
                    Lower = easier to read
                  </span>
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">{metrics.fleschKincaid}</p>
              </div>

              <div className="rounded-lg border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Avg. sentence length
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {metrics.avgSentenceLength.toLocaleString()} words
                </p>
              </div>

              <div className="rounded-lg border bg-background/80 p-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Passive voice
                </p>
                <Progress value={metrics.passiveVoicePercent} />
                <p className="text-xs text-muted-foreground">
                  {(metrics.passiveVoicePercent / 10).toFixed(2)}% of words appear in passive constructions.
                </p>
              </div>

              <div className="rounded-lg border bg-background/80 p-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Dialogue ratio
                </p>
                <Progress value={metrics.dialoguePercent} />
                <p className="text-xs text-muted-foreground">
                  {metrics.dialoguePercent.toFixed(1)}% of words occur in dialogue.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-background/80 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliché scan</p>
              {metrics.clicheMatches.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {metrics.clicheMatches.map((cliche) => (
                    <li key={cliche}>{cliche}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No common clichés detected.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
