import { z } from 'zod'
import { commonValidators, VALIDATION_LIMITS } from '../middleware'

/**
 * Validation schemas for document operations
 * Critical: Protects against XSS attacks in document editor
 */

export const documentAutosaveSchema = z.object({
  /** Document ID */
  id: commonValidators.uuid,

  /** Document content (HTML) - will be sanitized after validation */
  content: z
    .string()
    .max(VALIDATION_LIMITS.MAX_DOCUMENT_LENGTH, `Document content exceeds ${Math.round(VALIDATION_LIMITS.MAX_DOCUMENT_LENGTH / 1000000)}MB limit`),

  /** Content hash for conflict detection */
  contentHash: z
    .string()
    .min(1, 'Content hash required for conflict detection'),

  /** Version number */
  version: z
    .number()
    .int()
    .min(0)
    .optional(),

  /** Autosave metadata */
  metadata: z
    .object({
      wordCount: z.number().int().min(0).optional(),
      characterCount: z.number().int().min(0).optional(),
      lastEditedAt: commonValidators.isoDate.optional(),
    })
    .optional(),
})

export type DocumentAutosaveInput = z.infer<typeof documentAutosaveSchema>

/**
 * Schema for document creation
 */
export const documentCreateSchema = z.object({
  /** Project ID */
  projectId: commonValidators.uuid,

  /** Document title */
  title: commonValidators.nonEmptyString(VALIDATION_LIMITS.MAX_SHORT_TEXT),

  /** Document type */
  type: z.enum([
    'screenplay',
    'novel',
    'short_story',
    'article',
    'notes',
    'outline',
    'treatment',
  ]).default('notes'),

  /** Initial content */
  content: commonValidators.optionalString(VALIDATION_LIMITS.MAX_DOCUMENT_LENGTH),

  /** Parent document ID (for chapters/sections) */
  parentId: commonValidators.uuid.optional(),

  /** Position in parent */
  position: z.number().int().min(0).optional(),

  /** Template ID to use */
  templateId: commonValidators.uuid.optional(),
})

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>

/**
 * Schema for document updates
 */
export const documentUpdateSchema = z.object({
  /** Document ID */
  id: commonValidators.uuid,

  /** Updated title */
  title: commonValidators.optionalString(VALIDATION_LIMITS.MAX_SHORT_TEXT),

  /** Updated content */
  content: commonValidators.optionalString(VALIDATION_LIMITS.MAX_DOCUMENT_LENGTH),

  /** Updated type */
  type: z
    .enum([
      'screenplay',
      'novel',
      'short_story',
      'article',
      'notes',
      'outline',
      'treatment',
    ])
    .optional(),

  /** Updated position */
  position: z.number().int().min(0).optional(),

  /** Tags */
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>

/**
 * Schema for document duplication
 */
export const documentDuplicateSchema = z.object({
  /** Document ID to duplicate */
  id: commonValidators.uuid,

  /** Custom title for duplicate */
  title: commonValidators.optionalString(VALIDATION_LIMITS.MAX_SHORT_TEXT),

  /** Whether to include snapshots */
  includeSnapshots: z.boolean().default(false),

  /** Whether to include comments */
  includeComments: z.boolean().default(false),
})

export type DocumentDuplicateInput = z.infer<typeof documentDuplicateSchema>

/**
 * Schema for bulk document duplication
 */
export const documentBulkDuplicateSchema = z.object({
  /** Array of document IDs */
  documentIds: z
    .array(commonValidators.uuid)
    .min(1, 'At least one document ID required')
    .max(50, 'Maximum 50 documents can be duplicated at once'),

  /** Optional title suffix */
  titleSuffix: commonValidators.optionalString(100),

  /** Whether to include snapshots */
  includeSnapshots: z.boolean().default(false),
})

export type DocumentBulkDuplicateInput = z.infer<typeof documentBulkDuplicateSchema>

/**
 * Schema for document snapshots
 */
export const documentSnapshotSchema = z.object({
  /** Document ID */
  documentId: commonValidators.uuid,

  /** Snapshot name/label */
  label: commonValidators.optionalString(200),

  /** Whether this is an automatic snapshot */
  automatic: z.boolean().default(false),
})

export type DocumentSnapshotInput = z.infer<typeof documentSnapshotSchema>

/**
 * Schema for document search
 */
export const documentSearchSchema = z.object({
  /** Search query */
  query: commonValidators.nonEmptyString(500),

  /** Project ID to search within */
  projectId: commonValidators.uuid.optional(),

  /** Document type filter */
  type: z
    .enum([
      'screenplay',
      'novel',
      'short_story',
      'article',
      'notes',
      'outline',
      'treatment',
    ])
    .optional(),

  /** Tags filter */
  tags: z.array(z.string()).optional(),

  /** Pagination */
  limit: commonValidators.paginationLimit,
  cursor: commonValidators.paginationCursor,
})

export type DocumentSearchInput = z.infer<typeof documentSearchSchema>
