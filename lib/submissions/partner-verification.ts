/**
 * Partner Verification System
 *
 * Provides verification for literary agents and publishers to ensure legitimacy
 * and protect authors from scams or fraudulent partners.
 *
 * Verification Levels:
 * - Unverified: Default state, no verification
 * - Pending: Verification requested, under review
 * - Basic: Email and website verified
 * - Standard: Basic + industry association membership
 * - Premium: Standard + sales track record
 * - Elite: Premium + prominent agency/publisher with established reputation
 */

export type VerificationStatus = 'unverified' | 'pending' | 'rejected' | 'verified'

export type VerificationLevel = 'basic' | 'standard' | 'premium' | 'elite'

export interface VerificationRequest {
  id: string
  partnerId: string
  requestedBy: string // User ID of partner
  status: VerificationStatus
  level?: VerificationLevel

  // Submission data
  businessName: string
  website: string
  email: string
  phone?: string
  address?: string

  // Professional credentials
  industryAssociations?: string[] // e.g., AAR, Publishers Association
  membershipProof?: string[] // URLs to membership verification
  salesHistory?: string // Notable sales or publications
  clientList?: string // Anonymized list of represented authors

  // Social proof
  linkedIn?: string
  twitter?: string
  publishersMarketplace?: string
  queryTracker?: string
  manuscriptWishList?: string

  // Additional documentation
  documents?: string[] // URLs to uploaded documents
  notes?: string

  // Review data
  reviewedBy?: string // Admin user ID
  reviewedAt?: string
  reviewNotes?: string
  rejectionReason?: string

  createdAt: string
  updatedAt: string
}

export interface VerificationBadge {
  verified: boolean
  level?: VerificationLevel
  verifiedAt?: string
  badge: {
    label: string
    color: string
    icon: string
    description: string
  }
}

/**
 * Get verification badge information for display
 */
export function getVerificationBadge(
  status: VerificationStatus,
  level?: VerificationLevel
): VerificationBadge {
  if (status !== 'verified' || !level) {
    return {
      verified: false,
      badge: {
        label: 'Unverified',
        color: 'gray',
        icon: 'shield-off',
        description: 'This partner has not been verified',
      },
    }
  }

  const badges = {
    basic: {
      label: 'Verified',
      color: 'blue',
      icon: 'shield-check',
      description: 'Email and website verified',
    },
    standard: {
      label: 'Standard Verified',
      color: 'green',
      icon: 'shield-check',
      description: 'Industry association member with verified credentials',
    },
    premium: {
      label: 'Premium Verified',
      color: 'purple',
      icon: 'shield-check',
      description: 'Established track record with verified sales history',
    },
    elite: {
      label: 'Elite Verified',
      color: 'gold',
      icon: 'crown',
      description: 'Prominent agency/publisher with established industry reputation',
    },
  }

  return {
    verified: true,
    level,
    badge: badges[level],
  }
}

/**
 * Verification criteria checklist
 */
export interface VerificationCriteria {
  emailVerified: boolean
  websiteVerified: boolean
  industryAssociation: boolean
  salesHistory: boolean
  clientList: boolean
  socialProof: boolean
  documentsProvided: boolean
}

/**
 * Check if verification meets criteria for a specific level
 */
export function meetsVerificationLevel(
  criteria: VerificationCriteria,
  level: VerificationLevel
): boolean {
  switch (level) {
    case 'basic':
      return criteria.emailVerified && criteria.websiteVerified

    case 'standard':
      return (
        criteria.emailVerified &&
        criteria.websiteVerified &&
        criteria.industryAssociation
      )

    case 'premium':
      return (
        criteria.emailVerified &&
        criteria.websiteVerified &&
        criteria.industryAssociation &&
        criteria.salesHistory
      )

    case 'elite':
      return (
        criteria.emailVerified &&
        criteria.websiteVerified &&
        criteria.industryAssociation &&
        criteria.salesHistory &&
        criteria.clientList &&
        criteria.socialProof
      )

    default:
      return false
  }
}

/**
 * Calculate appropriate verification level based on criteria
 */
export function calculateVerificationLevel(
  criteria: VerificationCriteria
): VerificationLevel | null {
  if (meetsVerificationLevel(criteria, 'elite')) {
    return 'elite'
  }
  if (meetsVerificationLevel(criteria, 'premium')) {
    return 'premium'
  }
  if (meetsVerificationLevel(criteria, 'standard')) {
    return 'standard'
  }
  if (meetsVerificationLevel(criteria, 'basic')) {
    return 'basic'
  }
  return null
}

/**
 * Industry associations for verification
 */
export const INDUSTRY_ASSOCIATIONS = [
  {
    id: 'aar',
    name: 'Association of Authors\' Representatives (AAR)',
    website: 'https://aaronline.org',
    verificationUrl: 'https://aaronline.org/find-an-agent',
    region: 'US',
  },
  {
    id: 'publishers-association',
    name: 'The Publishers Association',
    website: 'https://www.publishers.org.uk',
    verificationUrl: 'https://www.publishers.org.uk/about-us/our-members/',
    region: 'UK',
  },
  {
    id: 'independent-publishers',
    name: 'Independent Publishers Guild',
    website: 'https://www.ipg.uk.com',
    verificationUrl: 'https://www.ipg.uk.com/membership/member-directory',
    region: 'UK',
  },
  {
    id: 'aala',
    name: 'Australian Literary Agents\' Association',
    website: 'https://austlit.edu.au',
    verificationUrl: 'https://austlit.edu.au/austlit/page/6966522',
    region: 'AU',
  },
  {
    id: 'literary-agents',
    name: 'The Association of Literary Agents',
    website: 'https://www.agentsassoc.co.uk',
    verificationUrl: 'https://www.agentsassoc.co.uk/members/',
    region: 'UK',
  },
] as const

/**
 * Verification document types
 */
export const VERIFICATION_DOCUMENTS = [
  'Business Registration',
  'Industry Association Membership Card',
  'Recent Sales Documentation',
  'Client References',
  'Professional License',
  'Tax ID Verification',
  'Other',
] as const

export type VerificationDocumentType = (typeof VERIFICATION_DOCUMENTS)[number]

/**
 * Red flags to watch for during verification
 */
export const VERIFICATION_RED_FLAGS = [
  'Requests upfront reading fees',
  'Promises guaranteed publication',
  'No verifiable online presence',
  'Recent business formation (< 6 months)',
  'Multiple negative reviews or complaints',
  'No industry association membership',
  'Suspicious email domain (free email services)',
  'Cannot verify claimed sales or clients',
  'Poor professional communication',
  'Inconsistent business information',
] as const

export type VerificationRedFlag = (typeof VERIFICATION_RED_FLAGS)[number]

/**
 * Verification review decision
 */
export interface VerificationReview {
  decision: 'approve' | 'reject' | 'request_more_info'
  level?: VerificationLevel
  notes: string
  redFlags?: VerificationRedFlag[]
  additionalInfoNeeded?: string[]
}

/**
 * Helper to validate email domain
 */
export function isValidBusinessEmail(email: string): boolean {
  const freeEmailProviders = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'mail.com',
  ]

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  return !freeEmailProviders.includes(domain)
}

/**
 * Helper to validate website URL
 */
export function isValidBusinessWebsite(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // Check if it's a proper domain (not a free hosting service)
    const hostname = urlObj.hostname.toLowerCase()

    const freeHosts = ['wordpress.com', 'blogspot.com', 'wix.com', 'weebly.com']
    return !freeHosts.some((host) => hostname.includes(host))
  } catch {
    return false
  }
}

/**
 * Calculate verification score (0-100)
 */
export function calculateVerificationScore(
  request: Partial<VerificationRequest>
): number {
  let score = 0

  // Basic information (20 points)
  if (request.email && isValidBusinessEmail(request.email)) score += 5
  if (request.website && isValidBusinessWebsite(request.website)) score += 5
  if (request.phone) score += 5
  if (request.address) score += 5

  // Industry credentials (30 points)
  if (request.industryAssociations && request.industryAssociations.length > 0) {
    score += Math.min(request.industryAssociations.length * 10, 15)
  }
  if (request.membershipProof && request.membershipProof.length > 0) {
    score += 15
  }

  // Track record (30 points)
  if (request.salesHistory) score += 15
  if (request.clientList) score += 15

  // Social proof (20 points)
  const socialLinks = [
    request.linkedIn,
    request.twitter,
    request.publishersMarketplace,
    request.queryTracker,
    request.manuscriptWishList,
  ].filter(Boolean)
  score += Math.min(socialLinks.length * 4, 20)

  return Math.min(score, 100)
}

/**
 * Get recommended verification level based on score
 */
export function getRecommendedLevel(score: number): VerificationLevel | null {
  if (score >= 90) return 'elite'
  if (score >= 70) return 'premium'
  if (score >= 50) return 'standard'
  if (score >= 30) return 'basic'
  return null
}

/**
 * Verification status messages
 */
export function getVerificationStatusMessage(
  status: VerificationStatus,
  level?: VerificationLevel
): string {
  switch (status) {
    case 'unverified':
      return 'This partner has not yet requested verification.'
    case 'pending':
      return 'Verification request is under review by our team.'
    case 'rejected':
      return 'Verification request was rejected. Contact support for details.'
    case 'verified':
      return level
        ? `Verified ${level.charAt(0).toUpperCase() + level.slice(1)} Partner - Credentials confirmed`
        : 'Verified Partner'
    default:
      return 'Status unknown'
  }
}

/**
 * Check if partner should be auto-verified based on domain
 */
export function shouldAutoVerify(email: string, website: string): boolean {
  // Known major publishers and agencies that can be auto-verified at basic level
  const trustedDomains = [
    'penguinrandomhouse.com',
    'harpercollins.com',
    'simonandschuster.com',
    'macmillan.com',
    'hachette.com',
    'scholastic.com',
  ]

  const emailDomain = email.split('@')[1]?.toLowerCase()
  const websiteDomain = new URL(website).hostname.toLowerCase()

  return trustedDomains.some(
    (domain) =>
      emailDomain?.includes(domain) || websiteDomain.includes(domain)
  )
}
