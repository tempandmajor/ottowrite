'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type SessionSummary = {
  totalWords: number
  wordsThisWeek: number
  averagePerSession: number
  totalSessions: number
  totalHours: number
  streak: number
}

type SessionStatsProps = {
  summary: SessionSummary
}

export function SessionStats({ summary }: SessionStatsProps) {
  const items = [
    { label: 'Total words', value: summary.totalWords.toLocaleString() },
    { label: 'Words this week', value: summary.wordsThisWeek.toLocaleString() },
    { label: 'Average per session', value: summary.averagePerSession.toLocaleString() },
    { label: 'Sessions', value: summary.totalSessions.toLocaleString() },
    { label: 'Hours logged', value: summary.totalHours.toString() },
    { label: 'Current streak', value: `${summary.streak} day${summary.streak === 1 ? '' : 's'}` },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Writing activity</CardTitle>
        <CardDescription>Metrics aggregated from your writing sessions.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card/60 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
