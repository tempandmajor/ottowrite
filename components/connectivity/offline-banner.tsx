'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WifiOff, RefreshCw, X, AlertTriangle, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConnectionStatus } from '@/stores/connectivity-store'

export type OfflineBannerProps = {
  status: ConnectionStatus
  isRetrying?: boolean
  lastChecked?: Date | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function OfflineBanner({
  status,
  isRetrying = false,
  lastChecked = null,
  onRetry,
  onDismiss,
  className,
}: OfflineBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Auto-show when offline, auto-hide when online
  useEffect(() => {
    if (status === 'offline' || status === 'degraded') {
      setIsVisible(true)
    } else if (status === 'online') {
      setIsVisible(false)
    }
  }, [status])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible || status === 'online') {
    return null
  }

  const bannerVariants = {
    offline: {
      icon: WifiOff,
      title: 'No internet connection',
      description: 'You are currently offline. Your work will be saved locally and synced when connection is restored.',
      className: 'bg-red-50 border-red-200 text-red-900',
      badgeVariant: 'destructive' as const,
      badgeText: 'Offline',
    },
    degraded: {
      icon: AlertTriangle,
      title: 'Limited connectivity',
      description: 'Connection to the server is experiencing issues. Some features may not work properly.',
      className: 'bg-amber-50 border-amber-200 text-amber-900',
      badgeVariant: 'outline' as const,
      badgeText: 'Degraded',
    },
    checking: {
      icon: Wifi,
      title: 'Checking connection',
      description: 'Verifying connection status...',
      className: 'bg-blue-50 border-blue-200 text-blue-900',
      badgeVariant: 'secondary' as const,
      badgeText: 'Checking',
    },
  }

  const variant = status === 'offline' ? bannerVariants.offline :
                 status === 'degraded' ? bannerVariants.degraded :
                 bannerVariants.checking

  const Icon = variant.icon

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300',
        className
      )}
    >
      <Alert className={cn('rounded-none border-x-0 border-t-0', variant.className)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Icon className="h-5 w-5 shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{variant.title}</h4>
                <Badge variant={variant.badgeVariant} className="text-xs">
                  {variant.badgeText}
                </Badge>
              </div>
              <AlertDescription className="text-xs">
                {variant.description}
                {lastChecked && (
                  <span className="ml-2 text-muted-foreground">
                    Last checked: {new Date(lastChecked).toLocaleTimeString()}
                  </span>
                )}
              </AlertDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className="h-8"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRetrying && 'animate-spin')} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}

            {onDismiss && status !== 'offline' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
        </div>
      </Alert>
    </div>
  )
}
