'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, WifiOff, X } from 'lucide-react'

type AutosaveErrorAlertProps = {
  error: string | null
  status: 'error' | 'offline' | 'conflict'
  onRetry: () => void
  onDismiss: () => void
}

export function AutosaveErrorAlert({ error, status, onRetry, onDismiss }: AutosaveErrorAlertProps) {
  if (!error && status !== 'offline' && status !== 'conflict') {
    return null
  }

  const getVariant = () => {
    if (status === 'conflict') return 'default'
    if (status === 'offline') return 'default'
    return 'destructive'
  }

  const getIcon = () => {
    if (status === 'offline') return <WifiOff className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  const getTitle = () => {
    if (status === 'conflict') return 'Save Conflict Detected'
    if (status === 'offline') return 'You are Offline'
    return 'Autosave Failed'
  }

  const getDescription = () => {
    if (status === 'conflict') {
      return 'This document was modified in another tab or session. Review the changes to continue.'
    }
    if (status === 'offline') {
      return 'Your changes are being saved locally. They will sync when you are back online.'
    }
    return error || 'An error occurred while saving your changes. Click retry to try again.'
  }

  return (
    <Alert variant={getVariant()} className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-2xl shadow-lg">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <AlertTitle>{getTitle()}</AlertTitle>
          <AlertDescription className="mt-1">{getDescription()}</AlertDescription>
          <div className="mt-3 flex items-center gap-2">
            {status !== 'conflict' && (
              <Button size="sm" variant="outline" onClick={onRetry} className="h-8">
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry Save
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8">
              <X className="mr-2 h-3 w-3" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  )
}
