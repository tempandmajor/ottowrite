'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Circle,
  PenSquare,
  Users,
  FileText,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ChecklistItem {
  id: keyof ChecklistProgress
  title: string
  description: string
  icon: typeof CheckCircle2
  completed: boolean
  action?: {
    label: string
    href: string
  }
}

interface ChecklistProgress {
  created_first_project: boolean
  added_first_character: boolean
  wrote_first_100_words: boolean
  used_ai_assistant: boolean
}

interface GettingStartedChecklistProps {
  initialProgress?: ChecklistProgress
}

export function GettingStartedChecklist({ initialProgress }: GettingStartedChecklistProps) {
  const [progress, setProgress] = useState<ChecklistProgress>(
    initialProgress || {
      created_first_project: false,
      added_first_character: false,
      wrote_first_100_words: false,
      used_ai_assistant: false,
    }
  )
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem('checklist-dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }

    // Load progress from database
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_checklist')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          const message = (error.message ?? '').toLowerCase()
          if (
            error.code === 'PGRST116' ||
            message.includes('json object requested') ||
            message.includes('has_completed_onboarding') ||
            message.includes('onboarding_checklist')
          ) {
            console.warn('Checklist progress unavailable; using local defaults.')
            return
          }
          throw error
        }

        if (profile?.onboarding_checklist) {
          setProgress(profile.onboarding_checklist as ChecklistProgress)
        }
      }
    } catch (error) {
      console.error('Error loading checklist progress:', error)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('checklist-dismissed', 'true')
  }

  const handleRestore = () => {
    setIsDismissed(false)
    localStorage.removeItem('checklist-dismissed')
    setIsExpanded(true)
  }

  const items: ChecklistItem[] = [
    {
      id: 'created_first_project',
      title: 'Create your first project',
      description: 'Start a novel, screenplay, or other writing project',
      icon: PenSquare,
      completed: progress.created_first_project,
      action: {
        label: 'Create Project',
        href: '/dashboard/projects?new=true',
      },
    },
    {
      id: 'added_first_character',
      title: 'Add a character',
      description: 'Build your first character profile with arcs and relationships',
      icon: Users,
      completed: progress.added_first_character,
      action: {
        label: 'Add Character',
        href: '/dashboard/projects',
      },
    },
    {
      id: 'wrote_first_100_words',
      title: 'Write 100 words',
      description: 'Start drafting in the editor and reach 100 words',
      icon: FileText,
      completed: progress.wrote_first_100_words,
      action: {
        label: 'Start Writing',
        href: '/dashboard/documents',
      },
    },
    {
      id: 'used_ai_assistant',
      title: 'Use AI assistance',
      description: 'Try the AI writing assistant to generate ideas or enhance prose',
      icon: Sparkles,
      completed: progress.used_ai_assistant,
      action: {
        label: 'Explore AI',
        href: '/dashboard/documents',
      },
    },
  ]

  const completedCount = Object.values(progress).filter(Boolean).length
  const totalCount = items.length
  const progressPercentage = (completedCount / totalCount) * 100
  const allCompleted = completedCount === totalCount

  if (isDismissed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestore}
        className="text-xs"
      >
        Show Getting Started Checklist
      </Button>
    )
  }

  if (allCompleted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">You&apos;re all set! 🎉</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve completed all getting started tasks. Keep writing!
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss} aria-label="Dismiss checklist">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Getting Started</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            </div>
            <CardDescription>
              Complete these tasks to unlock Ottowrite&apos;s full potential
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse checklist" : "Expand checklist"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDismiss} aria-label="Close checklist">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progressPercentage} className="mt-4" />
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {items.map(({ id, title, description, icon: Icon, completed, action }) => (
            <div
              key={id}
              className={cn(
                'flex items-start gap-4 rounded-lg border p-4 transition-colors',
                completed
                  ? 'border-border/50 bg-muted/30'
                  : 'border-border bg-card hover:bg-accent/50'
              )}
            >
              <div className={cn('mt-0.5', completed && 'opacity-50')}>
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', completed && 'opacity-50')} />
                  <h4
                    className={cn(
                      'font-medium text-sm',
                      completed && 'line-through opacity-50'
                    )}
                  >
                    {title}
                  </h4>
                </div>
                <p
                  className={cn(
                    'text-sm text-muted-foreground',
                    completed && 'opacity-50'
                  )}
                >
                  {description}
                </p>
              </div>

              {!completed && action && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
