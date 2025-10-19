import { create } from 'zustand'

export type ConnectionStatus = 'online' | 'offline' | 'checking' | 'degraded'

export type ConnectivityError = {
  message: string
  timestamp: Date
  type: 'network' | 'supabase' | 'api'
  retryable: boolean
}

type ConnectivityState = {
  // Connection status
  status: ConnectionStatus
  isOnline: boolean
  isSupabaseConnected: boolean
  lastChecked: Date | null

  // Error tracking
  lastError: ConnectivityError | null
  failedAttempts: number
  maxRetries: number

  // Retry state
  isRetrying: boolean
  retryScheduledAt: Date | null
  autoRetryEnabled: boolean

  // UI state
  showOfflineBanner: boolean
  showRetrySnackbar: boolean
  snackbarMessage: string | null

  // Actions
  setStatus: (status: ConnectionStatus) => void
  setOnline: (isOnline: boolean) => void
  setSupabaseConnected: (connected: boolean) => void
  setError: (error: ConnectivityError | null) => void
  incrementFailedAttempts: () => void
  resetFailedAttempts: () => void
  setRetrying: (isRetrying: boolean) => void
  scheduleRetry: (delayMs: number) => void
  cancelScheduledRetry: () => void
  setAutoRetry: (enabled: boolean) => void
  showSnackbar: (message: string) => void
  hideSnackbar: () => void
  showBanner: () => void
  hideBanner: () => void
  reset: () => void
}

const initialState = {
  status: 'checking' as ConnectionStatus,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSupabaseConnected: false,
  lastChecked: null,
  lastError: null,
  failedAttempts: 0,
  maxRetries: 3,
  isRetrying: false,
  retryScheduledAt: null,
  autoRetryEnabled: true,
  showOfflineBanner: false,
  showRetrySnackbar: false,
  snackbarMessage: null,
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  ...initialState,

  setStatus: (status) => {
    set({ status, lastChecked: new Date() })

    // Auto-show/hide banner based on status
    if (status === 'offline') {
      set({ showOfflineBanner: true })
    } else if (status === 'online') {
      set({ showOfflineBanner: false, showRetrySnackbar: false })
    }
  },

  setOnline: (isOnline) => {
    const currentStatus = get().status

    set({ isOnline, lastChecked: new Date() })

    // Update status if it changed
    if (isOnline && currentStatus === 'offline') {
      set({ status: 'checking' })
    } else if (!isOnline && currentStatus !== 'offline') {
      set({ status: 'offline' })
    }
  },

  setSupabaseConnected: (connected) => {
    const { isOnline } = get()

    set({
      isSupabaseConnected: connected,
      lastChecked: new Date()
    })

    // Determine overall status
    if (!isOnline) {
      set({ status: 'offline' })
    } else if (connected) {
      set({ status: 'online' })
    } else {
      set({ status: 'degraded' })
    }
  },

  setError: (error) => {
    set({ lastError: error })

    if (error) {
      const { failedAttempts, maxRetries, autoRetryEnabled } = get()

      // Show retry snackbar if error is retryable
      if (error.retryable) {
        set({
          showRetrySnackbar: true,
          snackbarMessage: error.message
        })

        // Schedule auto-retry if enabled and under max retries
        if (autoRetryEnabled && failedAttempts < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delayMs = Math.min(2000 * Math.pow(2, failedAttempts), 16000)
          get().scheduleRetry(delayMs)
        }
      }
    }
  },

  incrementFailedAttempts: () => {
    set((state) => ({ failedAttempts: state.failedAttempts + 1 }))
  },

  resetFailedAttempts: () => {
    set({ failedAttempts: 0 })
  },

  setRetrying: (isRetrying) => {
    set({ isRetrying })
  },

  scheduleRetry: (delayMs) => {
    const retryScheduledAt = new Date(Date.now() + delayMs)
    set({ retryScheduledAt })
  },

  cancelScheduledRetry: () => {
    set({ retryScheduledAt: null })
  },

  setAutoRetry: (enabled) => {
    set({ autoRetryEnabled: enabled })
  },

  showSnackbar: (message) => {
    set({
      showRetrySnackbar: true,
      snackbarMessage: message
    })
  },

  hideSnackbar: () => {
    set({
      showRetrySnackbar: false,
      snackbarMessage: null
    })
  },

  showBanner: () => {
    set({ showOfflineBanner: true })
  },

  hideBanner: () => {
    set({ showOfflineBanner: false })
  },

  reset: () => {
    set(initialState)
  },
}))
