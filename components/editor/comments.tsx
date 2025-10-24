/**
 * Comment Threads Component
 * Inline commenting with threading, @mentions, and resolve functionality
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare,
  Send,
  Check,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  AtSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export type Comment = {
  id: string
  thread_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  mentioned_users: string[]
  is_edited: boolean
  edited_at: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    email: string
  }
}

export type CommentThread = {
  id: string
  document_id: string
  user_id: string
  start_position: number
  end_position: number
  quoted_text: string
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
  comments: Comment[]
}

export type CommentThreadsProps = {
  documentId: string
  userId: string
  onThreadUpdate?: (thread: CommentThread) => void
}

export function CommentThreads({
  documentId,
  userId,
  onThreadUpdate,
}: CommentThreadsProps) {
  const [threads, setThreads] = useState<CommentThread[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments/threads?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to load threads')

      const data = await response.json()
      setThreads(data.threads || [])
    } catch (error) {
      console.error('[CommentThreads] Error loading threads:', error)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Filter threads based on resolved status
  const filteredThreads = showResolved
    ? threads
    : threads.filter((thread) => !thread.is_resolved)

  const unresolvedCount = threads.filter((t) => !t.is_resolved).length
  const resolvedCount = threads.filter((t) => t.is_resolved).length

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
              <CardDescription>
                {unresolvedCount} open, {resolvedCount} resolved
              </CardDescription>
            </div>

            <Button
              variant={showResolved ? "default" : "outline"}
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Hide' : 'Show'} Resolved
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Thread list */}
      {filteredThreads.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No {showResolved ? '' : 'open '}comments yet</p>
              <p className="text-sm mt-1">Select text in the editor to add a comment</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        filteredThreads.map((thread) => (
          <CommentThreadCard
            key={thread.id}
            thread={thread}
            userId={userId}
            onUpdate={async () => {
              await loadThreads()
              onThreadUpdate?.(thread)
            }}
          />
        ))
      )}
    </div>
  )
}

type CommentThreadCardProps = {
  thread: CommentThread
  userId: string
  onUpdate: () => Promise<void>
}

function CommentThreadCard({ thread, userId, onUpdate }: CommentThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleResolve = async () => {
    try {
      const response = await fetch('/api/comments/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          isResolved: !thread.is_resolved,
        }),
      })

      if (!response.ok) throw new Error('Failed to update thread')

      await onUpdate()
    } catch (error) {
      console.error('[CommentThread] Error updating thread:', error)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Extract mentioned user IDs from @mentions in the content
      const mentionedUsers = extractMentions(replyContent)

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          content: replyContent,
          mentionedUsers,
        }),
      })

      if (!response.ok) throw new Error('Failed to create reply')

      setReplyContent('')
      setIsReplying(false)
      await onUpdate()
    } catch (error) {
      console.error('[CommentThread] Error creating reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle @ mention detection
  const handleContentChange = (value: string) => {
    setReplyContent(value)

    // Check for @ mention
    const cursorPos = value.length
    const beforeCursor = value.slice(0, cursorPos)
    const match = beforeCursor.match(/@(\w*)$/)

    if (match) {
      setShowMentionMenu(true)
    } else {
      setShowMentionMenu(false)
    }
  }

  return (
    <Card className={cn(thread.is_resolved && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {thread.is_resolved ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-600 truncate">
                {thread.comments[0]?.user?.email || 'Unknown'}
              </span>
              <span className="text-xs text-gray-600">
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded italic">
              &ldquo;{thread.quoted_text}&rdquo;
            </p>
          </div>

          <Button
            variant={thread.is_resolved ? "outline" : "default"}
            size="sm"
            onClick={handleResolve}
            className="flex-shrink-0"
          >
            {thread.is_resolved ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Reopen Thread
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Mark Comment Resolved
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-3">
        {/* Comments */}
        {thread.comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            userId={userId}
            onUpdate={onUpdate}
          />
        ))}

        {/* Reply section */}
        {!thread.is_resolved && (
          <>
            {!isReplying ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(true)}
                className="w-full justify-start text-gray-500"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Reply...
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write a reply... Use @ to mention someone"
                  className="min-h-[80px]"
                />
                {showMentionMenu && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    Type to search users...
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={!replyContent.trim() || isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsReplying(false)
                      setReplyContent('')
                    }}
                    disabled={isSubmitting}
                  >
                    Discard Reply
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

type CommentItemProps = {
  comment: Comment
  userId: string
  onUpdate: () => Promise<void>
}

function CommentItem({ comment, userId, onUpdate }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isOwner = comment.user_id === userId

  const handleEdit = async () => {
    if (!editContent.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      const mentionedUsers = extractMentions(editContent)

      const response = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          content: editContent,
          mentionedUsers,
        }),
      })

      if (!response.ok) throw new Error('Failed to update comment')

      setIsEditing(false)
      await onUpdate()
    } catch (error) {
      console.error('[Comment] Error updating:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return

    try {
      const response = await fetch(`/api/comments?commentId=${comment.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete comment')

      await onUpdate()
    } catch (error) {
      console.error('[Comment] Error deleting:', error)
    }
  }

  return (
    <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.user.email}</span>
            <span className="text-xs text-gray-600">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.is_edited && (
              <Badge variant="outline" className="text-xs">
                edited
              </Badge>
            )}
          </div>
        </div>

        {isOwner && !isEditing && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2 mt-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleEdit}
              disabled={!editContent.trim() || isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Comment'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setEditContent(comment.content)
              }}
              disabled={isSubmitting}
            >
              Discard Changes
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {renderContentWithMentions(comment.content)}
        </p>
      )}
    </div>
  )
}

/**
 * Extract user IDs from @mention syntax
 * Format: @user:uuid or @email
 */
function extractMentions(content: string): string[] {
  const mentions: string[] = []
  const regex = /@user:([a-f0-9-]{36})/g
  let match

  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Render content with highlighted @mentions
 */
function renderContentWithMentions(content: string) {
  // Simple rendering for now - could be enhanced with actual user names
  return content
}
