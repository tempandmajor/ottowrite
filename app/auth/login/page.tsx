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
import { Loader2, Sparkles, ShieldCheck, PenTool } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast({ title: 'Login failed', description: error.message, variant: 'destructive' })
        return
      }

      if (data.user) {
        toast({ title: 'Welcome back', description: 'Pick up your latest draft where you left off.' })
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error('Login error', error)
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-8">
          <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Returning writer
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Dive back into your story universe.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Ottowrite keeps every character arc, outline, and draft synced—so you can pick up momentum instantly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
              <Sparkles className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">AI continuity</p>
              <p className="mt-1 text-xs text-muted-foreground">We remember voices, arcs, and pacing.</p>
            </div>
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
              <PenTool className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Polish faster</p>
              <p className="mt-1 text-xs text-muted-foreground">Scene-by-scene suggestions tuned to your style.</p>
            </div>
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
              <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Secure workspace</p>
              <p className="mt-1 text-xs text-muted-foreground">Enterprise-grade privacy for your drafts.</p>
            </div>
          </div>
        </div>

        <Card className="border-none bg-card/90 shadow-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Log in to Ottowrite</CardTitle>
            <CardDescription>Access your projects, outlines, and AI assistants.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin} className="space-y-6">
            <CardContent className="space-y-4">
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
                  placeholder="Your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in
                  </>
                ) : (
                  'Log in'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Need an account?{' '}
                <Link href="/auth/signup" className="font-medium text-primary hover:text-primary/80">
                  Sign up
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Forgot your password?{' '}
                <Link href="/auth/reset" className="underline">
                  Reset it here
                </Link>.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
