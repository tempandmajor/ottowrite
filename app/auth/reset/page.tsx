'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MailCheck } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!email) return

      setLoading(true)
      try {
        const supabase = createClient()
        const redirectTo = `${window.location.origin}/auth/update-password`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

        if (error) {
          toast({
            title: 'Reset failed',
            description: error.message,
            variant: 'destructive',
          })
          return
        }

        setSent(true)
        toast({
          title: 'Email sent',
          description: 'Check your inbox for a reset link. It expires in 60 minutes.',
        })
      } catch (error) {
        console.error('Password reset request failed', error)
        toast({
          title: 'Unexpected error',
          description: 'We could not start the reset flow. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [email, toast]
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-6">
          <Badge variant='outline' className="rounded-full border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Reset your access
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              We’ll send you a secure reset link.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Enter the email tied to your Ottowrite account. You’ll receive a password reset link so you can jump back into your draft safely.
            </p>
          </div>
          <div className="rounded-2xl border bg-card/80 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <MailCheck className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Didn’t receive anything?</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Check spam, promotions, and “Updates” tabs. The link expires within an hour—request another if needed.
            </p>
          </div>
        </div>

        <Card className="border-none bg-card/90 shadow-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Reset your password</CardTitle>
            <CardDescription>Send a reset email and follow the link to choose a new password.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading || sent}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading || sent}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : sent ? (
                  'Email sent'
                ) : (
                  'Send reset link'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{' '}
                <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80">
                  Go back to login
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Need help?{' '}
                <a
                  href="mailto:support@ottowrite.app"
                  className="underline"
                >
                  Contact support
                </a>
                .
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
