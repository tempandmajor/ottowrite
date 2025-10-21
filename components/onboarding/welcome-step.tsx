'use client'

import { Sparkles, PenTool, Compass } from 'lucide-react'

export function WelcomeStep() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex rounded-full bg-primary/10 p-4">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-3xl font-semibold">Welcome to Ottowrite!</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your AI-powered writing companion for creating unforgettable stories. Let&apos;s get you set up in just a few steps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
        <div className="rounded-2xl border bg-card/70 p-6 text-center space-y-3">
          <div className="inline-flex rounded-full bg-secondary p-3">
            <Sparkles className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="font-semibold">AI Brainstorming</h3>
          <p className="text-sm text-muted-foreground">
            Generate characters, scenes, and plot ideas tailored to your genre
          </p>
        </div>

        <div className="rounded-2xl border bg-card/70 p-6 text-center space-y-3">
          <div className="inline-flex rounded-full bg-secondary p-3">
            <PenTool className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="font-semibold">Structured Editing</h3>
          <p className="text-sm text-muted-foreground">
            Organize with beat sheets, outlines, and character arcs
          </p>
        </div>

        <div className="rounded-2xl border bg-card/70 p-6 text-center space-y-3">
          <div className="inline-flex rounded-full bg-secondary p-3">
            <Compass className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="font-semibold">Story Guidance</h3>
          <p className="text-sm text-muted-foreground">
            Detect plot holes and track narrative threads
          </p>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        This setup takes less than 2 minutes
      </div>
    </div>
  )
}
