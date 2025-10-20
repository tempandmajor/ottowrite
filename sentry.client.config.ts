import * as Sentry from '@sentry/nextjs'
import { replayIntegration, browserTracingIntegration } from '@sentry/browser'
import { enhancedBeforeSend, REPLAY_CONFIG } from './lib/monitoring/sentry-config'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring (free tier friendly)

  // Session replay - captures user interactions for debugging
  replaysSessionSampleRate: REPLAY_CONFIG.sessionSampleRate,
  replaysOnErrorSampleRate: REPLAY_CONFIG.errorSampleRate,

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Ignore errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Enhanced error filtering, classification, and alerting
  beforeSend: enhancedBeforeSend,

  // Integration configuration
  integrations: [
    replayIntegration({
      maskAllText: REPLAY_CONFIG.maskAllText,
      blockAllMedia: REPLAY_CONFIG.blockAllMedia,
      maskAllInputs: REPLAY_CONFIG.maskAllInputs,
    }),
    browserTracingIntegration(),
  ],

  // Release tracking (uses git commit SHA from Vercel)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Dist for identifying specific builds
  dist: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID,
})
