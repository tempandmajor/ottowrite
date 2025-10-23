'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Eye,
  FileText,
  BookOpen,
  Download,
  Printer,
  Copy,
  Share2,
  AlertTriangle,
  Shield,
  Activity,
  MapPin,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type {
  AccessLogEntry,
  SuspiciousActivityAlert,
  AccessSummary,
} from '@/lib/submissions/audit-trail'
import {
  formatAction,
  formatAlertType,
  getSeverityVariant,
} from '@/lib/submissions/audit-trail'

interface AccessAuditViewerProps {
  submissionId: string
}

export function AccessAuditViewer({ submissionId }: AccessAuditViewerProps) {
  const [summary, setSummary] = useState<AccessSummary | null>(null)
  const [logs, setLogs] = useState<AccessLogEntry[]>([])
  const [alerts, setAlerts] = useState<SuspiciousActivityAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAuditData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  const fetchAuditData = async () => {
    setLoading(true)
    try {
      // Fetch all audit data in parallel
      const [summaryRes, logsRes, alertsRes] = await Promise.all([
        fetch(`/api/submissions/${submissionId}/audit/summary`),
        fetch(`/api/submissions/${submissionId}/audit/logs`),
        fetch(`/api/submissions/${submissionId}/audit/alerts`),
      ])

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data.summary)
      }

      if (logsRes.ok) {
        const data = await logsRes.json()
        setLogs(data.logs || [])
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch audit data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      view_query: FileText,
      view_synopsis: BookOpen,
      view_samples: Eye,
      download_attempted: Download,
      print_attempted: Printer,
      copy_attempted: Copy,
      share_attempted: Share2,
    }
    const Icon = icons[action] || Eye
    return <Icon className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Audit Trail</CardTitle>
          <CardDescription>Loading audit data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accesses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalAccesses}</div>
              <p className="text-xs text-muted-foreground">
                From {summary.uniquePartners} partner{summary.uniquePartners !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Devices</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueDevices}</div>
              <p className="text-xs text-muted-foreground">
                {summary.uniqueIps} unique IP{summary.uniqueIps !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">View Breakdown</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Query:</span>
                  <span className="font-medium">{summary.queryViews}</span>
                </div>
                <div className="flex justify-between">
                  <span>Synopsis:</span>
                  <span className="font-medium">{summary.synopsisViews}</span>
                </div>
                <div className="flex justify-between">
                  <span>Samples:</span>
                  <span className="font-medium">{summary.sampleViews}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <p className="text-xs text-muted-foreground">
                {summary.deniedAccesses} denied access{summary.deniedAccesses !== 1 ? 'es' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Alerts */}
      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Alert:</strong> {alerts.length} suspicious activit
            {alerts.length === 1 ? 'y' : 'ies'} detected. Review the alerts tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for Logs and Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Access Audit Trail</CardTitle>
          <CardDescription>
            Complete history of who accessed your manuscript and when
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="logs">
                Access Logs ({logs.length})
              </TabsTrigger>
              <TabsTrigger value="alerts">
                Security Alerts ({alerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="mt-6">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No access logs yet</p>
                  <p className="text-sm">
                    Logs will appear when partners view your manuscript
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.partnerName || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                {log.partnerEmail}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="text-sm">{formatAction(log.action)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(log.accessedAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.locationCountry ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {log.locationCountry}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.sessionDurationSeconds ? (
                              <span className="text-sm">
                                {Math.floor(log.sessionDurationSeconds / 60)}m{' '}
                                {log.sessionDurationSeconds % 60}s
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="mt-6">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No security alerts</p>
                  <p className="text-sm">Your manuscript access appears normal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getSeverityVariant(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="text-sm font-medium">
                                {formatAlertType(alert.alertType)}
                              </span>
                              <Badge variant="outline">{alert.status}</Badge>
                            </div>
                            <p className="text-sm mb-2">{alert.description}</p>
                            <div className="text-xs text-muted-foreground">
                              Detected{' '}
                              {formatDistanceToNow(new Date(alert.detectedAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
