'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Check, Loader2, Sparkles, PenTool, Users } from 'lucide-react'

const benefits = [
  'AI-assisted outlining and beat sheets',
  'Character management with relationship maps',
  'Real-time analytics on pacing and tone',
]

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' })
        return
      }

      if (data.user) {
        toast({
          title: 'Welcome to Ottowrite',
          description: 'Check your inbox to verify your account and start writing.',
        })
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Sign up error', error)
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="space-y-8">
          <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Ottowrite for storytellers
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Create cinematic stories with an AI writing collaborator.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Ottowrite keeps your outlines, characters, and drafts in sync—so you can focus on building unforgettable narratives.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 rounded-2xl border bg-card/70 p-3 shadow-sm">
                <Check className="h-4 w-4 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
              <Sparkles className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Intelligent prompts</p>
              <p className="mt-1 text-xs text-muted-foreground">Beat-by-beat guidance tuned to your genre.</p>
            </div>
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
              <PenTool className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Editing companions</p>
              <p className="mt-1 text-xs text-muted-foreground">Enhance pacing, tone, and clarity without losing your voice.</p>
            </div>
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Collaborative hub</p>
              <p className="mt-1 text-xs text-muted-foreground">Invite co-writers and editors into shared story worlds.</p>
            </div>
          </div>
        </div>

        <Card className="border-none bg-card/90 shadow-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Create your Ottowrite account</CardTitle>
            <CardDescription>Sign up in seconds—no credit card required.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup} className="space-y-6">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Sam Rivera"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account
                  </>
                ) : (
                  'Create free account'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80">
                  Log in
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                By signing up you agree to our{' '}
                <Link href="/terms" className="underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
