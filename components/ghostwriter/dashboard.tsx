/**
 * Ghostwriter Dashboard Component (Enhanced for Ticket 1.4)
 *
 * Main dashboard with comprehensive quota management:
 * - Usage meter with Studio unlimited badge
 * - Generate button with quota gating
 * - Automatic upgrade dialog at limit
 * - Warning at 80% usage
 * - Feature explainer cards
 * - Recent generations list
 *
 * Acceptance Criteria:
 * - Studio users see unlimited badge (no quota UI)
 * - Non-Studio see accurate progress bar
 * - Generate button blocked when limit reached
 * - Upgrade dialog appears automatically at limit
 * - Warning shown at 80% usage
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sparkles,
  Zap,
  BookOpen,
  Target,
  ArrowRight,
  FileText,
  AlertTriangle,
  TrendingUp,
  Crown,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getGhostwriterUsageStats,
  isApproachingQuota,
  hasExceededQuota,
  getQuotaMessage,
  type GhostwriterUsageStats,
} from '@/lib/account/ghostwriter-quota'

interface RecentGeneration {
  id: string
  title: string
  wordCount: number
  createdAt: string
  status: string
  overallQualityScore: number | null
}

interface DashboardProps {
  userId: string
}

export function GhostwriterDashboard({ userId }: DashboardProps) {
  const [stats, setStats] = useState<GhostwriterUsageStats | null>(null)
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setStats(null)
      setRecentGenerations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch usage stats
      const usageStats = await getGhostwriterUsageStats(supabase, userId)
      setStats(usageStats)

      // Fetch recent generations
      const { data: chunks, error } = await supabase
        .from('ghostwriter_chunks')
        .select('id, title, word_count, created_at, status, overall_quality_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Failed to fetch recent generations:', error)
      } else {
        setRecentGenerations(
          (chunks || []).map((chunk) => ({
            id: chunk.id,
            title: chunk.title,
            wordCount: chunk.word_count,
            createdAt: chunk.created_at,
            status: chunk.status,
            overallQualityScore: chunk.overall_quality_score,
          }))
        )
      }

      // Auto-show upgrade dialog if quota exceeded
      if (usageStats && hasExceededQuota(usageStats)) {
        setShowUpgradeDialog(true)
      }
    } catch (err) {
      console.error('Failed to fetch Ghostwriter data:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateClick = () => {
    if (stats && hasExceededQuota(stats)) {
      setShowUpgradeDialog(true)
    } else {
      // Navigate to generation page
      window.location.href = '/dashboard/ghostwriter/new'
    }
  }

  const percentageUsed = stats?.percentageUsed ?? 0
  const isApproaching = stats ? isApproachingQuota(stats) : false
  const isExceeded = stats ? hasExceededQuota(stats) : false

  return (
    <div className="space-y-8">
      {/* Hero Section with Generate Button */}
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
        <Button
          size="lg"
          onClick={handleGenerateClick}
          disabled={isExceeded}
          className="relative"
        >
          {isExceeded && <Lock className="h-4 w-4 mr-2" />}
          {!isExceeded && <Sparkles className="h-4 w-4 mr-2" />}
          {isExceeded ? 'Limit Reached' : 'Start Writing'}
        </Button>
      </div>

      {/* Usage Meter Card */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="h-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ) : stats ? (
        <Card
          className={
            isExceeded
              ? 'border-destructive/20 bg-destructive/5'
              : isApproaching
                ? 'border-amber-500/20 bg-amber-500/5'
                : ''
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Ghostwriter Usage
                  {stats.isUnlimited && (
                    <Badge variant="secondary" className="ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      Unlimited
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {stats.isUnlimited
                    ? 'Studio plan includes unlimited Ghostwriter words'
                    : 'AI words used this month for Ghostwriter generations'}
                </CardDescription>
              </div>
              {(isApproaching || isExceeded) && !stats.isUnlimited && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/pricing">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar (hidden for unlimited) */}
            {!stats.isUnlimited && (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold">{stats.wordsUsed.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">
                    / {stats.wordsLimit?.toLocaleString() ?? 'Unlimited'} words
                  </span>
                </div>
                <Progress
                  value={percentageUsed}
                  className={
                    isExceeded
                      ? 'bg-destructive/20 [&>div]:bg-destructive'
                      : isApproaching
                        ? 'bg-amber-200/20 [&>div]:bg-amber-500'
                        : ''
                  }
                />
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {percentageUsed.toFixed(1)}% used
                </div>
              </div>
            )}

            {/* Unlimited Badge Display */}
            {stats.isUnlimited && (
              <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 text-center">
                <Crown className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Unlimited Generation</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.wordsUsed.toLocaleString()} words generated this month
                </p>
              </div>
            )}

            {/* Quota Exceeded Warning */}
            {isExceeded && !stats.isUnlimited && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <Lock className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive mb-1">Usage Limit Reached</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    You&apos;ve used all {stats.wordsLimit?.toLocaleString()} words of your monthly
                    Ghostwriter quota. Upgrade to continue generating.
                  </p>
                  <Button size="sm" variant="destructive" asChild>
                    <Link href="/pricing">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade Now
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* 80% Warning */}
            {isApproaching && !isExceeded && !stats.isUnlimited && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Approaching Limit
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                    You&apos;ve used {percentageUsed.toFixed(0)}% of your monthly quota (
                    {stats.wordsAvailable?.toLocaleString()} words remaining). Consider upgrading to
                    avoid interruption.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Usage Stats */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current plan</span>
                <span className="font-medium capitalize">{stats.tier}</span>
              </div>
              {!stats.isUnlimited && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium">{getQuotaMessage(stats)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Resets on</span>
                <span className="font-medium">
                  {new Date(stats.currentPeriod.end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {stats.chunksGenerated > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Chunks generated</span>
                    <span className="font-medium">{stats.chunksGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Chunks accepted</span>
                    <span className="font-medium">{stats.chunksAccepted}</span>
                  </div>
                  {stats.averageQualityScore && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg. quality</span>
                      <span className="font-medium">{stats.averageQualityScore.toFixed(1)}/10</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Feature Explainer Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Context-Aware</CardTitle>
            <CardDescription>
              Ghostwriter remembers your story, characters, and plot points to maintain consistency
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
        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>Your latest Ghostwriter writing sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGenerations.map((generation) => (
                <Link
                  key={generation.id}
                  href={`/dashboard/ghostwriter/${generation.id}`}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                          {generation.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {generation.wordCount.toLocaleString()} words
                          </Badge>
                          <Badge
                            variant={generation.status === 'accepted' ? 'default' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {generation.status}
                          </Badge>
                          {generation.overallQualityScore && (
                            <span className="text-xs">
                              ⭐ {generation.overallQualityScore.toFixed(1)}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
            {recentGenerations.length >= 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/ghostwriter/history">View All Generations</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Generations Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start your first writing session with Ghostwriter to see your generations here.
              </p>
              <Button onClick={handleGenerateClick} disabled={isExceeded}>
                {isExceeded && <Lock className="h-4 w-4 mr-2" />}
                {!isExceeded && <Sparkles className="h-4 w-4 mr-2" />}
                {isExceeded ? 'Upgrade to Continue' : 'Start Your First Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Ghostwriter Quota Reached
            </DialogTitle>
            <DialogDescription>
              You&apos;ve used all of your Ghostwriter words for this month. Upgrade your plan to
              continue generating content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {stats && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Words used</span>
                  <span className="font-semibold">{stats.wordsUsed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly limit</span>
                  <span className="font-semibold">{stats.wordsLimit?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Resets on</span>
                  <span className="font-semibold">
                    {new Date(stats.currentPeriod.end).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}
            <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-4">
              <div className="flex items-start gap-3">
                <Crown className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Studio Plan</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upgrade to Studio for unlimited Ghostwriter words, plus advanced features and
                    priority support.
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      Unlimited Ghostwriter generations
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      Advanced AI models
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      Priority processing
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button asChild>
              <Link href="/pricing">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Pricing
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
