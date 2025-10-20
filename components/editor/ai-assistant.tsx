'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AIModel } from '@/lib/ai/service'
import type { AICommand } from '@/lib/ai/intent'

type CommandOption = 'auto' | AICommand
type ModelOption = 'auto' | AIModel

type RoutingDecision = {
  model: AIModel
  intent: {
    command: AICommand
    intent: string
    recommendedModel: AIModel
    confidence: number
    rationale: string
  }
  confidence: number
  rationale: string[]
  alternatives: Array<{ model: AIModel; rationale: string }>
  allowManualOverride: boolean
}

type ContextPreviewPayload = {
  project: {
    projectId: string
    title: string
    genre?: string
    pov?: string
    tone?: string
    setting?: string
  } | null
  topCharacters: Array<{
    id: string
    name: string
    summary: string
    traits?: string[]
    tags?: string[]
  }>
  topLocations: Array<{
    id: string
    name: string
    summary: string
    traits?: string[]
    tags?: string[]
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    summary: string
    timestamp: string
    importance: 'major' | 'minor'
    location?: string
  }>
  recentExcerpts: Array<{
    id: string
    label: string
    content: string
    source: string
    createdAt: string
  }>
}

interface AIAssistantProps {
  documentId: string
  currentContent: string
  onInsertText: (content: string) => void
  getSelection?: () => string
}

export function AIAssistant({ documentId, currentContent, onInsertText, getSelection }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState<ModelOption>('auto')
  const [activeModel, setActiveModel] = useState<AIModel | null>(null)
  const [command, setCommand] = useState<CommandOption>('auto')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [copied, setCopied] = useState(false)
  const [routing, setRouting] = useState<RoutingDecision | null>(null)
  const [contextWarnings, setContextWarnings] = useState<string[]>([])
  const [contextTokens, setContextTokens] = useState<{
    explicit: number
    generated: number
    selection: number
  } | null>(null)
  const [contextPreview, setContextPreview] = useState<ContextPreviewPayload | null>(null)
  const { toast } = useToast()

  const manualOverride = useMemo(() => selectedModel !== 'auto', [selectedModel])
  const tokenSummary = useMemo(() => {
    if (!contextTokens) return null
    const formatter = new Intl.NumberFormat()
    return `explicit ${formatter.format(contextTokens.explicit)} · selection ${formatter.format(
      contextTokens.selection
    )} · generated ${formatter.format(contextTokens.generated)}`
  }, [contextTokens])

  const generateAI = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setResponse('')
    setRouting(null)
    setContextWarnings([])
    setContextTokens(null)
    setActiveModel(null)
    setContextPreview(null)

    try {
      const selection = getSelection?.() ?? ''
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel === 'auto' ? undefined : selectedModel,
          prompt,
          context: currentContent.slice(-5000),
          maxTokens: 2000,
          documentId,
          command: command === 'auto' ? undefined : command,
          selection: selection.length > 0 ? selection : undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate AI response')
      }

      const data = await res.json()
      setResponse(data.content)
      if (typeof data.model === 'string') {
        setActiveModel(data.model as AIModel)
      }
      if (typeof data.command === 'string') {
        setCommand(data.command as CommandOption)
      }
      setRouting(data.routing ? (data.routing as RoutingDecision) : null)
      setContextWarnings(Array.isArray(data.contextWarnings) ? data.contextWarnings : [])
      setContextTokens(
        data.contextTokens
          ? {
              explicit: Number(data.contextTokens.explicit ?? 0),
              generated: Number(data.contextTokens.generated ?? 0),
              selection: Number(data.contextTokens.selection ?? 0),
            }
          : null
      )
      setContextPreview(data.contextPreview ?? null)

      toast({
        title: 'Success',
        description: `Generated (${data.command ?? command}) with ${data.model} (Cost: $${data.usage.totalCost.toFixed(4)})`,
      })
    } catch (error) {
      console.error('AI generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate AI response',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: 'Copied',
      description: 'Response copied to clipboard',
    })
  }

  const insertIntoEditor = () => {
    onInsertText(response)
    toast({
      title: 'Inserted',
      description: 'AI response inserted into editor',
    })
  }

  const quickPrompts: Array<{ label: string; value: string; command: CommandOption }> = [
    { label: 'Continue this scene', value: 'Continue writing this scene in the same style and tone.', command: 'continue' },
    { label: 'Add dialogue', value: 'Add natural dialogue between the characters in this scene.', command: 'brainstorm' },
    { label: 'Describe setting', value: 'Add vivid sensory details to describe the setting.', command: 'expand' },
    { label: 'Show emotion', value: "Rewrite this to show the character's emotions through actions and body language instead of telling.", command: 'rewrite' },
    { label: 'Increase tension', value: 'Rewrite this scene to increase tension and suspense.', command: 'tone_shift' },
  ]

  const availableCommands: Array<{ value: CommandOption; label: string }> = [
    { value: 'auto', label: 'Auto detect' },
    { value: 'continue', label: 'Continue' },
    { value: 'rewrite', label: 'Rewrite / polish' },
    { value: 'shorten', label: 'Shorten' },
    { value: 'expand', label: 'Expand' },
    { value: 'tone_shift', label: 'Tone shift' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'brainstorm', label: 'Brainstorm ideas' },
    { value: 'notes', label: 'Feedback / notes' },
  ]

  const handleQuickPromptSelect = (value: string) => {
    const selected = quickPrompts.find((item) => item.value === value)
    setPrompt(value)
    setCommand(selected?.command ?? 'auto')
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="model">AI Model</Label>
          <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as ModelOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto (Let Ottowrite choose)
              </SelectItem>
              <SelectItem value="claude-sonnet-4.5">
                Claude Sonnet 4.5 (Creative)
              </SelectItem>
              <SelectItem value="gpt-5">
                GPT-5 (Analytical)
              </SelectItem>
              <SelectItem value="deepseek-v3">
                DeepSeek V3 (Cost-effective)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {manualOverride
              ? `Manual override enabled — requests will always use ${selectedModel.toUpperCase()}.`
              : `Automatic routing picks the best model based on prompt, context, and your plan.${
                  activeModel ? ` Last run used ${activeModel}.` : ''
                }`}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick-prompts">Quick Prompts</Label>
          <Select onValueChange={handleQuickPromptSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a quick prompt..." />
            </SelectTrigger>
            <SelectContent>
              {quickPrompts.map((p) => (
                <SelectItem key={p.label} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="command">Command</Label>
          <Select value={command} onValueChange={(value) => setCommand(value as CommandOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCommands.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {routing && (
          <div className="rounded-lg border border-dashed border-muted bg-muted/40 p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Routing decision</p>
                  <p className="text-xs text-muted-foreground">
                    Intent: {routing.intent.command} · Recommended {routing.model}{' '}
                    ({Math.round(routing.confidence * 100)}% confidence)
                  </p>
                </div>
                <Badge variant={manualOverride ? 'secondary' : 'outline'}>
                  {manualOverride ? `Manual: ${selectedModel.toUpperCase()}` : `Auto: ${routing.model}`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Intent rationale: {routing.intent.rationale}</p>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {routing.rationale.map((reason, index) => (
                <li key={index} className="flex gap-2">
                  <span>•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {routing.allowManualOverride && routing.alternatives.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Prefer a different model? You can override below before re-running.
                </p>
                <div className="flex flex-wrap gap-2">
                  {routing.alternatives.map((alternative) => (
                    <Button
                      key={alternative.model}
                      type="button"
                      size="sm"
                      variant={selectedModel === alternative.model ? 'default' : 'outline'}
                      onClick={() => setSelectedModel(alternative.model as ModelOption)}
                    >
                      {alternative.model}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(contextWarnings.length > 0 || contextTokens || contextPreview) && (
          <div className="rounded-lg border border-muted/60 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Context prep</span>
              {tokenSummary && <span>{tokenSummary}</span>}
            </div>
            {contextWarnings.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {contextWarnings.map((warning, index) => (
                  <li key={index} className="flex gap-2">
                    <span>•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            )}
            {contextPreview && (
              <details className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">
                  View context preview
                </summary>
                <div className="mt-2 space-y-2">
                  {contextPreview.project && (
                    <div>
                      <p className="font-semibold text-foreground">{contextPreview.project.title}</p>
                      <p className="text-muted-foreground">
                        {[
                          contextPreview.project.genre,
                          contextPreview.project.tone,
                          contextPreview.project.setting,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  )}
                  {contextPreview.topCharacters.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground">Key characters</p>
                      <ul className="mt-1 space-y-1">
                        {contextPreview.topCharacters.map((char) => (
                          <li key={char.id}>
                            <span className="font-medium text-foreground">{char.name}</span>
                            <span className="text-muted-foreground"> — {char.summary}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {contextPreview.topLocations.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground">Locations</p>
                      <ul className="mt-1 space-y-1">
                        {contextPreview.topLocations.map((loc) => (
                          <li key={loc.id}>
                            <span className="font-medium text-foreground">{loc.name}</span>
                            <span className="text-muted-foreground"> — {loc.summary}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {contextPreview.upcomingEvents.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground">Upcoming events</p>
                      <ul className="mt-1 space-y-1">
                        {contextPreview.upcomingEvents.map((event) => (
                          <li key={event.id}>
                            <span className="font-medium text-foreground">{event.title}</span>
                            <span className="text-muted-foreground">
                              {' '}
                              — {event.summary}
                              {event.location ? ` @ ${event.location}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {contextPreview.recentExcerpts.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground">Recent excerpts</p>
                      <ul className="mt-1 space-y-1">
                        {contextPreview.recentExcerpts.map((excerpt) => (
                          <li key={excerpt.id}>
                            <span className="font-medium text-foreground">{excerpt.label}</span>
                            <span className="text-muted-foreground"> — {excerpt.content}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="prompt">Your Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="Ask the AI to help with your writing..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={generateAI} disabled={loading || !prompt.trim()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>

        {response && (
          <div className="space-y-2 flex-1 flex flex-col">
            <Label>AI Response</Label>
            <div className="flex-1 border rounded-lg p-4 bg-muted/30 overflow-auto">
              <p className="whitespace-pre-wrap text-sm">{response}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="flex-1">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button onClick={insertIntoEditor} className="flex-1">
                Insert into Editor
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
