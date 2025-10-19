/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, FileText, Loader2, MapPin, StickyNote, Target, Users } from 'lucide-react'

type OutlineSectionPreviewProps = {
  title: string
  description: string
  type: string
  order: number
  notes: string
  originalNotes?: string
  saving?: boolean
  wordTarget?: number
  pageTarget?: number
  characters?: string[]
  locations?: string[]
  plotPoints?: string[]
}

function OutlineSectionCardPreview({
  title,
  description,
  type,
  order,
  notes,
  originalNotes = '',
  saving = false,
  wordTarget,
  pageTarget,
  characters,
  locations,
  plotPoints,
}: OutlineSectionPreviewProps) {
  const NOTE_MAX_LENGTH = 2000
  const isDirty = notes !== originalNotes
  const isOverLimit = notes.length > NOTE_MAX_LENGTH

  return (
    <Card className="max-w-3xl border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase">
                {type}
              </Badge>
              <span className="text-sm text-muted-foreground">Section {order}</span>
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {isDirty && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Unsaved
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(wordTarget || pageTarget) && (
          <div className="flex gap-4 flex-wrap text-sm">
            {wordTarget && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="font-semibold">{wordTarget.toLocaleString()}</span> words
                </span>
              </div>
            )}
            {pageTarget && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="font-semibold">{pageTarget}</span> pages
                </span>
              </div>
            )}
          </div>
        )}

        {characters && characters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" /> Characters
            </div>
            <div className="flex flex-wrap gap-2">
              {characters.map((character) => (
                <Badge key={character} variant="outline">
                  {character}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {locations && locations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" /> Locations
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <Badge key={location} variant="outline">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {plotPoints && plotPoints.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Key plot points
            </div>
            <ul className="ml-6 space-y-1 text-sm list-disc">
              {plotPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" /> Your notes
            </p>
            {isDirty && (
              <Button size="sm" disabled={saving || isOverLimit}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save Notes'
                )}
              </Button>
            )}
          </div>
          <Textarea
            value={notes}
            readOnly
            rows={3}
            className={`resize-none text-sm ${
              isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
              {isOverLimit
                ? `Too long — trim ${notes.length - NOTE_MAX_LENGTH} characters`
                : 'Keep track of beats, reminders, or TODOs specific to this section.'}
            </span>
            <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
              {notes.length} / {NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const meta: Meta<typeof OutlineSectionCardPreview> = {
  title: 'Outlines/OutlineDetailNotes',
  component: OutlineSectionCardPreview,
  args: {
    title: 'Act I – The Catalyst',
    description:
      'Introduce the protagonist’s ordinary world and plant the inciting anomaly that disrupts it.',
    type: 'chapter',
    order: 1,
    originalNotes: 'Ensure foreshadowing hints at the eclipse anomaly.',
    notes: 'Ensure foreshadowing hints at the eclipse anomaly.',
    wordTarget: 1800,
    pageTarget: 12,
    characters: ['Elara', 'Captain Myles'],
    locations: ['Sky Harbor', 'Observatory Deck'],
    plotPoints: ['Foreshadow eclipse', 'Introduce crew conflict'],
  },
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof OutlineSectionCardPreview>

export const CleanNotes: Story = {}

export const DirtyNotes: Story = {
  args: {
    notes: 'Need sharper conflict before the storm. Consider revealing Myles kept the warning logs secret.',
  },
}

export const OverCharacterLimit: Story = {
  args: {
    notes: 'Over limit note '.repeat(150),
  },
}
