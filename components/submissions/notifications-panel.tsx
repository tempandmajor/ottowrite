'use client'

/**
 * Notifications Panel Component
 *
 * Displays in-app notifications for submission events in a dropdown panel.
 *
 * Ticket: MS-4.2
 */

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Loader2, Eye, FileText, Mail, PartyPopper, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  actionUrl: string | null
  read: boolean
  createdAt: string
  submissionId: string | null
}

interface NotificationsPanelProps {
  userId: string
}

const notificationIcons: Record<string, React.ReactNode> = {
  partner_viewed: <Eye className="h-4 w-4" />,
  material_requested: <FileText className="h-4 w-4" />,
  response_received: <Mail className="h-4 w-4" />,
  status_accepted: <PartyPopper className="h-4 w-4" />,
  status_rejected: <X className="h-4 w-4" />,
  submission_reminder: <Bell className="h-4 w-4" />,
}

const notificationColors: Record<string, string> = {
  partner_viewed: 'text-cyan-500',
  material_requested: 'text-amber-500',
  response_received: 'text-indigo-500',
  status_accepted: 'text-green-500',
  status_rejected: 'text-red-500',
  submission_reminder: 'text-purple-500',
}

export function NotificationsPanel({ userId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
      fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/list?limit=20')

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')

      if (!response.ok) {
        throw new Error('Failed to fetch unread count')
      }

      const data = await response.json()
      setUnreadCount(data.count)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to mark all as read')
      }

      // Update local state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between p-4 pb-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be notified about submission activity here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <Separator />
        <div className="p-2">
          <Link href="/dashboard/submissions?tab=notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full text-sm">
              View all notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification
  onClick: () => void
}) {
  const icon = notificationIcons[notification.type] || <Bell className="h-4 w-4" />
  const iconColor = notificationColors[notification.type] || 'text-muted-foreground'

  const content = (
    <div
      className={`flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-muted/30' : ''
      }`}
      onClick={onClick}
    >
      <div className={`mt-0.5 ${iconColor}`}>{icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{notification.title}</p>
          {!notification.read && (
            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-snug">{notification.message}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return content
}
