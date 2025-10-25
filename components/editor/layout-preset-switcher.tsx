'use client'

/**
 * Layout Preset Switcher
 *
 * Quick switcher for workspace layout presets (Writer, Planner, Assistant, Full).
 * Provides buttons for instant layout switching and keyboard shortcut hints.
 *
 * Used in editor-toolbar.tsx
 */

import { useState, useEffect } from 'react'
import { FileText, Layout, Sparkles, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  WorkspaceLayoutPreset,
  LAYOUT_PRESET_META,
  getCurrentLayoutPreset,
  setLayoutPreset,
} from '@/lib/editor/workspace-state'

interface LayoutPresetSwitcherProps {
  onPresetChange?: (preset: WorkspaceLayoutPreset) => void
  className?: string
  variant?: 'dropdown' | 'buttons'
}

/**
 * Icon mapping for each preset
 */
const PRESET_ICONS = {
  writer: FileText,
  planner: Layout,
  assistant: Sparkles,
  full: LayoutGrid,
}

export function LayoutPresetSwitcher({
  onPresetChange,
  className,
  variant = 'dropdown',
}: LayoutPresetSwitcherProps) {
  const [currentPreset, setCurrentPreset] = useState<WorkspaceLayoutPreset>('writer')

  // Load current preset on mount
  useEffect(() => {
    setCurrentPreset(getCurrentLayoutPreset())
  }, [])

  const handlePresetChange = (preset: WorkspaceLayoutPreset) => {
    setLayoutPreset(preset)
    setCurrentPreset(preset)
    onPresetChange?.(preset)

    // Force a small delay to allow React to update state before re-render
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workspace-layout-changed', { detail: { preset } }))
    }, 0)
  }

  if (variant === 'buttons') {
    // Button group variant - shows all presets as individual buttons
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {(Object.keys(LAYOUT_PRESET_META) as WorkspaceLayoutPreset[]).map((preset) => {
          const Icon = PRESET_ICONS[preset]
          const meta = LAYOUT_PRESET_META[preset]
          const isActive = currentPreset === preset

          return (
            <Button
              key={preset}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetChange(preset)}
              className={cn(
                'gap-1.5',
                isActive && 'bg-primary text-primary-foreground'
              )}
              title={`${meta.label}: ${meta.description} (${meta.shortcut})`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{meta.label}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  // Dropdown variant - shows current preset with dropdown menu
  const CurrentIcon = PRESET_ICONS[currentPreset]
  const currentMeta = LAYOUT_PRESET_META[currentPreset]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-1.5 min-w-[140px] justify-start', className)}
        >
          <CurrentIcon className="h-4 w-4" />
          <span>{currentMeta.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Workspace Layout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(LAYOUT_PRESET_META) as WorkspaceLayoutPreset[]).map((preset) => {
          const Icon = PRESET_ICONS[preset]
          const meta = LAYOUT_PRESET_META[preset]
          const isActive = currentPreset === preset

          return (
            <DropdownMenuItem
              key={preset}
              onClick={() => handlePresetChange(preset)}
              className={cn(
                'flex items-center justify-between gap-3 cursor-pointer',
                isActive && 'bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                </div>
              </div>
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono bg-muted rounded">
                {meta.shortcut}
              </kbd>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact version - just shows icon with tooltip
 */
export function LayoutPresetSwitcherCompact({
  onPresetChange,
  className,
}: Omit<LayoutPresetSwitcherProps, 'variant'>) {
  const [currentPreset, setCurrentPreset] = useState<WorkspaceLayoutPreset>('writer')

  useEffect(() => {
    setCurrentPreset(getCurrentLayoutPreset())
  }, [])

  const handlePresetChange = (preset: WorkspaceLayoutPreset) => {
    setLayoutPreset(preset)
    setCurrentPreset(preset)
    onPresetChange?.(preset)
    window.dispatchEvent(new CustomEvent('workspace-layout-changed', { detail: { preset } }))
  }

  const CurrentIcon = PRESET_ICONS[currentPreset]
  const currentMeta = LAYOUT_PRESET_META[currentPreset]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 w-8 p-0', className)}
          title={`Layout: ${currentMeta.label}`}
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Workspace Layout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(LAYOUT_PRESET_META) as WorkspaceLayoutPreset[]).map((preset) => {
          const Icon = PRESET_ICONS[preset]
          const meta = LAYOUT_PRESET_META[preset]
          const isActive = currentPreset === preset

          return (
            <DropdownMenuItem
              key={preset}
              onClick={() => handlePresetChange(preset)}
              className={cn(
                'flex items-center justify-between gap-3 cursor-pointer',
                isActive && 'bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                </div>
              </div>
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono bg-muted rounded">
                {meta.shortcut}
              </kbd>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
