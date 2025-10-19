import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring (free tier friendly)

  // Session replay - captures user interactions for debugging
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Ignore errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Filter out sensitive information
  beforeSend(event, hint) {
    // Filter out errors from browser extensions
    if (event.exception) {
      const errorMessage = hint.originalException?.toString() || ''
      if (
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('moz-extension://')
      ) {
        return null
      }
    }

    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['Authorization']
      delete event.request.headers['Cookie']
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    // Browser extension errors
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',
    // Network errors that are expected
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    // User cancelled actions
    'AbortError',
    'The user aborted a request',
  ],

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // Privacy: mask all text by default
      blockAllMedia: true, // Privacy: don't capture images/videos
    }),
    Sentry.browserTracingIntegration(),
  ],
})
