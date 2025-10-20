import { useCallback, useEffect, useRef, useState } from 'react'

import { computeClientContentHash, type ClientContentSnapshot } from '@/lib/client-content-hash'
import { useConnectivityStore } from '@/stores/connectivity-store'

async function logAutosaveFailure(params: {
  documentId: string
  failureType: 'conflict' | 'error' | 'network'
  errorMessage?: string
  clientHash?: string
  serverHash?: string
  retryCount?: number
}) {
  try {
    await fetch('/api/telemetry/autosave-failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: params.documentId,
        failure_type: params.failureType,
        error_message: params.errorMessage,
        client_hash: params.clientHash,
        server_hash: params.serverHash,
        retry_count: params.retryCount ?? 0,
        user_agent: navigator.userAgent,
      }),
    })
  } catch (err) {
    console.error('Failed to log autosave failure:', err)
  }
}

export type AutosaveStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'error'
  | 'conflict'

type UseAutosaveOptions = {
  documentId: string | null
  enabled: boolean
  snapshot: ClientContentSnapshot
  sceneAnchors: Set<string>
  wordCount: number
  baseHash: string | null
  onBaseHashChange: (hash: string | null) => void
  onConflict: (payload: {
    html: string
    structure?: unknown
    wordCount?: number
    updatedAt?: string
    hash: string
  }) => void
  onAfterSave?: () => void
  onBeforeSave?: (snapshot: ClientContentSnapshot, wordCount: number) => void | Promise<void>
  onSnapshotCreated?: (hash: string, wordCount: number) => void | Promise<void>
}

export function useAutosave({
  documentId,
  enabled,
  snapshot,
  sceneAnchors,
  wordCount,
  baseHash,
  onBaseHashChange,
  onConflict,
  onAfterSave,
  onBeforeSave,
  onSnapshotCreated,
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Get connectivity state from store
  const isOnline = useConnectivityStore((state) => state.isOnline)
  const setConnectivityError = useConnectivityStore((state) => state.setError)

  const timerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const queuedRef = useRef(false)
  const latestSnapshotRef = useRef<ClientContentSnapshot>(snapshot)
  const latestAnchorsRef = useRef(sceneAnchors)
  const latestWordCountRef = useRef(wordCount)
  const latestBaseHashRef = useRef(baseHash)

  latestSnapshotRef.current = snapshot
  latestAnchorsRef.current = sceneAnchors
  latestWordCountRef.current = wordCount
  latestBaseHashRef.current = baseHash

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const runAutosave = useCallback(async () => {
    if (!enabled || !documentId) {
      return
    }

    // Check connectivity before attempting save
    if (!isOnline) {
      setStatus('offline')
      setConnectivityError({
        message: 'Cannot save - you are offline',
        timestamp: new Date(),
        type: 'network',
        retryable: true,
      })
      return
    }

    if (savingRef.current) {
      queuedRef.current = true
      return
    }

    const payloadSnapshot = latestSnapshotRef.current
    const payloadAnchors = Array.from(latestAnchorsRef.current)
    const payloadWordCount = latestWordCountRef.current
    const payloadBaseHash = latestBaseHashRef.current

    const hash = await computeClientContentHash({
      html: payloadSnapshot.html ?? '',
      structure: payloadSnapshot.structure,
      anchorIds: payloadAnchors,
    })

    if (hash === payloadBaseHash) {
      setStatus((prev) => (prev === 'conflict' ? prev : 'saved'))
      queuedRef.current = false
      return
    }

    savingRef.current = true
    setStatus('saving')
    setError(null)

    // Call onBeforeSave hook if provided (for snapshot creation)
    if (onBeforeSave) {
      try {
        await onBeforeSave(payloadSnapshot, payloadWordCount)
      } catch (err) {
        console.warn('onBeforeSave hook failed:', err)
        // Don't block the save if the hook fails
      }
    }

    try {
      const response = await fetch(`/api/documents/${documentId}/autosave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: payloadSnapshot.html,
          structure: payloadSnapshot.structure,
          anchorIds: payloadAnchors,
          wordCount: payloadWordCount,
          baseHash: payloadBaseHash,
          snapshotOnly: false,
        }),
      })

      if (response.status === 409) {
        const data = await response.json()

        // Log conflict to telemetry
        void logAutosaveFailure({
          documentId,
          failureType: 'conflict',
          errorMessage: 'Autosave conflict: document modified in another session',
          clientHash: hash,
          serverHash: data?.hash,
        })

        onConflict({
          html: data?.document?.html ?? payloadSnapshot.html ?? '',
          structure: data?.document?.structure,
          wordCount: data?.document?.wordCount,
          updatedAt: data?.document?.updatedAt,
          hash: data?.hash,
        })
        setStatus('conflict')
        return
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error ?? `Autosave failed with status ${response.status}`)
      }

      onBaseHashChange(hash)
      setStatus('saved')

      // Call onSnapshotCreated hook if provided
      if (onSnapshotCreated) {
        try {
          await onSnapshotCreated(hash, payloadWordCount)
        } catch (err) {
          console.warn('onSnapshotCreated hook failed:', err)
          // Don't block the save success if the hook fails
        }
      }

      if (onAfterSave) {
        onAfterSave()
      }
    } catch (err) {
      console.error('Autosave error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Autosave failed'

      // Determine error type based on connectivity
      const isNetworkError = !navigator.onLine || !isOnline

      // Log error to telemetry
      void logAutosaveFailure({
        documentId,
        failureType: isNetworkError ? 'network' : 'error',
        errorMessage,
        clientHash: hash,
      })

      // Update connectivity store with error
      setConnectivityError({
        message: errorMessage,
        timestamp: new Date(),
        type: isNetworkError ? 'network' : 'api',
        retryable: isNetworkError,
      })

      setStatus(isNetworkError ? 'offline' : 'error')
      setError(errorMessage)
    } finally {
      savingRef.current = false
      if (queuedRef.current) {
        queuedRef.current = false
        runAutosave()
      }
    }
  }, [
    documentId,
    enabled,
    isOnline,
    onAfterSave,
    onBaseHashChange,
    onBeforeSave,
    onConflict,
    onSnapshotCreated,
    setConnectivityError,
  ])

  const scheduleAutosave = useCallback(
    (delay = 1000) => {
      if (!enabled || !documentId) return
      setStatus((prev) => (prev === 'saving' ? prev : 'pending'))
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void runAutosave()
      }, delay)
    },
    [clearTimer, documentId, enabled, runAutosave]
  )

  useEffect(() => {
    if (!enabled) {
      clearTimer()
      setStatus('idle')
      return
    }
    scheduleAutosave()
    return clearTimer
  }, [enabled, snapshot, sceneAnchors, wordCount, scheduleAutosave, clearTimer])

  useEffect(() => {
    const handleOffline = () => {
      setStatus((prev) => (prev === 'conflict' ? prev : 'offline'))
    }
    const handleOnline = () => {
      setStatus((prev) => (prev === 'offline' ? 'pending' : prev))
      scheduleAutosave(250)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [scheduleAutosave])

  useEffect(() => () => clearTimer(), [clearTimer])

  const flush = useCallback(() => {
    clearTimer()
    void runAutosave()
  }, [clearTimer, runAutosave])

  const flushWithSnapshot = useCallback(async (): Promise<string | null> => {
    clearTimer()

    // Run autosave and return the hash
    try {
      await runAutosave()
      return latestBaseHashRef.current
    } catch (err) {
      console.error('Flush with snapshot failed:', err)
      return null
    }
  }, [clearTimer, runAutosave])

  return {
    status,
    error,
    scheduleAutosave,
    flush,
    flushWithSnapshot,
  }
}
