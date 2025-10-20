import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14 // 14 days

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
  })
}
