/**
 * Comment Trigger Component
 * Handles text selection and inline comment creation
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, X, Send } from 'lucide-react'

export type CommentTriggerProps = {
  documentId: string
  onCommentCreate?: () => void
}

export function CommentTrigger({ documentId, onCommentCreate }: CommentTriggerProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const [selection, setSelection] = useState<{
    text: string
    start: number
    end: number
  } | null>(null)
  const [commentContent, setCommentContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setShowPopup(false)
      return
    }

    const range = sel.getRangeAt(0)
    const selectedText = sel.toString().trim()

    if (selectedText.length === 0 || selectedText.length > 1000) {
      setShowPopup(false)
      return
    }

    // Calculate position for popup
    const rect = range.getBoundingClientRect()
    setPopupPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    })

    setSelection({
      text: selectedText,
      start: range.startOffset,
      end: range.endOffset,
    })

    setShowPopup(true)
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

  const handleSubmit = async () => {
    if (!selection || !commentContent.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/comments/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          startPosition: selection.start,
          endPosition: selection.end,
          quotedText: selection.text,
          initialComment: commentContent,
        }),
      })

      if (!response.ok) throw new Error('Failed to create comment')

      // Reset
      setCommentContent('')
      setShowPopup(false)
      setSelection(null)
      onCommentCreate?.()

      // Clear selection
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      console.error('[CommentTrigger] Error creating comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowPopup(false)
    setSelection(null)
    setCommentContent('')
    window.getSelection()?.removeAllRanges()
  }

  if (!showPopup || !selection) return null

  return (
    <div
      ref={popupRef}
      className="fixed z-50"
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
      }}
    >
      <Card className="w-80 shadow-lg">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Add Comment</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
              aria-label="Close comment dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
            <p className="text-gray-700 dark:text-gray-300 italic line-clamp-2">
              &ldquo;{selection.text}&rdquo;
            </p>
          </div>

          <Textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Write your comment... Use @ to mention someone"
            className="min-h-[80px]"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!commentContent.trim() || isSubmitting}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-1" />
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
