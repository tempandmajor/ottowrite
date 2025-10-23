/**
 * Ghostwriter Usage Meter Component
 *
 * Displays AI word usage for Ghostwriter feature with:
 * - Current usage vs plan limit
 * - Progress bar visualization
 * - Upgrade prompt when approaching limit
 *
 * Ticket: 1.1
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { getUsageSummary, type UsageSummary } from '@/lib/account/usage'
import { createClient } from '@/lib/supabase/client'

interface GhostwriterUsageMeterProps {
  userId: string
}

export function GhostwriterUsageMeter({ userId }: GhostwriterUsageMeterProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      if (!userId) {
        setUsage(null)
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const usageSummary = await getUsageSummary(supabase, userId)
        setUsage(usageSummary)
      } catch (err) {
        console.error('Failed to fetch usage:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return null
  }

  const { limits } = usage
  const aiWordsUsed = usage.usage.ai_words_used_month
  const aiWordsLimit = limits?.ai_words_per_month || 0
  const percentUsed = aiWordsLimit > 0 ? Math.min(100, (aiWordsUsed / aiWordsLimit) * 100) : 0
  const isApproachingLimit = percentUsed >= 80
  const isAtLimit = percentUsed >= 100

  return (
    <Card className={isApproachingLimit ? 'border-amber-500/20 bg-amber-500/5' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Ghostwriter Usage
            </CardTitle>
            <CardDescription>
              AI words used this month for Ghostwriter generations
            </CardDescription>
          </div>
          {isApproachingLimit && (
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
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold">
              {aiWordsUsed.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              / {aiWordsLimit ? aiWordsLimit.toLocaleString() : 'Unlimited'} words
            </span>
          </div>
          {aiWordsLimit > 0 && (
            <Progress
              value={percentUsed}
              className={isApproachingLimit ? 'bg-amber-200/20 [&>div]:bg-amber-500' : ''}
            />
          )}
        </div>

        {isAtLimit && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive mb-1">Usage Limit Reached</p>
              <p className="text-muted-foreground">
                You&apos;ve reached your monthly AI word limit. Upgrade your plan to continue using
                Ghostwriter.
              </p>
            </div>
          </div>
        )}

        {isApproachingLimit && !isAtLimit && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">
                Approaching Limit
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                You&apos;ve used {percentUsed.toFixed(0)}% of your monthly AI words. Consider
                upgrading to avoid interruption.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current plan</span>
            <span className="font-medium capitalize">{usage.plan}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Resets on</span>
            <span className="font-medium">
              {new Date(usage.currentPeriod.end).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
