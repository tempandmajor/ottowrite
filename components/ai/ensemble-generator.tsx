'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Copy, Check, Sparkles, ThumbsUp, GitMerge } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type BaseModel = 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3'
type SuggestionModel = BaseModel | 'blend'

type Suggestion = {
  model: SuggestionModel
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

type EnsembleGeneratorProps = {
  currentContext: string
  onInsert: (text: string) => void
  projectId?: string
  documentId?: string
}

const MODEL_LABELS: Record<SuggestionModel, string> = {
  'claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'gpt-5': 'GPT-5',
  'deepseek-v3': 'DeepSeek V3',
  blend: 'Blended draft',
}

const isBaseSuggestion = (
  suggestion: Suggestion
): suggestion is Suggestion & { model: BaseModel } => suggestion.model !== 'blend'

export function EnsembleGenerator({
  currentContext,
  onInsert,
  projectId,
  documentId,
}: EnsembleGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [blendedSuggestion, setBlendedSuggestion] = useState<Suggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<Suggestion['model'] | null>(null)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [blendInstructions, setBlendInstructions] = useState('')
  const [blendLoading, setBlendLoading] = useState(false)
  const [usedContent, setUsedContent] = useState<string | null>(null)
  const [usedModel, setUsedModel] = useState<Suggestion['model'] | null>(null)

  const { toast } = useToast()

  const runEnsemble = async () => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      toast({
        title: 'Prompt required',
        description: 'Describe what you want the models to tackle.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setSuggestions([])
    setBlendedSuggestion(null)
    setCopiedKey(null)
    setSelectedModel(null)
    setFeedbackNote('')
    setFeedbackSubmitted(false)
    setBlendInstructions('')
    setUsedContent(null)
    setUsedModel(null)

    try {
      const response = await fetch('/api/ai/ensemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          context: currentContext.slice(-4000),
          maxTokens: 800,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to run ensemble')
      }

      const payload = await response.json()
      setSuggestions(payload.suggestions ?? [])
      setLastPrompt(trimmedPrompt)
      toast({
        title: 'Ensemble complete',
        description: 'Compare the suggestions and pick the one you like.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Ensemble failed',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copySuggestion = async (key: string, suggestion: Suggestion) => {
    await navigator.clipboard.writeText(suggestion.content)
    setCopiedKey(key)
    toast({ title: 'Copied', description: `${MODEL_LABELS[suggestion.model]} output copied.` })
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSelectModel = (model: Suggestion['model']) => {
    setSelectedModel(model)
    if (usedModel !== model) {
      setUsedContent(null)
    }
  }

  const insertSuggestion = (suggestion: Suggestion) => {
    onInsert(suggestion.content)
    setUsedModel(suggestion.model)
    setSelectedModel(suggestion.model)
    setUsedContent(suggestion.content)
    toast({
      title: 'Inserted',
      description: `${MODEL_LABELS[suggestion.model]} output inserted into the editor.`,
    })
  }

  const handleSubmitFeedback = async () => {
    if (!selectedModel) {
      toast({
        title: 'Pick a favourite first',
        description: 'Select which draft worked best before submitting feedback.',
        variant: 'destructive',
      })
      return
    }

    if (!lastPrompt || suggestions.length === 0) {
      toast({
        title: 'Run an ensemble first',
        description: 'Generate suggestions before saving feedback.',
        variant: 'destructive',
      })
      return
    }

    const baseSuggestions = suggestions.filter(isBaseSuggestion)

    const usageSummary = baseSuggestions.reduce(
      (acc, suggestion) => {
        acc.totalInputTokens += suggestion.usage.inputTokens
        acc.totalOutputTokens += suggestion.usage.outputTokens
        acc.totalCost = Number((acc.totalCost + suggestion.usage.totalCost).toFixed(6))
        return acc
      },
      { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 }
    )

    const metadata: Record<string, unknown> = {}
    if (blendedSuggestion) {
      metadata.blended_used = selectedModel === 'blend'
    }
    const trimmedInstructions = blendInstructions.trim()
    if (trimmedInstructions.length > 0) {
      metadata.blend_instructions = trimmedInstructions
    }

    const payload: Record<string, unknown> = {
      project_id: projectId ?? null,
      document_id: documentId ?? null,
      prompt: lastPrompt,
      selected_model: selectedModel,
      selection_reason: feedbackNote.trim() || undefined,
      inserted_text: usedContent ?? undefined,
      suggestions: baseSuggestions,
      usage_summary: usageSummary,
    }

    if (Object.keys(metadata).length > 0) {
      payload.metadata = metadata
    }

    setFeedbackSubmitting(true)

    try {
      const response = await fetch('/api/ai/ensemble/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to store feedback')
      }

      setFeedbackSubmitted(true)
      toast({ title: 'Thanks!', description: 'Your ensemble feedback was saved.' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Feedback not saved',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const handleBlend = async () => {
    if (suggestions.length < 2 || !lastPrompt) {
      toast({
        title: 'Need more material',
        description: 'Run the ensemble (with at least two drafts) before blending.',
        variant: 'destructive',
      })
      return
    }

    const baseSuggestions = suggestions.filter(isBaseSuggestion)

    setBlendLoading(true)
    setCopiedKey(null)

    try {
      const response = await fetch('/api/ai/ensemble/blend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId ?? null,
          document_id: documentId ?? null,
          prompt: lastPrompt,
          context: currentContext.slice(-4000),
          suggestions: baseSuggestions.map((suggestion) => ({
            model: suggestion.model,
            content: suggestion.content,
          })),
          additional_instructions: blendInstructions.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to blend suggestions')
      }

      const payload = (await response.json()) as { suggestion: Suggestion }
      setBlendedSuggestion(payload.suggestion)
      handleSelectModel('blend')
      toast({
        title: 'Blended draft ready',
        description: 'Review the combined suggestion below.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Blend failed',
        description: error instanceof Error ? error.message : 'Try adjusting the instructions.',
        variant: 'destructive',
      })
    } finally {
      setBlendLoading(false)
    }
  }

  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Multi-model ensemble
        </CardTitle>
        <CardDescription>
          Generate side-by-side drafts from Claude, GPT-5, and DeepSeek, then vote on the best or blend them into one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ensemble-prompt">Prompt</Label>
          <Textarea
            id="ensemble-prompt"
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Explain what each model should attempt..."
          />
          <p className="text-xs text-muted-foreground">
            The last 4,000 characters of your document will be shared as context.
          </p>
        </div>

        <Button onClick={runEnsemble} disabled={loading || !prompt.trim()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gathering models...
            </>
          ) : (
            'Run ensemble'
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {suggestions.map((suggestion, index) => {
              const key = `base-${index}`
              const isSelected = selectedModel === suggestion.model
              return (
                <div
                  key={`${suggestion.model}-${index}`}
                  className={cn(
                    'flex h-full flex-col gap-3 rounded-xl border bg-card/60 p-4 shadow-sm transition',
                    isSelected && 'border-primary shadow-glow'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{MODEL_LABELS[suggestion.model]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ${suggestion.usage.totalCost.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto rounded-lg border bg-background/80 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{suggestion.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleSelectModel(suggestion.model)}
                      className="flex-1"
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      {isSelected ? 'Selected' : 'Pick best'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copySuggestion(key, suggestion)}
                    >
                      {copiedKey === key ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => insertSuggestion(suggestion)}>
                      Use draft
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tokens: {suggestion.usage.inputTokens + suggestion.usage.outputTokens}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {blendedSuggestion && (
          <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{MODEL_LABELS[blendedSuggestion.model]}</Badge>
                <span className="text-xs text-muted-foreground">
                  ${blendedSuggestion.usage.totalCost.toFixed(4)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tokens: {blendedSuggestion.usage.inputTokens + blendedSuggestion.usage.outputTokens}
              </p>
            </div>
            <div className="rounded-lg border bg-background/80 p-3 text-sm">
              <p className="whitespace-pre-wrap">{blendedSuggestion.content}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedModel === 'blend' ? 'default' : 'outline'}
                onClick={() => handleSelectModel('blend')}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                {selectedModel === 'blend' ? 'Selected' : 'Pick best'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copySuggestion('blend', blendedSuggestion)}
              >
                {copiedKey === 'blend' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </>
                )}
              </Button>
              <Button size="sm" onClick={() => insertSuggestion(blendedSuggestion)}>
                Use blended draft
              </Button>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-6 rounded-xl border border-border/60 bg-card/70 p-4">
            <div className="space-y-2">
              <Label htmlFor="ensemble-feedback">Tell us why it worked</Label>
              <Textarea
                id="ensemble-feedback"
                rows={3}
                value={feedbackNote}
                onChange={(event) => setFeedbackNote(event.target.value)}
                placeholder="Optional notes about voice, pacing, or why you chose this draft."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={feedbackSubmitting || feedbackSubmitted || !selectedModel}
                >
                  {feedbackSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : feedbackSubmitted ? (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Feedback saved
                    </>
                  ) : (
                    'Submit vote'
                  )}
                </Button>
                {feedbackSubmitted && (
                  <Badge variant="secondary">Thanks for the signal!</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ensemble-blend">Blend instructions (optional)</Label>
              <Textarea
                id="ensemble-blend"
                rows={2}
                value={blendInstructions}
                onChange={(event) => setBlendInstructions(event.target.value)}
                placeholder="e.g. Keep Claude's tone but borrow DeepSeek's ending twist."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleBlend}
                  disabled={blendLoading || suggestions.length < 2}
                >
                  {blendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Blending...
                    </>
                  ) : (
                    <>
                      <GitMerge className="mr-2 h-4 w-4" /> Blend suggestions
                    </>
                  )}
                </Button>
                {blendedSuggestion && (
                  <Button onClick={() => insertSuggestion(blendedSuggestion)}>
                    Use blended draft
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
