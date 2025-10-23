/**
 * Submission Security Overview Component
 *
 * Displays security status cards for all user submissions showing:
 * - DRM protection status
 * - Access statistics
 * - Watermark status
 * - Alert counts
 *
 * Ticket: MS-3.4
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Eye, AlertTriangle, Lock, Users, Globe } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface SubmissionSecurity {
  id: string
  title: string
  status: string
  totalAccesses: number
  uniquePartners: number
  uniqueIps: number
  alertCount: number
  lastAccessed: string | null
  hasDrm: boolean
  hasWatermark: boolean
}

interface SecurityStats {
  totalSubmissions: number
  activeSubmissions: number
  totalAccesses: number
  totalAlerts: number
  protectedSubmissions: number
}

export function SubmissionSecurityOverview({ userId }: { userId: string }) {
  const [submissions, setSubmissions] = useState<SubmissionSecurity[]>([])
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/ip-protection/overview')
        if (!response.ok) {
          throw new Error('Failed to fetch IP protection data')
        }
        const data = await response.json()
        setSubmissions(data.submissions)
        setStats(data.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load security overview</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Total Accesses</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccesses}</div>
            <p className="text-xs text-muted-foreground">Across all submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protected</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.protectedSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSubmissions > 0
                ? Math.round((stats.protectedSubmissions / stats.totalSubmissions) * 100)
                : 0}
              % with DRM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAlerts > 0 ? 'Requires attention' : 'All clear'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Security Status</CardTitle>
          <CardDescription>Security overview for each manuscript submission</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No submissions yet</p>
              <p className="text-sm mb-4">Create your first submission to monitor access</p>
              <Link href="/dashboard/submissions/new">
                <Button>Create Submission</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{submission.title}</h4>
                      <Badge variant={submission.status === 'active' ? 'default' : 'secondary'}>
                        {submission.status}
                      </Badge>
                      {submission.hasDrm && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          DRM
                        </Badge>
                      )}
                      {submission.hasWatermark && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Watermarked
                        </Badge>
                      )}
                      {submission.alertCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {submission.alertCount} alerts
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {submission.totalAccesses} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {submission.uniquePartners} partners
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {submission.uniqueIps} IPs
                      </span>
                      {submission.lastAccessed && (
                        <span>
                          Last accessed:{' '}
                          {new Date(submission.lastAccessed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/submissions/${submission.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
