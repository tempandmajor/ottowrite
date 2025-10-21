'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  Film,
  MapPin,
  Users,
  Clock,
  Sun,
  Moon,
  Download,
  Filter,
  Calendar,
  BarChart3,
  Tag,
} from 'lucide-react'
import {
  type Scene,
  type SceneBreakdown as SceneBreakdownType,
  type SceneLocation,
  extractScenes,
  generateSceneBreakdown,
  filterScenes,
  estimateSceneDuration,
  groupScenesByLocation,
  groupScenesByCharacter,
  exportToCSV,
  exportToText,
  generateShootingSchedule,
} from '@/lib/screenplay/scene-parser'
import type { ScreenplayElement } from '@/lib/screenplay/formatter'
import { cn } from '@/lib/utils'

type SceneBreakdownProps = {
  elements: ScreenplayElement[]
  onExport?: (format: 'csv' | 'text' | 'schedule') => void
}

export function SceneBreakdown({ elements, onExport }: SceneBreakdownProps) {
  const [breakdown, setBreakdown] = useState<SceneBreakdownType | null>(null)
  const [filteredScenes, setFilteredScenes] = useState<Scene[]>([])
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [filters, setFilters] = useState<{
    locationType?: SceneLocation
    time?: string
    location?: string
    character?: string
  }>({})
  const [groupBy, setGroupBy] = useState<'none' | 'location' | 'character'>('none')

  // Extract scenes from screenplay
  useEffect(() => {
    const scenes = extractScenes(elements)
    // Add estimated duration to each scene
    const scenesWithDuration = scenes.map((scene) => ({
      ...scene,
      duration: estimateSceneDuration(scene),
    }))
    const breakdownData = generateSceneBreakdown(scenesWithDuration)
    setBreakdown(breakdownData)
    setFilteredScenes(breakdownData.scenes)
  }, [elements])

  // Apply filters
  useEffect(() => {
    if (!breakdown) return

    const filtered = filterScenes(breakdown.scenes, filters)
    setFilteredScenes(filtered)
  }, [breakdown, filters])

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'text' | 'schedule') => {
    if (!breakdown) return

    let content = ''
    let filename = ''

    if (format === 'csv') {
      content = exportToCSV(filteredScenes)
      filename = 'scene-breakdown.csv'
    } else if (format === 'text') {
      content = exportToText(filteredScenes)
      filename = 'scene-breakdown.txt'
    } else if (format === 'schedule') {
      const schedule = generateShootingSchedule(filteredScenes)
      content = JSON.stringify(schedule, null, 2)
      filename = 'shooting-schedule.json'
    }

    // Download file
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    onExport?.(format)
  }, [breakdown, filteredScenes, onExport])

  if (!breakdown) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No scenes found. Add scene headings to your screenplay.</p>
        </CardContent>
      </Card>
    )
  }

  const groupedScenes = groupBy === 'location'
    ? groupScenesByLocation(filteredScenes)
    : groupBy === 'character'
    ? groupScenesByCharacter(filteredScenes)
    : null

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Scenes</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdown.totalScenes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {breakdown.intCount} INT / {breakdown.extCount} EXT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdown.locations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Characters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdown.characters.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Speaking roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Time Split</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{breakdown.dayCount}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <Moon className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{breakdown.nightCount}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Day / Night scenes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Export
              </CardTitle>
              <CardDescription>Filter scenes and export breakdown</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('text')}>
                <Download className="h-4 w-4 mr-1" />
                Text
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('schedule')}>
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Select
              value={filters.locationType || 'all'}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, locationType: value === 'all' ? undefined : value as SceneLocation }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INT">INT</SelectItem>
                <SelectItem value="EXT">EXT</SelectItem>
                <SelectItem value="INT./EXT.">INT./EXT.</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.time || 'all'}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, time: value === 'all' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Time of Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="DAY">Day</SelectItem>
                <SelectItem value="NIGHT">Night</SelectItem>
                <SelectItem value="DAWN">Dawn</SelectItem>
                <SelectItem value="DUSK">Dusk</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by location..."
              value={filters.location || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value || undefined }))}
            />

            <Input
              placeholder="Filter by character..."
              value={filters.character || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, character: e.target.value || undefined }))}
            />

            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as typeof groupBy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="location">Group by Location</SelectItem>
                <SelectItem value="character">Group by Character</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scene List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Scene Breakdown
          </CardTitle>
          <CardDescription>
            {filteredScenes.length} scene{filteredScenes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedScenes ? (
            <div className="space-y-6">
              {Array.from(groupedScenes).map(([group, scenes]) => (
                <div key={group}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {groupBy === 'location' ? <MapPin className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    {group}
                    <Badge variant="secondary">{scenes.length} scenes</Badge>
                  </h3>
                  <SceneTable scenes={scenes} onSelectScene={setSelectedScene} />
                </div>
              ))}
            </div>
          ) : (
            <SceneTable scenes={filteredScenes} onSelectScene={setSelectedScene} />
          )}
        </CardContent>
      </Card>

      {/* Scene Detail */}
      {selectedScene && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scene {selectedScene.sceneNumber}: {selectedScene.heading}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedScene(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-sm">{selectedScene.location}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <Badge variant="outline">{selectedScene.locationType}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <Badge variant="outline">{selectedScene.time}</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Characters ({selectedScene.characters.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedScene.characters.map((char) => (
                  <Badge key={char} variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {char}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
              <p className="text-sm whitespace-pre-wrap">{selectedScene.description}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Duration</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{selectedScene.duration} minutes</span>
              </div>
            </div>

            {selectedScene.tags && selectedScene.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedScene.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SceneTable({
  scenes,
  onSelectScene,
}: {
  scenes: Scene[]
  onSelectScene: (scene: Scene) => void
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Heading</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-24">Time</TableHead>
            <TableHead>Characters</TableHead>
            <TableHead className="w-24">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scenes.map((scene) => (
            <TableRow
              key={scene.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectScene(scene)}
            >
              <TableCell className="font-medium">{scene.sceneNumber}</TableCell>
              <TableCell className="max-w-xs truncate">{scene.heading}</TableCell>
              <TableCell>{scene.location}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {scene.locationType}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    scene.time.toUpperCase().includes('DAY') && 'border-yellow-500 text-yellow-700',
                    scene.time.toUpperCase().includes('NIGHT') && 'border-blue-500 text-blue-700'
                  )}
                >
                  {scene.time.length > 10 ? scene.time.substring(0, 10) + '...' : scene.time}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{scene.characters.length}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{scene.duration}m</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
