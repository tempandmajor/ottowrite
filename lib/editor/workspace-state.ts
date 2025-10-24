/**
 * Workspace State Management
 *
 * Utilities for managing and persisting workspace layout preferences.
 * Used by editor-workspace.tsx to maintain user's preferred sidebar states.
 */

export interface WorkspacePreferences {
  showBinder: boolean
  showOutline: boolean
  showUtilitySidebar: boolean
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
