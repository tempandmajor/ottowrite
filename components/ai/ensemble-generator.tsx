'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Copy, Check, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Suggestion = {
  model: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-v3'
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
}

const MODEL_LABELS: Record<Suggestion['model'], string> = {
  'claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'gpt-5': 'GPT-5',
  'deepseek-v3': 'DeepSeek V3',
}

export function EnsembleGenerator({ currentContext, onInsert }: EnsembleGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const { toast } = useToast()

  const runEnsemble = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt required',
        description: 'Describe what you want the models to tackle.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setSuggestions([])
    setCopiedIndex(null)

    try {
      const response = await fetch('/api/ai/ensemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
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

  const copySuggestion = async (suggestion: Suggestion, index: number) => {
    await navigator.clipboard.writeText(suggestion.content)
    setCopiedIndex(index)
    toast({ title: 'Copied', description: `${MODEL_LABELS[suggestion.model]} output copied.` })
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const insertSuggestion = (suggestion: Suggestion) => {
    onInsert(suggestion.content)
    toast({
      title: 'Inserted',
      description: `${MODEL_LABELS[suggestion.model]} output inserted into the editor.`,
    })
  }

  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Multi-model ensemble
        </CardTitle>
        <CardDescription>
          Generate side-by-side drafts from Claude, GPT-5, and DeepSeek to choose the best direction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {suggestions.map((suggestion, index) => (
              <div key={suggestion.model} className="flex h-full flex-col gap-3 rounded-xl border bg-card/60 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{MODEL_LABELS[suggestion.model]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    ${suggestion.usage.totalCost.toFixed(4)}
                  </span>
                </div>
                <div className="flex-1 overflow-auto rounded-lg border bg-background/80 p-3 text-sm">
                  <p className="whitespace-pre-wrap">{suggestion.content}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => copySuggestion(suggestion, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" /> Copy
                      </>
                    )}
                  </Button>
                  <Button className="flex-1" onClick={() => insertSuggestion(suggestion)}>
                    Use draft
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tokens: {suggestion.usage.inputTokens + suggestion.usage.outputTokens}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
