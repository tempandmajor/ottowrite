'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Globe,
  TrendingUp,
  Users,
  Clock,
  Award,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import type { SubmissionPartner } from '@/lib/submissions/types'

interface PartnerSale {
  id: string
  title: string
  author: string
  genre: string
  sale_date: string
  deal_type: string
  publisher?: string
}

interface PartnerStats {
  total_submissions: number
  total_acceptances: number
  acceptance_rate: number
  avg_response_time_days: number
  genre_breakdown: Record<string, number>
}

interface PartnerProfileProps {
  partnerId: string
  submissionId?: string // Optional - if user is selecting for a specific submission
}

export function PartnerProfile({ partnerId, submissionId }: PartnerProfileProps) {
  const router = useRouter()
  const [partner, setPartner] = useState<SubmissionPartner | null>(null)
  const [recentSales, setRecentSales] = useState<PartnerSale[]>([])
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPartner = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/submissions/partners/${partnerId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load partner')
        }

        setPartner(data.partner)
        setRecentSales(data.recentSales || [])
        setStats(data.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load partner')
      } finally {
        setLoading(false)
      }
    }

    fetchPartner()
  }, [partnerId])

  const handleSelectPartner = () => {
    if (submissionId) {
      router.push(`/dashboard/submissions/${submissionId}/select-partners?selected=${partnerId}`)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12 text-muted-foreground">Loading partner details...</div>
      </div>
    )
  }

  if (error || !partner) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Partner not found'}</AlertDescription>
        </Alert>
        <Link href="/dashboard/submissions">
          <Button variant="ghost" className="mt-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={
            submissionId
              ? `/dashboard/submissions/${submissionId}/select-partners`
              : '/dashboard/submissions'
          }
        >
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Partner Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl">{partner.name}</CardTitle>
                {partner.verified && (
                  <Badge variant="secondary">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    Verified
                  </Badge>
                )}
                {partner.aar_member && (
                  <Badge variant="outline">
                    <Award className="h-3 w-3 mr-1" />
                    AAR
                  </Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-4 text-base">
                <span className="flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  {partner.company}
                </span>
                <span className="capitalize">{partner.type}</span>
              </CardDescription>
            </div>
            {submissionId && partner.accepting_submissions && (
              <Button onClick={handleSelectPartner} size="lg">
                Select for Submission
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!partner.accepting_submissions && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This partner is currently not accepting new submissions.
              </AlertDescription>
            </Alert>
          )}

          {/* Bio */}
          {partner.bio && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{partner.bio}</p>
            </div>
          )}

          {/* Contact & Links */}
          <div className="space-y-2 mb-6">
            {partner.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${partner.email}`} className="text-primary hover:underline">
                  {partner.email}
                </a>
              </div>
            )}
            {partner.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {partner.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Genres */}
          {partner.genres && partner.genres.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Genres Represented</h3>
              <div className="flex flex-wrap gap-2">
                {partner.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Statistics</CardTitle>
          <CardDescription>Based on OttoWrite platform data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {partner.acceptance_rate !== null && partner.acceptance_rate !== undefined && (
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{partner.acceptance_rate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Acceptance Rate</div>
                </div>
              </div>
            )}

            {partner.total_submissions > 0 && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{partner.total_submissions}</div>
                  <div className="text-xs text-muted-foreground">Total Submissions</div>
                </div>
              </div>
            )}

            {partner.response_time_days && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{partner.response_time_days}</div>
                  <div className="text-xs text-muted-foreground">Days Avg Response</div>
                </div>
              </div>
            )}

            {stats?.total_acceptances && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.total_acceptances}</div>
                  <div className="text-xs text-muted-foreground">Total Acceptances</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      {recentSales && recentSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Recent Notable Sales
            </CardTitle>
            <CardDescription>Recent deals and publications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div key={sale.id} className="border-l-2 border-primary pl-4">
                  <div className="font-medium">{sale.title}</div>
                  <div className="text-sm text-muted-foreground">
                    by {sale.author} · {sale.genre}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {sale.deal_type}
                    {sale.publisher && ` · ${sale.publisher}`} ·{' '}
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Guidelines */}
      {partner.submission_guidelines && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {partner.submission_guidelines}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      {submissionId && partner.accepting_submissions && (
        <div className="sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="text-sm">
              <div className="font-medium">{partner.name}</div>
              <div className="text-muted-foreground">{partner.company}</div>
            </div>
            <Button onClick={handleSelectPartner} size="lg">
              Select for Submission
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
