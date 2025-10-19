'use client'

import { useConnectivity } from '@/hooks/use-connectivity'
import { OfflineBanner } from './offline-banner'
import { RetrySnackbar } from './retry-snackbar'

export type ConnectivityProviderProps = {
  children: React.ReactNode
  enableBanner?: boolean
  enableSnackbar?: boolean
  supabaseCheckInterval?: number
}

/**
 * Provider component that wraps the app and provides connectivity monitoring
 */
export function ConnectivityProvider({
  children,
  enableBanner = true,
  enableSnackbar = true,
  supabaseCheckInterval = 30000,
}: ConnectivityProviderProps) {
  const {
    status,
    isRetrying,
    lastChecked,
    failedAttempts,
    showRetrySnackbar,
    snackbarMessage,
    retry,
    dismissSnackbar,
    dismissBanner,
  } = useConnectivity({
    enableNavigatorCheck: true,
    enableSupabaseCheck: true,
    supabaseCheckInterval,
  })

  return (
    <>
      {children}

      {/* Offline Banner */}
      {enableBanner && (
        <OfflineBanner
          status={status}
          isRetrying={isRetrying}
          lastChecked={lastChecked}
          onRetry={retry}
          onDismiss={dismissBanner}
        />
      )}

      {/* Retry Snackbar */}
      {enableSnackbar && (
        <RetrySnackbar
          show={showRetrySnackbar}
          message={snackbarMessage}
          isRetrying={isRetrying}
          failedAttempts={failedAttempts}
          maxRetries={3}
          onRetry={retry}
          onDismiss={dismissSnackbar}
        />
      )}
    </>
  )
}
