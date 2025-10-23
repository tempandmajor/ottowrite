/**
 * New Ghostwriter Session Page
 *
 * Placeholder for creating a new Ghostwriter writing session.
 * Will be implemented in Phase 2.
 *
 * Ticket: 1.1 (Placeholder)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewGhostwriterSessionPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/ghostwriter">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ghostwriter
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">New Writing Session</CardTitle>
          </div>
          <CardDescription>Start a new Ghostwriter AI session</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              The Ghostwriter session interface is currently under development. Check back soon to
              start creating AI-powered story chunks!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/ghostwriter">
                  Return to Dashboard
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/documents">
                  Browse Documents
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="mt-8 space-y-4">
        <h3 className="font-semibold">What to Expect</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Context Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Define your story context, characters, and the specific chunk you want to write
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get high-quality content that matches your style and maintains consistency
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quality Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review consistency scores, pacing analysis, and character voice validation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Refinement Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Make adjustments with AI assistance before accepting the chunk
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
