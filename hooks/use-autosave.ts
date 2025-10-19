import { useCallback, useEffect, useRef, useState } from 'react'

import { computeClientContentHash, type ClientContentSnapshot } from '@/lib/client-content-hash'

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
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

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
      if (onAfterSave) {
        onAfterSave()
      }
    } catch (err) {
      console.error('Autosave error:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Autosave failed')
    } finally {
      savingRef.current = false
      if (queuedRef.current) {
        queuedRef.current = false
        runAutosave()
      }
    }
  }, [documentId, enabled, onAfterSave, onBaseHashChange, onConflict])

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

  return {
    status,
    error,
    scheduleAutosave,
    flush,
  }
}
