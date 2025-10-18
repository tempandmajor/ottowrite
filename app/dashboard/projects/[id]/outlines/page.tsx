'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  ArrowLeft,
  FileText,
  Loader2,
  Filter,
  RefreshCw,
  Search,
  SortDesc,
} from 'lucide-react'
import Link from 'next/link'
import { OutlineGeneratorDialog } from '@/components/outlines/outline-generator-dialog'
import { OutlineCard } from '@/components/outlines/outline-card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type Project = {
  id: string
  name: string
  type: string
  genre: string[] | null
  description: string | null
}

type Outline = {
  id: string
  title: string
  format: string
  premise: string | null
  content: any
  created_at: string
  updated_at: string
}

export default function OutlinesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [projectLoading, setProjectLoading] = useState(true)
  const [outlinesLoading, setOutlinesLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'recent' | 'az'>('recent')

  const loadProject = useCallback(async () => {
    try {
      setProjectLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      })
    } finally {
      setProjectLoading(false)
    }
  }, [params.id, router, toast])

  const loadOutlines = useCallback(async () => {
    try {
      setOutlinesLoading(true)
      const response = await fetch(`/api/outlines?project_id=${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch outlines')

      const data = await response.json()
      setOutlines(data)
    } catch (error) {
      console.error('Error loading outlines:', error)
      toast({
        title: 'Error',
        description: 'Failed to load outlines',
        variant: 'destructive',
      })
    } finally {
      setOutlinesLoading(false)
    }
  }, [params.id, toast])

  useEffect(() => {
    loadProject()
    loadOutlines()
  }, [loadProject, loadOutlines])

  const deleteOutline = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outline?')) return

    try {
      const response = await fetch(`/api/outlines?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete outline')

      toast({
        title: 'Success',
        description: 'Outline deleted successfully',
      })

      loadOutlines()
    } catch (error) {
      console.error('Error deleting outline:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete outline',
        variant: 'destructive',
      })
    }
  }

  const formatOptions = useMemo(() => {
    const values = new Set(outlines.map((outline) => outline.format))
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
        (outline.premise || '').toLowerCase().includes(normalizedSearch)

      const matchesFormat =
        formatFilter === 'all' || outline.format.toLowerCase() === formatFilter

      return matchesSearch && matchesFormat
    })
  }, [formatFilter, outlines, searchTerm, sortOrder])

  const activeFilters = formatFilter !== 'all' || searchTerm.trim().length > 0

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${project.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Story Outlines</h1>
            <p className="text-muted-foreground mt-1">{project.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Outline
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filter & organize
          </CardTitle>
          <CardDescription>
            Search through generated outlines and refine by format or sort order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search outlines by title or premise…"
                  className="pl-9"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex gap-3 lg:w-[360px]">
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="All formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All formats</SelectItem>
                  {formatOptions.map((format) => (
                    <SelectItem key={format} value={format.toLowerCase()}>
                      {format.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as 'recent' | 'az')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently updated</SelectItem>
                  <SelectItem value="az">Title A → Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <SortDesc className="mr-1 h-3 w-3" />
              {sortOrder === 'recent' ? 'Recently updated' : 'Alphabetical'}
            </Badge>
            <Badge variant={formatFilter === 'all' ? 'outline' : 'default'}>
              {formatFilter === 'all' ? 'All formats' : formatFilter.replace(/_/g, ' ')}
            </Badge>
            {activeFilters && (
              <Button
                variant="link"
                size="sm"
                className="gap-1 px-0"
                onClick={() => {
                  setFormatFilter('all')
                  setSortOrder('recent')
                  setSearchTerm('')
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Reset filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg">AI-Powered Outline Generation</CardTitle>
          <CardDescription>
            Use Claude 4.5 to generate professional story outlines in multiple formats.
            Perfect for planning your narrative structure before you write.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">Chapter Summary</h4>
              <p className="text-sm text-muted-foreground">
                Chapter-by-chapter breakdown with plot points and word count targets
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Scene-by-Scene</h4>
              <p className="text-sm text-muted-foreground">
                Detailed scene breakdown with characters, locations, and objectives
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Treatment</h4>
              <p className="text-sm text-muted-foreground">
                Narrative prose outline describing the full story flow
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Beat Outline</h4>
              <p className="text-sm text-muted-foreground">
                Story structure beats with thematic significance
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Custom</h4>
              <p className="text-sm text-muted-foreground">
                Flexible structure adapted to your specific needs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outlines List */}
      {outlinesLoading ? (
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
                  {activeFilters ? 'No outlines match your filters' : 'No outlines yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeFilters
                    ? 'Try adjusting your search or reset filters to see every outline.'
                    : 'Generate your first AI-powered outline to start planning your story.'}
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {activeFilters && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormatFilter('all')
                      setSortOrder('recent')
                      setSearchTerm('')
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Filters
                  </Button>
                )}
                <Button onClick={() => setShowGenerator(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Outline
                </Button>
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
              projectId={project.id}
              onDelete={() => deleteOutline(outline.id)}
            />
          ))}
        </div>
      )}

      {/* Generator Dialog */}
      <OutlineGeneratorDialog
        open={showGenerator}
        onOpenChange={setShowGenerator}
        projectId={project.id}
        projectType={project.type}
        genre={project.genre}
        onGenerated={() => {
          setShowGenerator(false)
          loadOutlines()
        }}
      />
    </div>
  )
}
