/**
 * Reusable Upgrade Prompt Component
 *
 * Displays upgrade CTAs throughout the app when users hit plan limits.
 * Non-intrusive but visible, can be dismissed.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Zap, Users, FileText, Sparkles, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type UpgradePromptVariant =
  | 'banner' // Horizontal banner at top of page
  | 'card'   // Card-style prompt
  | 'inline' // Inline prompt within content
  | 'badge'  // Small badge/pill

export type UpgradePromptReason =
  | 'document_limit'
  | 'project_limit'
  | 'ai_words_limit'
  | 'collaboration'
  | 'api_access'
  | 'team_seats'
  | 'generic'

export type UpgradePromptPlan = 'hobbyist' | 'professional' | 'studio'

interface UpgradePromptProps {
  reason: UpgradePromptReason
  currentPlan: string
  recommendedPlan: UpgradePromptPlan
  variant?: UpgradePromptVariant
  onDismiss?: () => void
  dismissible?: boolean
  className?: string
  compact?: boolean
}

const promptConfig: Record<UpgradePromptReason, {
  icon: React.ElementType
  title: string
  description: string
  color: string
}> = {
  document_limit: {
    icon: FileText,
    title: 'Document Limit Reached',
    description: 'Upgrade to create unlimited documents and unlock your creativity.',
    color: 'text-blue-500',
  },
  project_limit: {
    icon: FileText,
    title: 'Project Limit Reached',
    description: 'Upgrade to create unlimited projects and organize your work better.',
    color: 'text-blue-500',
  },
  ai_words_limit: {
    icon: Sparkles,
    title: 'AI Words Running Low',
    description: 'Upgrade for more AI-powered writing assistance each month.',
    color: 'text-purple-500',
  },
  collaboration: {
    icon: Users,
    title: 'Collaboration Unlocked in Studio',
    description: 'Upgrade to Studio to invite team members and collaborate in real-time.',
    color: 'text-green-500',
  },
  api_access: {
    icon: Zap,
    title: 'API Access Available',
    description: 'Upgrade to Professional or Studio for programmatic access to your content.',
    color: 'text-orange-500',
  },
  team_seats: {
    icon: Users,
    title: 'Team Seat Limit Reached',
    description: 'Upgrade to add more team members to your projects.',
    color: 'text-green-500',
  },
  generic: {
    icon: Crown,
    title: 'Upgrade Your Plan',
    description: 'Unlock more features and remove limits with a paid plan.',
    color: 'text-yellow-500',
  },
}

const planDisplayNames: Record<UpgradePromptPlan, string> = {
  hobbyist: 'Hobbyist',
  professional: 'Professional',
  studio: 'Studio',
}

export function UpgradePrompt({
  reason,
  currentPlan,
  recommendedPlan,
  variant = 'card',
  onDismiss,
  dismissible = true,
  className,
  compact = false,
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const config = promptConfig[reason]
  const Icon = config.icon
  const planName = planDisplayNames[recommendedPlan]

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const upgradeUrl = `/pricing?plan=${recommendedPlan}`

  // Badge variant - minimal UI
  if (variant === 'badge') {
    return (
      <Link href={upgradeUrl}>
        <div className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-1 text-xs font-medium text-white hover:from-purple-600 hover:to-blue-600 transition-all cursor-pointer',
          className
        )}>
          <Crown className="h-3 w-3" />
          <span>Upgrade to unlock</span>
        </div>
      </Link>
    )
  }

  // Inline variant - compact, single line
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-2',
        className
      )}>
        <Icon className={cn('h-5 w-5 flex-shrink-0', config.color)} />
        <p className="text-sm flex-1">
          {compact ? config.title : config.description}
        </p>
        <Link href={upgradeUrl}>
          <Button size="sm" className="flex-shrink-0">
            Upgrade to {planName}
          </Button>
        </Link>
        {dismissible && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  // Banner variant - full width, prominent
  if (variant === 'banner') {
    return (
      <div className={cn(
        'relative w-full border-b border-border/60 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10',
        className
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{config.title}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
            <Link href={upgradeUrl}>
              <Button className="flex-shrink-0">
                Upgrade to {planName}
              </Button>
            </Link>
            {dismissible && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Card variant (default) - standalone card
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-purple-500/5" />
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2">{config.title}</h3>
            <p className="text-muted-foreground mb-4">{config.description}</p>
            <div className="flex items-center gap-3">
              <Link href={upgradeUrl}>
                <Button>
                  Upgrade to {planName}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline">
                  View all plans
                </Button>
              </Link>
            </div>
          </div>
          {dismissible && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
