'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChapterSidebar } from '@/components/editor/chapter-sidebar'
import { ReadingTimeWidget } from '@/components/editor/reading-time-widget'
import { CharacterSceneIndex } from '@/components/editor/character-scene-index'
import type { Chapter } from '@/components/editor/chapter-sidebar'
import { BookOpen, Users, Clock } from 'lucide-react'

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

type TabValue = 'chapters' | 'reading' | 'characters'

/**
 * TabbedOutlineSidebar - Progressive disclosure for outline widgets
 *
 * Organizes outline tools into tabs to reduce cognitive load.
 * Only one tab is visible at a time, with keyboard shortcuts for quick switching.
 *
 * Keyboard shortcuts:
 * - Cmd/Ctrl + 1: Chapters
 * - Cmd/Ctrl + 2: Reading time
 * - Cmd/Ctrl + 3: Characters
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

  // Keyboard shortcuts: Cmd/Ctrl + 1-3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (!(e.metaKey || e.ctrlKey)) return

      const tabMap: Record<string, TabValue> = {
        '1': 'chapters',
        '2': 'reading',
        '3': 'characters',
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
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabValue)}
      className="w-full"
    >
      <TabsList className="w-full justify-start" aria-label="Outline tools">
        <TabsTrigger value="chapters" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>Chapters</span>
        </TabsTrigger>
        <TabsTrigger value="reading" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Reading time</span>
        </TabsTrigger>
        <TabsTrigger value="characters" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>Characters</span>
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
      </TabsContent>

      <TabsContent value="reading" className="space-y-4">
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
    </Tabs>
  )
}
