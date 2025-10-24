/**
 * Validation Schemas Index
 *
 * Central export for all validation schemas used across the API.
 * Import from here to ensure consistency.
 */

// AI validation schemas
export * from './ai-generate'
export { mapToAIModel } from './ai-generate'

// Document validation schemas
export * from './documents'

// Project validation schemas
export * from './projects'

// Character validation schemas
export * from './characters'

// Webhook validation schemas
export * from './webhooks'
