'use client'

/**
 * Top Partners List Component
 *
 * Displays top performing partners by acceptance rate.
 *
 * Ticket: MS-4.3
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp } from 'lucide-react'

interface TopPartner {
  partnerId: string
  partnerName: string
  partnerType: string
  submissionsSent: number
  acceptances: number
  acceptanceRate: number
  avgResponseDays: number
}

interface TopPartnersListProps {
  userId: string
}

export function TopPartnersList({ userId }: TopPartnersListProps) {
  const [partners, setPartners] = useState<TopPartner[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPartners = useCallback(async () => {
    if (!userId) {
      setPartners([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/submissions/analytics/partners?limit=5')

      if (!response.ok) {
        throw new Error('Failed to fetch partners')
      }

      const data = await response.json()
      setPartners(data.partners)
    } catch (error) {
      console.error('Error fetching partners:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Partners</CardTitle>
          <CardDescription>Partners with the best response rates</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (partners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Partners</CardTitle>
          <CardDescription>Partners with the best response rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No partner data yet. Need at least 3 responses per partner to show insights.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Partners</CardTitle>
        <CardDescription>Partners with the best response rates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {partners.map((partner, index) => (
            <div
              key={partner.partnerId}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{partner.partnerName}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {partner.partnerType}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {partner.acceptanceRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{partner.submissionsSent} submissions</span>
                  <span>•</span>
                  <span>{partner.acceptances} accepted</span>
                  <span>•</span>
                  <span>~{Math.round(partner.avgResponseDays)}d response</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
