/**
 * Submission Activity Timeline Component
 *
 * Displays chronological activity for a submission
 *
 * Ticket: MS-4.1
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Mail,
  AlertCircle,
} from 'lucide-react'

interface Activity {
  id: string
  type: string
  description: string
  partnerName: string | null
  metadata: Record<string, any>
  createdAt: string
}

const activityIcons: Record<string, any> = {
  submission_created: FileText,
  partner_added: Send,
  partner_viewed: Eye,
  material_requested: Clock,
  response_received: Mail,
  status_accepted: CheckCircle2,
  status_rejected: XCircle,
  note_added: FileText,
}

const activityColors: Record<string, string> = {
  submission_created: 'bg-blue-500',
  partner_added: 'bg-purple-500',
  partner_viewed: 'bg-cyan-500',
  material_requested: 'bg-amber-500',
  response_received: 'bg-indigo-500',
  status_accepted: 'bg-green-500',
  status_rejected: 'bg-red-500',
  note_added: 'bg-gray-500',
}

export function SubmissionActivityTimeline({ submissionId }: { submissionId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [submissionId])

  async function fetchActivities() {
    try {
      setLoading(true)
      const response = await fetch(`/api/submissions/${submissionId}/activity`)

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }

      const data = await response.json()
      setActivities(data.activities)
    } catch (err) {
      console.error('Failed to fetch activity:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            {/* Activities */}
            <div className="space-y-6">
              {activities.map((activity, index) => {
                const Icon = activityIcons[activity.type] || FileText
                const color = activityColors[activity.type] || 'bg-gray-500'

                return (
                  <div key={activity.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${color} text-white shrink-0`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          {activity.partnerName && (
                            <p className="text-sm text-muted-foreground">
                              Partner: {activity.partnerName}
                            </p>
                          )}
                        </div>
                        <time className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {formatDate(activity.createdAt)}
                        </time>
                      </div>

                      {/* Metadata */}
                      {Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
