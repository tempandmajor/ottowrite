/**
 * Workspace State Management
 *
 * Utilities for managing and persisting workspace layout preferences.
 * Used by editor-workspace.tsx to maintain user's preferred sidebar states.
 *
 * Supports 4 layout presets:
 * - Writer: Editor only (no sidebars) - maximum focus
 * - Planner: Outline + Editor - for planning and structuring
 * - Assistant: Editor + AI - for writing with AI assistance
 * - Full: Outline + Editor + AI - full workspace experience
 */

export type WorkspaceLayoutPreset = 'writer' | 'planner' | 'assistant' | 'full'

export interface WorkspacePreferences {
  showBinder: boolean
  showOutline: boolean
  showUtilitySidebar: boolean
}

/**
 * Layout preset configurations
 * Maps each preset to its sidebar visibility states
 */
export const LAYOUT_PRESETS: Record<WorkspaceLayoutPreset, WorkspacePreferences> = {
  writer: {
    showBinder: false,
    showOutline: false,
    showUtilitySidebar: false,
  },
  planner: {
    showBinder: false,
    showOutline: true,
    showUtilitySidebar: false,
  },
  assistant: {
    showBinder: false,
    showOutline: false,
    showUtilitySidebar: true,
  },
  full: {
    showBinder: false,
    showOutline: true,
    showUtilitySidebar: true,
  },
}

/**
 * Metadata for each layout preset
 * Used for UI display and descriptions
 */
export const LAYOUT_PRESET_META: Record<
  WorkspaceLayoutPreset,
  {
    label: string
    description: string
    icon: string
    shortcut: string
  }
> = {
  writer: {
    label: 'Writer',
    description: 'Editor only - maximum focus',
    icon: 'FileText',
    shortcut: '⌘1',
  },
  planner: {
    label: 'Planner',
    description: 'Outline + Editor - structure your work',
    icon: 'Layout',
    shortcut: '⌘2',
  },
  assistant: {
    label: 'Assistant',
    description: 'Editor + AI - write with assistance',
    icon: 'Sparkles',
    shortcut: '⌘3',
  },
  full: {
    label: 'Full',
    description: 'Everything - complete workspace',
    icon: 'LayoutGrid',
    shortcut: '⌘4',
  },
}

const STORAGE_PREFIX = 'ottowrite:workspace:'

/**
 * Get workspace preferences from localStorage
 *
 * Returns default values (all collapsed) for new users.
 * Returns saved preferences for returning users.
 */
export function getWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') {
    // Server-side: return defaults
    return {
      showBinder: false,
      showOutline: false,
      showUtilitySidebar: false,
    }
  }

  return {
    showBinder: localStorage.getItem(`${STORAGE_PREFIX}showBinder`) === 'true',
    showOutline: localStorage.getItem(`${STORAGE_PREFIX}showOutline`) === 'true',
    showUtilitySidebar: localStorage.getItem(`${STORAGE_PREFIX}showUtilitySidebar`) === 'true',
  }
}

/**
 * Set a workspace preference in localStorage
 *
 * @param key - Preference key (showBinder, showOutline, showUtilitySidebar)
 * @param value - Boolean value to save
 */
export function setWorkspacePreference(
  key: keyof WorkspacePreferences,
  value: boolean
): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value))
}

/**
 * Get a single workspace preference
 *
 * @param key - Preference key
 * @param defaultValue - Default value if not set
 */
export function getWorkspacePreference(
  key: keyof WorkspacePreferences,
  defaultValue: boolean = false
): boolean {
  if (typeof window === 'undefined') return defaultValue

  const saved = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
  return saved !== null ? saved === 'true' : defaultValue
}

/**
 * Clear all workspace preferences
 *
 * Useful for reset/logout scenarios.
 */
export function clearWorkspacePreferences(): void {
  if (typeof window === 'undefined') return

  const keys: Array<keyof WorkspacePreferences> = [
    'showBinder',
    'showOutline',
    'showUtilitySidebar',
  ]

  keys.forEach((key) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
  })
}

/**
 * Initialize workspace preferences for a new user
 *
 * Sets all sidebars to collapsed (default focused layout).
 */
export function initializeDefaultWorkspace(): void {
  if (typeof window === 'undefined') return

  // Only initialize if no preferences exist yet
  const hasPreferences = localStorage.getItem(`${STORAGE_PREFIX}showBinder`) !== null

  if (!hasPreferences) {
    setWorkspacePreference('showBinder', false)
    setWorkspacePreference('showOutline', false)
    setWorkspacePreference('showUtilitySidebar', false)
  }
}

/**
 * Get current layout preset
 *
 * Returns the saved preset, or detects which preset matches current sidebar state.
 * Falls back to 'writer' if no match found.
 */
export function getCurrentLayoutPreset(): WorkspaceLayoutPreset {
  if (typeof window === 'undefined') return 'writer'

  // Check if we have a saved preset
  const savedPreset = localStorage.getItem(`${STORAGE_PREFIX}layoutPreset`) as WorkspaceLayoutPreset | null
  if (savedPreset && savedPreset in LAYOUT_PRESETS) {
    return savedPreset
  }

  // Otherwise, detect preset from current sidebar state
  const prefs = getWorkspacePreferences()
  return detectLayoutPreset(prefs)
}

/**
 * Set current layout preset
 *
 * Applies the preset's sidebar configuration and saves it.
 *
 * @param preset - Layout preset to activate
 */
export function setLayoutPreset(preset: WorkspaceLayoutPreset): void {
  if (typeof window === 'undefined') return

  const config = LAYOUT_PRESETS[preset]

  // Apply all sidebar states
  setWorkspacePreference('showBinder', config.showBinder)
  setWorkspacePreference('showOutline', config.showOutline)
  setWorkspacePreference('showUtilitySidebar', config.showUtilitySidebar)

  // Save the preset name
  localStorage.setItem(`${STORAGE_PREFIX}layoutPreset`, preset)
}

/**
 * Detect which layout preset matches the given preferences
 *
 * @param prefs - Workspace preferences to match
 * @returns The matching preset, or 'writer' if no exact match
 */
export function detectLayoutPreset(prefs: WorkspacePreferences): WorkspaceLayoutPreset {
  // Try to find exact match
  for (const [preset, config] of Object.entries(LAYOUT_PRESETS)) {
    if (
      config.showBinder === prefs.showBinder &&
      config.showOutline === prefs.showOutline &&
      config.showUtilitySidebar === prefs.showUtilitySidebar
    ) {
      return preset as WorkspaceLayoutPreset
    }
  }

  // No exact match - return closest or default
  // If nothing is shown, it's writer mode
  if (!prefs.showBinder && !prefs.showOutline && !prefs.showUtilitySidebar) {
    return 'writer'
  }

  // If only outline is shown, it's planner mode
  if (!prefs.showBinder && prefs.showOutline && !prefs.showUtilitySidebar) {
    return 'planner'
  }

  // If only utility sidebar is shown, it's assistant mode
  if (!prefs.showBinder && !prefs.showOutline && prefs.showUtilitySidebar) {
    return 'assistant'
  }

  // If both outline and utility are shown (regardless of binder), it's full mode
  if (prefs.showOutline && prefs.showUtilitySidebar) {
    return 'full'
  }

  // Default fallback
  return 'writer'
}

/**
 * Migrate old workspace preferences to preset system
 *
 * Detects current sidebar state and assigns appropriate preset.
 * Run this on first load after preset system is deployed.
 */
export function migrateToPresetSystem(): void {
  if (typeof window === 'undefined') return

  // Check if migration already happened
  const migrated = localStorage.getItem(`${STORAGE_PREFIX}presetMigrated`)
  if (migrated === 'true') return

  // Get current preferences
  const prefs = getWorkspacePreferences()

  // Detect matching preset
  const preset = detectLayoutPreset(prefs)

  // Save detected preset
  localStorage.setItem(`${STORAGE_PREFIX}layoutPreset`, preset)

  // Mark migration complete
  localStorage.setItem(`${STORAGE_PREFIX}presetMigrated`, 'true')
}
