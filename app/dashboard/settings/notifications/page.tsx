/**
 * Notification Settings Page
 *
 * Allows users to configure their submission notification preferences.
 *
 * Ticket: MS-4.2
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationPreferences } from '@/components/submissions/notification-preferences'

export default async function NotificationSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how you receive notifications about your manuscript submissions
        </p>
      </div>

      <NotificationPreferences userId={user.id} />
    </div>
  )
}
