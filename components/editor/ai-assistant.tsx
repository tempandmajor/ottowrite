'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, Sparkles, Copy, Check, Plus, Pencil, Trash2, FolderKanban } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AIModel } from '@/lib/ai/service'
import type { AICommand } from '@/lib/ai/intent'
import { trackEvent } from '@/lib/telemetry/track'

type CommandOption = 'auto' | AICommand
type ModelOption = 'auto' | AIModel
type PromptIntent = AICommand

type PromptTemplate = {
  id: string
  name: string
  command: PromptIntent
  content: string
}

type TemplateGroup = {
  label: string
  command: PromptIntent
  templates: PromptTemplate[]
}

const generateTemplateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

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
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    command: 'continue' as PromptIntent,
    content: '',
  })
  const { toast } = useToast()

  const defaultTemplateGroups: TemplateGroup[] = useMemo(() => {
    const defaults: Record<PromptIntent, PromptTemplate[]> = {
      continue: [
        {
          id: 'default-continue-1',
          name: 'Continue scene',
          command: 'continue',
          content: 'Continue the current scene, keeping the same voice and pacing. Introduce the next beat organically.',
        },
        {
          id: 'default-continue-2',
          name: 'Describe next moment',
          command: 'continue',
          content: 'Write the next paragraph focusing on sensory details and character reactions.',
        },
      ],
      rewrite: [
        {
          id: 'default-rewrite-1',
          name: 'Polish prose',
          command: 'rewrite',
          content: 'Rewrite the selected passage to be tighter and more vivid, preserving core meaning.',
        },
        {
          id: 'default-rewrite-2',
          name: 'Show emotion',
          command: 'rewrite',
          content: 'Rewrite to show emotion through body language and environment rather than stating it directly.',
        },
      ],
      shorten: [
        {
          id: 'default-shorten-1',
          name: 'Tighten paragraph',
          command: 'shorten',
          content: 'Shorten the selection by 30% while keeping key plot beats and voice intact.',
        },
      ],
      expand: [
        {
          id: 'default-expand-1',
          name: 'Add sensory detail',
          command: 'expand',
          content: 'Expand this section by adding sensory details (sight, sound, touch) and grounding in the setting.',
        },
      ],
      tone_shift: [
        {
          id: 'default-tone-1',
          name: 'Increase tension',
          command: 'tone_shift',
          content: 'Rewrite the passage to increase tension and urgency while keeping the same plot beats.',
        },
      ],
      summarize: [
        {
          id: 'default-summarize-1',
          name: 'Chapter summary',
          command: 'summarize',
          content: 'Summarize the selected text in 3 bullet points focusing on key plot changes and emotions.',
        },
      ],
      brainstorm: [
        {
          id: 'default-brainstorm-1',
          name: 'What if variations',
          command: 'brainstorm',
          content: 'Provide three “what if” variations that push the scene in unexpected directions.',
        },
      ],
      notes: [
        {
          id: 'default-notes-1',
          name: 'Feedback',
          command: 'notes',
          content: 'Give concise editorial feedback highlighting strengths and opportunities for improvement.',
        },
      ],
    }

    return (Object.keys(defaults) as PromptIntent[]).map((intent) => ({
      label: intent.replace('_', ' '),
      command: intent,
      templates: defaults[intent],
    }))
  }, [])

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
      trackEvent('editor.ai.command_submit', {
        command: command === 'auto' ? 'auto' : command,
        manualOverride: command !== 'auto',
        modelOverride: selectedModel !== 'auto',
      })
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
      trackEvent('editor.ai.command_resolved', {
        requestedCommand: command === 'auto' ? 'auto' : command,
        resolvedCommand: typeof data.command === 'string' ? data.command : command,
        model: data.model ?? selectedModel,
      })
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

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/ai/templates', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to load templates')
      }
      const data = await res.json()
      if (Array.isArray(data.templates)) {
        setCustomTemplates(
          data.templates.filter((item: any): item is PromptTemplate =>
            typeof item?.id === 'string' &&
            typeof item?.name === 'string' &&
            typeof item?.command === 'string' &&
            typeof item?.content === 'string'
          )
        )
      } else {
        setCustomTemplates([])
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Warning',
        description: 'Could not load custom templates. Defaults will still be available.',
      })
    } finally {
      setLoadingTemplates(false)
    }
  }, [toast])

  const saveTemplates = async (templates: PromptTemplate[]) => {
    try {
      const res = await fetch('/api/ai/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      })
      if (!res.ok) {
        throw new Error('Failed to save templates')
      }
      setCustomTemplates(templates)
      toast({ title: 'Templates saved' })
      trackEvent('editor.ai.template_save', {
        total: templates.length,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Unable to save templates right now. Please try again later.',
        variant: 'destructive',
      })
    }
  }

  const handleTemplateSelect = (template: PromptTemplate) => {
    setPrompt(template.content)
    setCommand(template.command)
    trackEvent('editor.ai.template_use', {
      templateId: template.id,
      command: template.command,
      source: template.id.startsWith('default-') ? 'default' : 'custom',
    })
  }

  const handleTemplateDialogClose = () => {
    setTemplateDialogOpen(false)
    setEditingTemplate(null)
    setTemplateForm({ name: '', command: 'continue', content: '' })
  }

  const handleTemplateSubmit = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast({
        title: 'Template incomplete',
        description: 'Please provide both a name and prompt text.',
        variant: 'destructive',
      })
      return
    }

    const template: PromptTemplate = {
      id: editingTemplate?.id ?? generateTemplateId(),
      name: templateForm.name.trim(),
      command: templateForm.command,
      content: templateForm.content.trim(),
    }

    const nextTemplates = editingTemplate
      ? customTemplates.map((item) => (item.id === editingTemplate.id ? template : item))
      : [...customTemplates, template]

    await saveTemplates(nextTemplates)
    handleTemplateDialogClose()
  }

  const handleTemplateDelete = async (templateId: string) => {
    const nextTemplates = customTemplates.filter((item) => item.id !== templateId)
    await saveTemplates(nextTemplates)
  }

  const openCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ name: '', command: 'continue', content: '' })
    setTemplateDialogOpen(true)
  }

  const openEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({ name: template.name, command: template.command, content: template.content })
    setTemplateDialogOpen(true)
  }

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

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

  const templateGroups = useMemo<TemplateGroup[]>(() => {
    const grouped = [...defaultTemplateGroups]
    if (customTemplates.length > 0) {
      const customByCommand: Record<PromptIntent, PromptTemplate[]> = customTemplates.reduce(
        (acc, template) => {
          if (!acc[template.command]) {
            acc[template.command] = []
          }
          acc[template.command].push(template)
          return acc
        },
        {} as Record<PromptIntent, PromptTemplate[]>
      )

      Object.entries(customByCommand).forEach(([commandKey, templates]) => {
        const existing = grouped.find((group) => group.command === commandKey)
        if (existing) {
          existing.templates = [...existing.templates, ...templates]
        } else {
          grouped.push({
            label: commandKey.replace('_', ' '),
            command: commandKey as PromptIntent,
            templates,
          })
        }
      })
    }

    return grouped.sort((a, b) => a.label.localeCompare(b.label))
  }, [customTemplates, defaultTemplateGroups])

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
              <SelectItem value="deepseek-chat">
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
          <div className="flex items-center gap-2">
            <Select
              disabled={loadingTemplates}
              onValueChange={(value) => {
                const [type, templateId] = value.split(':')
                const group = templateGroups.find((g) => g.command === (type as PromptIntent))
                const template = group?.templates.find((item) => item.id === templateId)
                if (template) {
                  handleTemplateSelect(template)
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={loadingTemplates ? 'Loading templates…' : 'Choose a template…'} />
              </SelectTrigger>
              <SelectContent>
                {templateGroups.map((group) => (
                  <div key={group.command} className="space-y-1">
                    <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    {group.templates.map((template) => (
                      <SelectItem key={template.id} value={`${group.command}:${template.id}`}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" onClick={openCreateTemplate}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">Manage templates</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Templates are grouped by intent. Choose one to pre-fill the prompt and set the command.
          </p>
        </div>

        {customTemplates.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FolderKanban className="h-4 w-4" /> Your templates
            </Label>
            <div className="grid gap-2">
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2"
                >
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{template.name}</span>
                      <Badge variant="secondary" className="capitalize">
                        {template.command.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleTemplateSelect(template)}>
                      Use
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEditTemplate(template)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit template</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Need reusable prompts? Create custom templates to save your favorite instructions.
        </p>
      </CardFooter>

      <Dialog open={templateDialogOpen} onOpenChange={(open) => (open ? setTemplateDialogOpen(true) : handleTemplateDialogClose())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit template' : 'New template'}</DialogTitle>
            <DialogDescription>Store reusable prompts grouped by command. Templates sync to your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-command">Command</Label>
              <Select
                value={templateForm.command}
                onValueChange={(value) => setTemplateForm((prev) => ({ ...prev, command: value as PromptIntent }))}
              >
                <SelectTrigger id="template-command">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCommands
                    .filter((item) => item.value !== 'auto')
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value as PromptIntent}>
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-content">Prompt</Label>
              <Textarea
                id="template-content"
                rows={5}
                value={templateForm.content}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, content: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {editingTemplate && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleTemplateDelete(editingTemplate.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete template
              </Button>
            )}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button type="button" variant="outline" onClick={handleTemplateDialogClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleTemplateSubmit}>
                {editingTemplate ? 'Save changes' : 'Create template'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
