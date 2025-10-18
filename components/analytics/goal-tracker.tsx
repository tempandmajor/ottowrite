'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export type Goal = {
  id: string
  goal_type: 'daily' | 'weekly' | 'monthly' | 'project'
  target_words: number
  deadline: string | null
  project_id: string | null
  created_at: string
  achieved: number
  progressPercent: number
}

type GoalTrackerProps = {
  goals: Goal[]
}

const LABELS: Record<Goal['goal_type'], string> = {
  daily: 'Daily goal',
  weekly: 'Weekly goal',
  monthly: 'Monthly goal',
  project: 'Project goal',
}

export function GoalTracker({ goals }: GoalTrackerProps) {
  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Writing goals</CardTitle>
          <CardDescription>No goals set yet. Create one to track your progress.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Writing goals</CardTitle>
        <CardDescription>Monitor progress toward your current word targets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="space-y-2 rounded-xl border bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="muted">{LABELS[goal.goal_type]}</Badge>
                {goal.deadline && (
                  <span className="text-xs text-muted-foreground">
                    Due {new Date(goal.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {goal.achieved.toLocaleString()} / {goal.target_words.toLocaleString()} words
              </span>
            </div>
            <Progress value={goal.progressPercent} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
