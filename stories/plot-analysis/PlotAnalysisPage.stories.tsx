/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, History, ListChecks, Loader2, Play } from 'lucide-react'

type SummaryProps = {
  status: 'completed' | 'running'
  summary?: string
  wordCount?: number
  openIssues?: number
  totalIssues?: number
  resolvedIssues?: number
  criticalIssues?: number
  majorIssues?: number
  issuesLoading?: boolean
}

type HistoryEntry = {
  id: string
  createdAt: string
  status: 'completed' | 'running'
  type: string
  summary: string
  unresolvedIssues: number
}

type HistoryProps = {
  entries: HistoryEntry[]
}

const meta: Meta<{ summary: SummaryProps; history: HistoryProps }> = {
  title: 'Plot Analysis/PlotAnalysisPageSections',
  args: {
    summary: {
      status: 'completed',
      summary:
        'Timeline remains coherent. Watch the escalating conflict between Act II and III to preserve stakes. Consider firming the emotional fallout after the midpoint twist so the finale lands.',
      wordCount: 62457,
      openIssues: 3,
      totalIssues: 8,
      resolvedIssues: 5,
      criticalIssues: 1,
      majorIssues: 1,
      issuesLoading: false,
    },
    history: {
      entries: [
        {
          id: 'analysis-1',
          createdAt: '2025-10-05T14:10:00Z',
          status: 'completed',
          type: 'full',
          summary: 'Initial pass surfaced timeline gaps around chapter 12.',
          unresolvedIssues: 6,
        },
        {
          id: 'analysis-2',
          createdAt: '2025-10-11T09:42:00Z',
          status: 'completed',
          type: 'timeline',
          summary: 'Resolved most sequencing conflicts; verify aftermath beats.',
          unresolvedIssues: 3,
        },
      ],
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<{ summary: SummaryProps; history: HistoryProps }>

export const SummaryCompleted: Story = {
  render: ({ summary }) => <SummaryTab {...summary} />,
}

export const SummaryRunning: Story = {
  render: () => <SummaryTab status="running" issuesLoading summary="" />,
}

export const HistoryView: Story = {
  render: ({ history }) => <HistoryTab {...history} />,
}

function SummaryTab({
  status,
  summary,
  wordCount = 0,
  openIssues = 0,
  totalIssues = 0,
  resolvedIssues = 0,
  criticalIssues = 0,
  majorIssues = 0,
  issuesLoading = false,
}: SummaryProps) {
  const resolvedCount = resolvedIssues
  const issueCount = openIssues

  if (status !== 'completed') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <div>
            <p className="font-medium">Analysis is running</p>
            <p className="text-sm text-muted-foreground">
              Keep this tab open — we’ll pull in issues as soon as the AI finishes.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Summary</CardTitle>
        <CardDescription>
          Completed • {wordCount.toLocaleString()} words analyzed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && <p className="text-sm leading-relaxed">{summary}</p>}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SummaryTile
            label="Open issues"
            value={issueCount}
            badgeVariant="secondary"
          />
          <SummaryTile label="Total recorded" value={totalIssues} />
          <SummaryTile label="Resolved" value={resolvedCount} badgeVariant="success" />
          {criticalIssues > 0 && (
            <SummaryTile label="Critical" value={criticalIssues} badgeVariant="critical" />
          )}
          {majorIssues > 0 && (
            <SummaryTile label="Major" value={majorIssues} badgeVariant="major" />
          )}
          {issuesLoading && (
            <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fetching</p>
                <p className="text-sm font-medium">Refreshing issue stats…</p>
              </div>
            </div>
          )}
        </div>

        {totalIssues === 0 && !issuesLoading && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">No plot issues detected yet.</span>
          </div>
        )}

        {totalIssues > 0 && issueCount === 0 && !issuesLoading && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All tracked issues are resolved. Great work!</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryTile({
  label,
  value,
  badgeVariant,
}: {
  label: string
  value: number
  badgeVariant?: 'secondary' | 'success' | 'critical' | 'major'
}) {
  const variantClasses: Record<'secondary' | 'success' | 'critical' | 'major', string> = {
    secondary: 'bg-muted text-foreground',
    success: 'bg-green-100 text-green-800',
    critical: 'bg-red-100 text-red-800 flex items-center gap-1',
    major: 'bg-orange-100 text-orange-800',
  }
  const badgeClassName = badgeVariant ? variantClasses[badgeVariant] : ''

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
      <Badge variant="secondary" className={`text-base ${badgeClassName}`.trim()}>
        {badgeVariant === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
        {value}
      </Badge>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function HistoryTab({ entries }: HistoryProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <History className="h-6 w-6 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">No analysis history yet</p>
            <p className="text-sm text-muted-foreground">
              Run your first analysis to start tracking revisions over time.
            </p>
          </div>
          <Button size="sm" className="mx-auto flex items-center gap-2">
            <Play className="h-4 w-4" /> Run analysis
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs value="history" className="space-y-4">
      <TabsList className="grid grid-cols-2 md:w-auto">
        <TabsTrigger value="summary" disabled className="flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Summary
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2" aria-selected>
          <History className="h-4 w-4" /> History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="history" className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base">{entry.type.replace('_', ' ')} analysis</CardTitle>
                <CardDescription>{new Date(entry.createdAt).toLocaleString()}</CardDescription>
              </div>
              <Badge variant={entry.status === 'completed' ? 'secondary' : 'outline'}>
                {entry.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{entry.summary}</p>
              <p className="text-xs text-muted-foreground">
                {entry.unresolvedIssues} unresolved issues at time of run.
              </p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  )
}
