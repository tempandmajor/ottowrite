/**
 * New User Dashboard Component
 *
 * Simplified dashboard for users with 0 projects.
 * Focuses on single clear CTA to create first project.
 * Implements progressive disclosure (Miller's Law).
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TemplateDialog } from '@/components/dashboard/template-dialog'
import { Sparkles, PenSquare, BookOpen, Lightbulb } from 'lucide-react'

export function NewUserDashboard() {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <div className="max-w-2xl space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to Ottowrite
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Your AI-powered writing companion for crafting compelling stories. Let&apos;s start by creating your first project.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="h-14 px-8 text-lg font-semibold shadow-lg"
            onClick={() => setShowTemplateDialog(true)}
          >
            <PenSquare className="mr-2 h-5 w-5" />
            Create Your First Project
          </Button>
          <p className="text-sm text-muted-foreground">
            Choose from novel, screenplay, series, play, or short story
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid gap-4 pt-8 md:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="space-y-2 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Organize</h3>
              <p className="text-sm text-muted-foreground">
                Keep characters, outlines, and scenes in perfect sync
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="space-y-2 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Generate</h3>
              <p className="text-sm text-muted-foreground">
                AI-assisted writing for outlines, dialogue, and descriptions
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="space-y-2 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Refine</h3>
              <p className="text-sm text-muted-foreground">
                Track progress and polish your story with powerful tools
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <TemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} />
    </div>
  )
}
