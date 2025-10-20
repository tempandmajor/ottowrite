import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14 // 14 days

/**
 * Database Connection Pool Configuration
 *
 * For serverless environments (Vercel), we use smaller pool sizes to prevent
 * connection exhaustion. Each function instance gets its own pool.
 *
 * Supabase connection limits:
 * - Free tier: 60 concurrent connections
 * - Pro tier: 200 concurrent connections
 * - Enterprise: Custom limits
 *
 * With ~10 concurrent serverless functions and pool_size=5, we use ~50 connections max.
 */
const DB_POOL_CONFIG = {
  // Maximum number of connections in the pool per instance
  pool_size: parseInt(process.env.DB_POOL_SIZE || '5', 10),

  // Maximum time (ms) to wait for a connection from the pool
  // Fail fast in serverless to avoid timeouts
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),

  // Connection idle timeout (ms) - reclaim idle connections
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10),

  // Maximum connection lifetime (ms) - prevent stale connections
  max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '300000', 10),
}

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not fully configured')
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const cookieDomain = process.env.SUPABASE_COOKIE_DOMAIN?.trim() || undefined

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              path: '/',
              sameSite: 'lax',
              secure: isProduction,
              maxAge: SESSION_MAX_AGE_SECONDS,
              domain: cookieDomain,
              ...options,
            })
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: isProduction,
      maxAge: SESSION_MAX_AGE_SECONDS,
      domain: cookieDomain,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-timeout': DB_POOL_CONFIG.connect_timeout.toString(),
      },
    },
  })
}

/**
 * Get current database pool configuration
 * Useful for monitoring and debugging
 */
export function getPoolConfig() {
  return { ...DB_POOL_CONFIG }
}
