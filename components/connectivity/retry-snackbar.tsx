'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, X, CheckCircle2, AlertCircle, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RetrySnackbarProps = {
  show: boolean
  message: string | null
  isRetrying?: boolean
  retryScheduledAt?: Date | null
  failedAttempts?: number
  maxRetries?: number
  onRetry?: () => void
  onDismiss?: () => void
  autoHideDuration?: number // ms, 0 to disable
  className?: string
}

export function RetrySnackbar({
  show,
  message,
  isRetrying = false,
  retryScheduledAt = null,
  failedAttempts = 0,
  maxRetries = 3,
  onRetry,
  onDismiss,
  autoHideDuration = 5000,
  className,
}: RetrySnackbarProps) {
  const [isVisible, setIsVisible] = useState(show)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

  // Show/hide based on prop
  useEffect(() => {
    if (show) {
      setIsVisible(true)
    } else if (autoHideDuration > 0) {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [show, autoHideDuration])

  // Auto-hide after duration
  useEffect(() => {
    if (!show || autoHideDuration === 0) {
      return
    }

    const timer = setTimeout(() => {
      onDismiss?.()
    }, autoHideDuration)

    return () => clearTimeout(timer)
  }, [show, autoHideDuration, onDismiss])

  // Countdown to next retry
  useEffect(() => {
    if (!retryScheduledAt) {
      setCountdown(null)
      setProgress(0)
      return
    }

    const updateCountdown = () => {
      const now = Date.now()
      const scheduledTime = retryScheduledAt.getTime()
      const remaining = Math.max(0, scheduledTime - now)
      const seconds = Math.ceil(remaining / 1000)

      setCountdown(seconds)

      // Calculate progress (inverse of countdown)
      const total = scheduledTime - (scheduledTime - 10000) // Assume 10s max
      const elapsed = total - remaining
      setProgress(Math.min(100, (elapsed / total) * 100))

      if (remaining <= 0) {
        setCountdown(null)
        setProgress(0)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 100)

    return () => clearInterval(interval)
  }, [retryScheduledAt])

  if (!isVisible) {
    return null
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 300)
  }

  // Determine variant based on state
  const isSuccess = message?.toLowerCase().includes('restored') || message?.toLowerCase().includes('success')
  const isError = failedAttempts >= maxRetries

  const variant = isSuccess ? 'success' :
                 isError ? 'error' :
                 isRetrying ? 'loading' :
                 'warning'

  const variantStyles = {
    success: {
      icon: CheckCircle2,
      className: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      iconColor: 'text-emerald-600',
    },
    error: {
      icon: AlertCircle,
      className: 'bg-red-50 border-red-200 text-red-900',
      iconColor: 'text-red-600',
    },
    loading: {
      icon: RefreshCw,
      className: 'bg-blue-50 border-blue-200 text-blue-900',
      iconColor: 'text-blue-600',
    },
    warning: {
      icon: Wifi,
      className: 'bg-amber-50 border-amber-200 text-amber-900',
      iconColor: 'text-amber-600',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-full max-w-md',
        'animate-in slide-in-from-bottom-4 duration-300',
        !show && 'animate-out slide-out-to-bottom-4',
        className
      )}
    >
      <Alert className={cn('shadow-lg', style.className)}>
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 mt-0.5',
              style.iconColor,
              isRetrying && 'animate-spin'
            )}
          />

          <div className="flex-1 min-w-0">
            <AlertDescription className="text-sm font-medium mb-2">
              {message || 'Connection issue detected'}
            </AlertDescription>

            {/* Retry attempts indicator */}
            {failedAttempts > 0 && !isSuccess && (
              <div className="text-xs text-muted-foreground mb-2">
                Attempt {failedAttempts} of {maxRetries}
              </div>
            )}

            {/* Countdown to next retry */}
            {countdown !== null && countdown > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  Retrying in {countdown}s...
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            )}

            {/* Action buttons */}
            {!isSuccess && (
              <div className="flex items-center gap-2 mt-3">
                {onRetry && !isRetrying && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry Now
                  </Button>
                )}
              </div>
            )}
          </div>

          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
      </Alert>
    </div>
  )
}
