/* eslint-disable storybook/no-renderer-packages */
import { useMemo } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { OutlineCard } from '@/components/outlines/outline-card'
import { FileText, Filter, RefreshCw, Search } from 'lucide-react'

type StoryOutline = {
  id: string
  title: string
  premise: string
  format: string
  content: unknown
  created_at: string
  updated_at: string
}

type PreviewProps = {
  outlines: StoryOutline[]
  loading?: boolean
  formatFilter?: string
  searchTerm?: string
  sortOrder?: 'recent' | 'az'
  activeFilters?: boolean
}

const baseOutlines: StoryOutline[] = [
  {
    id: 'outline-1',
    title: 'Season One Blueprint',
    premise: 'A reluctant mage must unite rival kingdoms before a converging eclipse shatters reality.',
    format: 'chapter_summary',
    content: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'outline-2',
    title: 'Heist Arc Treatment',
    premise: 'An aging thief assembles her estranged crew for one last impossible job on a floating city.',
    format: 'treatment',
    content: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'outline-3',
    title: 'Act Structure – Sci-Fi Pilot',
    premise: 'A first-contact mission spirals when the crew uncover their own future broadcasts from orbit.',
    format: 'beat_outline',
    content: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
]

function OutlinesPreview({
  outlines,
  loading = false,
  formatFilter = 'all',
  searchTerm = '',
  sortOrder = 'recent',
  activeFilters,
}: PreviewProps) {
  const formatOptions = useMemo(() => {
    const values = new Set<string>(outlines.map((outline) => outline.format))
    return Array.from(values).sort()
  }, [outlines])

  const filteredOutlines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const sorted = [...outlines].sort((a, b) => {
      if (sortOrder === 'az') {
        return a.title.localeCompare(b.title)
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return sorted.filter((outline) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        outline.title.toLowerCase().includes(normalizedSearch) ||
        outline.premise.toLowerCase().includes(normalizedSearch)

      const matchesFormat = formatFilter === 'all' || outline.format === formatFilter

      return matchesSearch && matchesFormat
    })
  }, [formatFilter, outlines, searchTerm, sortOrder])

  const hasFilters =
    activeFilters ??
    (formatFilter !== 'all' || searchTerm.trim().length > 0 || sortOrder !== 'recent')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-6 lg:flex lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Outlines</CardTitle>
            <CardDescription>
              Filter and sort AI generated outlines before jumping into polish sessions.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              New Outline
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="outline-search">Search</Label>
              <Input
                id="outline-search"
                placeholder="Search title or premise"
                value={searchTerm}
                readOnly
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="outline-format">Format</Label>
              <Select value={formatFilter} disabled>
                <SelectTrigger id="outline-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All formats</SelectItem>
                  {formatOptions.map((format) => (
                    <SelectItem key={format} value={format} className="capitalize">
                      {format.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="outline-sort">Sort</Label>
              <Select value={sortOrder} disabled>
                <SelectTrigger id="outline-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently updated</SelectItem>
                  <SelectItem value="az">Title A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormatBlurb title="Chapter Summary" description="High-level beats with targets per chapter." />
            <FormatBlurb title="Scene-by-Scene" description="Detailed breakdown of moments and objectives." />
            <FormatBlurb title="Treatment" description="Narrative prose overview for stakeholder reviews." />
            <FormatBlurb title="Beat Outline" description="Structure guidance rooted in pacing milestones." />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOutlines.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {hasFilters ? 'No outlines match your filters' : 'No outlines yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {hasFilters
                    ? 'Try adjusting your search or reset filters to see every outline.'
                    : 'Generate your first AI-powered outline to start planning your story.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOutlines.map((outline) => (
            <OutlineCard
              key={outline.id}
              outline={outline}
              projectId="project-123"
              onDelete={() => {
                // noop for story context
              }}
              defaultExpanded={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FormatBlurb({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

const meta: Meta<typeof OutlinesPreview> = {
  title: 'Outlines/OutlinesPageFilters',
  component: OutlinesPreview,
  args: {
    outlines: baseOutlines,
    loading: false,
    formatFilter: 'all',
    searchTerm: '',
    sortOrder: 'recent',
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof OutlinesPreview>

export const Populated: Story = {}

export const LoadingState: Story = {
  args: {
    loading: true,
  },
}

export const EmptyDefault: Story = {
  args: {
    outlines: [],
    loading: false,
  },
}

export const FilteredNoResults: Story = {
  args: {
    formatFilter: 'treatment',
    searchTerm: 'dragon',
    activeFilters: true,
  },
}
