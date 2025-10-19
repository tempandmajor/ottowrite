import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring for edge runtime
  tracesSampleRate: 0.1, // 10% of transactions

  // Environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Filter out sensitive information
  beforeSend(event) {
    // Scrub sensitive data from edge runtime events
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: ['Unauthorized', 'Not found', '401', '404'],
})
