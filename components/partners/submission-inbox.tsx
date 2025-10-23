'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  User,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface PartnerSubmissionInboxProps {
  partnerId: string
}

interface Submission {
  id: string
  title: string
  genre: string
  word_count: number
  author_name: string
  submitted_at: string
  status: 'submitted' | 'viewed' | 'accepted' | 'rejected' | 'requested_more'
  query_letter_preview: string
}

export function PartnerSubmissionInbox({ partnerId }: PartnerSubmissionInboxProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        partner_id: partnerId,
        ...(filter !== 'all' && { status: filter }),
      })

      const response = await fetch(`/api/partners/submissions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, filter])

  const filteredSubmissions = submissions.filter((submission) => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      submission.title.toLowerCase().includes(search) ||
      submission.author_name.toLowerCase().includes(search) ||
      submission.genre.toLowerCase().includes(search)
    )
  })

  const getStatusBadge = (status: Submission['status']) => {
    const statusConfig = {
      submitted: { label: 'New', variant: 'default' as const, icon: Clock },
      viewed: { label: 'Viewed', variant: 'secondary' as const, icon: FileText },
      accepted: { label: 'Accepted', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
      requested_more: { label: 'Requested More', variant: 'default' as const, icon: FileText },
    }

    const config = statusConfig[status] || statusConfig.submitted
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getCounts = () => {
    return {
      all: submissions.length,
      submitted: submissions.filter(s => s.status === 'submitted').length,
      viewed: submissions.filter(s => s.status === 'viewed').length,
      accepted: submissions.filter(s => s.status === 'accepted').length,
      rejected: submissions.filter(s => s.status === 'rejected').length,
    }
  }

  const counts = getCounts()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Submission Inbox</CardTitle>
            <CardDescription>
              Review and respond to manuscript submissions
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="all">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              New ({counts.submitted})
            </TabsTrigger>
            <TabsTrigger value="viewed">
              Viewed ({counts.viewed})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted ({counts.accepted})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({counts.rejected})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading submissions...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map((submission) => (
                  <Card key={submission.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{submission.title}</CardTitle>
                            {getStatusBadge(submission.status)}
                          </div>
                          <CardDescription className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {submission.author_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {submission.genre}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {submission.word_count.toLocaleString()} words
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                            </span>
                          </CardDescription>
                        </div>
                        <Link href={`/partners/submissions/${submission.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.query_letter_preview}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
