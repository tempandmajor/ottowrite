import { z } from 'zod'

/**
 * Environment Variable Validation
 *
 * This module validates all required environment variables at application startup.
 * It ensures the app fails fast with clear error messages if configuration is missing.
 *
 * Usage:
 *   import { env } from '@/lib/env-validation'
 *   const apiKey = env('ANTHROPIC_API_KEY')
 */

// Define the schema for all environment variables
const envSchema = z.object({
  // =============================================================================
  // REQUIRED - Application will not work without these
  // =============================================================================

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Stripe Configuration (required for payments)
  STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key is required'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'Stripe publishable key is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe webhook secret is required'),

  // Stripe Price IDs (required for subscriptions)
  STRIPE_PRICE_HOBBYIST: z.string().min(1, 'Hobbyist price ID is required'),
  STRIPE_PRICE_PROFESSIONAL: z.string().min(1, 'Professional price ID is required'),
  STRIPE_PRICE_STUDIO: z.string().min(1, 'Studio price ID is required'),

  // At least one AI provider key is required
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  // =============================================================================
  // OPTIONAL - For specific features
  // =============================================================================

  // GitHub Integration
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPO_URL: z.string().url().optional().or(z.literal('')),

  // Vercel Deployment
  VERCEL_TOKEN: z.string().optional(),

  // Supabase CLI
  SUPABASE_ACCESS_TOKEN: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(), // Fallback for SSR
  SUPABASE_URL: z.string().url().optional().or(z.literal('')), // Fallback for SSR

  // Application Settings
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal('')),
  PGPASSWORD: z.string().optional(),

  // Monitoring (Production)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Development
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  DEBUG: z.string().optional(),
})

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>

// Cache for validated environment
let cachedEnv: Env | null = null

/**
 * Validate and cache environment variables
 * @throws {Error} If validation fails with detailed error messages
 */
export function validateEnv(): Env {
  if (cachedEnv) {
    return cachedEnv
  }

  try {
    const parsed = envSchema.parse(process.env)

    // Additional validation: At least one AI provider key required
    const hasAIKey = parsed.ANTHROPIC_API_KEY || parsed.OPENAI_API_KEY || parsed.DEEPSEEK_API_KEY
    if (!hasAIKey) {
      throw new Error(
        'At least one AI provider API key is required:\n' +
        '  - ANTHROPIC_API_KEY (for Claude models)\n' +
        '  - OPENAI_API_KEY (for GPT models)\n' +
        '  - DEEPSEEK_API_KEY (for DeepSeek models)\n\n' +
        'Get API keys from:\n' +
        '  - Anthropic: https://console.anthropic.com/settings/keys\n' +
        '  - OpenAI: https://platform.openai.com/api-keys\n' +
        '  - DeepSeek: https://platform.deepseek.com/api_keys'
      )
    }

    cachedEnv = parsed
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors into a readable message
      const missingVars: string[] = []
      const invalidVars: string[] = []

      error.issues.forEach((err) => {
        const varName = err.path.join('.')
        if (err.code === 'invalid_type' && 'received' in err && err.received === 'undefined') {
          missingVars.push(varName)
        } else {
          invalidVars.push(`${varName}: ${err.message}`)
        }
      })

      let errorMessage = '\n❌ Environment Variable Validation Failed!\n\n'

      if (missingVars.length > 0) {
        errorMessage += '📋 Missing Required Variables:\n'
        missingVars.forEach((varName) => {
          errorMessage += `  - ${varName}\n`
        })
        errorMessage += '\n'
      }

      if (invalidVars.length > 0) {
        errorMessage += '⚠️  Invalid Variables:\n'
        invalidVars.forEach((msg) => {
          errorMessage += `  - ${msg}\n`
        })
        errorMessage += '\n'
      }

      errorMessage += '💡 Quick Fix:\n'
      errorMessage += '  1. Copy .env.example to .env.local\n'
      errorMessage += '  2. Fill in your actual API keys and secrets\n'
      errorMessage += '  3. See .env.example for links to obtain API keys\n\n'
      errorMessage += '📚 Documentation: See README.md for setup instructions\n'

      throw new Error(errorMessage)
    }

    // Re-throw other errors (like the AI key validation)
    throw error
  }
}

/**
 * Type-safe environment variable getter
 * @param key - The environment variable key
 * @returns The value of the environment variable
 * @throws {Error} If environment validation hasn't been run yet
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env-validation'
 *
 * // Type-safe access with autocomplete
 * const apiKey = env('ANTHROPIC_API_KEY')
 * const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
 * ```
 */
export function env<K extends keyof Env>(key: K): Env[K] {
  if (!cachedEnv) {
    throw new Error(
      'Environment validation has not been run. ' +
      'Call validateEnv() at application startup before using env().'
    )
  }

  return cachedEnv[key]
}

/**
 * Check if a specific environment variable is set (for optional vars)
 * @param key - The environment variable key
 * @returns True if the variable is set and non-empty
 */
export function hasEnv<K extends keyof Env>(key: K): boolean {
  if (!cachedEnv) {
    throw new Error(
      'Environment validation has not been run. ' +
      'Call validateEnv() at application startup before using hasEnv().'
    )
  }

  const value = cachedEnv[key]
  return value !== undefined && value !== null && value !== ''
}

/**
 * Get environment info for debugging (safe for logging - no secrets)
 */
export function getEnvInfo(): {
  nodeEnv: string
  hasSupabase: boolean
  hasStripe: boolean
  aiProviders: string[]
  hasGitHub: boolean
  hasVercel: boolean
  hasSentry: boolean
} {
  if (!cachedEnv) {
    throw new Error('Environment validation has not been run.')
  }

  return {
    nodeEnv: cachedEnv.NODE_ENV || 'development',
    hasSupabase: Boolean(cachedEnv.NEXT_PUBLIC_SUPABASE_URL && cachedEnv.SUPABASE_SERVICE_ROLE_KEY),
    hasStripe: Boolean(cachedEnv.STRIPE_SECRET_KEY && cachedEnv.STRIPE_WEBHOOK_SECRET),
    aiProviders: [
      cachedEnv.ANTHROPIC_API_KEY ? 'anthropic' : null,
      cachedEnv.OPENAI_API_KEY ? 'openai' : null,
      cachedEnv.DEEPSEEK_API_KEY ? 'deepseek' : null,
    ].filter(Boolean) as string[],
    hasGitHub: Boolean(cachedEnv.GITHUB_TOKEN),
    hasVercel: Boolean(cachedEnv.VERCEL_TOKEN),
    hasSentry: Boolean(cachedEnv.NEXT_PUBLIC_SENTRY_DSN),
  }
}

// Validate immediately in development to catch errors early
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnv()

    // Log environment info in development only
    if (process.env.NODE_ENV === 'development') {
      const info = getEnvInfo()
      console.log('✅ Environment validation passed')
      console.log('📊 Configuration:', {
        ...info,
        aiProviders: info.aiProviders.join(', ') || 'none',
      })
    }
  } catch (error) {
    // In production builds, we want to fail fast
    // In development, Next.js will show the error clearly
    if (error instanceof Error) {
      console.error(error.message)
    }

    // Exit in production/build, but let Next.js handle it in dev
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
      process.exit(1)
    }
  }
}
