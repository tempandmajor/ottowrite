/**
 * Ghostwriter Dashboard Component
 *
 * Main dashboard for Ghostwriter AI agent feature with:
 * - Usage meter showing AI words consumed
 * - Recent generations list
 * - Feature explainer cards
 * - Start Writing CTA
 *
 * Ticket: 1.1
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Zap, BookOpen, Target, ArrowRight, FileText } from 'lucide-react'
import Link from 'next/link'
import { GhostwriterUsageMeter } from './usage-meter'
import { RecentGenerationsList } from './recent-generations-list'

interface GhostwriterStats {
  totalGenerations: number
  wordsGenerated: number
  avgQualityScore: number
}

interface RecentGeneration {
  id: string
  title: string
  wordCount: number
  createdAt: string
  projectName: string
}

export function GhostwriterDashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<GhostwriterStats | null>(null)
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setStats(null)
      setRecentGenerations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // TODO: Replace with actual API calls once endpoints are created
      // const [statsRes, generationsRes] = await Promise.all([
      //   fetch('/api/ghostwriter/statistics'),
      //   fetch('/api/ghostwriter/recent'),
      // ])

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500))

      setStats({
        totalGenerations: 0,
        wordsGenerated: 0,
        avgQualityScore: 0,
      })

      setRecentGenerations([])
    } catch (err) {
      console.error('Failed to fetch Ghostwriter data:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Ghostwriter</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Your AI writing partner that helps you craft stories in manageable chunks with
            context awareness and quality control.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/dashboard/ghostwriter/new">
            <Sparkles className="h-4 w-4 mr-2" />
            Start Writing
          </Link>
        </Button>
      </div>

      {/* Usage Meter */}
      <GhostwriterUsageMeter userId={userId} />

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Context-Aware</CardTitle>
            <CardDescription>
              Ghostwriter remembers your story, characters, and plot points to maintain
              consistency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Tracks character traits and relationships
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Maintains plot continuity across chunks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                References past events naturally
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Chunk-Based Writing</CardTitle>
            <CardDescription>
              Break your story into manageable pieces and write at your own pace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Define custom chunk sizes (scenes, chapters, etc.)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Review and refine each chunk individually
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Seamlessly connect chunks together
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Target className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Quality Control</CardTitle>
            <CardDescription>
              Built-in quality checks ensure every chunk meets your standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Consistency scoring across chunks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Pacing and flow analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Character voice validation
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent Generations */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : recentGenerations.length > 0 ? (
        <RecentGenerationsList generations={recentGenerations} onRefresh={fetchData} />
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Generations Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start your first writing session with Ghostwriter to see your generations here.
              </p>
              <Button asChild>
                <Link href="/dashboard/ghostwriter/new">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Your First Session
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {stats && stats.totalGenerations > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Generations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalGenerations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Words Generated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.wordsGenerated.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Quality Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgQualityScore.toFixed(1)}/10</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Getting Started Guide */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle>Getting Started with Ghostwriter</CardTitle>
          <CardDescription>
            Follow these steps to make the most of your AI writing partner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Set Your Context</h4>
                <p className="text-sm text-muted-foreground">
                  Tell Ghostwriter about your story, characters, and the chunk you want to write
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Generate & Review</h4>
                <p className="text-sm text-muted-foreground">
                  Get AI-generated content that matches your style and review for quality
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Refine & Accept</h4>
                <p className="text-sm text-muted-foreground">
                  Make any adjustments, then accept the chunk to add it to your document
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/ghostwriter/new">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
