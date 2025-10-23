/**
 * Recent Access Logs Component
 *
 * Displays detailed access logs for all submissions with:
 * - Chronological access history
 * - Partner information
 * - IP addresses and locations
 * - Action types (view query, synopsis, samples)
 *
 * Ticket: MS-3.4
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, FileText, Book, Download, Printer, Copy, Globe, Calendar } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AccessLog {
  id: string
  submissionTitle: string
  partnerName: string
  partnerEmail: string
  action: string
  accessedAt: string
  ipAddress: string | null
  locationCountry: string | null
  sessionDuration: number | null
  accessGranted: boolean
}

const actionLabels: Record<string, string> = {
  view_query: 'Viewed Query Letter',
  view_synopsis: 'Viewed Synopsis',
  view_samples: 'Viewed Sample Pages',
  download_attempted: 'Attempted Download',
  print_attempted: 'Attempted Print',
  copy_attempted: 'Attempted Copy',
  share_attempted: 'Attempted Share',
}

const actionIcons: Record<string, any> = {
  view_query: FileText,
  view_synopsis: Book,
  view_samples: Eye,
  download_attempted: Download,
  print_attempted: Printer,
  copy_attempted: Copy,
  share_attempted: Globe,
}

export function RecentAccessLogs({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [filterAction, setFilterAction] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [userId, filterAction, page])

  async function fetchLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterAction !== 'all') params.append('action', filterAction)
      params.append('page', page.toString())
      params.append('limit', '50')

      const response = await fetch(`/api/ip-protection/access-logs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch access logs')

      const data = await response.json()
      setLogs(data.logs)
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Failed to fetch access logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Access Logs</CardTitle>
            <CardDescription>Detailed history of all manuscript access</CardDescription>
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="view_query">Query Letter Views</SelectItem>
              <SelectItem value="view_synopsis">Synopsis Views</SelectItem>
              <SelectItem value="view_samples">Sample Page Views</SelectItem>
              <SelectItem value="download_attempted">Download Attempts</SelectItem>
              <SelectItem value="print_attempted">Print Attempts</SelectItem>
              <SelectItem value="copy_attempted">Copy Attempts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No Access Logs</p>
            <p className="text-sm text-muted-foreground">
              Access logs will appear here when partners view your submissions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const IconComponent = actionIcons[log.action] || Eye

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {new Date(log.accessedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.accessedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium max-w-[200px] truncate">
                          {log.submissionTitle}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.partnerName}</div>
                          <div className="text-xs text-muted-foreground">{log.partnerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{actionLabels[log.action] || log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {log.locationCountry && (
                            <>
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              {log.locationCountry}
                            </>
                          )}
                          {log.ipAddress && (
                            <div className="text-xs text-muted-foreground">
                              {log.ipAddress}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(log.sessionDuration)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.accessGranted ? 'outline' : 'destructive'}>
                          {log.accessGranted ? 'Granted' : 'Denied'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setPage(page + 1)}
                  className="text-sm text-primary hover:underline"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
