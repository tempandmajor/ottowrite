import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - lower sample rate for server
  tracesSampleRate: 0.05, // 5% of transactions (free tier friendly)

  // Environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Ignore errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Filter out sensitive information
  beforeSend(event, hint) {
    // Scrub sensitive data from server-side events
    if (event.request) {
      // Remove headers that might contain sensitive data
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-supabase-auth']
      }

      // Remove query params that might contain tokens
      if (event.request.query_string) {
        const params = new URLSearchParams(event.request.query_string)
        if (params.has('token')) params.delete('token')
        if (params.has('key')) params.delete('key')
        event.request.query_string = params.toString()
      }
    }

    // Add custom context for server errors
    if (event.exception) {
      const error = hint.originalException
      if (error instanceof Error) {
        Sentry.setContext('error_details', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines only
        })
      }
    }

    return event
  },

  // Ignore common non-critical server errors
  ignoreErrors: [
    // Expected operational errors
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    // User errors
    'Unauthorized',
    'Not found',
    '401',
    '404',
  ],

  // Integration configuration
  integrations: [Sentry.httpIntegration()],
})
