/**
 * Security Alerts Panel Component
 *
 * Displays and manages security alerts for suspicious manuscript access:
 * - Alert severity levels
 * - Alert types (rapid access, unusual location, etc.)
 * - Alert status management
 * - Alert resolution workflow
 *
 * Ticket: MS-3.4
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
import {
  AlertTriangle,
  Shield,
  Globe,
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface SecurityAlert {
  id: string
  submissionId: string
  submissionTitle: string
  partnerName: string
  partnerEmail: string
  alertType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detectedAt: string
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved'
  metadata: {
    accessCount?: number
    deviceCount?: number
    ipCount?: number
    timeWindow?: string
  }
}

const alertTypeLabels: Record<string, string> = {
  rapid_access: 'Rapid Access',
  unusual_location: 'Unusual Location',
  multiple_devices: 'Multiple Devices',
  access_after_expiry: 'Expired Token Access',
  unauthorized_action: 'Unauthorized Action',
  ip_mismatch: 'IP Mismatch',
  suspicious_user_agent: 'Suspicious User Agent',
  excessive_duration: 'Excessive Duration',
  concurrent_sessions: 'Concurrent Sessions',
}

const alertTypeIcons: Record<string, any> = {
  rapid_access: Clock,
  unusual_location: Globe,
  multiple_devices: Smartphone,
  ip_mismatch: Globe,
  access_after_expiry: Shield,
  unauthorized_action: AlertTriangle,
}

export function SecurityAlertsPanel({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchAlerts = useCallback(async () => {
    if (!userId) {
      setAlerts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterSeverity !== 'all') params.append('severity', filterSeverity)

      const response = await fetch(`/api/ip-protection/alerts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')

      const data = await response.json()
      setAlerts(data.alerts)
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }, [filterSeverity, filterStatus, userId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function updateAlertStatus(alertId: string, status: string, notes: string) {
    try {
      setUpdating(true)
      const response = await fetch(`/api/ip-protection/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })

      if (!response.ok) throw new Error('Failed to update alert')

      await fetchAlerts()
      setSelectedAlert(null)
      setResolutionNotes('')
    } catch (err) {
      console.error('Failed to update alert:', err)
    } finally {
      setUpdating(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'destructive'
      case 'investigating':
        return 'default'
      case 'confirmed':
        return 'destructive'
      case 'false_positive':
        return 'secondary'
      case 'resolved':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Suspicious activity detected across your submissions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-lg font-medium mb-2">All Clear!</p>
              <p className="text-sm text-muted-foreground">
                No security alerts detected for your submissions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const IconComponent = alertTypeIcons[alert.alertType] || AlertTriangle

                return (
                  <button
                    type="button"
                    key={alert.id}
                    className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {alertTypeLabels[alert.alertType] || alert.alertType}
                            </h4>
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant={getStatusColor(alert.status)}>{alert.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Submission: {alert.submissionTitle}</span>
                            <span>Partner: {alert.partnerName}</span>
                            <span>
                              Detected:{' '}
                              {new Date(alert.detectedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-full bg-muted p-2 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAlert && alertTypeLabels[selectedAlert.alertType]}
            </DialogTitle>
            <DialogDescription>Review and manage this security alert</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Severity</div>
                  <Badge variant={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <Badge variant={getStatusColor(selectedAlert.status)}>
                    {selectedAlert.status}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Submission</div>
                <div className="font-medium">{selectedAlert.submissionTitle}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Partner</div>
                <div className="font-medium">{selectedAlert.partnerName}</div>
                <div className="text-sm text-muted-foreground">{selectedAlert.partnerEmail}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <p>{selectedAlert.description}</p>
              </div>

              {Object.keys(selectedAlert.metadata).length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Details</div>
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    {selectedAlert.metadata.accessCount && (
                      <div>Access count: {selectedAlert.metadata.accessCount}</div>
                    )}
                    {selectedAlert.metadata.deviceCount && (
                      <div>Device count: {selectedAlert.metadata.deviceCount}</div>
                    )}
                    {selectedAlert.metadata.ipCount && (
                      <div>IP count: {selectedAlert.metadata.ipCount}</div>
                    )}
                    {selectedAlert.metadata.timeWindow && (
                      <div>Time window: {selectedAlert.metadata.timeWindow}</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground mb-2">Resolution Notes</div>
                <Textarea
                  placeholder="Add notes about how you resolved this alert..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedAlert && updateAlertStatus(selectedAlert.id, 'false_positive', resolutionNotes)
              }
              disabled={updating}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark as False Positive
            </Button>
            <Button
              onClick={() =>
                selectedAlert && updateAlertStatus(selectedAlert.id, 'resolved', resolutionNotes)
              }
              disabled={updating}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
