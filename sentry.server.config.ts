import * as Sentry from '@sentry/nextjs'
import { enhancedBeforeSend } from './lib/monitoring/sentry-config'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - lower sample rate for server
  tracesSampleRate: 0.05, // 5% of transactions (free tier friendly)

  // Environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Ignore errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Enhanced error filtering, classification, and alerting
  beforeSend: enhancedBeforeSend,

  // Integration configuration
  integrations: [Sentry.httpIntegration()],

  // Release tracking (uses git commit SHA from Vercel)
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Dist for identifying specific builds
  dist: process.env.VERCEL_DEPLOYMENT_ID,
})
