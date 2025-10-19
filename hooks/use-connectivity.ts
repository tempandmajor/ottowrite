import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useConnectivityStore } from '@/stores/connectivity-store'

export type ConnectivityCheckOptions = {
  enableNavigatorCheck?: boolean
  enableSupabaseCheck?: boolean
  supabaseCheckInterval?: number // ms
  onStatusChange?: (status: 'online' | 'offline' | 'checking' | 'degraded') => void
  onError?: (error: Error) => void
}

/**
 * Hook for monitoring connectivity status with navigator.onLine and Supabase checks
 */
export function useConnectivity(options: ConnectivityCheckOptions = {}) {
  const {
    enableNavigatorCheck = true,
    enableSupabaseCheck = true,
    supabaseCheckInterval = 30000, // Check every 30 seconds
    onStatusChange,
    onError,
  } = options

  const store = useConnectivityStore()
  const supabaseCheckTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Check Supabase connectivity by running a simple query
   */
  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    try {
      const supabase = createClient()

      // Try to fetch auth session as a connectivity check
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.warn('[Connectivity] Supabase check failed:', error.message)
        store.setSupabaseConnected(false)
        return false
      }

      store.setSupabaseConnected(true)
      return true
    } catch (error) {
      console.error('[Connectivity] Supabase check error:', error)
      store.setSupabaseConnected(false)

      if (onError && error instanceof Error) {
        onError(error)
      }

      return false
    }
  }, [store, onError])

  /**
   * Perform full connectivity check
   */
  const checkConnectivity = useCallback(async () => {
    store.setStatus('checking')

    // Check navigator.onLine first (instant)
    const navigatorOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    store.setOnline(navigatorOnline)

    if (!navigatorOnline) {
      store.setStatus('offline')
      return
    }

    // Check Supabase if enabled
    if (enableSupabaseCheck) {
      const supabaseConnected = await checkSupabaseConnection()

      if (supabaseConnected) {
        store.setStatus('online')
        store.resetFailedAttempts()
      } else {
        store.setStatus('degraded')
      }
    } else {
      store.setStatus('online')
    }
  }, [store, enableSupabaseCheck, checkSupabaseConnection])

  /**
   * Retry connection with exponential backoff
   */
  const retry = useCallback(async () => {
    if (store.isRetrying) {
      return // Already retrying
    }

    store.setRetrying(true)
    store.incrementFailedAttempts()

    try {
      await checkConnectivity()

      if (store.status === 'online') {
        store.resetFailedAttempts()
        store.showSnackbar('Connection restored')

        // Auto-hide snackbar after 3 seconds
        setTimeout(() => {
          store.hideSnackbar()
        }, 3000)
      }
    } catch (error) {
      console.error('[Connectivity] Retry failed:', error)

      if (onError && error instanceof Error) {
        onError(error)
      }
    } finally {
      store.setRetrying(false)
      store.cancelScheduledRetry()
    }
  }, [store, checkConnectivity, onError])

  /**
   * Manual retry trigger
   */
  const manualRetry = useCallback(() => {
    store.cancelScheduledRetry()
    retry()
  }, [store, retry])

  /**
   * Setup navigator.onLine event listeners
   */
  useEffect(() => {
    if (!enableNavigatorCheck || typeof window === 'undefined') {
      return
    }

    const handleOnline = () => {
      console.log('[Connectivity] Browser is online')
      store.setOnline(true)
      checkConnectivity()
    }

    const handleOffline = () => {
      console.log('[Connectivity] Browser is offline')
      store.setOnline(false)
      store.setStatus('offline')
      store.setError({
        message: 'No internet connection',
        timestamp: new Date(),
        type: 'network',
        retryable: true,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enableNavigatorCheck, store, checkConnectivity])

  /**
   * Setup periodic Supabase connectivity checks
   */
  useEffect(() => {
    if (!enableSupabaseCheck || typeof window === 'undefined') {
      return
    }

    // Initial check
    checkSupabaseConnection()

    // Setup periodic checks
    supabaseCheckTimerRef.current = setInterval(() => {
      if (store.isOnline && !store.isRetrying) {
        checkSupabaseConnection()
      }
    }, supabaseCheckInterval)

    return () => {
      if (supabaseCheckTimerRef.current) {
        clearInterval(supabaseCheckTimerRef.current)
      }
    }
  }, [enableSupabaseCheck, supabaseCheckInterval, store.isOnline, store.isRetrying, checkSupabaseConnection])

  /**
   * Setup auto-retry based on scheduled retry time
   */
  useEffect(() => {
    if (!store.retryScheduledAt || !store.autoRetryEnabled) {
      return
    }

    const now = Date.now()
    const scheduledTime = store.retryScheduledAt.getTime()
    const delay = Math.max(0, scheduledTime - now)

    retryTimerRef.current = setTimeout(() => {
      retry()
    }, delay)

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [store.retryScheduledAt, store.autoRetryEnabled, retry])

  /**
   * Notify on status changes
   */
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(store.status)
    }
  }, [store.status, onStatusChange])

  /**
   * Initial connectivity check on mount
   */
  useEffect(() => {
    checkConnectivity()
  }, []) // Only run once on mount

  return {
    // Status
    status: store.status,
    isOnline: store.isOnline,
    isSupabaseConnected: store.isSupabaseConnected,
    isRetrying: store.isRetrying,
    lastChecked: store.lastChecked,

    // Error info
    lastError: store.lastError,
    failedAttempts: store.failedAttempts,

    // UI state
    showOfflineBanner: store.showOfflineBanner,
    showRetrySnackbar: store.showRetrySnackbar,
    snackbarMessage: store.snackbarMessage,

    // Actions
    retry: manualRetry,
    checkConnectivity,
    dismissSnackbar: store.hideSnackbar,
    dismissBanner: store.hideBanner,
    setAutoRetry: store.setAutoRetry,
  }
}
