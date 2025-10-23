/**
 * Helper functions for Manuscript Submissions
 */

import type {
  SubmissionStatus,
  SubmissionPartner,
  ManuscriptSubmission,
  PartnerType,
} from './types'

/**
 * Check if submission status is final (cannot be changed)
 */
export function isSubmissionFinal(status: SubmissionStatus): boolean {
  return status === 'accepted' || status === 'rejected' || status === 'withdrawn'
}

/**
 * Check if submission can be edited
 */
export function canEditSubmission(status: SubmissionStatus): boolean {
  return status === 'draft'
}

/**
 * Check if submission can be withdrawn
 */
export function canWithdrawSubmission(status: SubmissionStatus): boolean {
  return !isSubmissionFinal(status) && status !== 'draft'
}

/**
 * Calculate days since submission
 */
export function daysSinceSubmission(submittedAt: string | null): number | null {
  if (!submittedAt) return null

  const submitted = new Date(submittedAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - submitted.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Calculate days until access expires
 */
export function daysUntilAccessExpires(expiresAt: string | null): number | null {
  if (!expiresAt) return null

  const expires = new Date(expiresAt)
  const now = new Date()

  // If already expired
  if (expires < now) return 0

  const diffTime = expires.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if access has expired
 */
export function hasAccessExpired(
  expiresAt: string | null,
  revokedAt: string | null
): boolean {
  if (revokedAt) return true
  if (!expiresAt) return false

  const expires = new Date(expiresAt)
  const now = new Date()

  return expires < now
}

/**
 * Format partner display name
 */
export function formatPartnerName(partner: SubmissionPartner): string {
  return `${partner.name} - ${partner.company}`
}

/**
 * Get partner type label
 */
export function getPartnerTypeLabel(type: PartnerType): string {
  const labels: Record<PartnerType, string> = {
    agent: 'Literary Agent',
    publisher: 'Publisher',
    manager: 'Manager',
  }
  return labels[type]
}

/**
 * Calculate expected response date based on partner's average response time
 */
export function calculateExpectedResponseDate(
  submittedAt: string,
  responseTimeDays: number | null
): Date | null {
  if (!responseTimeDays) return null

  const submitted = new Date(submittedAt)
  const expected = new Date(submitted)
  expected.setDate(expected.getDate() + responseTimeDays)

  return expected
}

/**
 * Check if response is overdue
 */
export function isResponseOverdue(
  submittedAt: string | null,
  responseTimeDays: number | null,
  status: SubmissionStatus
): boolean {
  if (!submittedAt || !responseTimeDays) return false
  if (isSubmissionFinal(status)) return false

  const expectedDate = calculateExpectedResponseDate(submittedAt, responseTimeDays)
  if (!expectedDate) return false

  const now = new Date()
  return now > expectedDate
}

/**
 * Format acceptance rate for display
 */
export function formatAcceptanceRate(rate: number | null): string {
  if (rate === null) return 'N/A'
  return `${rate.toFixed(1)}%`
}

/**
 * Sort partners by relevance for a given genre
 */
export function sortPartnersByRelevance(
  partners: SubmissionPartner[],
  genre: string
): SubmissionPartner[] {
  return [...partners].sort((a, b) => {
    // Verified partners first
    if (a.verified !== b.verified) {
      return a.verified ? -1 : 1
    }

    // Accepting submissions first
    if (a.accepting_submissions !== b.accepting_submissions) {
      return a.accepting_submissions ? -1 : 1
    }

    // Genre match first
    const aHasGenre = a.genres.includes(genre)
    const bHasGenre = b.genres.includes(genre)
    if (aHasGenre !== bHasGenre) {
      return aHasGenre ? -1 : 1
    }

    // AAR members first
    if (a.aar_member !== b.aar_member) {
      return a.aar_member ? -1 : 1
    }

    // Higher acceptance rate first
    const rateA = a.acceptance_rate || 0
    const rateB = b.acceptance_rate || 0
    return rateB - rateA
  })
}

/**
 * Validate submission data
 */
export interface SubmissionValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateSubmissionData(data: {
  title?: string
  genre?: string
  word_count?: number
  query_letter?: string
  synopsis?: string
}): SubmissionValidationResult {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Title is required'
  }

  if (!data.genre || data.genre.trim().length === 0) {
    errors.genre = 'Genre is required'
  }

  if (!data.word_count || data.word_count <= 0) {
    errors.word_count = 'Word count must be greater than 0'
  }

  if (!data.query_letter || data.query_letter.trim().length === 0) {
    errors.query_letter = 'Query letter is required'
  } else if (data.query_letter.trim().length < 100) {
    errors.query_letter = 'Query letter must be at least 100 characters'
  }

  if (!data.synopsis || data.synopsis.trim().length === 0) {
    errors.synopsis = 'Synopsis is required'
  } else if (data.synopsis.trim().length < 200) {
    errors.synopsis = 'Synopsis must be at least 200 characters'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Generate access token expiration date (30 days from now)
 */
export function generateAccessExpiration(): Date {
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + 30)
  return expiration
}

/**
 * Get status badge color class
 */
export function getStatusBadgeColor(status: SubmissionStatus): string {
  const colors: Record<SubmissionStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    sample_requested: 'bg-purple-100 text-purple-800',
    full_requested: 'bg-orange-100 text-orange-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get readable status label
 */
export function getStatusLabel(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    sample_requested: 'Sample Requested',
    full_requested: 'Full Manuscript Requested',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }
  return labels[status] || status
}

/**
 * Calculate submission stats
 */
export function calculateSubmissionStats(submissions: ManuscriptSubmission[]) {
  const total = submissions.length
  const byStatus = submissions.reduce(
    (acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    },
    {} as Record<SubmissionStatus, number>
  )

  const accepted = byStatus.accepted || 0
  const rejected = byStatus.rejected || 0
  const responded = accepted + rejected

  const acceptanceRate = responded > 0 ? (accepted / responded) * 100 : 0

  return {
    total,
    pending: byStatus.submitted || 0,
    under_review: byStatus.under_review || 0,
    sample_requested: byStatus.sample_requested || 0,
    full_requested: byStatus.full_requested || 0,
    accepted,
    rejected,
    withdrawn: byStatus.withdrawn || 0,
    acceptance_rate: acceptanceRate,
  }
}
