/**
 * Upgrade Modal Component
 *
 * Blocking modal that appears when users try to exceed plan limits.
 * More prominent than UpgradePrompt for critical upgrade moments.
 */

'use client'

import { useRouter } from 'next/navigation'
import { FileText, Users, Sparkles, Crown, Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { UpgradePromptReason, UpgradePromptPlan } from './upgrade-prompt'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: UpgradePromptReason
  currentPlan: string
  recommendedPlan: UpgradePromptPlan
  limitInfo?: {
    current: number
    limit: number
  }
}

const modalConfig: Record<UpgradePromptReason, {
  icon: React.ElementType
  title: string
  description: string
  features: string[]
  color: string
}> = {
  document_limit: {
    icon: FileText,
    title: 'Document Limit Reached',
    description: 'You\'ve reached your plan\'s document limit. Upgrade to continue creating.',
    features: [
      'Unlimited documents',
      'Unlimited projects',
      'Priority support',
      'Advanced AI features',
    ],
    color: 'from-blue-500 to-blue-600',
  },
  project_limit: {
    icon: FileText,
    title: 'Project Limit Reached',
    description: 'You\'ve reached your plan\'s project limit. Upgrade to continue organizing.',
    features: [
      'Unlimited projects',
      'Unlimited documents',
      'Team collaboration',
      'Priority support',
    ],
    color: 'from-blue-500 to-blue-600',
  },
  ai_words_limit: {
    icon: Sparkles,
    title: 'AI Words Limit Reached',
    description: 'You\'ve used all your AI words for this month. Upgrade for more AI assistance.',
    features: [
      '50,000+ AI words/month',
      'Advanced AI models',
      'Faster generation',
      'Priority processing',
    ],
    color: 'from-purple-500 to-purple-600',
  },
  collaboration: {
    icon: Users,
    title: 'Collaboration Requires Studio',
    description: 'Team collaboration is available on the Studio plan. Upgrade to invite collaborators.',
    features: [
      'Up to 5 team members',
      'Real-time collaboration',
      'Role-based permissions',
      'Activity tracking',
    ],
    color: 'from-green-500 to-green-600',
  },
  api_access: {
    icon: Zap,
    title: 'API Access Requires Upgrade',
    description: 'Programmatic access is available on Professional and Studio plans.',
    features: [
      '50-1000 API calls/day',
      'REST API access',
      'Webhook support',
      'API documentation',
    ],
    color: 'from-orange-500 to-orange-600',
  },
  team_seats: {
    icon: Users,
    title: 'Team Seat Limit Reached',
    description: 'You\'ve reached your plan\'s team member limit. Upgrade for more seats.',
    features: [
      'More team members',
      'Enhanced collaboration',
      'Priority support',
      'Advanced permissions',
    ],
    color: 'from-green-500 to-green-600',
  },
  generic: {
    icon: Crown,
    title: 'Upgrade Required',
    description: 'This feature requires a paid plan. Upgrade to unlock all features.',
    features: [
      'Remove all limits',
      'Advanced features',
      'Priority support',
      'Premium content',
    ],
    color: 'from-yellow-500 to-yellow-600',
  },
}

const planDisplayNames: Record<UpgradePromptPlan, string> = {
  hobbyist: 'Hobbyist',
  professional: 'Professional',
  studio: 'Studio',
}

export function UpgradeModal({
  open,
  onOpenChange,
  reason,
  currentPlan,
  recommendedPlan,
  limitInfo,
}: UpgradeModalProps) {
  const router = useRouter()
  const config = modalConfig[reason]
  const Icon = config.icon
  const planName = planDisplayNames[recommendedPlan]

  const handleUpgrade = () => {
    router.push(`/pricing?plan=${recommendedPlan}`)
    onOpenChange(false)
  }

  const handleViewPlans = () => {
    router.push('/pricing')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${config.color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {limitInfo && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current usage:</span>
                <span className="font-semibold">
                  {limitInfo.current} / {limitInfo.limit}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Upgrade to {planName} for:</p>
            <ul className="space-y-2">
              {config.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-green-500"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full">
            Upgrade to {planName}
          </Button>
          <Button onClick={handleViewPlans} variant="outline" className="w-full">
            View all plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
