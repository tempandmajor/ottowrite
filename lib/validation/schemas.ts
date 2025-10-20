/**
 * Zod Validation Schemas
 *
 * Comprehensive input validation for all API endpoints.
 * Prevents XSS, SQL injection, and malformed data.
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Safe string - prevents XSS by limiting dangerous characters
 * Allows common punctuation but blocks script tags and SQL injection patterns
 */
export const safeStringSchema = z
  .string()
  .min(1, 'String cannot be empty')
  .max(10000, 'String exceeds maximum length')
  .refine(
    (val) => !/<script|javascript:|on\w+=/i.test(val),
    'Potentially unsafe content detected'
  )

/**
 * Safe text for long-form content (with higher limit)
 */
export const safeTextSchema = z
  .string()
  .max(100000, 'Text exceeds maximum length')
  .refine(
    (val) => !/<script|javascript:|on\w+=/i.test(val),
    'Potentially unsafe content detected'
  )

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address')

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format').max(2048, 'URL too long')

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Date range validation
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

/**
 * Allowed document MIME types
 */
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

/**
 * File upload validation
 */
export const fileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
  type: z.string(),
})

/**
 * Image upload validation
 */
export const imageUploadSchema = fileUploadSchema.extend({
  type: z.enum(ALLOWED_IMAGE_TYPES as [string, ...string[]]),
  size: z.number().int().min(1).max(5 * 1024 * 1024), // 5MB max for images
})

/**
 * Document upload validation
 */
export const documentUploadSchema = fileUploadSchema.extend({
  type: z.enum(ALLOWED_DOCUMENT_TYPES as [string, ...string[]]),
})

// ============================================================================
// USER & AUTH SCHEMAS
// ============================================================================

/**
 * Login credentials
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Signup data
 */
export const signupSchema = loginSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * Password reset request
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

/**
 * Password update
 */
export const passwordUpdateSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

/**
 * Create project
 */
export const createProjectSchema = z.object({
  name: safeStringSchema.max(200, 'Project name too long'),
  description: safeTextSchema.optional(),
  genre: z.string().max(100).optional(),
  target_word_count: z.number().int().min(0).max(10000000).optional(),
  folder_id: uuidSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

/**
 * Update project
 */
export const updateProjectSchema = createProjectSchema.partial().extend({
  id: uuidSchema,
})

/**
 * Query projects
 */
export const queryProjectsSchema = z.object({
  search: z.string().max(200).optional(),
  folderId: z.union([uuidSchema, z.literal('none')]).optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  ...sortSchema.shape,
})

/**
 * Project query schema (alias for compatibility)
 */
export const projectQuerySchema = queryProjectsSchema

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * Create document
 */
export const createDocumentSchema = z.object({
  project_id: uuidSchema,
  title: safeStringSchema.max(500, 'Title too long'),
  content: safeTextSchema.optional(),
  folder_id: uuidSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

/**
 * Update document
 */
export const updateDocumentSchema = createDocumentSchema.partial().extend({
  id: uuidSchema,
})

/**
 * Autosave document
 */
export const autosaveDocumentSchema = z.object({
  id: uuidSchema,
  content: safeTextSchema,
  version: z.number().int().min(0),
})

/**
 * Duplicate document
 */
export const duplicateDocumentSchema = z.object({
  id: uuidSchema,
  new_title: safeStringSchema.max(500).optional(),
  project_id: uuidSchema.optional(),
})

// ============================================================================
// CHARACTER SCHEMAS
// ============================================================================

/**
 * Character role enum
 */
const characterRoles = ['protagonist', 'antagonist', 'supporting', 'minor', 'other'] as const

/**
 * Arc type enum
 */
const arcTypes = ['positive', 'negative', 'flat', 'transformative', 'none'] as const

/**
 * Create character
 */
export const createCharacterSchema = z.object({
  project_id: uuidSchema,
  name: safeStringSchema.max(200, 'Name too long'),
  role: z.enum(characterRoles),
  importance: z.number().int().min(1).max(10).default(5),
  age: z.number().int().min(0).max(1000).optional(),
  gender: z.string().max(50).optional(),
  appearance: safeStringSchema.max(500).optional(),
  physical_description: safeTextSchema.optional(),
  personality_traits: z.array(z.string().max(100)).max(50).default([]),
  strengths: z.array(z.string().max(100)).max(50).default([]),
  weaknesses: z.array(z.string().max(100)).max(50).default([]),
  fears: z.array(z.string().max(100)).max(50).default([]),
  desires: z.array(z.string().max(100)).max(50).default([]),
  backstory: safeTextSchema.optional(),
  arc_type: z.enum(arcTypes).optional(),
  character_arc: safeTextSchema.optional(),
  internal_conflict: safeTextSchema.optional(),
  external_conflict: safeTextSchema.optional(),
  first_appearance: z.string().max(200).optional(),
  last_appearance: z.string().max(200).optional(),
  story_function: safeTextSchema.optional(),
  image_url: urlSchema.optional(),
  voice_description: safeTextSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: safeTextSchema.optional(),
})

/**
 * Update character
 */
export const updateCharacterSchema = createCharacterSchema.partial().extend({
  id: uuidSchema,
})

/**
 * Character relationship types
 */
const relationshipTypes = [
  'family',
  'romantic',
  'friendship',
  'rivalry',
  'mentor_mentee',
  'colleague',
  'enemy',
  'ally',
  'acquaintance',
  'other',
] as const

/**
 * Relationship status
 */
const relationshipStatuses = ['current', 'past', 'developing', 'ending', 'complicated'] as const

/**
 * Create character relationship
 */
export const createRelationshipSchema = z.object({
  project_id: uuidSchema,
  character_a_id: uuidSchema,
  character_b_id: uuidSchema,
  relationship_type: z.enum(relationshipTypes),
  description: safeTextSchema.optional(),
  strength: z.number().int().min(1).max(10).default(5),
  is_positive: z.boolean().default(true),
  status: z.enum(relationshipStatuses).optional(),
  starts_at: z.string().max(200).optional(),
  ends_at: z.string().max(200).optional(),
  key_moments: z.array(z.string().max(500)).max(50).default([]),
  notes: safeTextSchema.optional(),
})

/**
 * Update character relationship
 */
export const updateRelationshipSchema = createRelationshipSchema.partial().extend({
  id: uuidSchema,
})

/**
 * Character arc stage
 */
export const createArcStageSchema = z.object({
  character_id: uuidSchema,
  stage_name: safeStringSchema.max(200),
  stage_order: z.number().int().min(1).max(1000),
  description: safeTextSchema.optional(),
  location: z.string().max(500).optional(),
  chapter_scene: z.string().max(200).optional(),
  page_number: z.number().int().min(0).max(100000).optional(),
  emotional_state: z.string().max(200).optional(),
  beliefs: safeTextSchema.optional(),
  relationships_status: safeTextSchema.optional(),
  is_completed: z.boolean().default(false),
  notes: safeTextSchema.optional(),
})

/**
 * Update arc stage
 */
export const updateArcStageSchema = createArcStageSchema.partial().extend({
  id: uuidSchema,
})

// ============================================================================
// LOCATION & WORLD-BUILDING SCHEMAS
// ============================================================================

/**
 * Create location
 */
export const createLocationSchema = z.object({
  project_id: uuidSchema,
  name: safeStringSchema.max(200),
  location_type: z.string().max(100).optional(),
  description: safeTextSchema.optional(),
  significance: safeTextSchema.optional(),
  image_url: urlSchema.optional(),
  climate: z.string().max(200).optional(),
  population: z.number().int().min(0).optional(),
  culture: safeTextSchema.optional(),
  history: safeTextSchema.optional(),
  notable_features: z.array(z.string().max(500)).max(50).default([]),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: safeTextSchema.optional(),
})

/**
 * Update location
 */
export const updateLocationSchema = createLocationSchema.partial().extend({
  id: uuidSchema,
})

/**
 * Create location event
 */
export const createLocationEventSchema = z.object({
  location_id: uuidSchema,
  event_name: safeStringSchema.max(200),
  event_date: z.string().max(200).optional(),
  event_order: z.number().int().min(1).optional(),
  description: safeTextSchema.optional(),
  participants: z.array(z.string().max(200)).max(100).default([]),
  significance: safeTextSchema.optional(),
  notes: safeTextSchema.optional(),
})

/**
 * Update location event
 */
export const updateLocationEventSchema = createLocationEventSchema.partial().extend({
  id: uuidSchema,
})

// ============================================================================
// AI GENERATION SCHEMAS
// ============================================================================

/**
 * AI model selection
 */
const aiModels = ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4.5', 'claude-haiku-4'] as const

/**
 * AI generation request
 */
export const aiGenerateSchema = z.object({
  prompt: safeTextSchema.min(1, 'Prompt is required'),
  model: z.enum(aiModels).default('claude-sonnet-4.5'),
  maxTokens: z.number().int().min(1).max(8000).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  context: safeTextSchema.optional(),
  systemPrompt: safeTextSchema.optional(),
  documentId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  command: z.string().max(200).optional(),
  selection: z.string().max(50000).optional(),
})

/**
 * Template usage
 */
export const templateUseSchema = z.object({
  template_id: uuidSchema,
  variables: z.record(z.string(), safeStringSchema).optional(),
  project_id: uuidSchema.optional(),
})

/**
 * Plot analysis request
 */
export const plotAnalysisSchema = z.object({
  project_id: uuidSchema,
  content: safeTextSchema.min(100, 'Content too short for analysis'),
  analysis_types: z.array(z.enum(['plot_holes', 'pacing', 'character_consistency', 'logic', 'timeline'])).min(1),
})

/**
 * Dialogue analysis request
 */
export const dialogueAnalysisSchema = z.object({
  character_id: uuidSchema,
  action: z.enum(['analyze', 'validate']),
  dialogue_samples: z.array(
    z.object({
      text: safeStringSchema,
      context: z.string().max(1000).optional(),
      scene_description: z.string().max(1000).optional(),
      emotional_state: z.string().max(200).optional(),
    })
  ).max(50).optional(),
  new_dialogue: safeStringSchema.optional(),
  context: z.string().max(1000).optional(),
})

// ============================================================================
// BEAT SHEET & OUTLINE SCHEMAS
// ============================================================================

/**
 * Create beat sheet
 */
export const createBeatSheetSchema = z.object({
  project_id: uuidSchema,
  template_name: z.string().max(200),
  beats: z.array(
    z.object({
      beat_number: z.number().int().min(1),
      beat_name: safeStringSchema.max(200),
      description: safeTextSchema.optional(),
      page_percentage: z.number().min(0).max(100).optional(),
      is_completed: z.boolean().default(false),
    })
  ).max(100),
})

/**
 * Create outline
 */
export const createOutlineSchema = z.object({
  project_id: uuidSchema,
  title: safeStringSchema.max(500),
  content: safeTextSchema,
  structure_type: z.string().max(100).optional(),
  version: z.number().int().min(1).default(1),
})

/**
 * Update outline
 */
export const updateOutlineSchema = createOutlineSchema.partial().extend({
  id: uuidSchema,
})

// ============================================================================
// ANALYTICS & TELEMETRY SCHEMAS
// ============================================================================

/**
 * Analytics event
 */
export const analyticsEventSchema = z.object({
  event_name: z.string().max(200),
  event_category: z.string().max(100),
  event_data: z.record(z.string(), z.any()).optional(),
  session_id: uuidSchema.optional(),
})

/**
 * AI telemetry
 */
export const aiTelemetrySchema = z.object({
  model: z.string().max(100),
  operation: z.string().max(200),
  tokens_used: z.number().int().min(0),
  cost: z.number().min(0),
  latency_ms: z.number().int().min(0),
  success: z.boolean(),
  error_message: z.string().max(1000).optional(),
})

/**
 * Autosave failure telemetry
 */
export const autosaveFailureSchema = z.object({
  document_id: uuidSchema,
  error_type: z.string().max(100),
  error_message: z.string().max(1000),
  network_status: z.enum(['online', 'offline', 'slow']).optional(),
  retry_count: z.number().int().min(0),
})

// ============================================================================
// SEARCH & QUERY SCHEMAS
// ============================================================================

/**
 * Search documents
 */
export const searchDocumentsSchema = z.object({
  query: z.string().min(1).max(500),
  project_id: uuidSchema.optional(),
  tags: z.array(z.string()).optional(),
  ...paginationSchema.shape,
})

/**
 * Research search
 */
export const researchSearchSchema = z.object({
  query: z.string().min(1).max(500),
  max_results: z.number().int().min(1).max(20).default(10),
  project_id: uuidSchema.optional(),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and parse request body
 */
export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await schema.parseAsync(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`)
      return { success: false, error: errorMessages.join('; ') }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  params: URLSearchParams
): { success: true; data: T } | { success: false; error: string } {
  try {
    const obj = Object.fromEntries(params.entries())
    const data = schema.parse(obj)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`)
      return { success: false, error: errorMessages.join('; ') }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Sanitize HTML to prevent XSS
 * Note: For production, consider using DOMPurify or similar
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  maxSize: number,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` }
  }

  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mimeToExt: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'text/markdown': ['md'],
  }

  const expectedExts = mimeToExt[file.type] || []
  if (ext && !expectedExts.includes(ext)) {
    return { valid: false, error: 'File extension does not match file type' }
  }

  return { valid: true }
}
