/**
 * Trial Banner Component
 *
 * Shows trial status countdown for users on trial subscriptions.
 * Displays prominently in dashboard with days remaining.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TrialBannerProps {
  trialEndsAt: string
  planName: string
  onDismiss?: () => void
  className?: string
}

export function TrialBanner({ trialEndsAt, planName, onDismiss, className }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const now = new Date()
  const endDate = new Date(trialEndsAt)
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60))

  // Don't show if trial has ended
  if (daysRemaining < 0) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Determine urgency level
  const isUrgent = daysRemaining <= 2
  const isWarning = daysRemaining <= 5

  // Format time remaining
  let timeText: string
  if (daysRemaining === 0) {
    if (hoursRemaining <= 1) {
      timeText = 'less than 1 hour'
    } else {
      timeText = `${hoursRemaining} hours`
    }
  } else if (daysRemaining === 1) {
    timeText = '1 day'
  } else {
    timeText = `${daysRemaining} days`
  }

  return (
    <div
      className={cn(
        'relative w-full border-b',
        isUrgent
          ? 'bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border-orange-200 dark:border-orange-800'
          : isWarning
          ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border-yellow-200 dark:border-yellow-800'
          : 'bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-blue-200 dark:border-blue-800',
        className
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
              isUrgent
                ? 'bg-gradient-to-br from-orange-500 to-red-500'
                : isWarning
                ? 'bg-gradient-to-br from-yellow-500 to-amber-500'
                : 'bg-gradient-to-br from-blue-500 to-purple-500'
            )}
          >
            {isUrgent ? (
              <Zap className="h-5 w-5 text-white" />
            ) : (
              <Clock className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-sm">
                {isUrgent ? 'Trial ending soon!' : `${planName} Trial`}
              </h3>
              <span className="text-xs text-muted-foreground">
                {timeText} remaining
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isUrgent
                ? `Your trial ends in ${timeText}. Subscribe now to keep your access and data.`
                : `You're currently on a free trial. Subscribe before ${endDate.toLocaleDateString()} to continue.`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/pricing">
              <Button size="sm" variant={isUrgent ? 'default' : 'outline'}>
                View Plans
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact trial badge for showing in small spaces
 */
export function TrialBadge({ trialEndsAt, className }: { trialEndsAt: string; className?: string }) {
  const now = new Date()
  const endDate = new Date(trialEndsAt)
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysRemaining < 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        daysRemaining <= 2
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {daysRemaining === 0 ? 'Trial ends today' : `${daysRemaining}d left in trial`}
    </span>
  )
}
