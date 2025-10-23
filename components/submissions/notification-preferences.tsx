'use client'

/**
 * Notification Preferences Component
 *
 * Allows users to configure their submission notification settings.
 *
 * Ticket: MS-4.2
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Bell, Mail, Loader2, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface NotificationPreferences {
  emailEnabled: boolean
  inAppEnabled: boolean
  notifyPartnerViewed: boolean
  notifyMaterialRequested: boolean
  notifyResponseReceived: boolean
  notifyStatusAccepted: boolean
  notifyStatusRejected: boolean
  notifySubmissionReminder: boolean
  emailDigestFrequency: 'immediate' | 'daily' | 'weekly' | 'never'
}

interface NotificationPreferencesProps {
  userId: string
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/preferences')

      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }

      const data = await response.json()
      setPreferences(data.preferences)
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      setSaved(false)

      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      setSaved(true)
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated',
      })

      // Reset saved indicator after 2 seconds
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load notification preferences</p>
          <Button onClick={fetchPreferences} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about submission activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Notification Channels</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="in-app-enabled" className="cursor-pointer">
                      In-app notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications in the dashboard
                    </p>
                  </div>
                </div>
                <Switch
                  id="in-app-enabled"
                  checked={preferences.inAppEnabled}
                  onCheckedChange={(checked: boolean) => updatePreference('inAppEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-enabled" className="cursor-pointer">
                      Email notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-enabled"
                  checked={preferences.emailEnabled}
                  onCheckedChange={(checked: boolean) => updatePreference('emailEnabled', checked)}
                />
              </div>

              {preferences.emailEnabled && (
                <div className="ml-7 mt-3 space-y-2">
                  <Label htmlFor="email-frequency">Email frequency</Label>
                  <Select
                    value={preferences.emailDigestFrequency}
                    onValueChange={(value) =>
                      updatePreference(
                        'emailDigestFrequency',
                        value as NotificationPreferences['emailDigestFrequency']
                      )
                    }
                  >
                    <SelectTrigger id="email-frequency" className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily digest</SelectItem>
                      <SelectItem value="weekly">Weekly digest</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Event Notifications */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Event Notifications</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which events trigger notifications
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-partner-viewed" className="cursor-pointer">
                    Partner viewed submission
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When a partner opens your query letter or synopsis
                  </p>
                </div>
                <Switch
                  id="notify-partner-viewed"
                  checked={preferences.notifyPartnerViewed}
                  onCheckedChange={(checked: boolean) =>
                    updatePreference('notifyPartnerViewed', checked)
                  }
                  disabled={!preferences.inAppEnabled && !preferences.emailEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-material-requested" className="cursor-pointer">
                    Material requested
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When a partner requests sample pages or full manuscript
                  </p>
                </div>
                <Switch
                  id="notify-material-requested"
                  checked={preferences.notifyMaterialRequested}
                  onCheckedChange={(checked: boolean) =>
                    updatePreference('notifyMaterialRequested', checked)
                  }
                  disabled={!preferences.inAppEnabled && !preferences.emailEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-response-received" className="cursor-pointer">
                    Response received
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When a partner sends a response to your submission
                  </p>
                </div>
                <Switch
                  id="notify-response-received"
                  checked={preferences.notifyResponseReceived}
                  onCheckedChange={(checked: boolean) =>
                    updatePreference('notifyResponseReceived', checked)
                  }
                  disabled={!preferences.inAppEnabled && !preferences.emailEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-status-accepted" className="cursor-pointer">
                    Submission accepted
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When a partner accepts your submission (offer of representation)
                  </p>
                </div>
                <Switch
                  id="notify-status-accepted"
                  checked={preferences.notifyStatusAccepted}
                  onCheckedChange={(checked: boolean) =>
                    updatePreference('notifyStatusAccepted', checked)
                  }
                  disabled={!preferences.inAppEnabled && !preferences.emailEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-status-rejected" className="cursor-pointer">
                    Submission declined
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When a partner declines your submission
                  </p>
                </div>
                <Switch
                  id="notify-status-rejected"
                  checked={preferences.notifyStatusRejected}
                  onCheckedChange={(checked: boolean) =>
                    updatePreference('notifyStatusRejected', checked)
                  }
                  disabled={!preferences.inAppEnabled && !preferences.emailEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-submission-reminder" className="cursor-pointer">
                    Submission reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Periodic reminders for submissions awaiting response
                  </p>
                </div>
                <Switch
                  id="notify-submission-reminder"
                  checked={preferences.notifySubmissionReminder}
                  onCheckedChange={(checked: boolean) =>
                    updatePreference('notifySubmissionReminder', checked)
                  }
                  disabled={!preferences.inAppEnabled && !preferences.emailEnabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4">
          <Button onClick={savePreferences} disabled={saving || saved}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saved && <Check className="h-4 w-4 mr-2" />}
            {saved ? 'Saved' : 'Save Preferences'}
          </Button>
          {!preferences.inAppEnabled && !preferences.emailEnabled && (
            <p className="text-sm text-amber-600">
              Enable at least one notification channel to receive notifications
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
