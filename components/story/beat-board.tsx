'use client'

import { useState } from 'react'
import { BeatCard } from './beat-card'
import { Card } from '@/components/ui/card'

type Beat = {
  id: string
  project_id: string
  beat_type: string
  order_position: number
  title: string
  description: string | null
  notes: string | null
  target_page_count: number | null
  actual_page_count: number | null
  status: 'pending' | 'in_progress' | 'complete'
  linked_document_ids: string[]
  metadata: any
}

interface BeatBoardProps {
  beats: Beat[]
  onBeatUpdate: (beatId: string, updates: Partial<Beat>) => void
}

export function BeatBoard({ beats, onBeatUpdate }: BeatBoardProps) {
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null)

  const sortedBeats = [...beats].sort((a, b) => a.order_position - b.order_position)

  const getStatusCounts = () => {
    const pending = beats.filter((b) => b.status === 'pending').length
    const inProgress = beats.filter((b) => b.status === 'in_progress').length
    const complete = beats.filter((b) => b.status === 'complete').length
    return { pending, inProgress, complete }
  }

  const stats = getStatusCounts()
  const progress = beats.length > 0 ? (stats.complete / beats.length) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Story Progress</h3>
            <span className="text-sm text-muted-foreground">
              {stats.complete} / {beats.length} beats complete
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-yellow-600">{stats.pending}</span> Pending
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-blue-600">{stats.inProgress}</span> In Progress
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-green-600">{stats.complete}</span> Complete
            </span>
          </div>
        </div>
      </Card>

      {/* Beat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedBeats.map((beat) => (
          <BeatCard
            key={beat.id}
            beat={beat}
            isExpanded={expandedBeat === beat.id}
            onToggleExpand={() =>
              setExpandedBeat(expandedBeat === beat.id ? null : beat.id)
            }
            onUpdate={(updates) => onBeatUpdate(beat.id, updates)}
          />
        ))}
      </div>
    </div>
  )
}
