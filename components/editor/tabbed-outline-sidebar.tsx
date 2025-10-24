'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChapterSidebar } from '@/components/editor/chapter-sidebar'
import { ReadingTimeWidget } from '@/components/editor/reading-time-widget'
import { CharacterSceneIndex } from '@/components/editor/character-scene-index'
import type { Chapter } from '@/components/editor/chapter-sidebar'
import {
  BookOpen,
  Users,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react'

interface TabbedOutlineSidebarProps {
  structure: Chapter[]
  content: string
  wordCount: number
  activeSceneId: string | null
  missingAnchors: Set<string>
  onStructureChange: (chapters: Chapter[]) => void
  onSelectScene: (sceneId: string | null) => void
  onCreateScene: (chapterId: string, sceneId: string) => void
  onInsertAnchor: (sceneId: string) => void
}

type TabValue = 'chapters' | 'characters' | 'timeline' | 'analysis' | 'settings'

/**
 * TabbedOutlineSidebar - Progressive disclosure for outline widgets
 *
 * Organizes outline tools into tabs to reduce cognitive load.
 * Only one tab is visible at a time, with keyboard shortcuts for quick switching.
 *
 * Keyboard shortcuts:
 * - Cmd/Ctrl + 1: Chapters
 * - Cmd/Ctrl + 2: Characters
 * - Cmd/Ctrl + 3: Timeline
 * - Cmd/Ctrl + 4: Analysis
 * - Cmd/Ctrl + 5: Settings
 */
export function TabbedOutlineSidebar({
  structure,
  content,
  wordCount,
  activeSceneId,
  missingAnchors,
  onStructureChange,
  onSelectScene,
  onCreateScene,
  onInsertAnchor,
}: TabbedOutlineSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('chapters')

  // Keyboard shortcuts: Cmd/Ctrl + 1-5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (!(e.metaKey || e.ctrlKey)) return

      const tabMap: Record<string, TabValue> = {
        '1': 'chapters',
        '2': 'characters',
        '3': 'timeline',
        '4': 'analysis',
        '5': 'settings',
      }

      const newTab = tabMap[e.key]
      if (newTab) {
        e.preventDefault()
        setActiveTab(newTab)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="chapters" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>Chapters</span>
        </TabsTrigger>
        <TabsTrigger value="characters" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>Characters</span>
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Timeline</span>
        </TabsTrigger>
        <TabsTrigger value="analysis" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span>Analysis</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chapters" className="space-y-4">
        <ChapterSidebar
          chapters={structure}
          onChange={onStructureChange}
          activeSceneId={activeSceneId}
          onSelectScene={onSelectScene}
          onCreateScene={onCreateScene}
          onInsertAnchor={onInsertAnchor}
          missingAnchors={missingAnchors}
        />
        <ReadingTimeWidget
          content={content}
          wordCount={wordCount}
          structure={structure}
        />
      </TabsContent>

      <TabsContent value="characters" className="space-y-4">
        <CharacterSceneIndex
          content={content}
          structure={structure}
          onNavigateToScene={onSelectScene}
        />
      </TabsContent>

      <TabsContent value="timeline" className="space-y-4">
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium">Timeline View</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming soon: Visualize your story&apos;s chronology and pacing
          </p>
        </div>
      </TabsContent>

      <TabsContent value="analysis" className="space-y-4">
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium">Analysis Tools</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming soon: Readability metrics, pacing analysis, and more
          </p>
        </div>
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <Settings className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium">Outline Settings</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming soon: Customize your outline view and structure preferences
          </p>
        </div>
      </TabsContent>
    </Tabs>
  )
}
