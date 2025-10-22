'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { generateSystemDesign } from '@/lib/ai/system-designer'
import { Loader2 } from 'lucide-react'

export type SystemDesign = {
  rules: string
  costs: string
  limitations: string
  failureModes: string
  applications: string
  conflicts: string
  tags: string[]
}

type SystemDesignerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSave: (design: SystemDesign) => void
}

export function SystemDesigner({ open, onOpenChange, projectId, onSave }: SystemDesignerProps) {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState('')
  const [designType, setDesignType] = useState<'magic' | 'technology'>('magic')
  const [existingNotes, setExistingNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast({
        title: 'Add more detail',
        description: 'Give the assistant more context so it can produce a meaningful system.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const design = await generateSystemDesign({
        projectId,
        type: designType,
        prompt,
        existingNotes,
      })
      onSave(design)
      toast({
        title: 'System drafted',
        description: 'Review the generated rules before adding them to your world bible.',
      })
      onOpenChange(false)
      setPrompt('')
      setExistingNotes('')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Please try again with a different prompt.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Design a magic or tech system</DialogTitle>
          <DialogDescription>
            Give the assistant a description of the system&apos;s flavor, intended role, and constraints.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="system-type">System type</Label>
            <Input
              id="system-type"
              value={designType}
              onChange={(event) => setDesignType(event.target.value === 'technology' ? 'technology' : 'magic')}
            />
            <p className="text-xs text-muted-foreground">
              Enter either &quot;magic&quot; or &quot;technology&quot; to guide the assistant.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Prompt</Label>
            <Textarea
              id="system-prompt"
              rows={5}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the doctrine, power source, intended tone, or key themes..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="system-notes">Existing notes (optional)</Label>
            <Textarea
              id="system-notes"
              rows={3}
              value={existingNotes}
              onChange={(event) => setExistingNotes(event.target.value)}
              placeholder="Paste any partial systems or constraints you want respected."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Designer
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
              </>
            ) : (
              'Generate Magic System'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
