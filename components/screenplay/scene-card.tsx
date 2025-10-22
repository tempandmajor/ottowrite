'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Trash2, Pencil } from 'lucide-react'

export type SceneCardData = {
  id: string
  title: string
  description: string | null
  beat_type: string
  color: string
}

type SceneCardProps = {
  card: SceneCardData
  onEdit: (card: SceneCardData) => void
  onDelete: (card: SceneCardData) => void
}

const COLOR_MAP: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-900',
  a: 'bg-sky-100 text-sky-800',
  b: 'bg-purple-100 text-purple-800',
  c: 'bg-rose-100 text-rose-800',
}

export function SceneCard({ card, onEdit, onDelete }: SceneCardProps) {
  const color = COLOR_MAP[card.color?.toLowerCase() ?? 'neutral'] ?? COLOR_MAP.neutral

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="flex items-start gap-3 pb-3">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">
            {card.title || 'Untitled scene'}
          </CardTitle>
          <Badge className={color}>{card.beat_type || 'A'}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(card)} aria-label="Edit scene">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(card)}
            className="text-destructive"
            aria-label="Delete scene"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {card.description || 'No description provided.'}
        </p>
      </CardContent>
    </Card>
  )
}
