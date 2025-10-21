/**
 * Real-time Collaboration Client
 * Manages WebSocket connections, presence, and synchronization using Supabase Realtime
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import type { TextOperation } from './ot-engine'
import { applyOperation, transform } from './ot-engine'

export type CursorPosition = {
  userId: string
  userName: string
  userColor: string
  position: number
  selection?: {
    start: number
    end: number
  }
  timestamp: number
}

export type UserPresence = {
  userId: string
  userName: string
  userColor: string
  userAvatar?: string
  lastActive: number
  isActive: boolean
}

export type CollaborationMessage =
  | { type: 'operation'; operation: TextOperation; userId: string; revision: number }
  | { type: 'cursor'; cursor: CursorPosition }
  | { type: 'presence'; presence: UserPresence }
  | { type: 'ack'; revision: number }

export type CollaborationState = {
  documentId: string
  revision: number
  content: string
  pendingOperations: TextOperation[]
  serverOperations: TextOperation[]
  cursors: Map<string, CursorPosition>
  presence: Map<string, UserPresence>
}

export type CollaborationCallbacks = {
  onContentChange?: (content: string) => void
  onCursorChange?: (cursors: Map<string, CursorPosition>) => void
  onPresenceChange?: (presence: Map<string, UserPresence>) => void
  onError?: (error: Error) => void
  onConnectionChange?: (connected: boolean) => void
}

/**
 * Collaboration Client for real-time editing
 */
export class CollaborationClient {
  private channel: RealtimeChannel | null = null
  private state: CollaborationState
  private callbacks: CollaborationCallbacks
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000 // Start with 1 second
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private cursorThrottleTimeout: ReturnType<typeof setTimeout> | null = null
  private userId: string
  private userName: string
  private userColor: string

  constructor(
    private supabaseUrl: string,
    private supabaseKey: string,
    documentId: string,
    userId: string,
    userName: string,
    userColor: string,
    initialContent: string,
    callbacks: CollaborationCallbacks = {}
  ) {
    this.userId = userId
    this.userName = userName
    this.userColor = userColor
    this.callbacks = callbacks

    this.state = {
      documentId,
      revision: 0,
      content: initialContent,
      pendingOperations: [],
      serverOperations: [],
      cursors: new Map(),
      presence: new Map(),
    }

    // Add self to presence
    this.state.presence.set(userId, {
      userId,
      userName,
      userColor,
      lastActive: Date.now(),
      isActive: true,
    })
  }

  /**
   * Connect to the collaboration channel
   */
  async connect(): Promise<void> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseKey)

      // Create a channel for this document
      this.channel = supabase.channel(`document:${this.state.documentId}`)

      // Listen for operations from other users
      this.channel.on('broadcast', { event: 'operation' }, (payload) => {
        this.handleRemoteOperation(payload.payload as CollaborationMessage)
      })

      // Listen for cursor updates
      this.channel.on('broadcast', { event: 'cursor' }, (payload) => {
        this.handleRemoteCursor(payload.payload as CollaborationMessage)
      })

      // Listen for presence updates
      this.channel.on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync()
      })

      this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        this.handlePresenceJoin(newPresences)
      })

      this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        this.handlePresenceLeave(leftPresences)
      })

      // Subscribe to the channel
      await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await this.channel?.track({
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor,
            lastActive: Date.now(),
            isActive: true,
          })

          this.callbacks.onConnectionChange?.(true)
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000

          // Start heartbeat
          this.startHeartbeat()
        } else if (status === 'CHANNEL_ERROR') {
          this.callbacks.onError?.(new Error('Channel connection error'))
          this.callbacks.onConnectionChange?.(false)
          this.attemptReconnect()
        } else if (status === 'TIMED_OUT') {
          this.callbacks.onError?.(new Error('Channel connection timed out'))
          this.callbacks.onConnectionChange?.(false)
          this.attemptReconnect()
        }
      })
    } catch (error) {
      this.callbacks.onError?.(error as Error)
      this.attemptReconnect()
    }
  }

  /**
   * Disconnect from the collaboration channel
   */
  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.cursorThrottleTimeout) {
      clearTimeout(this.cursorThrottleTimeout)
      this.cursorThrottleTimeout = null
    }

    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    this.callbacks.onConnectionChange?.(false)
  }

  /**
   * Send a local operation to the server
   */
  sendOperation(operation: TextOperation): void {
    // Apply operation locally
    try {
      this.state.content = applyOperation(this.state.content, operation)
      this.state.revision++
      this.state.pendingOperations.push(operation)

      // Notify local content change
      this.callbacks.onContentChange?.(this.state.content)

      // Send to server
      this.channel?.send({
        type: 'broadcast',
        event: 'operation',
        payload: {
          type: 'operation',
          operation,
          userId: this.userId,
          revision: this.state.revision,
        } as CollaborationMessage,
      })
    } catch (error) {
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Update cursor position
   */
  updateCursor(position: number, selection?: { start: number; end: number }): void {
    const cursor: CursorPosition = {
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      position,
      selection,
      timestamp: Date.now(),
    }

    // Throttle cursor updates to avoid flooding the network
    if (this.cursorThrottleTimeout) {
      clearTimeout(this.cursorThrottleTimeout)
    }

    this.cursorThrottleTimeout = setTimeout(() => {
      this.channel?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          type: 'cursor',
          cursor,
        } as CollaborationMessage,
      })
    }, 50) // Send at most every 50ms
  }

  /**
   * Get current document content
   */
  getContent(): string {
    return this.state.content
  }

  /**
   * Get current revision number
   */
  getRevision(): number {
    return this.state.revision
  }

  /**
   * Get all cursor positions except our own
   */
  getCursors(): Map<string, CursorPosition> {
    const cursors = new Map(this.state.cursors)
    cursors.delete(this.userId)
    return cursors
  }

  /**
   * Get all active users except ourselves
   */
  getPresence(): Map<string, UserPresence> {
    const presence = new Map(this.state.presence)
    presence.delete(this.userId)
    return presence
  }

  /**
   * Handle operation from another user
   */
  private handleRemoteOperation(message: CollaborationMessage): void {
    if (message.type !== 'operation') return
    if (message.userId === this.userId) return // Ignore our own operations

    try {
      let serverOp = message.operation

      // Transform against pending operations
      for (const pendingOp of this.state.pendingOperations) {
        serverOp = transform(serverOp, pendingOp, 'left')
      }

      // Apply transformed operation
      this.state.content = applyOperation(this.state.content, serverOp)
      this.state.revision = message.revision

      // Notify content change
      this.callbacks.onContentChange?.(this.state.content)

      // Transform cursors
      this.transformCursors(serverOp)
    } catch (error) {
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Handle cursor update from another user
   */
  private handleRemoteCursor(message: CollaborationMessage): void {
    if (message.type !== 'cursor') return
    if (message.cursor.userId === this.userId) return // Ignore our own cursor

    // Update cursor position
    this.state.cursors.set(message.cursor.userId, message.cursor)

    // Notify cursor change
    this.callbacks.onCursorChange?.(this.getCursors())

    // Clean up old cursors (older than 10 seconds)
    const now = Date.now()
    for (const [userId, cursor] of this.state.cursors) {
      if (now - cursor.timestamp > 10000) {
        this.state.cursors.delete(userId)
      }
    }
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync(): void {
    if (!this.channel) return

    const presenceState = this.channel.presenceState()
    this.state.presence.clear()

    for (const [userId, presences] of Object.entries(presenceState)) {
      const presence = presences[0] as unknown as UserPresence
      if (presence) {
        this.state.presence.set(userId, {
          ...presence,
          isActive: true,
        })
      }
    }

    this.callbacks.onPresenceChange?.(this.getPresence())
  }

  /**
   * Handle user joining
   */
  private handlePresenceJoin(newPresences: unknown[]): void {
    for (const presence of newPresences as UserPresence[]) {
      this.state.presence.set(presence.userId, {
        ...presence,
        isActive: true,
      })
    }

    this.callbacks.onPresenceChange?.(this.getPresence())
  }

  /**
   * Handle user leaving
   */
  private handlePresenceLeave(leftPresences: unknown[]): void {
    for (const presence of leftPresences as UserPresence[]) {
      this.state.presence.delete(presence.userId)
      this.state.cursors.delete(presence.userId)
    }

    this.callbacks.onPresenceChange?.(this.getPresence())
    this.callbacks.onCursorChange?.(this.getCursors())
  }

  /**
   * Transform cursor positions when an operation is applied
   */
  private transformCursors(operation: TextOperation): void {
    let offset = 0

    for (const op of operation.ops) {
      if (op.type === 'insert') {
        // Shift cursors after insertion point
        for (const cursor of this.state.cursors.values()) {
          if (cursor.position >= offset) {
            cursor.position += op.text.length
            if (cursor.selection) {
              cursor.selection.start += op.text.length
              cursor.selection.end += op.text.length
            }
          }
        }
        offset += op.text.length
      } else if (op.type === 'delete') {
        // Shift cursors after deletion point
        for (const cursor of this.state.cursors.values()) {
          if (cursor.position >= offset + op.count) {
            cursor.position -= op.count
            if (cursor.selection) {
              cursor.selection.start = Math.max(offset, cursor.selection.start - op.count)
              cursor.selection.end = Math.max(offset, cursor.selection.end - op.count)
            }
          } else if (cursor.position > offset) {
            cursor.position = offset
            if (cursor.selection) {
              cursor.selection.start = offset
              cursor.selection.end = offset
            }
          }
        }
      } else if (op.type === 'retain') {
        offset += op.count
      }
    }

    this.callbacks.onCursorChange?.(this.getCursors())
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.channel?.track({
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
        lastActive: Date.now(),
        isActive: true,
      })
    }, 30000) // Every 30 seconds
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onError?.(new Error('Max reconnection attempts reached'))
      return
    }

    this.reconnectAttempts++

    // Exponential backoff with jitter
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    const jitter = Math.random() * 1000
    const totalDelay = Math.min(delay + jitter, 30000) // Max 30 seconds

    setTimeout(async () => {
      try {
        await this.disconnect()
        await this.connect()
      } catch (error) {
        this.callbacks.onError?.(error as Error)
      }
    }, totalDelay)
  }
}
