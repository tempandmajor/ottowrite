/**
 * Document Type System
 * TICKET-TMPL-001: Core Type System Enhancement
 *
 * Centralized document type definitions for all formats:
 * - Prose (novels, short stories)
 * - Film (feature, short, documentary, animation)
 * - TV (drama, sitcom, pilot, series)
 * - Stage (plays, musicals)
 * - Alternative (graphic novels, audio, games)
 */

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * All supported document types in OttoWrite
 * Matches database constraint in migration 20250123000001
 */
export type DocumentType =
  // Prose formats
  | 'novel'
  | 'series'
  | 'short_story'
  // Film formats
  | 'feature_film'
  | 'short_film'
  | 'documentary'
  | 'animation'
  // TV formats
  | 'tv_drama'
  | 'tv_sitcom_multi'
  | 'tv_sitcom_single'
  | 'tv_pilot'
  | 'tv_movie'
  | 'limited_series'
  | 'web_series'
  // Stage formats
  | 'stage_play'
  | 'one_act_play'
  | 'musical'
  | 'radio_play'
  // Alternative formats
  | 'graphic_novel'
  | 'audio_drama'
  | 'video_game_script'
  | 'commercial'
  | 'treatment'
  | 'outline'
  // Legacy types (deprecated, use specific types instead)
  | 'screenplay' // Use feature_film, short_film, etc.
  | 'play' // Use stage_play, one_act_play, etc.
  | 'article' // Legacy
  | 'blog' // Legacy

/**
 * Document type categories for grouping in UI
 */
export type DocumentCategory = 'prose' | 'screenplay' | 'tv' | 'stage' | 'other'

/**
 * Document type metadata interface
 */
export interface DocumentTypeMetadata {
  type: DocumentType
  label: string
  category: DocumentCategory
  description: string
  pageRange: [number, number] // [min, max] page count
  industryStandard: string
  icon: string
  sortOrder: number
}

// ============================================================================
// Document Type Metadata
// ============================================================================

/**
 * Complete metadata for all document types
 * Used for UI labels, validation, and documentation
 */
export const DOCUMENT_TYPE_METADATA: Record<DocumentType, DocumentTypeMetadata> = {
  // -------------------------------------------------------------------------
  // Prose Formats
  // -------------------------------------------------------------------------
  novel: {
    type: 'novel',
    label: 'Novel',
    category: 'prose',
    description: 'Full-length novel manuscript',
    pageRange: [200, 400],
    industryStandard: 'Double-spaced, 12pt font, approximately 250 words per page',
    icon: '📖',
    sortOrder: 1,
  },
  series: {
    type: 'series',
    label: 'Book Series',
    category: 'prose',
    description: 'Multi-book series with linked narratives',
    pageRange: [200, 400],
    industryStandard: 'Double-spaced, 12pt font per volume',
    icon: '📚',
    sortOrder: 2,
  },
  short_story: {
    type: 'short_story',
    label: 'Short Story',
    category: 'prose',
    description: 'Short form fiction',
    pageRange: [5, 50],
    industryStandard: 'Double-spaced, 12pt font, 1,000-10,000 words',
    icon: '📄',
    sortOrder: 3,
  },

  // -------------------------------------------------------------------------
  // Film Formats
  // -------------------------------------------------------------------------
  feature_film: {
    type: 'feature_film',
    label: 'Feature Film',
    category: 'screenplay',
    description: 'Standard theatrical feature film screenplay',
    pageRange: [90, 120],
    industryStandard: '1 page = 1 minute of screen time, Courier 12pt',
    icon: '🎬',
    sortOrder: 10,
  },
  short_film: {
    type: 'short_film',
    label: 'Short Film',
    category: 'screenplay',
    description: 'Short format film screenplay',
    pageRange: [5, 30],
    industryStandard: '1 page = 1 minute of screen time, Courier 12pt',
    icon: '🎞️',
    sortOrder: 11,
  },
  documentary: {
    type: 'documentary',
    label: 'Documentary',
    category: 'screenplay',
    description: 'Documentary screenplay with interviews and narration',
    pageRange: [60, 120],
    industryStandard: 'Flexible format, includes interview notes and V.O. narration',
    icon: '🎥',
    sortOrder: 12,
  },
  animation: {
    type: 'animation',
    label: 'Animation Feature',
    category: 'screenplay',
    description: 'Animated feature film screenplay',
    pageRange: [90, 120],
    industryStandard: 'Detailed action descriptions, character expressions, timing notes',
    icon: '✨',
    sortOrder: 13,
  },

  // -------------------------------------------------------------------------
  // TV Formats
  // -------------------------------------------------------------------------
  tv_drama: {
    type: 'tv_drama',
    label: 'TV Drama (1-Hour)',
    category: 'tv',
    description: 'One-hour drama with act breaks for commercials',
    pageRange: [45, 60],
    industryStandard: 'Network: 42-44 min runtime = 45-55 pages. Cable/Streaming: more flexible',
    icon: '📺',
    sortOrder: 20,
  },
  tv_sitcom_multi: {
    type: 'tv_sitcom_multi',
    label: 'TV Sitcom (Multi-Camera)',
    category: 'tv',
    description: 'Traditional multi-camera sitcom format (filmed before live audience)',
    pageRange: [22, 30],
    industryStandard: '22 minutes runtime = 22-30 pages. ALL CAPS action, scene letters',
    icon: '📹',
    sortOrder: 21,
  },
  tv_sitcom_single: {
    type: 'tv_sitcom_single',
    label: 'TV Sitcom (Single-Camera)',
    category: 'tv',
    description: 'Single-camera comedy format (more cinematic)',
    pageRange: [25, 35],
    industryStandard: '22-30 minutes runtime, standard screenplay format',
    icon: '🎭',
    sortOrder: 22,
  },
  tv_pilot: {
    type: 'tv_pilot',
    label: 'TV Pilot',
    category: 'tv',
    description: 'Television pilot episode (drama or comedy)',
    pageRange: [30, 65],
    industryStandard: 'Varies by format: Drama 55-65 pages, Comedy 30-40 pages',
    icon: '🌟',
    sortOrder: 23,
  },
  tv_movie: {
    type: 'tv_movie',
    label: 'TV Movie',
    category: 'tv',
    description: 'Made-for-television movie',
    pageRange: [90, 120],
    industryStandard: 'Similar to feature film, includes act breaks for commercials',
    icon: '📡',
    sortOrder: 24,
  },
  limited_series: {
    type: 'limited_series',
    label: 'Limited Series',
    category: 'tv',
    description: 'Limited/mini-series episode with defined endpoint',
    pageRange: [45, 60],
    industryStandard: 'Serialized storytelling, self-contained arc across episodes',
    icon: '🎬',
    sortOrder: 25,
  },
  web_series: {
    type: 'web_series',
    label: 'Web Series',
    category: 'tv',
    description: 'Web-based episodic content',
    pageRange: [5, 15],
    industryStandard: 'Compressed format, 5-15 minutes, optimized for digital platforms',
    icon: '💻',
    sortOrder: 26,
  },

  // -------------------------------------------------------------------------
  // Stage Formats
  // -------------------------------------------------------------------------
  stage_play: {
    type: 'stage_play',
    label: 'Stage Play',
    category: 'stage',
    description: 'Full-length stage play (2-3 acts)',
    pageRange: [90, 120],
    industryStandard: 'Character list, stage directions in italics, act/scene structure',
    icon: '🎭',
    sortOrder: 30,
  },
  one_act_play: {
    type: 'one_act_play',
    label: 'One-Act Play',
    category: 'stage',
    description: 'Single-act stage play without intermission',
    pageRange: [30, 45],
    industryStandard: 'Continuous action, 30-45 minutes runtime',
    icon: '🎪',
    sortOrder: 31,
  },
  musical: {
    type: 'musical',
    label: 'Musical',
    category: 'stage',
    description: 'Stage musical with songs, dialogue, and choreography',
    pageRange: [90, 150],
    industryStandard: 'Includes lyrics, song cues, dance breaks, [MUSIC] notations',
    icon: '🎵',
    sortOrder: 32,
  },
  radio_play: {
    type: 'radio_play',
    label: 'Radio Play',
    category: 'stage',
    description: 'Radio drama script (audio-only theatrical production)',
    pageRange: [30, 60],
    industryStandard: 'Heavy emphasis on sound effects and dialogue, [SFX] notation',
    icon: '📻',
    sortOrder: 33,
  },

  // -------------------------------------------------------------------------
  // Alternative Formats
  // -------------------------------------------------------------------------
  graphic_novel: {
    type: 'graphic_novel',
    label: 'Graphic Novel',
    category: 'other',
    description: 'Panel-based graphic narrative with visual storytelling',
    pageRange: [50, 300],
    industryStandard: 'Panel descriptions, character dialogue, SFX, visual composition notes',
    icon: '🎨',
    sortOrder: 40,
  },
  audio_drama: {
    type: 'audio_drama',
    label: 'Audio Drama',
    category: 'other',
    description: 'Audio-only dramatic production (podcast, audiobook)',
    pageRange: [30, 60],
    industryStandard: 'Sound effects, music cues, voice direction, binaural audio notes',
    icon: '🎧',
    sortOrder: 41,
  },
  video_game_script: {
    type: 'video_game_script',
    label: 'Video Game Script',
    category: 'other',
    description: 'Interactive video game narrative with player choices',
    pageRange: [50, 200],
    industryStandard: 'Branching dialogue, player choice notation, quest structure',
    icon: '🎮',
    sortOrder: 42,
  },
  commercial: {
    type: 'commercial',
    label: 'Commercial',
    category: 'other',
    description: 'Advertisement script (30s, 60s spots)',
    pageRange: [1, 3],
    industryStandard: '30-second = 60-75 words, 60-second = 150-180 words',
    icon: '📢',
    sortOrder: 43,
  },
  treatment: {
    type: 'treatment',
    label: 'Treatment',
    category: 'other',
    description: 'Prose narrative summary of screenplay',
    pageRange: [5, 20],
    industryStandard: 'Story outline in prose format, present tense, 3-20 pages',
    icon: '📝',
    sortOrder: 44,
  },
  outline: {
    type: 'outline',
    label: 'Outline',
    category: 'other',
    description: 'Beat-by-beat story outline',
    pageRange: [3, 15],
    industryStandard: 'Scene-by-scene breakdown, bullet points or numbered list',
    icon: '📋',
    sortOrder: 45,
  },

  // -------------------------------------------------------------------------
  // Legacy Types (Deprecated)
  // -------------------------------------------------------------------------
  screenplay: {
    type: 'screenplay',
    label: 'Screenplay (Legacy)',
    category: 'screenplay',
    description: '[DEPRECATED] Use specific film/TV types instead',
    pageRange: [90, 120],
    industryStandard: 'Migrated to feature_film',
    icon: '🎬',
    sortOrder: 99,
  },
  play: {
    type: 'play',
    label: 'Play (Legacy)',
    category: 'stage',
    description: '[DEPRECATED] Use stage_play, one_act_play, etc.',
    pageRange: [90, 120],
    industryStandard: 'Migrated to stage_play',
    icon: '🎭',
    sortOrder: 99,
  },
  article: {
    type: 'article',
    label: 'Article (Legacy)',
    category: 'other',
    description: '[DEPRECATED] Legacy article format',
    pageRange: [5, 20],
    industryStandard: 'Legacy format',
    icon: '📰',
    sortOrder: 99,
  },
  blog: {
    type: 'blog',
    label: 'Blog (Legacy)',
    category: 'other',
    description: '[DEPRECATED] Legacy blog format',
    pageRange: [1, 10],
    industryStandard: 'Legacy format',
    icon: '📝',
    sortOrder: 99,
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable label for document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_METADATA[type]?.label ?? type
}

/**
 * Get document type metadata
 */
export function getDocumentTypeInfo(type: DocumentType): DocumentTypeMetadata {
  return DOCUMENT_TYPE_METADATA[type]
}

/**
 * Get document type category
 */
export function getDocumentCategory(type: DocumentType): DocumentCategory {
  return DOCUMENT_TYPE_METADATA[type]?.category ?? 'other'
}

/**
 * Check if document type is a screenplay/script format
 * (requires screenplay-specific editor features)
 */
export function isScriptType(type: DocumentType): boolean {
  const scriptTypes: DocumentType[] = [
    // Film
    'feature_film',
    'short_film',
    'documentary',
    'animation',
    // TV
    'tv_drama',
    'tv_sitcom_multi',
    'tv_sitcom_single',
    'tv_pilot',
    'tv_movie',
    'limited_series',
    'web_series',
    // Stage
    'stage_play',
    'one_act_play',
    'musical',
    'radio_play',
    // Alternative
    'audio_drama',
    'video_game_script',
    'commercial',
    // Legacy
    'screenplay',
    'play',
  ]
  return scriptTypes.includes(type)
}

/**
 * Check if document type is a TV format
 */
export function isTVType(type: DocumentType): boolean {
  const tvTypes: DocumentType[] = [
    'tv_drama',
    'tv_sitcom_multi',
    'tv_sitcom_single',
    'tv_pilot',
    'tv_movie',
    'limited_series',
    'web_series',
  ]
  return tvTypes.includes(type)
}

/**
 * Check if document type is a stage format
 */
export function isStageType(type: DocumentType): boolean {
  const stageTypes: DocumentType[] = [
    'stage_play',
    'one_act_play',
    'musical',
    'radio_play',
    'play', // legacy
  ]
  return stageTypes.includes(type)
}

/**
 * Check if document type is a film format
 */
export function isFilmType(type: DocumentType): boolean {
  const filmTypes: DocumentType[] = [
    'feature_film',
    'short_film',
    'documentary',
    'animation',
    'screenplay', // legacy
  ]
  return filmTypes.includes(type)
}

/**
 * Get all document types for a category
 */
export function getDocumentTypesByCategory(category: DocumentCategory): DocumentType[] {
  return Object.values(DOCUMENT_TYPE_METADATA)
    .filter((meta) => meta.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((meta) => meta.type)
}

/**
 * Get all active (non-legacy) document types
 */
export function getActiveDocumentTypes(): DocumentType[] {
  return Object.values(DOCUMENT_TYPE_METADATA)
    .filter((meta) => meta.sortOrder < 99) // Legacy types have sortOrder 99
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((meta) => meta.type)
}

/**
 * Validate page count for document type
 */
export function isPageCountValid(type: DocumentType, pageCount: number): boolean {
  const meta = DOCUMENT_TYPE_METADATA[type]
  if (!meta) return true // Unknown type, allow any page count

  const [min, max] = meta.pageRange
  return pageCount >= min && pageCount <= max
}

/**
 * Get expected page range string for UI
 */
export function getPageRangeLabel(type: DocumentType): string {
  const meta = DOCUMENT_TYPE_METADATA[type]
  if (!meta) return ''

  const [min, max] = meta.pageRange
  if (min === max) return `${min} pages`
  return `${min}-${max} pages`
}

// ============================================================================
// UI Helper Functions
// ============================================================================

/**
 * Group document types by category for UI display
 */
export interface DocumentTypeGroup {
  category: DocumentCategory
  label: string
  icon: string
  types: Array<{
    type: DocumentType
    label: string
    description: string
    pageRange: string
    icon: string
  }>
}

export function getDocumentTypeGroups(): DocumentTypeGroup[] {
  const categories: Array<{
    category: DocumentCategory
    label: string
    icon: string
  }> = [
    { category: 'prose', label: 'Prose', icon: '📖' },
    { category: 'screenplay', label: 'Film', icon: '🎬' },
    { category: 'tv', label: 'Television', icon: '📺' },
    { category: 'stage', label: 'Stage', icon: '🎭' },
    { category: 'other', label: 'Other Formats', icon: '✨' },
  ]

  return categories.map((cat) => ({
    category: cat.category,
    label: cat.label,
    icon: cat.icon,
    types: Object.values(DOCUMENT_TYPE_METADATA)
      .filter((meta) => meta.category === cat.category && meta.sortOrder < 99)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((meta) => ({
        type: meta.type,
        label: meta.label,
        description: meta.description,
        pageRange: getPageRangeLabel(meta.type),
        icon: meta.icon,
      })),
  }))
}

/**
 * Search document types by label or description
 */
export function searchDocumentTypes(query: string): DocumentType[] {
  const lowerQuery = query.toLowerCase()
  return Object.values(DOCUMENT_TYPE_METADATA)
    .filter(
      (meta) =>
        meta.sortOrder < 99 && // Exclude legacy types
        (meta.label.toLowerCase().includes(lowerQuery) ||
          meta.description.toLowerCase().includes(lowerQuery))
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((meta) => meta.type)
}
