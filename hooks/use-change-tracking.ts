/**
 * Change Tracking Hook
 * Manages document changes with insertion/deletion tracking
 */

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export type ChangeType = 'insertion' | 'deletion' | 'modification'
export type ChangeStatus = 'pending' | 'accepted' | 'rejected'

export type DocumentChange = {
  id: string
  document_id: string
  user_id: string
  change_type: ChangeType
  content: string
  original_content?: string
  start_position: number
  end_position: number
  status: ChangeStatus
  comment?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  author?: {
    id: string
    email: string
  }
  reviewer?: {
    id: string
    email: string
  }
}

export type ChangeHistoryEntry = {
  id: string
  change_id: string
  user_id: string
  action: 'created' | 'accepted' | 'rejected' | 'commented'
  comment?: string
  snapshot?: Record<string, any>
  created_at: string
  user?: {
    id: string
    email: string
  }
}

type UseChangeTrackingProps = {
  documentId: string
  enabled?: boolean
}

export function useChangeTracking({ documentId, enabled = true }: UseChangeTrackingProps) {
  const [changes, setChanges] = useState<DocumentChange[]>([])
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(enabled)
  const { toast } = useToast()

  // Fetch changes for document
  const fetchChanges = useCallback(async (status: 'all' | ChangeStatus = 'all') => {
    if (!documentId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        documentId,
        status,
      })

      const response = await fetch(`/api/changes?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch changes')
      }

      const data = await response.json()
      setChanges(data.changes || [])
    } catch (error) {
      console.error('Error fetching changes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load changes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [documentId, toast])

  // Fetch change history
  const fetchHistory = useCallback(async (changeId?: string) => {
    if (!documentId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        documentId,
        ...(changeId && { changeId }),
      })

      const response = await fetch(`/api/changes/history?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const data = await response.json()
      setHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load change history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [documentId, toast])

  // Create a new change
  const createChange = useCallback(
    async (params: {
      changeType: ChangeType
      content: string
      originalContent?: string
      startPosition: number
      endPosition: number
      comment?: string
    }) => {
      if (!trackingEnabled) return null

      try {
        const response = await fetch('/api/changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            ...params,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create change')
        }

        const data = await response.json()
        const newChange = data.change

        // Add to local state
        setChanges((prev) => [newChange, ...prev])

        toast({
          title: 'Change tracked',
          description: `${params.changeType} recorded`,
        })

        return newChange
      } catch (error) {
        console.error('Error creating change:', error)
        toast({
          title: 'Error',
          description: 'Failed to track change',
          variant: 'destructive',
        })
        return null
      }
    },
    [documentId, trackingEnabled, toast]
  )

  // Review a change (accept/reject)
  const reviewChange = useCallback(
    async (changeId: string, action: 'accept' | 'reject', comment?: string) => {
      try {
        const response = await fetch('/api/changes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeId,
            action,
            comment,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Failed to review change')
        }

        const data = await response.json()
        const updatedChange = data.change

        // Update local state
        setChanges((prev) =>
          prev.map((c) => (c.id === changeId ? updatedChange : c))
        )

        toast({
          title: `Change ${action}ed`,
          description: `The change has been ${action}ed`,
        })

        return updatedChange
      } catch (error) {
        console.error('Error reviewing change:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to review change',
          variant: 'destructive',
        })
        return null
      }
    },
    [toast]
  )

  // Delete a pending change
  const deleteChange = useCallback(
    async (changeId: string) => {
      try {
        const response = await fetch(`/api/changes?id=${changeId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete change')
        }

        // Remove from local state
        setChanges((prev) => prev.filter((c) => c.id !== changeId))

        toast({
          title: 'Change deleted',
          description: 'The change has been removed',
        })

        return true
      } catch (error) {
        console.error('Error deleting change:', error)
        toast({
          title: 'Error',
          description: 'Failed to delete change',
          variant: 'destructive',
        })
        return false
      }
    },
    [toast]
  )

  // Apply accepted changes to document
  const applyChange = useCallback(
    (change: DocumentChange, currentContent: string): string => {
      if (change.status !== 'accepted') return currentContent

      const { change_type, content, start_position, end_position } = change

      switch (change_type) {
        case 'insertion':
          // Insert content at position
          return (
            currentContent.slice(0, start_position) +
            content +
            currentContent.slice(start_position)
          )

        case 'deletion':
          // Remove content from start to end position
          return (
            currentContent.slice(0, start_position) +
            currentContent.slice(end_position)
          )

        case 'modification':
          // Replace content from start to end with new content
          return (
            currentContent.slice(0, start_position) +
            content +
            currentContent.slice(end_position)
          )

        default:
          return currentContent
      }
    },
    []
  )

  // Apply all accepted changes
  const applyAcceptedChanges = useCallback(
    (currentContent: string): string => {
      const acceptedChanges = changes
        .filter((c) => c.status === 'accepted')
        .sort((a, b) => a.start_position - b.start_position)

      let result = currentContent
      for (const change of acceptedChanges) {
        result = applyChange(change, result)
      }

      return result
    },
    [changes, applyChange]
  )

  // Get pending changes count
  const pendingCount = changes.filter((c) => c.status === 'pending').length

  // Get changes by type
  const changesByType = {
    insertions: changes.filter((c) => c.change_type === 'insertion'),
    deletions: changes.filter((c) => c.change_type === 'deletion'),
    modifications: changes.filter((c) => c.change_type === 'modification'),
  }

  // Load changes on mount
  useEffect(() => {
    if (enabled) {
      fetchChanges()
    }
  }, [enabled, fetchChanges])

  return {
    // State
    changes,
    history,
    loading,
    trackingEnabled,
    pendingCount,
    changesByType,

    // Actions
    setTrackingEnabled,
    fetchChanges,
    fetchHistory,
    createChange,
    reviewChange,
    deleteChange,
    applyChange,
    applyAcceptedChanges,
  }
}
