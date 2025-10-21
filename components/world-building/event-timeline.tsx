'use client'

import { useState, useMemo } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GripVertical, MapPin, Calendar, Star, Edit, Trash2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocationEvent {
  id: string
  title: string
  description?: string | null
  occurs_at?: string | null
  importance: number
  key_characters?: string[] | null
  location_id: string
  location_name?: string
  order_index?: number
}

interface EventTimelineProps {
  events: LocationEvent[]
  locations: { id: string; name: string }[]
  onReorder?: (reorderedEvents: LocationEvent[]) => void
  onEdit?: (event: LocationEvent) => void
  onDelete?: (eventId: string) => void
  viewMode?: 'vertical' | 'horizontal'
  className?: string
}

function SortableEventCard({
  event,
  onEdit,
  onDelete
}: {
  event: LocationEvent
  onEdit?: (event: LocationEvent) => void
  onDelete?: (eventId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-opacity',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <Card className="border-l-4 border-l-primary/40 bg-card/80 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <button
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing touch-none"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-foreground flex items-start justify-between gap-2">
                <span className="break-words">{event.title}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    <Star className="h-3 w-3 mr-1 inline fill-yellow-400 text-yellow-400" />
                    {event.importance}/10
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-1 text-xs">
                {event.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location_name}
                  </span>
                )}
                {event.occurs_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {event.occurs_at}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {(event.description || (event.key_characters && event.key_characters.length > 0)) && (
          <CardContent className="pt-0 pb-3 pl-11">
            {event.description && (
              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
            )}
            {event.key_characters && event.key_characters.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.key_characters.map((character) => (
                  <Badge key={character} variant="secondary" className="text-xs">
                    {character}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(event)}
              aria-label="Edit event"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(event.id)}
              aria-label="Delete event"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export function EventTimeline({
  events,
  locations,
  onReorder,
  onEdit,
  onDelete,
  viewMode = 'vertical',
  className,
}: EventTimelineProps) {
  const [filteredLocationId, setFilteredLocationId] = useState<string>('all')
  const [minImportance, setMinImportance] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [localEvents, setLocalEvents] = useState<LocationEvent[]>(events)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter events based on location, importance, and search query
  const filteredEvents = useMemo(() => {
    return localEvents.filter((event) => {
      const matchesLocation = filteredLocationId === 'all' || event.location_id === filteredLocationId
      const matchesImportance = event.importance >= minImportance
      const matchesSearch = searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location_name?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesLocation && matchesImportance && matchesSearch
    })
  }, [localEvents, filteredLocationId, minImportance, searchQuery])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localEvents.findIndex((e) => e.id === active.id)
      const newIndex = localEvents.findIndex((e) => e.id === over.id)

      const reordered = arrayMove(localEvents, oldIndex, newIndex).map((e, idx) => ({
        ...e,
        order_index: idx,
      }))

      setLocalEvents(reordered)
      onReorder?.(reordered)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="w-full sm:w-64 space-y-1.5">
          <Label htmlFor="location-filter" className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Filter by Location
          </Label>
          <Select value={filteredLocationId} onValueChange={setFilteredLocationId}>
            <SelectTrigger id="location-filter">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48 space-y-1.5">
          <Label htmlFor="importance-filter" className="text-xs text-muted-foreground flex items-center gap-1">
            <Star className="h-3 w-3" />
            Min. Importance
          </Label>
          <Select value={String(minImportance)} onValueChange={(val) => setMinImportance(Number(val))}>
            <SelectTrigger id="importance-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 3, 5, 7, 9].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num}/10 and above
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:flex-1 space-y-1.5">
          <Label htmlFor="search-events" className="text-xs text-muted-foreground">
            Search Events
          </Label>
          <Input
            id="search-events"
            type="text"
            placeholder="Search title, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          {filteredLocationId !== 'all' && ' in this location'}
        </p>
        {(filteredLocationId !== 'all' || minImportance > 0 || searchQuery !== '') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilteredLocationId('all')
              setMinImportance(0)
              setSearchQuery('')
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Timeline */}
      {filteredEvents.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredEvents.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={cn(
              'space-y-3',
              viewMode === 'horizontal' && 'flex gap-4 overflow-x-auto pb-4'
            )}>
              {filteredEvents.map((event) => (
                <SortableEventCard
                  key={event.id}
                  event={event}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No events match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
