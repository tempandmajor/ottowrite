import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Client Connection Pool Configuration
 *
 * Service role clients bypass RLS and are used for:
 * - Webhooks (Stripe, etc.)
 * - Background jobs
 * - Admin operations
 *
 * These clients need robust connection pooling since they're
 * long-lived and handle high-throughput operations.
 */
const SERVICE_ROLE_POOL_CONFIG = {
  // Larger pool for service role (handles webhooks, background jobs)
  db: {
    pool_size: parseInt(process.env.SERVICE_ROLE_POOL_SIZE || '10', 10),
    connect_timeout: parseInt(process.env.SERVICE_ROLE_CONNECT_TIMEOUT || '15000', 10),
    idle_timeout: parseInt(process.env.SERVICE_ROLE_IDLE_TIMEOUT || '60000', 10),
    max_lifetime: parseInt(process.env.SERVICE_ROLE_MAX_LIFETIME || '300000', 10),
  },
}

// Singleton instance for connection pooling
// Use function return type to avoid type narrowing issues
let serviceRoleClientInstance: ReturnType<typeof createServiceRoleClientInternal> | null = null

function createServiceRoleClientInternal(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-timeout': SERVICE_ROLE_POOL_CONFIG.db.connect_timeout.toString(),
      },
    },
  })
}

export function createServiceRoleClient() {
  // Reuse existing client instance to share connection pool
  if (serviceRoleClientInstance) {
    return serviceRoleClientInstance
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL environment variable')
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  serviceRoleClientInstance = createServiceRoleClientInternal(supabaseUrl, serviceRoleKey)

  return serviceRoleClientInstance
}

/**
 * Get current service role pool configuration
 * Useful for monitoring and debugging
 */
export function getServiceRolePoolConfig() {
  return { ...SERVICE_ROLE_POOL_CONFIG }
}

/**
 * Reset the service role client instance
 * Useful for testing or forcing connection pool refresh
 */
export function resetServiceRoleClient() {
  serviceRoleClientInstance = null
}
