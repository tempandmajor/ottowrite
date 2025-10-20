import { NextRequest } from 'next/server'
import { z, ZodError, type ZodSchema } from 'zod'
import { errorResponses } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

/**
 * Validation Middleware for API Routes
 *
 * Provides Zod-based validation for request bodies, query parameters, and more.
 * Protects against malicious input, data corruption, and injection attacks.
 */

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    issues: Array<{ path: string; message: string }>
  }
}

/**
 * Validate request body against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with parsed data or error
 *
 * @example
 * ```typescript
 * const result = await validateBody(request, aiGenerateSchema)
 * if (!result.success) {
 *   return errorResponses.validationError(result.error.message, {
 *     details: result.error.issues
 *   })
 * }
 * const { prompt, documentId } = result.data
 * ```
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const data = schema.parse(body)

    return {
      success: true,
      data,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }))

      logger.warn('Request validation failed', {
        operation: 'validation:body',
        issues,
      })

      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues,
        },
      }
    }

    // JSON parsing error
    logger.warn('Request body parsing failed', {
      operation: 'validation:parse',
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        issues: [],
      },
    }
  }
}

/**
 * Validate query parameters against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with parsed data or error
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const data = schema.parse(params)

    return {
      success: true,
      data,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }))

      logger.warn('Query validation failed', {
        operation: 'validation:query',
        issues,
      })

      return {
        success: false,
        error: {
          message: 'Invalid query parameters',
          issues,
        },
      }
    }

    return {
      success: false,
      error: {
        message: 'Query parameter validation error',
        issues: [],
      },
    }
  }
}

/**
 * Helper to create a validation error response
 *
 * @param result - Validation result from validateBody or validateQuery
 * @param userId - Optional user ID for logging
 * @returns NextResponse with validation error
 */
export async function validationErrorResponse(
  result: ValidationResult<unknown>,
  userId?: string
) {
  if (result.success) {
    throw new Error('Cannot create error response for successful validation')
  }

  const errorMessage = result.error?.issues.length
    ? `${result.error.message}: ${result.error.issues.map(i => `${i.path}: ${i.message}`).join(', ')}`
    : result.error?.message || 'Validation failed'

  return errorResponses.validationError(errorMessage, {
    userId,
    details: {
      issues: result.error?.issues,
    },
  })
}

/**
 * Common Zod validators for reuse
 */
export const commonValidators = {
  /** UUID v4 string */
  uuid: z.string().uuid('Invalid UUID format'),

  /** Non-empty string with max length */
  nonEmptyString: (maxLength = 1000) =>
    z.string().min(1, 'Required').max(maxLength, `Maximum ${maxLength} characters`),

  /** Optional non-empty string */
  optionalString: (maxLength = 1000) =>
    z.string().max(maxLength, `Maximum ${maxLength} characters`).optional(),

  /** Email address */
  email: z.string().email('Invalid email address'),

  /** URL */
  url: z.string().url('Invalid URL format'),

  /** Positive integer */
  positiveInt: z.number().int().positive('Must be a positive integer'),

  /** ISO date string */
  isoDate: z.string().datetime('Invalid ISO date format'),

  /** Enum with custom error message */
  enum: <T extends [string, ...string[]]>(values: T, name = 'value') =>
    z.enum(values, {
      message: `${name} must be one of: ${values.join(', ')}`,
    }),

  /** Pagination limit (1-100) */
  paginationLimit: z.number().int().min(1).max(100).default(50),

  /** Pagination cursor */
  paginationCursor: z.string().uuid().optional(),
}

/**
 * File upload validation
 */
export interface FileValidationOptions {
  maxSizeBytes: number
  allowedMimeTypes: string[]
}

export function validateFile(
  file: File,
  options: FileValidationOptions
): ValidationResult<File> {
  const { maxSizeBytes, allowedMimeTypes } = options

  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      success: false,
      error: {
        message: `File size exceeds maximum of ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
        issues: [{
          path: 'file.size',
          message: `Size: ${file.size} bytes, max: ${maxSizeBytes} bytes`,
        }],
      },
    }
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      success: false,
      error: {
        message: `File type not allowed: ${file.type}`,
        issues: [{
          path: 'file.type',
          message: `Allowed types: ${allowedMimeTypes.join(', ')}`,
        }],
      },
    }
  }

  return {
    success: true,
    data: file,
  }
}

/**
 * Validation constants
 */
export const VALIDATION_LIMITS = {
  /** Maximum length for prompts (AI safety) */
  MAX_PROMPT_LENGTH: 50000,

  /** Maximum length for document content */
  MAX_DOCUMENT_LENGTH: 5000000, // 5MB of text

  /** Maximum length for short text fields */
  MAX_SHORT_TEXT: 500,

  /** Maximum length for medium text fields */
  MAX_MEDIUM_TEXT: 5000,

  /** Maximum file upload size (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** Allowed image MIME types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const
