/**
 * DMCA Requests List Component
 *
 * Displays all DMCA takedown requests with:
 * - Statistics cards
 * - Status filtering
 * - Request list with actions
 *
 * Ticket: MS-5.3
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, FileText, Clock, CheckCircle2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface DMCARequest {
  id: string
  workTitle: string
  infringingUrl: string
  infringingPlatform: string
  status: string
  submittedAt: string | null
  createdAt: string
}

interface DMCAStats {
  totalRequests: number
  draftRequests: number
  submittedRequests: number
  activeRequests: number
  completedRequests: number
  successRate: number
}

const statusColors: Record<string, string> = {
  draft: 'secondary',
  submitted: 'default',
  under_review: 'default',
  notice_sent: 'default',
  content_removed: 'default',
  counter_notice_received: 'destructive',
  rejected: 'destructive',
  withdrawn: 'secondary',
  completed: 'outline',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  notice_sent: 'Notice Sent',
  content_removed: 'Content Removed',
  counter_notice_received: 'Counter Notice',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  completed: 'Completed',
}

export function DMCARequestsList({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<DMCARequest[]>([])
  const [stats, setStats] = useState<DMCAStats | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setRequests([])
      setStats(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const [requestsRes, statsRes] = await Promise.all([
        fetch(`/api/ip-protection/dmca/requests?${params}`),
        fetch('/api/ip-protection/dmca/statistics'),
      ])

      if (!requestsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch DMCA data')
      }

      const [requestsData, statsData] = await Promise.all([
        requestsRes.json(),
        statsRes.json(),
      ])

      setRequests(requestsData.requests)
      setStats(statsData.stats)
    } catch (err) {
      console.error('Failed to fetch DMCA data:', err)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleWithdraw = async (requestId: string) => {
    if (!confirm('Are you sure you want to withdraw this DMCA request?')) return

    try {
      const response = await fetch(`/api/ip-protection/dmca/requests/${requestId}/withdraw`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to withdraw request')

      await fetchData()
    } catch (err) {
      console.error('Failed to withdraw request:', err)
      alert('Failed to withdraw request. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                {stats.draftRequests} draft
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRequests}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedRequests}</div>
              <p className="text-xs text-muted-foreground">Successfully resolved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Of submitted requests</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DMCA Requests</CardTitle>
              <CardDescription>Your copyright infringement takedown requests</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">No DMCA Requests</p>
              <p className="text-sm text-muted-foreground mb-4">
                You haven&apos;t submitted any DMCA takedown requests yet
              </p>
              <Link href="/dashboard/ip-protection/dmca/new">
                <Button>Create Your First Request</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{request.workTitle}</h4>
                      <Badge variant={statusColors[request.status] as any}>
                        {statusLabels[request.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {request.infringingPlatform}
                      </span>
                      <span>
                        {request.submittedAt
                          ? `Submitted ${new Date(request.submittedAt).toLocaleDateString()}`
                          : `Created ${new Date(request.createdAt).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate max-w-xl">
                      {request.infringingUrl}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {request.status === 'draft' && (
                      <Link href={`/dashboard/ip-protection/dmca/${request.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
                    {request.status !== 'withdrawn' && request.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleWithdraw(request.id)}
                      >
                        Withdraw
                      </Button>
                    )}
                    <Link href={`/dashboard/ip-protection/dmca/${request.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
