'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageMeter } from '@/components/account/usage-meter'
import { ManageSubscriptionButton } from '@/components/account/manage-subscription-button'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatNumber } from '@/lib/number-format'
import type { UsageSummary } from '@/lib/account/usage'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, TrendingUp } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  hobbyist: 'Hobbyist',
  professional: 'Professional',
  studio: 'Studio',
}

type UsageDashboardProps = {
  userEmail: string
  fullName?: string
  usageSummary: UsageSummary
}

export function UsageDashboard({ userEmail, fullName, usageSummary }: UsageDashboardProps) {
  const planName = PLAN_LABELS[usageSummary.plan] ?? usageSummary.plan

  const planLimits = usageSummary.limits ?? {
    max_projects: null,
    max_documents: null,
    max_document_snapshots: null,
    max_templates: null,
    ai_words_per_month: null,
    ai_requests_per_month: null,
  }

  const projectsLimit = planLimits.max_projects
  const documentsLimit = planLimits.max_documents
  const aiWordsLimit = planLimits.ai_words_per_month
  const aiRequestsLimit = planLimits.ai_requests_per_month

  const metrics = {
    projectsPercent: projectsLimit
      ? Math.min(100, Math.round((usageSummary.usage.projects / projectsLimit) * 100))
      : 0,
    documentsPercent: documentsLimit
      ? Math.min(100, Math.round((usageSummary.usage.documents / documentsLimit) * 100))
      : 0,
    aiWordsPercent: aiWordsLimit
      ? Math.min(100, Math.round((usageSummary.usage.ai_words_used_month / aiWordsLimit) * 100))
      : 0,
    aiRequestsPercent: aiRequestsLimit
      ? Math.min(100, Math.round((usageSummary.usage.ai_requests_month / aiRequestsLimit) * 100))
      : 0,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Account usage</h1>
            <p className="text-sm text-muted-foreground">
              Monitor plan limits, AI consumption, and recent billing periods.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {userEmail}
            </Badge>
            {fullName && (
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {fullName}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <Card className="border-none bg-card/80 shadow-card">
        <CardHeader>
          <CardTitle>Your plan</CardTitle>
          <CardDescription>
            Current period {formatDate(usageSummary.currentPeriod.start)} – {formatDate(usageSummary.currentPeriod.end)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active plan</p>
                <p className="text-xl font-semibold text-foreground">{planName}</p>
              </div>
              <div className="flex gap-2">
                <ManageSubscriptionButton />
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/pricing">View plans</Link>
                </Button>
              </div>
            </div>
            <UsageMeter
              label="Projects"
              value={usageSummary.usage.projects}
              limit={planLimits.max_projects}
              percent={metrics.projectsPercent}
              warningThreshold={0.8}
              warningMessage="You’re nearing the project limit for your plan."
            />
            <UsageMeter
              label="Documents"
              value={usageSummary.usage.documents}
              limit={planLimits.max_documents}
              percent={metrics.documentsPercent}
              warningThreshold={0.8}
              warningMessage="Consider upgrading to unlock more document slots."
            />
          </div>

          <div className="space-y-4">
            <UsageMeter
              label="AI words this month"
              value={usageSummary.usage.ai_words_used_month}
              limit={planLimits.ai_words_per_month}
              percent={metrics.aiWordsPercent}
              warningThreshold={0.8}
              warningMessage="You’re close to your monthly AI word cap."
              unit="words"
            />
            <UsageMeter
              label="AI requests this month"
              value={usageSummary.usage.ai_requests_month}
              limit={planLimits.ai_requests_per_month}
              percent={metrics.aiRequestsPercent}
              warningThreshold={0.8}
              warningMessage="AI request allowance is nearly used for this period."
              unit="requests"
            />
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">${usageSummary.usage.ai_cost_month.toFixed(2)}</span> estimated AI spend
                this period
              </p>
              <p className="mt-1 text-xs">
                Prompt tokens: {formatNumber(usageSummary.usage.ai_prompt_tokens)} · Completion tokens:{' '}
                {formatNumber(usageSummary.usage.ai_completion_tokens)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/80 shadow-card">
        <CardHeader>
          <CardTitle>Recent usage history</CardTitle>
          <CardDescription>
            Snapshot of the last billing cycles saved from automated usage tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageSummary.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">History will appear once billing cycles complete.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-left">AI words</th>
                    <th className="px-4 py-3 text-left">AI requests</th>
                    <th className="px-4 py-3 text-left">Projects</th>
                    <th className="px-4 py-3 text-left">Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {usageSummary.history.map((entry) => (
                    <tr key={`${entry.periodStart}-${entry.periodEnd}`} className="bg-background/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {formatDate(entry.periodStart)} – {formatDate(entry.periodEnd)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatNumber(entry.aiWordsUsed)}</td>
                      <td className="px-4 py-3">{formatNumber(entry.aiRequests)}</td>
                      <td className="px-4 py-3">{formatNumber(entry.projectsCount)}</td>
                      <td className="px-4 py-3">{formatNumber(entry.documentsCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {usageSummary.history.length > 1 && (
        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader>
            <CardTitle>Usage trends</CardTitle>
            <CardDescription>
              Compared to the previous period.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {buildTrendItems(usageSummary.history).map((item) => (
              <div key={item.label} className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                <p className={`text-xs ${item.delta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {item.delta >= 0 ? '+' : ''}{item.delta}% vs. prior period
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function buildTrendItems(history: UsageSummary['history']) {
  const [current, previous] = history
  if (!current || !previous) return []

  const calcDelta = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return currentValue === 0 ? 0 : 100
    return Math.round(((currentValue - previousValue) / previousValue) * 100)
  }

  return [
    {
      label: 'AI words',
      value: formatNumber(current.aiWordsUsed),
      delta: calcDelta(current.aiWordsUsed, previous.aiWordsUsed),
    },
    {
      label: 'AI requests',
      value: formatNumber(current.aiRequests),
      delta: calcDelta(current.aiRequests, previous.aiRequests),
    },
    {
      label: 'Projects',
      value: formatNumber(current.projectsCount),
      delta: calcDelta(current.projectsCount, previous.projectsCount),
    },
    {
      label: 'Documents',
      value: formatNumber(current.documentsCount),
      delta: calcDelta(current.documentsCount, previous.documentsCount),
    },
  ]
}
