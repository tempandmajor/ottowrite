/**
 * Partner Responses List Component
 *
 * Displays all partner responses for a submission with:
 * - Response status
 * - Partner information
 * - Timeline
 * - Notes
 *
 * Ticket: MS-4.1
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  ExternalLink,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface PartnerResponse {
  id: string
  partnerId: string
  partnerName: string
  partnerCompany: string
  partnerType: string
  status: string
  submittedAt: string
  viewedByPartner: boolean
  firstViewedAt: string | null
  lastViewedAt: string | null
  viewCount: number
  partnerResponse: string | null
  partnerResponseDate: string | null
  rejectionReason: string | null
}

const statusColors: Record<string, any> = {
  draft: 'secondary',
  submitted: 'default',
  viewed: 'default',
  requested_more: 'default',
  accepted: 'default',
  rejected: 'destructive',
  withdrawn: 'secondary',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  viewed: 'Viewed',
  requested_more: 'Requested More',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const statusIcons: Record<string, any> = {
  draft: FileText,
  submitted: Mail,
  viewed: Eye,
  requested_more: Clock,
  accepted: CheckCircle2,
  rejected: XCircle,
}

export function PartnerResponsesList({ submissionId }: { submissionId: string }) {
  const [responses, setResponses] = useState<PartnerResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchResponses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/submissions/${submissionId}/partners`)

      if (!response.ok) {
        throw new Error('Failed to fetch partner responses')
      }

      const data = await response.json()
      setResponses(data.partners)
    } catch (err) {
      console.error('Failed to fetch partner responses:', err)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Responses</CardTitle>
        <CardDescription>
          {responses.length} {responses.length === 1 ? 'partner' : 'partners'} contacted
        </CardDescription>
      </CardHeader>
      <CardContent>
        {responses.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No partners have been contacted yet
            </p>
            <Link href={`/dashboard/submissions/${submissionId}/select-partners`}>
              <Button>Select Partners</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => {
              const StatusIcon = statusIcons[response.status] || Mail

              return (
                <div
                  key={response.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/dashboard/submissions/partners/${response.partnerId}`}
                          className="font-medium hover:underline"
                        >
                          {response.partnerName}
                        </Link>
                        <Badge variant={statusColors[response.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusLabels[response.status]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {response.partnerCompany} • {response.partnerType}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Submitted</div>
                      <div>{formatDate(response.submittedAt)}</div>
                    </div>

                    {response.viewedByPartner && response.firstViewedAt && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">First Viewed</div>
                        <div>{formatDate(response.firstViewedAt)}</div>
                      </div>
                    )}

                    {response.viewCount > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">View Count</div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {response.viewCount} {response.viewCount === 1 ? 'time' : 'times'}
                        </div>
                      </div>
                    )}

                    {response.partnerResponseDate && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Responded</div>
                        <div>{formatDate(response.partnerResponseDate)}</div>
                      </div>
                    )}
                  </div>

                  {response.partnerResponse && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <div className="text-xs font-medium mb-1">Partner Response:</div>
                      <div className="text-sm">{response.partnerResponse}</div>
                    </div>
                  )}

                  {response.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-xs font-medium mb-1 text-red-600 dark:text-red-400">
                        Rejection Reason:
                      </div>
                      <div className="text-sm text-red-900 dark:text-red-200">
                        {response.rejectionReason}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Link href={`/dashboard/submissions/partners/${response.partnerId}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Partner
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
