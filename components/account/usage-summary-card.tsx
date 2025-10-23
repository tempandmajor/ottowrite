'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ManageSubscriptionButton } from '@/components/account/manage-subscription-button'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatNumber } from '@/lib/number-format'
import type { UsageSummary } from '@/lib/account/usage'
import { UpgradePrompt } from '@/components/upgrade/upgrade-prompt'

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  hobbyist: 'Hobbyist',
  professional: 'Professional',
  studio: 'Studio',
}

type UsageSummaryCardProps = {
  usageSummary: UsageSummary
  subscriptionStatus?: string | null
  trialEndsAt?: string | null
}

export function UsageSummaryCard({ usageSummary, subscriptionStatus, trialEndsAt }: UsageSummaryCardProps) {
  const planName = PLAN_LABELS[usageSummary.plan] ?? usageSummary.plan
  const limits = usageSummary.limits ?? {
    max_projects: null,
    max_documents: null,
    ai_words_per_month: null,
    ai_requests_per_month: null,
    collaborator_slots: null,
    api_requests_per_day: null,
  }

  const projectsPercent = limits.max_projects
    ? Math.min(100, Math.round((usageSummary.usage.projects / limits.max_projects) * 100))
    : 0
  const documentsPercent = limits.max_documents
    ? Math.min(100, Math.round((usageSummary.usage.documents / limits.max_documents) * 100))
    : 0
  const aiWordsPercent = limits.ai_words_per_month
    ? Math.min(100, Math.round((usageSummary.usage.ai_words_used_month / limits.ai_words_per_month) * 100))
    : 0
  const teamSeatsPercent = limits.collaborator_slots && limits.collaborator_slots > 0
    ? Math.min(100, Math.round((usageSummary.usage.collaborators / limits.collaborator_slots) * 100))
    : 0
  const apiRequestsPercent = limits.api_requests_per_day && limits.api_requests_per_day > 0
    ? Math.min(100, Math.round((usageSummary.usage.api_requests_today / limits.api_requests_per_day) * 100))
    : 0

  const hasTeamSeats = limits.collaborator_slots && limits.collaborator_slots > 0
  const hasAPIAccess = limits.api_requests_per_day && limits.api_requests_per_day > 0
  const hasWarning = projectsPercent >= 80 || documentsPercent >= 80 || aiWordsPercent >= 80 || teamSeatsPercent >= 80 || apiRequestsPercent >= 80

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  const isTrialing = subscriptionStatus === 'trialing'

  return (
    <Card className="border-none bg-card/80 shadow-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Plan & usage summary</CardTitle>
            <CardDescription>
              Current period {formatDate(usageSummary.currentPeriod.start)} – {formatDate(usageSummary.currentPeriod.end)}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/account/usage">
              View details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Active plan</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-foreground">{planName}</p>
              {isTrialing && trialEndsAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Trial
                </span>
              )}
            </div>
            {isTrialing && trialEndsAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Trial ends {formatDate(trialEndsAt)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <ManageSubscriptionButton />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pricing">View plans</Link>
            </Button>
          </div>
        </div>

        {hasWarning && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>
              You&apos;re approaching one or more plan limits.{' '}
              <Link href="/dashboard/account/usage" className="font-semibold underline underline-offset-2">
                View detailed usage
              </Link>{' '}
              or consider upgrading.
            </p>
          </div>
        )}

        <div className={`grid gap-4 ${hasTeamSeats || hasAPIAccess ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Projects</span>
              <span className="font-medium">
                {usageSummary.usage.projects}
                {limits.max_projects ? ` / ${formatNumber(limits.max_projects)}` : ''}
              </span>
            </div>
            <Progress value={projectsPercent} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Documents</span>
              <span className="font-medium">
                {usageSummary.usage.documents}
                {limits.max_documents ? ` / ${formatNumber(limits.max_documents)}` : ''}
              </span>
            </div>
            <Progress value={documentsPercent} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI words</span>
              <span className="font-medium">
                {formatNumber(usageSummary.usage.ai_words_used_month)}
                {limits.ai_words_per_month ? ` / ${formatNumber(limits.ai_words_per_month)}` : ''}
              </span>
            </div>
            <Progress value={aiWordsPercent} className="h-2" />
          </div>

          {hasTeamSeats && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Team seats</span>
                <span className="font-medium">
                  {usageSummary.usage.collaborators} / {limits.collaborator_slots}
                </span>
              </div>
              <Progress value={teamSeatsPercent} className="h-2" />
            </div>
          )}

          {hasAPIAccess && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API requests (today)</span>
                <span className="font-medium">
                  {usageSummary.usage.api_requests_today} / {limits.api_requests_per_day}
                </span>
              </div>
              <Progress value={apiRequestsPercent} className="h-2" />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated AI spend this period</span>
            <span className="font-semibold text-foreground">
              ${usageSummary.usage.ai_cost_month.toFixed(2)}
            </span>
          </div>
        </div>

        {/* AI Words Upgrade Prompt */}
        {aiWordsPercent >= 80 && limits.ai_words_per_month && limits.ai_words_per_month > 0 && (
          <UpgradePrompt
            reason="ai_words_limit"
            currentPlan={usageSummary.plan}
            recommendedPlan={usageSummary.plan === 'free' ? 'hobbyist' : usageSummary.plan === 'hobbyist' ? 'professional' : 'studio'}
            variant="inline"
            compact
          />
        )}
      </CardContent>
    </Card>
  )
}
