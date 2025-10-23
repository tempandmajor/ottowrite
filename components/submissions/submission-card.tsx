/**
 * Submission Card Component
 *
 * Displays a single submission with:
 * - Basic information
 * - Status badge
 * - Partner statistics
 * - Quick actions
 *
 * Ticket: MS-4.1
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, Users, Clock, CheckCircle2, XCircle, MoreVertical, Pause, Play, BookOpen } from 'lucide-react'

interface Submission {
  id: string
  title: string
  genre: string
  wordCount: number
  status: string
  createdAt: string
  totalPartners: number
  viewedCount: number
  requestedCount: number
  acceptedCount: number
  rejectedCount: number
  lastActivity: string | null
}

const statusColors: Record<string, any> = {
  draft: 'secondary',
  active: 'default',
  paused: 'outline',
  closed: 'secondary',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
}

export function SubmissionCard({
  submission,
  onUpdate,
}: {
  submission: Submission
  onUpdate: () => void
}) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/submissions/${submission.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      onUpdate()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatWordCount = (count: number) => {
    return count.toLocaleString()
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/dashboard/submissions/${submission.id}`}>
                <h3 className="text-lg font-semibold hover:underline">{submission.title}</h3>
              </Link>
              <Badge variant={statusColors[submission.status]}>
                {statusLabels[submission.status]}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {submission.genre}
              </span>
              <span>{formatWordCount(submission.wordCount)} words</span>
              <span>Created {formatDate(submission.createdAt)}</span>
            </div>

            {/* Partner Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Partners</div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{submission.totalPartners}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Viewed</div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold">{submission.viewedCount}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Requests</div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">{submission.requestedCount}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Accepted</div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-semibold">{submission.acceptedCount}</span>
                  {submission.rejectedCount > 0 && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-semibold">{submission.rejectedCount}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {submission.lastActivity && (
              <div className="mt-3 text-xs text-muted-foreground">
                Last activity: {formatDate(submission.lastActivity)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-4">
            <Link href={`/dashboard/submissions/${submission.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={updating}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {submission.status === 'active' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Submission
                  </DropdownMenuItem>
                )}
                {submission.status === 'paused' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume Submission
                  </DropdownMenuItem>
                )}
                {submission.status !== 'closed' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Close Submission
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/submissions/${submission.id}/edit`}>
                    Edit Submission
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
