/**
 * React hooks for real-time collaboration
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CollaborationClient, type CursorPosition, type UserPresence } from '@/lib/collaboration/client'
import { insertOp, deleteOp, type TextOperation } from '@/lib/collaboration/ot-engine'

export type CollaborationHookOptions = {
  documentId: string
  userId: string
  userName: string
  userColor?: string
  initialContent: string
  enabled?: boolean
  onError?: (error: Error) => void
}

export type CollaborationHookResult = {
  content: string
  cursors: Map<string, CursorPosition>
  presence: Map<string, UserPresence>
  isConnected: boolean
  insertText: (position: number, text: string) => void
  deleteText: (position: number, count: number) => void
  updateCursor: (position: number, selection?: { start: number; end: number }) => void
  reconnect: () => Promise<void>
  disconnect: () => Promise<void>
}

/**
 * Hook for real-time collaborative editing
 */
export function useCollaboration(options: CollaborationHookOptions): CollaborationHookResult {
  const {
    documentId,
    userId,
    userName,
    userColor = generateUserColor(userId),
    initialContent,
    enabled = true,
    onError,
  } = options

  const [content, setContent] = useState(initialContent)
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map())
  const [presence, setPresence] = useState<Map<string, UserPresence>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  const clientRef = useRef<CollaborationClient | null>(null)
  const contentLengthRef = useRef(initialContent.length)

  // Initialize collaboration client
  useEffect(() => {
    if (!enabled) return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const client = new CollaborationClient(
      supabaseUrl,
      supabaseKey,
      documentId,
      userId,
      userName,
      userColor,
      initialContent,
      {
        onContentChange: (newContent) => {
          setContent(newContent)
          contentLengthRef.current = newContent.length
        },
        onCursorChange: (newCursors) => {
          setCursors(new Map(newCursors))
        },
        onPresenceChange: (newPresence) => {
          setPresence(new Map(newPresence))
        },
        onError: (error) => {
          console.error('[Collaboration] Error:', error)
          onError?.(error)
        },
        onConnectionChange: (connected) => {
          setIsConnected(connected)
        },
      }
    )

    clientRef.current = client

    // Connect to collaboration channel
    client.connect().catch((error) => {
      console.error('[Collaboration] Failed to connect:', error)
      onError?.(error)
    })

    // Cleanup on unmount
    return () => {
      client.disconnect().catch(console.error)
      clientRef.current = null
    }
  }, [documentId, userId, userName, userColor, initialContent, enabled, onError])

  // Insert text at position
  const insertText = useCallback((position: number, text: string) => {
    if (!clientRef.current) return

    try {
      const operation = insertOp(position, text, contentLengthRef.current)
      clientRef.current.sendOperation(operation)
    } catch (error) {
      console.error('[Collaboration] Failed to insert text:', error)
      onError?.(error as Error)
    }
  }, [onError])

  // Delete text at position
  const deleteText = useCallback((position: number, count: number) => {
    if (!clientRef.current) return

    try {
      const operation = deleteOp(position, count, contentLengthRef.current)
      clientRef.current.sendOperation(operation)
    } catch (error) {
      console.error('[Collaboration] Failed to delete text:', error)
      onError?.(error as Error)
    }
  }, [onError])

  // Update cursor position
  const updateCursor = useCallback((position: number, selection?: { start: number; end: number }) => {
    if (!clientRef.current) return

    try {
      clientRef.current.updateCursor(position, selection)
    } catch (error) {
      console.error('[Collaboration] Failed to update cursor:', error)
      onError?.(error as Error)
    }
  }, [onError])

  // Reconnect to collaboration channel
  const reconnect = useCallback(async () => {
    if (!clientRef.current) return

    try {
      await clientRef.current.disconnect()
      await clientRef.current.connect()
    } catch (error) {
      console.error('[Collaboration] Failed to reconnect:', error)
      onError?.(error as Error)
      throw error
    }
  }, [onError])

  // Disconnect from collaboration channel
  const disconnect = useCallback(async () => {
    if (!clientRef.current) return

    try {
      await clientRef.current.disconnect()
    } catch (error) {
      console.error('[Collaboration] Failed to disconnect:', error)
      onError?.(error as Error)
      throw error
    }
  }, [onError])

  return {
    content,
    cursors,
    presence,
    isConnected,
    insertText,
    deleteText,
    updateCursor,
    reconnect,
    disconnect,
  }
}

/**
 * Generate a consistent color for a user ID
 */
function generateUserColor(userId: string): string {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#14B8A6', // teal
    '#6366F1', // indigo
  ]

  // Generate a hash from the userId
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Use hash to pick a color
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * Hook to track if collaboration is supported
 */
export function useCollaborationSupported(): boolean {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    // Check if Supabase credentials are available
    const hasSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    setSupported(hasSupabase)
  }, [])

  return supported
}

/**
 * Hook to get active collaborators count
 */
export function useActiveCollaborators(presence: Map<string, UserPresence>): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Count active users (last active within 60 seconds)
    const now = Date.now()
    const activeUsers = Array.from(presence.values()).filter(
      (user) => user.isActive && (now - user.lastActive) < 60000
    )

    setCount(activeUsers.length)
  }, [presence])

  return count
}
