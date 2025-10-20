import { createBrowserClient } from '@supabase/ssr'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14 // 14 days

/**
 * Browser Client Connection Configuration
 *
 * Browser clients are lightweight and don't need explicit pooling
 * since the browser manages HTTP/2 connection reuse automatically.
 *
 * However, we configure timeouts to prevent hanging requests.
 */
const BROWSER_CLIENT_CONFIG = {
  connect_timeout: parseInt(process.env.NEXT_PUBLIC_DB_CONNECT_TIMEOUT || '10000', 10),
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing public Supabase environment variables')
  }

  // Match server/middleware cookie policy: secure only in production
  const isProduction = process.env.NODE_ENV === 'production'

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    cookieOptions: {
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: 'lax',
      path: '/',
      secure: isProduction,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-timeout': BROWSER_CLIENT_CONFIG.connect_timeout.toString(),
      },
    },
  })
}

/**
 * Get current browser client configuration
 * Useful for monitoring and debugging
 */
export function getBrowserClientConfig() {
  return { ...BROWSER_CLIENT_CONFIG }
}
