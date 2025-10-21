'use client'

import { Button } from '@/components/ui/button'
import {
  LayoutPanelLeft,
  Users,
  BookOpenText,
  Sparkles,
  Keyboard,
  ArrowRight
} from 'lucide-react'

interface TourStepProps {
  onComplete: () => void
  onSkip: () => void
}

const features = [
  {
    icon: LayoutPanelLeft,
    title: 'Dashboard Overview',
    description: 'Track your projects, documents, and writing progress all in one place',
  },
  {
    icon: Users,
    title: 'Character Management',
    description: 'Build rich character profiles with relationship maps and arc tracking',
  },
  {
    icon: BookOpenText,
    title: 'Outline & Beat Sheets',
    description: 'Plan your story structure with proven templates and AI assistance',
  },
  {
    icon: Sparkles,
    title: 'AI Writing Assistant',
    description: 'Generate ideas, enhance prose, and get unstuck with AI suggestions',
  },
  {
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    description: 'Speed up your workflow with Cmd+K command palette and shortcuts',
  },
]

export function TourStep({ onComplete, onSkip }: TourStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Quick Tour</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Here&apos;s a quick overview of Ottowrite&apos;s key features to help you get started.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border bg-card/70 p-6 space-y-3"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-secondary p-2.5 shrink-0">
                <Icon className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
            <Keyboard className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-lg">Pro Tip: Use Keyboard Shortcuts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Press <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">Cmd+K</kbd> (or <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">Ctrl+K</kbd> on Windows) to open the command palette from anywhere and quickly navigate to projects, documents, or features.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          size="lg"
          onClick={onComplete}
          className="group"
        >
          Start Writing
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      <div className="text-center">
        <Button variant="ghost" onClick={onSkip}>
          Skip tour
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        You can access help anytime from the navigation menu
      </div>
    </div>
  )
}
