'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Check, Loader2, Lock } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!password || password !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Please re-enter matching passwords.',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)

      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
          toast({
            title: 'Update failed',
            description: error.message,
            variant: 'destructive',
          })
          return
        }

        setUpdated(true)
        toast({
          title: 'Password updated',
          description: 'Sign in with your new password to continue.',
        })
        router.push('/auth/login')
      } catch (error) {
        console.error('Password update failed', error)
        toast({
          title: 'Unexpected error',
          description: 'We could not update your password. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [confirmPassword, password, router, toast]
  )

  return (
    <div id="main-content" className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-6">
          <Badge variant="outline" className="rounded-full border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Secure reset
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Choose a new password to continue.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              This step finalizes your reset. Your Ottowrite workspace remains protected and only you can access your drafts.
            </p>
          </div>
          <div className="rounded-2xl border bg-card/80 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Tips for a strong password</p>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Use 12+ characters.</li>
              <li>Mix upper and lowercase letters, numbers, and symbols.</li>
              <li>Avoid using previous passwords or obvious phrases.</li>
            </ul>
          </div>
        </div>

        <Card className="border-none bg-card/90 shadow-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Set a new password</CardTitle>
            <CardDescription>Create a fresh password to secure your account.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  disabled={loading || updated}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Retype your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  disabled={loading || updated}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading || updated}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating
                  </>
                ) : updated ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Updated
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
