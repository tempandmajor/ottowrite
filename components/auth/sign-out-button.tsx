'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, type ButtonProps } from '@/components/ui/button'

export function SignOutButton({ className, ...props }: ButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} className={className} {...props}>
      Sign Out
    </Button>
  )
}
