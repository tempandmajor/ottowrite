/**
 * User Experience Level Detection
 *
 * Determines user experience level for progressive dashboard disclosure.
 * Based on UX-007 requirements:
 * - New: 0 projects
 * - Beginner: 1-2 projects
 * - Experienced: 3+ projects OR 7+ days since account creation
 *
 * Implements Miller's Law for cognitive load management.
 */

export type ExperienceLevel = 'new' | 'beginner' | 'experienced'

export interface ExperienceLevelInput {
  projectCount: number
  accountCreatedAt: string // ISO 8601 date string
}

/**
 * Determines user experience level based on project count and account age
 */
export function getUserExperienceLevel(input: ExperienceLevelInput): ExperienceLevel {
  const { projectCount, accountCreatedAt } = input

  // New users: 0 projects
  if (projectCount === 0) {
    return 'new'
  }

  // Calculate days since account creation
  const accountDate = new Date(accountCreatedAt)
  const now = new Date()
  const daysSinceCreation = Math.floor(
    (now.getTime() - accountDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Experienced users: 3+ projects OR 7+ days
  if (projectCount >= 3 || daysSinceCreation >= 7) {
    return 'experienced'
  }

  // Beginner users: 1-2 projects AND < 7 days
  return 'beginner'
}

/**
 * Get human-readable description of experience level
 */
export function getExperienceLevelDescription(level: ExperienceLevel): string {
  switch (level) {
    case 'new':
      return 'Just getting started'
    case 'beginner':
      return 'Building your first projects'
    case 'experienced':
      return 'Active storyteller'
  }
}

/**
 * Check if user should see "Show all features" toggle
 * Only show for beginner users (new users have no features to hide)
 */
export function shouldShowFeatureToggle(level: ExperienceLevel): boolean {
  return level === 'beginner'
}
