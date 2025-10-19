'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Sparkles } from 'lucide-react'

type OutlineGeneratorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectType: string
  genre: string[] | null
  onGenerated: () => void
  defaultPremise?: string
  defaultAdditionalContext?: string
  defaultFormat?: OutlineFormat
}

type OutlineFormat = 'chapter_summary' | 'scene_by_scene' | 'treatment' | 'beat_outline' | 'custom'

const formatDescriptions: Record<OutlineFormat, string> = {
  chapter_summary: 'Chapter-by-chapter breakdown with plot points and targets',
  scene_by_scene: 'Detailed scene breakdown with locations and objectives',
  treatment: 'Narrative prose outline describing the story flow',
  beat_outline: 'Story structure beats with thematic significance',
  custom: 'Flexible structure adapted to your specific needs',
}

export function OutlineGeneratorDialog({
  open,
  onOpenChange,
  projectId,
  projectType,
  genre,
  onGenerated,
  defaultPremise = '',
  defaultAdditionalContext = '',
  defaultFormat = 'chapter_summary',
}: OutlineGeneratorDialogProps) {
  const { toast } = useToast()
  const [premise, setPremise] = useState(defaultPremise)
  const [format, setFormat] = useState<OutlineFormat>(defaultFormat)
  const [additionalContext, setAdditionalContext] = useState(defaultAdditionalContext)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!premise.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a premise for your story',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/outlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          premise: premise.trim(),
          format,
          additional_context: additionalContext.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate outline')
      }

      toast({
        title: 'Success',
        description: 'Outline generated successfully',
      })

      // Reset form
      setPremise(defaultPremise)
      setAdditionalContext(defaultAdditionalContext)
      setFormat(defaultFormat)

      onGenerated()
    } catch (error) {
      console.error('Error generating outline:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate outline',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generate AI Outline
          </DialogTitle>
          <DialogDescription>
            Provide your story premise and let Claude 4.5 generate a professional outline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Outline Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as OutlineFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chapter_summary">Chapter Summary</SelectItem>
                <SelectItem value="scene_by_scene">Scene-by-Scene</SelectItem>
                <SelectItem value="treatment">Treatment</SelectItem>
                <SelectItem value="beat_outline">Beat Outline</SelectItem>
                <SelectItem value="custom">Custom Structure</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {formatDescriptions[format]}
            </p>
          </div>

          {/* Project Info Display */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Project Type:</span>
              <span className="font-medium">{projectType.replace('_', ' ')}</span>
            </div>
            {genre && genre.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Genre:</span>
                <span className="font-medium">{genre.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Premise Input */}
          <div className="space-y-2">
            <Label htmlFor="premise">
              Story Premise <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="premise"
              placeholder="Describe your story in 2-4 sentences. Include the main character, conflict, and stakes..."
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Be specific about characters, setting, conflict, and what makes your story unique
            </p>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Additional Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Any specific requirements, themes, character arcs, or plot points you want included..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Include any existing beats, character arcs, or specific story elements
            </p>
          </div>

          {/* AI Notice */}
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-900">
                  Powered by Claude 4.5 Sonnet
                </p>
                <p className="text-sm text-purple-700">
                  Generation typically takes 20-40 seconds. The AI will analyze your premise
                  and create a comprehensive outline tailored to your project type and genre.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !premise.trim()}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Outline
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
