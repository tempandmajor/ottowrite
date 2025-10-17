'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, MoreVertical, Check, Clock, Circle } from 'lucide-react'

type Beat = {
  id: string
  order_position: number
  title: string
  description: string | null
  notes: string | null
  target_page_count: number | null
  actual_page_count: number | null
  status: 'pending' | 'in_progress' | 'complete'
}

interface BeatCardProps {
  beat: Beat
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<Beat>) => void
}

export function BeatCard({ beat, isExpanded, onToggleExpand, onUpdate }: BeatCardProps) {
  const [notes, setNotes] = useState(beat.notes || '')
  const [isEditingNotes, setIsEditingNotes] = useState(false)

  const handleSaveNotes = () => {
    onUpdate({ notes })
    setIsEditingNotes(false)
  }

  const handleStatusChange = (status: Beat['status']) => {
    onUpdate({ status })
  }

  const getStatusIcon = () => {
    switch (beat.status) {
      case 'complete':
        return <Check className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (beat.status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">
                Beat {beat.order_position}
              </span>
              <Badge variant="outline" className={getStatusColor()}>
                <span className="mr-1">{getStatusIcon()}</span>
                {beat.status.replace('_', ' ')}
              </Badge>
            </div>
            <CardTitle className="text-lg">{beat.title}</CardTitle>
            {beat.target_page_count && (
              <CardDescription className="mt-1">
                Target: Page ~{beat.target_page_count}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
                <Circle className="h-4 w-4 mr-2" />
                Mark as Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                <Clock className="h-4 w-4 mr-2" />
                Mark as In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('complete')}>
                <Check className="h-4 w-4 mr-2" />
                Mark as Complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{beat.description}</p>

        {/* Expandable Notes Section */}
        <div className="border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={onToggleExpand}
          >
            <span className="text-sm font-medium">Notes</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              {isEditingNotes ? (
                <>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this beat..."
                    rows={4}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotes(beat.notes || '')
                        setIsEditingNotes(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {beat.notes || 'No notes yet.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(true)}>
                    {beat.notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
