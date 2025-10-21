'use client'

import { useState } from 'react'
import { TemplateDialog } from '@/components/dashboard/template-dialog'
import { Button } from '@/components/ui/button'
import { PenSquare, Sparkles } from 'lucide-react'

interface TemplateStepProps {
  projectType: string
  onTemplateSelected: () => void
  onSkip: () => void
}

export function TemplateStep({ projectType, onTemplateSelected, onSkip }: TemplateStepProps) {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  const handleTemplateSelect = () => {
    setTemplateDialogOpen(false)
    onTemplateSelected()
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Choose a template (optional)</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Start with a pre-built outline and beat sheet, or begin with a blank canvas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-border bg-card/70 p-8 space-y-4 hover:border-primary/50 hover:shadow-lg transition-all">
          <div className="inline-flex rounded-full bg-secondary p-3">
            <Sparkles className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Use a Template</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get started faster with AI-generated outlines based on proven story structures like the Hero&apos;s Journey, Three-Act Structure, or Save the Cat.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Pre-built beat sheets
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Character arc suggestions
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Genre-specific guidance
            </li>
          </ul>
          <Button
            size="lg"
            className="w-full"
            onClick={() => setTemplateDialogOpen(true)}
          >
            Browse Templates
          </Button>
        </div>

        <div className="rounded-2xl border-2 border-border bg-card/70 p-8 space-y-4 hover:border-primary/50 hover:shadow-lg transition-all">
          <div className="inline-flex rounded-full bg-secondary p-3">
            <PenSquare className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Start From Scratch</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Prefer complete creative freedom? Create a blank {projectType} project and build your story structure from the ground up.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Maximum flexibility
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No structural constraints
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Add AI assistance later
            </li>
          </ul>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={onSkip}
          >
            Create Blank Project
          </Button>
        </div>
      </div>

      <div className="text-center">
        <Button variant="ghost" onClick={onSkip}>
          I&apos;ll decide later
        </Button>
      </div>

      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open)
          if (!open) {
            // Dialog was closed, consider it as selection made
            handleTemplateSelect()
          }
        }}
      />
    </div>
  )
}
