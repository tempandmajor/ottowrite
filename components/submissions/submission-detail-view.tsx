/**
 * Submission Detail View Component
 *
 * Detailed view of a single submission with:
 * - Full submission information
 * - Partner responses
 * - Activity timeline
 * - Actions
 *
 * Ticket: MS-4.1
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Calendar,
  FileText,
  Users,
  Activity,
  Download,
  Share2,
} from 'lucide-react'
import Link from 'next/link'
import { PartnerResponsesList } from './partner-responses-list'
import { SubmissionActivityTimeline } from './submission-activity-timeline'

interface SubmissionDetail {
  id: string
  title: string
  genre: string
  wordCount: number
  status: string
  synopsis: string
  queryLetter: string
  samplePages: string
  createdAt: string
  updatedAt: string
  totalPartners: number
  viewedCount: number
  requestedCount: number
  acceptedCount: number
  rejectedCount: number
}

export function SubmissionDetailView({ submissionId }: { submissionId: string }) {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmission = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/submissions/${submissionId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch submission')
      }

      const data = await response.json()
      setSubmission(data.submission)
    } catch (err) {
      console.error('Failed to fetch submission:', err)
      setError(err instanceof Error ? err.message : 'Failed to load submission')
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !submission) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">{error || 'Submission not found'}</p>
            <Link href="/dashboard/submissions">
              <Button variant="outline">Back to Submissions</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{submission.title}</h1>
            <Badge>{submission.status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {submission.genre}
            </span>
            <span>{submission.wordCount.toLocaleString()} words</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {formatDate(submission.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href={`/dashboard/submissions/${submission.id}/edit`}>
            <Button size="sm">Edit Submission</Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submission.totalPartners}</div>
            <p className="text-xs text-muted-foreground">Total contacted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Viewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submission.viewedCount}</div>
            <p className="text-xs text-muted-foreground">
              {submission.totalPartners > 0
                ? `${Math.round((submission.viewedCount / submission.totalPartners) * 100)}% view rate`
                : 'No partners yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submission.requestedCount}</div>
            <p className="text-xs text-muted-foreground">Material requested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{submission.acceptedCount}</div>
            <p className="text-xs text-muted-foreground">
              {submission.rejectedCount} rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">
            <Users className="h-4 w-4 mr-2" />
            Partner Responses
          </TabsTrigger>
          <TabsTrigger value="materials">
            <FileText className="h-4 w-4 mr-2" />
            Submission Materials
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <PartnerResponsesList submissionId={submission.id} />
        </TabsContent>

        <TabsContent value="materials">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Letter</CardTitle>
                <CardDescription>Your pitch to literary agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {submission.queryLetter || (
                    <p className="text-muted-foreground italic">No query letter provided</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Synopsis</CardTitle>
                <CardDescription>Detailed plot summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {submission.synopsis || (
                    <p className="text-muted-foreground italic">No synopsis provided</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Pages</CardTitle>
                <CardDescription>First pages of your manuscript</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-xs">
                  {submission.samplePages || (
                    <p className="text-muted-foreground italic">No sample pages provided</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <SubmissionActivityTimeline submissionId={submission.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
