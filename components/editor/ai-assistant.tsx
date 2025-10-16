'use client'

import { useState } from 'react'
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
import { Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AIModel } from '@/lib/ai/service'

interface AIAssistantProps {
  documentId: string
  currentContent: string
  onInsertText: (text: string) => void
}

export function AIAssistant({ documentId, currentContent, onInsertText }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-sonnet-4.5')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

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

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          context: currentContent.substring(0, 5000), // Send last 5000 chars as context
          maxTokens: 2000,
          documentId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate AI response')
      }

      const data = await res.json()
      setResponse(data.content)

      toast({
        title: 'Success',
        description: `Generated with ${data.model} (Cost: $${data.usage.totalCost.toFixed(4)})`,
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

  const quickPrompts = [
    { label: 'Continue this scene', value: 'Continue writing this scene in the same style and tone.' },
    { label: 'Add dialogue', value: 'Add natural dialogue between the characters in this scene.' },
    { label: 'Describe setting', value: 'Add vivid sensory details to describe the setting.' },
    { label: 'Show emotion', value: 'Rewrite this to show the character\'s emotions through actions and body language instead of telling.' },
    { label: 'Increase tension', value: 'Rewrite this scene to increase tension and suspense.' },
  ]

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
          <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as AIModel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick-prompts">Quick Prompts</Label>
          <Select onValueChange={(value) => setPrompt(value)}>
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
