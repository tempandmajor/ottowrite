import { createBrowserClient } from '@supabase/ssr'

const SESSION_STORAGE_KEY = 'ottowrite.auth.token'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14 // 14 days

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing public Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: SESSION_STORAGE_KEY,
    },
    cookieOptions: {
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: 'lax',
      path: '/',
      secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true,
    },
  })
}
