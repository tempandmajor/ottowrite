import { z } from 'zod'
import { commonValidators, VALIDATION_LIMITS } from '../middleware'

/**
 * Validation schemas for character operations
 */

export const characterSchema = z.object({
  /** Project ID */
  projectId: commonValidators.uuid,

  /** Character name */
  name: commonValidators.nonEmptyString(200),

  /** Character role */
  role: z
    .enum(['protagonist', 'antagonist', 'supporting', 'minor', 'other'])
    .default('other'),

  /** Age */
  age: z.number().int().min(0).max(200).optional(),

  /** Gender */
  gender: commonValidators.optionalString(50),

  /** Physical description */
  physicalDescription: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Personality traits */
  personality: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Background/backstory */
  backstory: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Motivations/goals */
  motivations: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Flaws/weaknesses */
  flaws: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Character arc summary */
  arc: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Voice/speaking style */
  voice: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Occupation */
  occupation: commonValidators.optionalString(200),

  /** Notable relationships */
  relationships: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Image URLs */
  imageUrls: z
    .array(z.string().url())
    .max(10)
    .optional(),

  /** Tags */
  tags: z
    .array(z.string().max(50))
    .max(20)
    .optional(),

  /** Custom properties (JSON) */
  properties: z.record(z.string(), z.unknown()).optional(),
})

export type CharacterInput = z.infer<typeof characterSchema>

/**
 * Schema for character updates
 */
export const characterUpdateSchema = z.object({
  /** Character ID */
  id: commonValidators.uuid,

  /** All fields optional for updates */
  name: commonValidators.optionalString(200),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor', 'other']).optional(),
  age: z.number().int().min(0).max(200).optional(),
  gender: commonValidators.optionalString(50),
  physicalDescription: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  personality: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  backstory: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  motivations: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  flaws: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  arc: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  voice: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  occupation: commonValidators.optionalString(200),
  relationships: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
})

export type CharacterUpdateInput = z.infer<typeof characterUpdateSchema>

/**
 * Schema for character relationships
 */
export const characterRelationshipSchema = z.object({
  /** Project ID */
  projectId: commonValidators.uuid,

  /** Source character ID */
  characterId: commonValidators.uuid,

  /** Related character ID */
  relatedCharacterId: commonValidators.uuid,

  /** Relationship type */
  relationshipType: z.enum([
    'family',
    'friend',
    'enemy',
    'rival',
    'mentor',
    'mentee',
    'romantic',
    'professional',
    'ally',
    'other',
  ]),

  /** Relationship description */
  description: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Relationship strength (1-10) */
  strength: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional(),

  /** Status */
  status: z
    .enum(['current', 'past', 'developing', 'broken'])
    .default('current'),

  /** Additional properties */
  properties: z.record(z.string(), z.unknown()).optional(),
})

export type CharacterRelationshipInput = z.infer<typeof characterRelationshipSchema>

/**
 * Schema for character arc stages
 */
export const characterArcSchema = z.object({
  /** Character ID */
  characterId: commonValidators.uuid,

  /** Stage name */
  stageName: commonValidators.nonEmptyString(200),

  /** Stage description */
  description: commonValidators.optionalString(VALIDATION_LIMITS.MAX_MEDIUM_TEXT),

  /** Stage order/position */
  position: z.number().int().min(0),

  /** Related document ID (optional) */
  documentId: commonValidators.uuid.optional(),

  /** Related scene/chapter reference */
  sceneReference: commonValidators.optionalString(500),

  /** Stage status */
  status: z
    .enum(['planned', 'in_progress', 'completed'])
    .default('planned'),
})

export type CharacterArcInput = z.infer<typeof characterArcSchema>

/**
 * Schema for character dialogue voice analysis
 */
export const dialogueVoiceSchema = z.object({
  /** Character ID */
  characterId: commonValidators.uuid,

  /** Project ID */
  projectId: commonValidators.uuid,

  /** Dialogue samples for analysis (array of strings) */
  dialogueSamples: z
    .array(z.string().min(10).max(5000))
    .min(1, 'At least one dialogue sample required')
    .max(20, 'Maximum 20 dialogue samples allowed'),

  /** Target passage to analyze against */
  targetPassage: z
    .string()
    .min(10, 'Target passage must be at least 10 characters')
    .max(5000, 'Target passage too long'),

  /** Additional context */
  context: commonValidators.optionalString(1000),
})

export type DialogueVoiceInput = z.infer<typeof dialogueVoiceSchema>
