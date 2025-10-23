import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import type { SubmissionPartner } from '@/lib/submissions/types'

interface PartnerStatsProps {
  stats: {
    total_submissions: number
    new_submissions: number
    reviewed_submissions: number
    accepted_submissions: number
    rejected_submissions: number
    acceptance_rate: number
  } | null
  partner: SubmissionPartner
}

export function PartnerStats({ stats }: PartnerStatsProps) {
  const statCards = [
    {
      title: 'Total Submissions',
      value: stats?.total_submissions || 0,
      icon: FileText,
      description: 'All time',
      color: 'text-blue-600',
    },
    {
      title: 'New',
      value: stats?.new_submissions || 0,
      icon: Clock,
      description: 'Awaiting review',
      color: 'text-orange-600',
    },
    {
      title: 'Accepted',
      value: stats?.accepted_submissions || 0,
      icon: CheckCircle,
      description: 'Requested/offered',
      color: 'text-green-600',
    },
    {
      title: 'Rejected',
      value: stats?.rejected_submissions || 0,
      icon: XCircle,
      description: 'Passed',
      color: 'text-red-600',
    },
    {
      title: 'Acceptance Rate',
      value: stats?.acceptance_rate ? `${Math.round(stats.acceptance_rate)}%` : '0%',
      icon: TrendingUp,
      description: 'Overall',
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
