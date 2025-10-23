/**
 * TypeScript types for Manuscript Submissions
 * Matches database schema from migration 20250122000001_manuscript_submissions.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PartnerType = 'agent' | 'publisher' | 'manager'
export type PartnerStatus = 'active' | 'inactive' | 'suspended'

export type ManuscriptType = 'novel' | 'novella' | 'short_story' | 'screenplay' | 'memoir' | 'non_fiction'

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'sample_requested'
  | 'full_requested'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type RejectionCategory =
  | 'not_fit_for_list'
  | 'writing_needs_work'
  | 'story_not_ready'
  | 'market_reasons'
  | 'other'

export type AccessType = 'view' | 'download' | 'print' | 'copy_attempt'

export type NotificationType =
  | 'submission_received'
  | 'submission_viewed'
  | 'sample_requested'
  | 'full_requested'
  | 'accepted'
  | 'rejected'
  | 'access_expires_soon'
  | 'access_revoked'

export type NotificationChannel = 'email' | 'in_app' | 'both'

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface SubmissionPartner {
  id: string
  // Basic Information
  name: string
  type: PartnerType
  company: string
  email: string
  website: string | null
  // Verification
  verified: boolean
  verification_date: string | null
  verification_notes: string | null
  verification_status?: 'unverified' | 'pending' | 'rejected' | 'verified'
  verification_level?: 'basic' | 'standard' | 'premium' | 'elite'
  verified_at?: string | null
  verified_by?: string | null
  aar_member: boolean
  // Preferences
  genres: string[]
  accepting_submissions: boolean
  submission_guidelines: string | null
  response_time_days: number | null
  // Stats
  total_submissions: number
  total_accepted: number
  total_rejected: number
  acceptance_rate: number | null
  // Contact & Bio
  bio: string | null
  linkedin_url: string | null
  twitter_handle: string | null
  // Status
  status: PartnerStatus
  // Timestamps
  created_at: string
  updated_at: string
}

export interface WatermarkData {
  partnerId: string
  timestamp: string
  format: string
  watermarkId: string
}

export interface ManuscriptSubmission {
  id: string
  // Relationships
  user_id: string
  project_id: string | null
  partner_id: string
  // Submission Details
  title: string
  genre: string
  word_count: number
  type: ManuscriptType
  // Query Materials
  query_letter: string
  synopsis: string
  author_bio: string | null
  // Sample Content
  sample_pages_count: number
  sample_pages_content: string | null
  full_manuscript_available: boolean
  // File Storage
  query_letter_file_path: string | null
  synopsis_file_path: string | null
  sample_pages_file_path: string | null
  full_manuscript_file_path: string | null
  // IP Protection
  watermark_applied: boolean
  watermark_data: WatermarkData | null
  access_token: string | null
  access_expires_at: string | null
  access_revoked_at: string | null
  // Status Tracking
  status: SubmissionStatus
  priority_review: boolean
  // Response
  partner_response: string | null
  partner_response_date: string | null
  rejection_reason: string | null
  rejection_category: RejectionCategory | null
  // Tracking
  viewed_by_partner: boolean
  first_viewed_at: string | null
  last_viewed_at: string | null
  view_count: number
  // Metadata
  submission_metadata: Record<string, unknown>
  // Timestamps
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface SubmissionAccessLog {
  id: string
  // Relationships
  submission_id: string
  partner_id: string | null
  // Access Details
  access_type: AccessType
  ip_address: string | null
  user_agent: string | null
  // Session
  session_id: string | null
  session_start: string | null
  session_end: string | null
  session_duration_seconds: number | null
  // Content Access
  pages_viewed: number[] | null
  download_successful: boolean | null
  // Location
  country_code: string | null
  city: string | null
  // Timestamps
  accessed_at: string
}

export interface SubmissionNotification {
  id: string
  // Relationships
  submission_id: string
  user_id: string
  // Notification Details
  type: NotificationType
  // Delivery
  channel: NotificationChannel
  email_sent: boolean
  email_sent_at: string | null
  email_opened: boolean
  email_opened_at: string | null
  // In-app
  read: boolean
  read_at: string | null
  // Content
  title: string
  message: string
  action_url: string | null
  // Timestamps
  created_at: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSubmissionRequest {
  project_id?: string
  partner_id: string
  title: string
  genre: string
  word_count: number
  type: ManuscriptType
  query_letter: string
  synopsis: string
  author_bio?: string
  sample_pages_count?: number
  sample_pages_content?: string
}

export interface UpdateSubmissionRequest {
  title?: string
  genre?: string
  word_count?: number
  query_letter?: string
  synopsis?: string
  author_bio?: string
  sample_pages_content?: string
  status?: SubmissionStatus
}

export interface SubmissionWithPartner extends ManuscriptSubmission {
  partner: SubmissionPartner
}

export interface SubmissionStats {
  total_submissions: number
  pending: number
  under_review: number
  accepted: number
  rejected: number
  acceptance_rate: number
}

export interface PartnerStats {
  total_partners: number
  verified_partners: number
  accepting_submissions: number
  average_response_time: number | null
}

// ============================================================================
// FILTER/QUERY TYPES
// ============================================================================

export interface SubmissionFilters {
  status?: SubmissionStatus | SubmissionStatus[]
  partner_id?: string
  genre?: string
  type?: ManuscriptType
  date_from?: string
  date_to?: string
}

export interface PartnerFilters {
  type?: PartnerType | PartnerType[]
  genre?: string
  verified?: boolean
  accepting_submissions?: boolean
}

// ============================================================================
// UI DISPLAY TYPES
// ============================================================================

export interface SubmissionListItem {
  id: string
  title: string
  partner_name: string
  partner_company: string
  status: SubmissionStatus
  submitted_at: string | null
  last_viewed_at: string | null
  view_count: number
  priority_review: boolean
}

export interface PartnerListItem {
  id: string
  name: string
  type: PartnerType
  company: string
  genres: string[]
  accepting_submissions: boolean
  acceptance_rate: number | null
  response_time_days: number | null
  total_submissions: number
  verified: boolean
  aar_member: boolean
}

// ============================================================================
// STATUS BADGE HELPERS
// ============================================================================

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  sample_requested: 'Sample Requested',
  full_requested: 'Full Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  under_review: 'yellow',
  sample_requested: 'purple',
  full_requested: 'orange',
  accepted: 'green',
  rejected: 'red',
  withdrawn: 'gray',
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  agent: 'Literary Agent',
  publisher: 'Publisher',
  manager: 'Manager',
}

export const REJECTION_CATEGORY_LABELS: Record<RejectionCategory, string> = {
  not_fit_for_list: 'Not a fit for list',
  writing_needs_work: 'Writing needs work',
  story_not_ready: 'Story not ready',
  market_reasons: 'Market reasons',
  other: 'Other',
}
