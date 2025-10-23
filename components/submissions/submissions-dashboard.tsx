/**
 * Submissions Dashboard Component
 *
 * Main dashboard for viewing and managing manuscript submissions with:
 * - Overview statistics
 * - Submission list with filtering
 * - Partner response tracking
 * - Status management
 *
 * Ticket: MS-4.1
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Send, Users, TrendingUp, Search, Filter, BarChart3, Shield } from 'lucide-react'
import Link from 'next/link'
import { SubmissionCard } from './submission-card'

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

interface SubmissionStats {
  totalSubmissions: number
  activeSubmissions: number
  totalPartners: number
  totalViews: number
  requestsReceived: number
  acceptanceRate: number
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
]

export function SubmissionsDashboard({ userId }: { userId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'activity' | 'title'>('recent')

  const fetchData = useCallback(async () => {
    if (!userId) {
      setSubmissions([])
      setStats(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [submissionsRes, statsRes] = await Promise.all([
        fetch('/api/submissions/list'),
        fetch('/api/submissions/statistics'),
      ])

      if (!submissionsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch submissions data')
      }

      const [submissionsData, statsData] = await Promise.all([
        submissionsRes.json(),
        statsRes.json(),
      ])

      setSubmissions(submissionsData.submissions)
      setStats(statsData.stats)
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter and sort submissions
  const filteredSubmissions = submissions
    .filter((sub) => {
      // Status filter
      if (filterStatus !== 'all' && sub.status !== filterStatus) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          sub.title.toLowerCase().includes(query) ||
          sub.genre.toLowerCase().includes(query)
        )
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'activity':
          if (!a.lastActivity && !b.lastActivity) return 0
          if (!a.lastActivity) return 1
          if (!b.lastActivity) return -1
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeSubmissions} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partners Contacted</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPartners}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalViews} views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requests Received</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requestsReceived}</div>
              <p className="text-xs text-muted-foreground">
                {stats.acceptanceRate.toFixed(0)}% acceptance rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Your Submissions</CardTitle>
              <CardDescription>Manage and track your manuscript submissions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/ip-protection">
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  IP Protection
                </Button>
              </Link>
              <Link href="/dashboard/submissions/analytics">
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link href="/dashboard/submissions/new">
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  New Submission
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions by title or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="activity">Recent Activity</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">
                {submissions.length === 0 ? 'No submissions yet' : 'No matching submissions'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {submissions.length === 0
                  ? 'Create your first submission to start sending your manuscript'
                  : 'Try adjusting your filters or search query'}
              </p>
              {submissions.length === 0 && (
                <Link href="/dashboard/submissions/new">
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Create Your First Submission
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
