'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Copy, Check, FileDown, Sparkles } from 'lucide-react'
import type { CoverageReport } from '@/lib/ai/coverage-service'

type CoverageGeneratorProps = {
  projectId: string
  defaultTitle: string
  defaultGenres?: string[]
  initialScriptSample?: string
}

type CoverageUsage = {
  inputTokens: number
  outputTokens: number
  totalCost: number
} | null

const FORMAT_OPTIONS = [
  { value: 'feature', label: 'Feature film' },
  { value: 'pilot', label: 'TV pilot' },
  { value: 'episode', label: 'TV episode' },
  { value: 'short', label: 'Short film' },
  { value: 'limited_series', label: 'Limited series' },
  { value: 'other', label: 'Other / experimental' },
] as const

const RATING_LABELS: Record<CoverageReport['verdict']['rating'], string> = {
  pass: 'Pass',
  consider: 'Consider',
  recommend: 'Recommend',
}

export function CoverageGenerator({
  projectId,
  defaultTitle,
  defaultGenres = [],
  initialScriptSample = '',
}: CoverageGeneratorProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    scriptTitle: defaultTitle,
    format: 'feature' as (typeof FORMAT_OPTIONS)[number]['value'],
    genreTags: defaultGenres.join(', '),
    existingLogline: '',
    developmentNotes: '',
    scriptText: initialScriptSample,
  })
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<CoverageReport | null>(null)
  const [usage, setUsage] = useState<CoverageUsage>(null)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleChange = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const copyToClipboard = useCallback(
    async (label: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedSection(label)
        toast({ title: 'Copied', description: `${label} copied to clipboard.` })
        setTimeout(() => setCopiedSection(null), 2000)
      } catch (error) {
        console.error('Failed to copy coverage section:', error)
        toast({
          title: 'Copy failed',
          description: 'Please copy manually if the clipboard is unavailable.',
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

  const downloadMarkdown = useCallback(() => {
    if (!report) return
    const lines = [
      `# Script Coverage – ${form.scriptTitle || defaultTitle}`,
      ``,
      `**Verdict:** ${RATING_LABELS[report.verdict.rating]}`,
      ``,
      `## Logline`,
      report.logline,
      ``,
      `## Synopsis (One Page)`,
      report.synopsis.onePage,
      ``,
      `## Synopsis (Two Page)`,
      report.synopsis.twoPage,
      ``,
      `## Coverage Notes`,
      `**Summary**`,
      report.coverageNotes.summary,
      ``,
      `**Strengths**`,
      ...report.coverageNotes.strengths.map((item) => `- ${item}`),
      ``,
      `**Weaknesses**`,
      ...report.coverageNotes.weaknesses.map((item) => `- ${item}`),
      ``,
      `**Character Notes**`,
      ...report.coverageNotes.characterNotes.map((item) => `- ${item}`),
      ``,
      `**Plot Notes**`,
      ...report.coverageNotes.plotNotes.map((item) => `- ${item}`),
      ``,
      `**Dialogue Notes**`,
      ...report.coverageNotes.dialogueNotes.map((item) => `- ${item}`),
      ``,
      `**Pacing Notes**`,
      ...report.coverageNotes.pacingNotes.map((item) => `- ${item}`),
      ``,
      `**Additional Notes**`,
      ...report.coverageNotes.additionalNotes.map((item) => `- ${item}`),
      ``,
      `## Genre & Tone`,
      `- Primary: ${report.genre.primary}`,
      `- Subgenres: ${report.genre.subgenres.join(', ') || '—'}`,
      `- Tone: ${report.genre.tone}`,
      `- Audience: ${report.genre.audience.join(', ') || '—'}`,
      ``,
      `## Marketability`,
      report.marketability.assessment,
      ``,
      `**Audience Segments**`,
      ...report.marketability.audienceSegments.map((item) => `- ${item}`),
      ``,
      `**Comparable Titles**`,
      ...report.marketability.comparableTitles.map((item) => `- ${item}`),
      ``,
      `**Distribution Notes**`,
      ...report.marketability.distributionNotes.map((item) => `- ${item}`),
      ``,
      `**Budget Estimate**`,
      report.marketability.budgetEstimate,
      ``,
      `**Risk Factors**`,
      ...report.marketability.riskFactors.map((item) => `- ${item}`),
      ``,
      `## Scores`,
      `- Concept: ${report.verdict.scores.concept}/10`,
      `- Character: ${report.verdict.scores.character}/10`,
      `- Structure: ${report.verdict.scores.structure}/10`,
      `- Dialogue: ${report.verdict.scores.dialogue}/10`,
      `- Writing: ${report.verdict.scores.writing}/10`,
      `- Marketability: ${report.verdict.scores.marketability}/10`,
      ``,
      `**Verdict Explanation**`,
      report.verdict.explanation,
      ``,
      usage
        ? `*Model: GPT-5 · Tokens: ${usage.inputTokens + usage.outputTokens} · Approx. cost: $${usage.totalCost.toFixed(
            4
          )}*`
        : '',
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `coverage-${form.scriptTitle || defaultTitle}.md`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [defaultTitle, form.scriptTitle, report, usage])

  const handleGenerate = useCallback(async () => {
    if (form.scriptText.trim().length < 200) {
      toast({
        title: 'Need more script pages',
        description: 'Paste at least a few scenes (200+ characters) so the reader has context.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setReport(null)
    setUsage(null)
    setCopiedSection(null)

    try {
      const response = await fetch('/api/ai/generate-coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          script_title: form.scriptTitle,
          script_text: form.scriptText,
          format: form.format,
          genre_tags: form.genreTags,
          existing_logline: form.existingLogline,
          development_notes: form.developmentNotes,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Coverage generation failed.')
      }

      const payload = (await response.json()) as {
        report: CoverageReport
        usage?: CoverageUsage
      }

      setReport(payload.report)
      setUsage(payload.usage ?? null)
      toast({
        title: 'Coverage generated',
        description: 'Review the report and copy sections into your development docs.',
      })
    } catch (error) {
      console.error('Coverage generation error:', error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [form, projectId, toast])

  const totalTokens = useMemo(() => {
    if (!usage) return null
    return usage.inputTokens + usage.outputTokens
  }, [usage])

  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Script coverage generator
        </CardTitle>
        <CardDescription>
          Generate professional-style coverage with logline, synopsis, reader notes, and marketability in minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coverage-title">Script title</Label>
            <Input
              id="coverage-title"
              value={form.scriptTitle}
              onChange={(event) => handleChange('scriptTitle', event.target.value)}
              placeholder="Untitled Feature"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverage-format">Format</Label>
            <Select
              value={form.format}
              onValueChange={(value) =>
                handleChange(
                  'format',
                  value as (typeof FORMAT_OPTIONS)[number]['value']
                )
              }
            >
              <SelectTrigger id="coverage-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverage-genres">Genre tags</Label>
            <Input
              id="coverage-genres"
              value={form.genreTags}
              onChange={(event) => handleChange('genreTags', event.target.value)}
              placeholder="sci-fi, thriller, character drama"
            />
            <p className="text-xs text-muted-foreground">
              Separate with commas. Used to calibrate tone and comparable titles.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverage-logline">Existing logline (optional)</Label>
            <Textarea
              id="coverage-logline"
              rows={2}
              value={form.existingLogline}
              onChange={(event) => handleChange('existingLogline', event.target.value)}
              placeholder="If you already have a logline, paste it here for refinement."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="coverage-notes">Development notes (optional)</Label>
            <Textarea
              id="coverage-notes"
              rows={3}
              value={form.developmentNotes}
              onChange={(event) => handleChange('developmentNotes', event.target.value)}
              placeholder="Mention draft stage, production goals, or topics you want the reader to weigh in on."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverage-script">Script sample</Label>
          <Textarea
            id="coverage-script"
            rows={14}
            value={form.scriptText}
            onChange={(event) => handleChange('scriptText', event.target.value)}
            placeholder="Paste act summaries or your full script. The reader will analyse up to ~60,000 characters."
          />
          <p className="text-xs text-muted-foreground">
            Paste the full script for best results. We&apos;ll automatically truncate the excerpt if it exceeds 60k characters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reading screenplay...
              </>
            ) : (
              'Generate coverage'
            )}
          </Button>
          {usage && totalTokens && (
            <p className="text-xs text-muted-foreground">
              Model: GPT-5 · Tokens: {totalTokens.toLocaleString()} · Est. cost ${usage.totalCost.toFixed(4)}
            </p>
          )}
        </div>

        {report && (
          <div className="space-y-6">
            <Card className="border border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>Verdict & logline</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm uppercase tracking-wide">
                      {RATING_LABELS[report.verdict.rating]}
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard('Logline', report.logline)}
                    >
                      {copiedSection === 'Logline' ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy logline
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadMarkdown}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Download report
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Share the verdict summary with producers or your development team.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base font-medium text-foreground">{report.logline}</p>
                <div className="h-px w-full bg-border" />
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(report.verdict.scores).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium capitalize">{key}</span>
                        <span className="text-xs text-muted-foreground">{value}/10</span>
                      </div>
                      <Progress value={(value / 10) * 100} />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {report.verdict.explanation}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle>Synopsis</CardTitle>
                <CardDescription>Industry-standard summaries for readers and executives.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      One-page
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard('One-page synopsis', report.synopsis.onePage)}
                    >
                      {copiedSection === 'One-page synopsis' ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="rounded-lg border bg-background/70 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {report.synopsis.onePage}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Two-page
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard('Two-page synopsis', report.synopsis.twoPage)}
                    >
                      {copiedSection === 'Two-page synopsis' ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="rounded-lg border bg-background/70 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {report.synopsis.twoPage}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle>Coverage notes</CardTitle>
                <CardDescription>Reader commentary spanning character, plot, dialogue, and pacing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <section className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Summary</h3>
                  <p className="rounded-lg border bg-background/70 p-4 leading-relaxed text-foreground whitespace-pre-wrap">
                    {report.coverageNotes.summary}
                  </p>
                </section>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Strengths</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.strengths.map((item, index) => (
                        <li key={`strength-${index}`} className="rounded-lg border bg-muted/40 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Weaknesses</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.weaknesses.map((item, index) => (
                        <li key={`weakness-${index}`} className="rounded-lg border bg-muted/40 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Character notes</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.characterNotes.map((item, index) => (
                        <li key={`character-${index}`} className="rounded-lg border bg-muted/30 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Plot notes</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.plotNotes.map((item, index) => (
                        <li key={`plot-${index}`} className="rounded-lg border bg-muted/30 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Dialogue notes</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.dialogueNotes.map((item, index) => (
                        <li key={`dialogue-${index}`} className="rounded-lg border bg-muted/30 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Pacing notes</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.pacingNotes.map((item, index) => (
                        <li key={`pacing-${index}`} className="rounded-lg border bg-muted/30 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {report.coverageNotes.additionalNotes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Additional notes</h3>
                    <ul className="space-y-2">
                      {report.coverageNotes.additionalNotes.map((item, index) => (
                        <li key={`additional-${index}`} className="rounded-lg border bg-muted/30 p-3 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/70">
              <CardHeader className="space-y-2">
                <CardTitle>Genre & marketability</CardTitle>
                <CardDescription>
                  Identify positioning, comparable titles, and commercial considerations.
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">{report.genre.primary || 'Genre TBD'}</Badge>
                  {report.genre.subgenres.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Tone & audience</h3>
                  <p className="rounded-lg border bg-background/70 p-4 text-sm text-foreground whitespace-pre-wrap">
                    {report.genre.tone}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {report.genre.audience.map((audience) => (
                      <Badge key={audience} variant="outline" className="text-xs">
                        {audience}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Marketability</h3>
                  <p className="rounded-lg border bg-background/70 p-4 text-sm text-foreground whitespace-pre-wrap">
                    {report.marketability.assessment}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Budget estimate: {report.marketability.budgetEstimate || 'Not specified'}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Comparable titles</h3>
                  <ul className="space-y-1 text-sm">
                    {report.marketability.comparableTitles.map((title, index) => (
                      <li key={`comp-${index}`} className="rounded border bg-muted/30 p-2">
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Distribution & risks</h3>
                  <ul className="space-y-1 text-sm">
                    {report.marketability.distributionNotes.map((note, index) => (
                      <li key={`dist-${index}`} className="rounded border bg-muted/30 p-2">
                        {note}
                      </li>
                    ))}
                  </ul>
                  <div className="h-px w-full bg-border" />
                  <ul className="space-y-1 text-sm">
                    {report.marketability.riskFactors.map((risk, index) => (
                      <li key={`risk-${index}`} className="rounded border bg-muted/30 p-2">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
