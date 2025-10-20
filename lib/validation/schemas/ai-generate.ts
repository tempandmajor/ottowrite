import { z } from 'zod'
import { commonValidators, VALIDATION_LIMITS } from '../middleware'

/**
 * Validation schema for AI generation endpoints
 * Protects against prompt injection and excessive resource usage
 */

export const aiGenerateSchema = z.object({
  /** Document ID to generate content for */
  documentId: commonValidators.uuid,

  /** User prompt for AI generation */
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(VALIDATION_LIMITS.MAX_PROMPT_LENGTH, `Prompt must be less than ${VALIDATION_LIMITS.MAX_PROMPT_LENGTH} characters`),

  /** Command type */
  command: z
    .enum(['continue', 'rewrite', 'expand', 'summarize', 'brainstorm', 'custom'])
    .optional(),

  /** Selection to rewrite/expand (required for some commands) */
  selection: z
    .string()
    .max(VALIDATION_LIMITS.MAX_MEDIUM_TEXT)
    .optional(),

  /** Additional context for generation */
  context: z
    .string()
    .max(VALIDATION_LIMITS.MAX_MEDIUM_TEXT)
    .optional(),

  /** Project ID for context */
  projectId: commonValidators.uuid.optional(),

  /** Model preference */
  model: z
    .enum(['claude', 'gpt', 'deepseek'])
    .optional(),
})

export type AIGenerateInput = z.infer<typeof aiGenerateSchema>

/**
 * Schema for AI template operations
 */
export const aiTemplateSchema = z.object({
  /** Template name */
  name: commonValidators.nonEmptyString(200),

  /** Template description */
  description: commonValidators.optionalString(1000),

  /** System prompt */
  systemPrompt: z
    .string()
    .min(10, 'System prompt must be at least 10 characters')
    .max(VALIDATION_LIMITS.MAX_PROMPT_LENGTH),

  /** User prompt template */
  userPromptTemplate: z
    .string()
    .min(10, 'User prompt template must be at least 10 characters')
    .max(VALIDATION_LIMITS.MAX_PROMPT_LENGTH),

  /** Template variables */
  variables: z
    .array(z.object({
      name: commonValidators.nonEmptyString(50),
      description: commonValidators.optionalString(200),
      required: z.boolean().default(false),
    }))
    .optional(),

  /** Template category */
  category: z
    .enum(['writing', 'editing', 'planning', 'analysis', 'research'])
    .optional(),
})

export type AITemplateInput = z.infer<typeof aiTemplateSchema>

/**
 * Schema for AI ensemble operations
 */
export const aiEnsembleSchema = z.object({
  /** Prompt for ensemble generation */
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(VALIDATION_LIMITS.MAX_PROMPT_LENGTH),

  /** Document context */
  documentId: commonValidators.uuid.optional(),

  /** Project context */
  projectId: commonValidators.uuid.optional(),

  /** Number of models to use (1-3) */
  modelCount: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(3),

  /** Additional context */
  context: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
})

export type AIEnsembleInput = z.infer<typeof aiEnsembleSchema>

/**
 * Schema for AI ensemble blend operation
 */
export const aiEnsembleBlendSchema = z.object({
  /** Suggestions to blend (minimum 2) */
  suggestions: z
    .array(z.object({
      model: z.string(),
      text: z.string(),
      tokens: z.number().optional(),
    }))
    .min(2, 'At least 2 suggestions required for blending')
    .max(5, 'Maximum 5 suggestions allowed'),

  /** Blending strategy */
  strategy: z
    .enum(['merge', 'best_of', 'creative_mix'])
    .default('merge'),

  /** Target length hint */
  targetLength: z
    .number()
    .int()
    .min(100)
    .max(10000)
    .optional(),
})

export type AIEnsembleBlendInput = z.infer<typeof aiEnsembleBlendSchema>

/**
 * Schema for AI coverage generation
 */
export const aiCoverageSchema = z.object({
  /** Project ID */
  projectId: commonValidators.uuid,

  /** Script text sample (minimum 200 chars) */
  scriptText: z
    .string()
    .min(200, 'Script sample must be at least 200 characters')
    .max(100000, 'Script sample too large'),

  /** Format type */
  format: z.enum([
    'feature',
    'pilot',
    'episode',
    'short',
    'limited_series',
    'other',
  ]),

  /** Script title */
  title: commonValidators.optionalString(500),

  /** Genre tags */
  genreTags: z
    .array(z.string())
    .optional(),

  /** Logline */
  logline: commonValidators.optionalString(500),

  /** Development notes */
  developmentNotes: commonValidators.optionalString(5000),
})

export type AICoverageInput = z.infer<typeof aiCoverageSchema>

/**
 * Schema for background task creation
 */
export const aiBackgroundTaskSchema = z.object({
  /** Task type */
  taskType: z.enum([
    'generate',
    'analyze',
    'summarize',
    'research',
    'outline',
    'coverage',
  ]),

  /** Task prompt */
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(VALIDATION_LIMITS.MAX_PROMPT_LENGTH),

  /** Document ID */
  documentId: commonValidators.uuid.optional(),

  /** Project ID */
  projectId: commonValidators.uuid.optional(),

  /** Additional context */
  context: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Metadata */
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type AIBackgroundTaskInput = z.infer<typeof aiBackgroundTaskSchema>
