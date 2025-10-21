/**
 * Collaborative Editor Component
 * Real-time multi-user editing with cursor presence and user indicators
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  Wifi,
  WifiOff,
  Circle,
  AlertCircle,
} from 'lucide-react'
import { useCollaboration, useActiveCollaborators } from '@/hooks/use-collaboration'
import { cn } from '@/lib/utils'

export type CollaborativeEditorProps = {
  documentId: string
  userId: string
  userName: string
  userColor?: string
  initialContent: string
  placeholder?: string
  className?: string
  onContentChange?: (content: string) => void
  onError?: (error: Error) => void
  disabled?: boolean
}

export function CollaborativeEditor({
  documentId,
  userId,
  userName,
  userColor,
  initialContent,
  placeholder = 'Start typing...',
  className,
  onContentChange,
  onError,
  disabled = false,
}: CollaborativeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localCursorPosition, setLocalCursorPosition] = useState(0)
  const [showReconnectButton, setShowReconnectButton] = useState(false)

  const {
    content,
    cursors,
    presence,
    isConnected,
    insertText,
    deleteText,
    updateCursor,
    reconnect,
  } = useCollaboration({
    documentId,
    userId,
    userName,
    userColor,
    initialContent,
    enabled: !disabled,
    onError: (error) => {
      console.error('[CollaborativeEditor] Error:', error)
      setShowReconnectButton(true)
      onError?.(error)
    },
  })

  const activeCollaborators = useActiveCollaborators(presence)

  // Sync content to parent
  useEffect(() => {
    onContentChange?.(content)
  }, [content, onContentChange])

  // Update textarea content when collaboration content changes
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== content) {
      const cursorPosition = textareaRef.current.selectionStart
      textareaRef.current.value = content

      // Restore cursor position
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [content])

  // Handle text input
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (disabled) return

      const textarea = e.currentTarget
      const newValue = textarea.value
      const oldValue = content

      // Find the difference
      let commonPrefixLength = 0
      while (
        commonPrefixLength < newValue.length &&
        commonPrefixLength < oldValue.length &&
        newValue[commonPrefixLength] === oldValue[commonPrefixLength]
      ) {
        commonPrefixLength++
      }

      let commonSuffixLength = 0
      while (
        commonSuffixLength < newValue.length - commonPrefixLength &&
        commonSuffixLength < oldValue.length - commonPrefixLength &&
        newValue[newValue.length - 1 - commonSuffixLength] === oldValue[oldValue.length - 1 - commonSuffixLength]
      ) {
        commonSuffixLength++
      }

      const oldTextLength = oldValue.length - commonPrefixLength - commonSuffixLength
      const newText = newValue.slice(commonPrefixLength, newValue.length - commonSuffixLength)

      // Apply operation
      if (oldTextLength > 0) {
        deleteText(commonPrefixLength, oldTextLength)
      }
      if (newText.length > 0) {
        insertText(commonPrefixLength, newText)
      }

      // Update local cursor position
      setLocalCursorPosition(textarea.selectionStart)
    },
    [content, disabled, insertText, deleteText]
  )

  // Handle cursor movement
  const handleCursorMove = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      if (disabled) return

      const textarea = e.currentTarget
      const position = textarea.selectionStart
      const end = textarea.selectionEnd

      setLocalCursorPosition(position)

      // Send cursor update
      if (position === end) {
        updateCursor(position)
      } else {
        updateCursor(position, { start: position, end })
      }
    },
    [disabled, updateCursor]
  )

  // Handle reconnect
  const handleReconnect = useCallback(async () => {
    try {
      await reconnect()
      setShowReconnectButton(false)
    } catch (error) {
      console.error('[CollaborativeEditor] Reconnect failed:', error)
    }
  }, [reconnect])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>Collaborative Editor</CardTitle>
            <CardDescription>
              Real-time editing with {activeCollaborators} other{activeCollaborators === 1 ? ' user' : ' users'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            {isConnected ? (
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Connected</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="h-3 w-3 text-red-500" />
                <span className="text-red-500">Disconnected</span>
              </Badge>
            )}

            {/* Active users count */}
            {activeCollaborators > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                <span>{activeCollaborators}</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Reconnect button */}
        {showReconnectButton && !isConnected && (
          <div className="mt-2">
            <Button onClick={handleReconnect} variant="outline" size="sm" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Reconnect
            </Button>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        {/* Active users list */}
        {presence.size > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Active Users:</div>
            <div className="flex flex-wrap gap-2">
              {Array.from(presence.values()).map((user) => (
                <Badge
                  key={user.userId}
                  variant="outline"
                  className="gap-1.5"
                  style={{
                    borderColor: user.userColor,
                  }}
                >
                  <Circle
                    className="h-2 w-2 fill-current"
                    style={{ color: user.userColor }}
                  />
                  <span>{user.userName}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Editor area with cursor overlays */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            className={cn(
              'w-full min-h-[400px] p-4 font-mono text-sm',
              'border rounded-md resize-y',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:bg-gray-50 disabled:cursor-not-allowed',
              className
            )}
            placeholder={placeholder}
            disabled={disabled}
            onInput={handleInput}
            onClick={handleCursorMove}
            onKeyUp={handleCursorMove}
            onSelect={handleCursorMove}
            defaultValue={initialContent}
          />

          {/* Remote cursor indicators */}
          {textareaRef.current && Array.from(cursors.values()).map((cursor) => (
            <RemoteCursor
              key={cursor.userId}
              cursor={cursor}
              textareaRef={textareaRef}
            />
          ))}
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            Position: {localCursorPosition} | Length: {content.length}
          </div>
          {isConnected && (
            <div className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              <span>Auto-saving...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Remote cursor indicator component
 */
function RemoteCursor({
  cursor,
  textareaRef,
}: {
  cursor: { userId: string; userName: string; userColor: string; position: number }
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const text = textarea.value

    // Calculate line and column
    const beforeCursor = text.slice(0, cursor.position)
    const lines = beforeCursor.split('\n')
    const line = lines.length - 1
    const column = lines[line].length

    // Get approximate position (this is a simplified calculation)
    const lineHeight = 20 // Approximate line height
    const charWidth = 8 // Approximate character width for monospace font

    const top = line * lineHeight + 16 // 16px for padding
    const left = column * charWidth + 16 // 16px for padding

    setPosition({ top, left })
  }, [cursor.position, textareaRef])

  if (!position) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 10,
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 h-5 animate-pulse"
        style={{ backgroundColor: cursor.userColor }}
      />

      {/* User name label */}
      <div
        className="absolute -top-6 left-0 px-2 py-0.5 text-xs text-white rounded whitespace-nowrap"
        style={{ backgroundColor: cursor.userColor }}
      >
        {cursor.userName}
      </div>
    </div>
  )
}
