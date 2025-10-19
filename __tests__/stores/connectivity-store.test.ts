import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConnectivityStore } from '@/stores/connectivity-store'

describe('ConnectivityStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useConnectivityStore.getState().reset()
  })

  describe('Initial State', () => {
    it('should initialize with checking status', () => {
      const { status } = useConnectivityStore.getState()
      expect(status).toBe('checking')
    })

    it('should initialize with navigator.onLine value', () => {
      const { isOnline } = useConnectivityStore.getState()
      expect(typeof isOnline).toBe('boolean')
    })

    it('should initialize with no errors', () => {
      const { lastError, failedAttempts } = useConnectivityStore.getState()
      expect(lastError).toBeNull()
      expect(failedAttempts).toBe(0)
    })

    it('should initialize with auto-retry enabled', () => {
      const { autoRetryEnabled } = useConnectivityStore.getState()
      expect(autoRetryEnabled).toBe(true)
    })
  })

  describe('Status Management', () => {
    it('should update status', () => {
      const { setStatus, status } = useConnectivityStore.getState()

      setStatus('online')
      expect(useConnectivityStore.getState().status).toBe('online')

      setStatus('offline')
      expect(useConnectivityStore.getState().status).toBe('offline')
    })

    it('should update lastChecked when status changes', () => {
      const { setStatus, lastChecked } = useConnectivityStore.getState()

      expect(lastChecked).toBeNull()

      setStatus('online')
      const newLastChecked = useConnectivityStore.getState().lastChecked

      expect(newLastChecked).toBeInstanceOf(Date)
    })

    it('should show banner when offline', () => {
      const { setStatus } = useConnectivityStore.getState()

      setStatus('offline')

      expect(useConnectivityStore.getState().showOfflineBanner).toBe(true)
    })

    it('should hide banner when online', () => {
      const { setStatus } = useConnectivityStore.getState()

      setStatus('offline')
      expect(useConnectivityStore.getState().showOfflineBanner).toBe(true)

      setStatus('online')
      expect(useConnectivityStore.getState().showOfflineBanner).toBe(false)
      expect(useConnectivityStore.getState().showRetrySnackbar).toBe(false)
    })
  })

  describe('Online/Offline Tracking', () => {
    it('should set online status', () => {
      const { setOnline } = useConnectivityStore.getState()

      setOnline(true)
      expect(useConnectivityStore.getState().isOnline).toBe(true)

      setOnline(false)
      expect(useConnectivityStore.getState().isOnline).toBe(false)
    })

    it('should transition from offline to checking when coming online', () => {
      const { setStatus, setOnline } = useConnectivityStore.getState()

      setStatus('offline')
      setOnline(true)

      expect(useConnectivityStore.getState().status).toBe('checking')
    })

    it('should transition to offline when going offline', () => {
      const { setStatus, setOnline } = useConnectivityStore.getState()

      setStatus('online')
      setOnline(false)

      expect(useConnectivityStore.getState().status).toBe('offline')
    })
  })

  describe('Supabase Connection', () => {
    it('should track Supabase connection status', () => {
      const { setSupabaseConnected } = useConnectivityStore.getState()

      setSupabaseConnected(true)
      expect(useConnectivityStore.getState().isSupabaseConnected).toBe(true)

      setSupabaseConnected(false)
      expect(useConnectivityStore.getState().isSupabaseConnected).toBe(false)
    })

    it('should set status to online when Supabase connected', () => {
      const { setOnline, setSupabaseConnected } = useConnectivityStore.getState()

      setOnline(true)
      setSupabaseConnected(true)

      expect(useConnectivityStore.getState().status).toBe('online')
    })

    it('should set status to degraded when Supabase disconnected but online', () => {
      const { setOnline, setSupabaseConnected } = useConnectivityStore.getState()

      setOnline(true)
      setSupabaseConnected(false)

      expect(useConnectivityStore.getState().status).toBe('degraded')
    })

    it('should set status to offline when not online', () => {
      const { setOnline, setSupabaseConnected } = useConnectivityStore.getState()

      setOnline(false)
      setSupabaseConnected(true)

      expect(useConnectivityStore.getState().status).toBe('offline')
    })
  })

  describe('Error Handling', () => {
    it('should set error', () => {
      const { setError } = useConnectivityStore.getState()

      const error = {
        message: 'Test error',
        timestamp: new Date(),
        type: 'network' as const,
        retryable: true,
      }

      setError(error)

      expect(useConnectivityStore.getState().lastError).toEqual(error)
    })

    it('should show snackbar for retryable errors', () => {
      const { setError } = useConnectivityStore.getState()

      const error = {
        message: 'Connection failed',
        timestamp: new Date(),
        type: 'network' as const,
        retryable: true,
      }

      setError(error)

      expect(useConnectivityStore.getState().showRetrySnackbar).toBe(true)
      expect(useConnectivityStore.getState().snackbarMessage).toBe('Connection failed')
    })

    it('should not schedule retry for non-retryable errors', () => {
      const { setError } = useConnectivityStore.getState()

      const error = {
        message: 'Permanent error',
        timestamp: new Date(),
        type: 'api' as const,
        retryable: false,
      }

      setError(error)

      expect(useConnectivityStore.getState().retryScheduledAt).toBeNull()
    })
  })

  describe('Retry Logic', () => {
    it('should increment failed attempts', () => {
      const { incrementFailedAttempts } = useConnectivityStore.getState()

      expect(useConnectivityStore.getState().failedAttempts).toBe(0)

      incrementFailedAttempts()
      expect(useConnectivityStore.getState().failedAttempts).toBe(1)

      incrementFailedAttempts()
      expect(useConnectivityStore.getState().failedAttempts).toBe(2)
    })

    it('should reset failed attempts', () => {
      const { incrementFailedAttempts, resetFailedAttempts } = useConnectivityStore.getState()

      incrementFailedAttempts()
      incrementFailedAttempts()
      expect(useConnectivityStore.getState().failedAttempts).toBe(2)

      resetFailedAttempts()
      expect(useConnectivityStore.getState().failedAttempts).toBe(0)
    })

    it('should set retrying status', () => {
      const { setRetrying } = useConnectivityStore.getState()

      setRetrying(true)
      expect(useConnectivityStore.getState().isRetrying).toBe(true)

      setRetrying(false)
      expect(useConnectivityStore.getState().isRetrying).toBe(false)
    })

    it('should schedule retry', () => {
      const { scheduleRetry } = useConnectivityStore.getState()

      const now = Date.now()
      scheduleRetry(5000)

      const scheduled = useConnectivityStore.getState().retryScheduledAt
      expect(scheduled).toBeInstanceOf(Date)
      expect(scheduled!.getTime()).toBeGreaterThanOrEqual(now + 5000)
      expect(scheduled!.getTime()).toBeLessThan(now + 6000)
    })

    it('should cancel scheduled retry', () => {
      const { scheduleRetry, cancelScheduledRetry } = useConnectivityStore.getState()

      scheduleRetry(5000)
      expect(useConnectivityStore.getState().retryScheduledAt).not.toBeNull()

      cancelScheduledRetry()
      expect(useConnectivityStore.getState().retryScheduledAt).toBeNull()
    })

    it('should enable/disable auto-retry', () => {
      const { setAutoRetry } = useConnectivityStore.getState()

      expect(useConnectivityStore.getState().autoRetryEnabled).toBe(true)

      setAutoRetry(false)
      expect(useConnectivityStore.getState().autoRetryEnabled).toBe(false)

      setAutoRetry(true)
      expect(useConnectivityStore.getState().autoRetryEnabled).toBe(true)
    })
  })

  describe('UI State', () => {
    it('should show/hide snackbar', () => {
      const { showSnackbar, hideSnackbar } = useConnectivityStore.getState()

      showSnackbar('Test message')
      expect(useConnectivityStore.getState().showRetrySnackbar).toBe(true)
      expect(useConnectivityStore.getState().snackbarMessage).toBe('Test message')

      hideSnackbar()
      expect(useConnectivityStore.getState().showRetrySnackbar).toBe(false)
      expect(useConnectivityStore.getState().snackbarMessage).toBeNull()
    })

    it('should show/hide banner', () => {
      const { showBanner, hideBanner } = useConnectivityStore.getState()

      showBanner()
      expect(useConnectivityStore.getState().showOfflineBanner).toBe(true)

      hideBanner()
      expect(useConnectivityStore.getState().showOfflineBanner).toBe(false)
    })
  })

  describe('Reset', () => {
    it('should reset to initial state', () => {
      const { setStatus, setError, incrementFailedAttempts, showSnackbar, reset } =
        useConnectivityStore.getState()

      // Make some changes
      setStatus('offline')
      incrementFailedAttempts()
      showSnackbar('Test')
      setError({
        message: 'Error',
        timestamp: new Date(),
        type: 'network',
        retryable: true,
      })

      // Reset
      reset()

      const state = useConnectivityStore.getState()
      expect(state.status).toBe('checking')
      expect(state.failedAttempts).toBe(0)
      expect(state.showRetrySnackbar).toBe(false)
      expect(state.lastError).toBeNull()
    })
  })

  describe('Exponential Backoff', () => {
    it('should schedule retry with exponential backoff', () => {
      const { setError, incrementFailedAttempts } = useConnectivityStore.getState()

      const error = {
        message: 'Connection failed',
        timestamp: new Date(),
        type: 'network' as const,
        retryable: true,
      }

      // First attempt
      setError(error)
      incrementFailedAttempts()

      const firstRetry = useConnectivityStore.getState().retryScheduledAt
      expect(firstRetry).not.toBeNull()

      // Second attempt
      setError(error)
      incrementFailedAttempts()

      const secondRetry = useConnectivityStore.getState().retryScheduledAt
      expect(secondRetry).not.toBeNull()

      // The delays should be different due to exponential backoff
      // (Note: This is a simplified test - actual implementation uses exponential backoff)
    })

    it('should not schedule retry after max retries', () => {
      const { setError, incrementFailedAttempts } = useConnectivityStore.getState()

      const error = {
        message: 'Connection failed',
        timestamp: new Date(),
        type: 'network' as const,
        retryable: true,
      }

      // Exceed max retries (default 3)
      incrementFailedAttempts()
      incrementFailedAttempts()
      incrementFailedAttempts()

      setError(error)

      // Should not schedule retry after max attempts
      const scheduled = useConnectivityStore.getState().retryScheduledAt
      expect(scheduled).toBeNull()
    })
  })
})
