import { z } from 'zod'
import { commonValidators, VALIDATION_LIMITS } from '../middleware'
import type { DocumentType } from '@/lib/document-types'
import { DOCUMENT_TYPE_METADATA } from '@/lib/document-types'

/**
 * Validation schemas for project operations
 * Protects against SQL injection in query endpoint
 *
 * IMPORTANT: Document types are imported from lib/document-types.ts
 * to ensure validation stays in sync with database constraints.
 */

/**
 * Get all valid document types as a tuple for Zod enum
 */
const ALL_DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_METADATA) as [DocumentType, ...DocumentType[]]

export const projectQuerySchema = z.object({
  /** Search query (sanitized to prevent SQL injection) */
  search: commonValidators.optionalString(500),

  /** Folder filter */
  folderId: commonValidators.uuid.optional(),

  /** Tag filter (array of tag names) */
  tags: z
    .array(z.string().max(50))
    .max(20)
    .optional(),

  /** Type filter (accepts all 28 document types from lib/document-types.ts) */
  type: z.enum(ALL_DOCUMENT_TYPES).optional(),

  /** Genre filter */
  genre: z.string().max(100).optional(),

  /** Status filter */
  status: z
    .enum(['active', 'archived', 'completed', 'draft'])
    .optional(),

  /** Sort field */
  sortBy: z
    .enum(['title', 'created_at', 'updated_at', 'type'])
    .default('updated_at'),

  /** Sort order */
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),

  /** Pagination */
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>

/**
 * Schema for project creation
 */
export const projectCreateSchema = z.object({
  /** Project title */
  title: commonValidators.nonEmptyString(VALIDATION_LIMITS.MAX_SHORT_TEXT),

  /** Project type (accepts all 28 document types from lib/document-types.ts) */
  type: z.enum(ALL_DOCUMENT_TYPES),

  /** Project description */
  description: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Genre (accepts string or array, normalizes to array for database) */
  genre: z
    .union([
      z.string().min(1).max(200),
      z.array(z.string().min(1).max(50)).max(10),
    ])
    .optional()
    .nullable(),

  /** Genre tags (array) - deprecated, use genre field */
  genreTags: z
    .array(z.string().max(50))
    .max(10)
    .optional(),

  /** Logline */
  logline: commonValidators.optionalString(500),

  /** Folder ID */
  folderId: commonValidators.uuid.optional(),

  /** Tags */
  tags: z
    .array(z.string().max(50))
    .max(20)
    .optional(),

  /** Target word count */
  targetWordCount: z
    .number()
    .int()
    .min(0)
    .max(1000000)
    .optional(),

  /** Cover image URL */
  coverImage: z.string().url().optional(),
})

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>

/**
 * Schema for project updates
 */
export const projectUpdateSchema = z.object({
  /** Project ID */
  id: commonValidators.uuid,

  /** Updated title */
  title: commonValidators.optionalString(VALIDATION_LIMITS.MAX_SHORT_TEXT),

  /** Updated type */
  type: z.enum(ALL_DOCUMENT_TYPES).optional(),

  /** Updated description */
  description: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Updated genre (accepts string or array, normalizes to array for database) */
  genre: z
    .union([
      z.string().min(1).max(200),
      z.array(z.string().min(1).max(50)).max(10),
    ])
    .optional()
    .nullable(),

  /** Updated genre tags - deprecated, use genre field */
  genreTags: z.array(z.string().max(50)).max(10).optional(),

  /** Updated logline */
  logline: commonValidators.optionalString(500),

  /** Updated folder */
  folderId: commonValidators.uuid.nullable().optional(),

  /** Updated tags */
  tags: z.array(z.string().max(50)).max(20).optional(),

  /** Updated target word count */
  targetWordCount: z.number().int().min(0).max(1000000).optional(),

  /** Updated cover image */
  coverImage: z.string().url().optional(),

  /** Updated status */
  status: z.enum(['active', 'archived', 'completed', 'draft']).optional(),
})

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>

/**
 * Schema for folder operations
 */
export const folderSchema = z.object({
  /** Folder name */
  name: commonValidators.nonEmptyString(200),

  /** Folder description */
  description: commonValidators.optionalString(1000),

  /** Parent folder ID */
  parentId: commonValidators.uuid.optional(),

  /** Folder color (hex) */
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
})

export type FolderInput = z.infer<typeof folderSchema>

/**
 * Schema for folder updates
 */
export const folderUpdateSchema = z.object({
  /** Folder ID */
  id: commonValidators.uuid,

  /** Updated name */
  name: commonValidators.optionalString(200),

  /** Updated description */
  description: commonValidators.optionalString(1000),

  /** Updated parent folder */
  parentId: commonValidators.uuid.nullable().optional(),

  /** Updated color */
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
})

export type FolderUpdateInput = z.infer<typeof folderUpdateSchema>

/**
 * Schema for tag operations
 */
export const tagSchema = z.object({
  /** Tag name */
  name: z
    .string()
    .min(1, 'Tag name required')
    .max(50, 'Tag name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'),

  /** Tag color (hex) */
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),

  /** Tag description */
  description: commonValidators.optionalString(500),
})

export type TagInput = z.infer<typeof tagSchema>

/**
 * Schema for tag updates
 */
export const tagUpdateSchema = z.object({
  /** Tag ID */
  id: commonValidators.uuid,

  /** Updated name */
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
    .optional(),

  /** Updated color */
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),

  /** Updated description */
  description: commonValidators.optionalString(500),
})

export type TagUpdateInput = z.infer<typeof tagUpdateSchema>
