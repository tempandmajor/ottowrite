'use client'

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type IssueSeverity = 'warning' | 'info'

type FormatIssue = {
  severity: IssueSeverity
  message: string
  suggestion?: string
}

type FormatMetrics = {
  pageEstimate: number
  totalLines: number
  slugLineCount: number
  dialogueCount: number
  averageDialogueLength: number
  longActionBlocks: number
  transitionCount: number
}

type FormatValidatorProps = {
  scriptText: string
}

const slugRegex = /^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.|EXT\/INT\.)/
const transitionRegex =
  /^(CUT TO:|DISSOLVE TO:|FADE OUT\.|FADE IN:|SMASH TO:|MATCH CUT TO:|WIPE TO:)$/
const characterRegex = /^[A-Z0-9' .\-()]{2,40}$/

function analyseScript(scriptText: string): { metrics: FormatMetrics; issues: FormatIssue[] } {
  const lines = scriptText
    .split(/\r?\n/)
    .map((line) => line.trimRight())
    .filter((line, index, all) => !(line.length === 0 && index === 0 && all.length === 1))

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  const slugLines = nonEmptyLines.filter((line) => slugRegex.test(line))
  const transitionLines = nonEmptyLines.filter((line) => transitionRegex.test(line))

  const potentialCharacters = nonEmptyLines.filter((line, index) => {
    if (slugRegex.test(line) || transitionRegex.test(line)) return false
    if (!characterRegex.test(line)) return false
    if (line.split(' ').length > 6) return false
    const previous = nonEmptyLines[index - 1]
    return !previous || previous.length === 0 || previous.endsWith(')')
  })

  const dialogueBlocks = potentialCharacters.length

  const dialogueLengths: number[] = []
  for (let i = 0; i < nonEmptyLines.length; i += 1) {
    const line = nonEmptyLines[i]
    if (characterRegex.test(line) && line === line.toUpperCase() && !slugRegex.test(line)) {
      let j = i + 1
      let linesSpoken = 0
      while (j < nonEmptyLines.length && nonEmptyLines[j].length > 0 && !characterRegex.test(nonEmptyLines[j])) {
        if (!slugRegex.test(nonEmptyLines[j]) && !transitionRegex.test(nonEmptyLines[j])) {
          linesSpoken += 1
        }
        j += 1
      }
      if (linesSpoken > 0) {
        dialogueLengths.push(linesSpoken)
      }
    }
  }

  const actionBlocks = nonEmptyLines.reduce<number[]>((acc, line) => {
    if (slugRegex.test(line) || transitionRegex.test(line) || characterRegex.test(line)) {
      if (acc[acc.length - 1] !== 0) {
        acc.push(0)
      }
      return acc
    }
    acc[acc.length - 1] = (acc[acc.length - 1] ?? 0) + 1
    return acc
  }, [0])

  const longActionBlocks = actionBlocks.filter((count) => count >= 6).length

  const pageEstimate = Math.max(1, Math.round(nonEmptyLines.length / 55))

  const metrics: FormatMetrics = {
    pageEstimate,
    totalLines: nonEmptyLines.length,
    slugLineCount: slugLines.length,
    dialogueCount: dialogueBlocks,
    averageDialogueLength:
      dialogueLengths.length > 0
        ? Math.round((dialogueLengths.reduce((sum, value) => sum + value, 0) / dialogueLengths.length) * 10) / 10
        : 0,
    longActionBlocks,
    transitionCount: transitionLines.length,
  }

  const issues: FormatIssue[] = []

  if (slugLines.length === 0) {
    issues.push({
      severity: 'warning',
      message: 'No scene headings detected.',
      suggestion: 'Ensure scene headings follow INT./EXT. LOCATION - TIME format.',
    })
  } else if (slugLines.length < pageEstimate) {
    issues.push({
      severity: 'info',
      message: 'Scene heading density is low.',
      suggestion: 'Consider breaking up long sequences with additional scene headings.',
    })
  }

  const lowercaseSlugLines = slugLines.filter((line) => line !== line.toUpperCase())
  if (lowercaseSlugLines.length > 0) {
    issues.push({
      severity: 'warning',
      message: 'Some scene headings are not uppercase.',
      suggestion: 'Scene headings should be fully uppercase for readability.',
    })
  }

  if (dialogueBlocks > 0 && metrics.averageDialogueLength > 6) {
    issues.push({
      severity: 'info',
      message: 'Dialogue paragraphs run longer than industry averages.',
      suggestion: 'Aim for 2-4 lines per speech to keep pacing brisk.',
    })
  }

  if (longActionBlocks > Math.max(1, Math.round(pageEstimate / 4))) {
    issues.push({
      severity: 'warning',
      message: 'Found several long action blocks.',
      suggestion: 'Break action into smaller beats to help readers visualize the scene.',
    })
  }

  const overWideLines = nonEmptyLines.filter(
    (line) => !slugRegex.test(line) && !characterRegex.test(line) && line.length > 80
  )
  if (overWideLines.length > 0) {
    issues.push({
      severity: 'info',
      message: 'Some action lines exceed 80 characters.',
      suggestion: 'Wrap action lines to avoid eye strain when reading.',
    })
  }

  if (transitionLines.length === 0) {
    issues.push({
      severity: 'info',
      message: 'No transitions detected.',
      suggestion: 'While optional, using CUT TO: or similar can clarify major breaks.',
    })
  }

  return { metrics, issues }
}

const severityStyles: Record<IssueSeverity, string> = {
  warning: 'bg-destructive/10 border-destructive/30 text-destructive',
  info: 'bg-secondary/20 border-secondary/30 text-secondary-foreground',
}

export function FormatValidator({ scriptText }: FormatValidatorProps) {
  const hasScript = scriptText.trim().length > 0

  const { metrics, issues } = useMemo(() => {
    if (!hasScript) {
      return {
        metrics: {
          pageEstimate: 0,
          totalLines: 0,
          slugLineCount: 0,
          dialogueCount: 0,
          averageDialogueLength: 0,
          longActionBlocks: 0,
          transitionCount: 0,
        },
        issues: [] as FormatIssue[],
      }
    }
    return analyseScript(scriptText)
  }, [hasScript, scriptText])

  if (!hasScript) {
    return (
      <Card className="border border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Format validator</CardTitle>
          <CardDescription>Paste script pages above to see formatting checks.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          We’ll flag scene heading issues, action block density, dialogue length, and transitions once you add pages.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-primary/30 bg-card/80">
      <CardHeader>
        <CardTitle>Format validator</CardTitle>
        <CardDescription>Quick checks against professional screenplay formatting conventions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Estimated pages" value={metrics.pageEstimate.toString()} />
          <Metric label="Scene headings" value={metrics.slugLineCount.toString()} />
          <Metric label="Dialogue blocks" value={metrics.dialogueCount.toString()} />
          <Metric label="Avg. dialogue lines" value={metrics.averageDialogueLength.toString()} />
          <Metric label="Long action blocks" value={metrics.longActionBlocks.toString()} />
          <Metric label="Transitions" value={metrics.transitionCount.toString()} />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Formatting feedback</h3>
          {issues.length === 0 ? (
            <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-sm text-emerald-700">
              Looks sharp! We didn’t find any major formatting concerns.
            </p>
          ) : (
            <ul className="space-y-3">
              {issues.map((issue, index) => (
                <li
                  key={`${issue.message}-${index}`}
                  className={`rounded-xl border p-4 text-sm shadow-sm ${severityStyles[issue.severity]}`}
                >
                  <p className="font-medium">{issue.message}</p>
                  {issue.suggestion && <p className="mt-1 text-xs opacity-80">{issue.suggestion}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type MetricProps = {
  label: string
  value: string
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
