/**
 * Analytics Queue Hook
 *
 * Client-side hook for enqueueing and monitoring analytics jobs.
 */

import { useState, useCallback } from 'react'
import type {
  AnalyticsJobInput,
  AnalyticsJobOutput,
  JobPriority,
  JobStatus,
} from '@/lib/analytics/worker-contract'

export type AnalyticsJobResult = {
  id: string
  jobType: string
  status: JobStatus
  priority: JobPriority
  input: Record<string, unknown>
  output: AnalyticsJobOutput | null
  error: string | null
  attempts: number
  maxAttempts: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export type UseAnalyticsQueueReturn = {
  // State
  isEnqueuing: boolean
  isFetching: boolean
  lastError: Error | null

  // Actions
  enqueueJob: (input: AnalyticsJobInput) => Promise<string | null>
  getJobStatus: (jobId: string) => Promise<AnalyticsJobResult | null>
  cancelJob: (jobId: string) => Promise<boolean>
  waitForJobCompletion: (
    jobId: string,
    options?: { pollInterval?: number; timeout?: number }
  ) => Promise<AnalyticsJobResult | null>
}

/**
 * Hook for managing analytics jobs
 */
export function useAnalyticsQueue(): UseAnalyticsQueueReturn {
  const [isEnqueuing, setIsEnqueuing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)

  /**
   * Enqueue a new analytics job
   */
  const enqueueJob = useCallback(async (input: AnalyticsJobInput): Promise<string | null> => {
    setIsEnqueuing(true)
    setLastError(null)

    try {
      const response = await fetch('/api/analytics/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enqueue job')
      }

      const data = await response.json()
      return data.job.id
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setLastError(err)
      console.error('Failed to enqueue job:', err)
      return null
    } finally {
      setIsEnqueuing(false)
    }
  }, [])

  /**
   * Get job status
   */
  const getJobStatus = useCallback(async (jobId: string): Promise<AnalyticsJobResult | null> => {
    setIsFetching(true)
    setLastError(null)

    try {
      const response = await fetch(`/api/analytics/jobs/${jobId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch job')
      }

      const data = await response.json()
      return data.job
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setLastError(err)
      console.error('Failed to fetch job status:', err)
      return null
    } finally {
      setIsFetching(false)
    }
  }, [])

  /**
   * Cancel a job
   */
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    setLastError(null)

    try {
      const response = await fetch(`/api/analytics/jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel job')
      }

      return true
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setLastError(err)
      console.error('Failed to cancel job:', err)
      return false
    }
  }, [])

  /**
   * Wait for job completion with polling
   */
  const waitForJobCompletion = useCallback(
    async (
      jobId: string,
      options: { pollInterval?: number; timeout?: number } = {}
    ): Promise<AnalyticsJobResult | null> => {
      const { pollInterval = 2000, timeout = 60000 } = options
      const startTime = Date.now()

      while (Date.now() - startTime < timeout) {
        const job = await getJobStatus(jobId)

        if (!job) {
          throw new Error('Job not found')
        }

        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          return job
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }

      throw new Error('Job completion timeout')
    },
    [getJobStatus]
  )

  return {
    isEnqueuing,
    isFetching,
    lastError,
    enqueueJob,
    getJobStatus,
    cancelJob,
    waitForJobCompletion,
  }
}
