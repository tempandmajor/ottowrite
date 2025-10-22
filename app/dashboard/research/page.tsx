'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Pin,
  Edit,
  Trash2,
  FileText,
  Filter,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import { NoteEditor } from '@/components/research/note-editor'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type NoteCategory = 'reference' | 'character' | 'worldbuilding' | 'plot' | 'setting' | 'research' | 'other'

type ResearchNote = {
  id?: string
  title: string
  content: string
  tags: string[]
  category?: NoteCategory
  is_pinned: boolean
  sources?: Array<{ title: string; url: string; description?: string }>
  created_at?: string
  updated_at?: string
}

const CATEGORIES: Array<{ value: NoteCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'reference', label: 'Reference' },
  { value: 'character', label: 'Character' },
  { value: 'worldbuilding', label: 'World Building' },
  { value: 'plot', label: 'Plot' },
  { value: 'setting', label: 'Setting' },
  { value: 'research', label: 'Research' },
  { value: 'other', label: 'Other' },
]

export default function ResearchNotesPage() {
  const { toast } = useToast()
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'all'>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [editingNote, setEditingNote] = useState<ResearchNote | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)

  const fetchNotes = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedTag) params.append('tag', selectedTag)
      if (searchQuery) params.append('search', searchQuery)
      if (showPinnedOnly) params.append('pinned', 'true')

      const response = await fetch(`/api/research/notes?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch notes')

      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to load research notes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedTag, searchQuery, showPinnedOnly, toast])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  async function handleSaveNote(note: ResearchNote) {
    try {
      const isUpdate = !!note.id
      const response = await fetch('/api/research/notes', {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      })

      if (!response.ok) throw new Error('Failed to save note')

      toast({
        title: 'Success',
        description: isUpdate ? 'Note updated successfully' : 'Note created successfully',
      })

      setEditingNote(null)
      setCreatingNew(false)
      await fetchNotes()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to save note',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteNote(note: ResearchNote) {
    if (!note.id) return
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/research/notes?id=${note.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete note')

      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      })

      await fetchNotes()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      })
    }
  }

  async function togglePin(note: ResearchNote) {
    try {
      const response = await fetch('/api/research/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          is_pinned: !note.is_pinned,
        }),
      })

      if (!response.ok) throw new Error('Failed to update note')

      await fetchNotes()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      })
    }
  }

  // Get all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap((note) => note.tags))
  ).sort()

  if (creatingNew) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <NoteEditor
          onSave={handleSaveNote}
          onCancel={() => setCreatingNew(false)}
        />
      </div>
    )
  }

  if (editingNote) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <NoteEditor
          note={editingNote}
          onSave={handleSaveNote}
          onCancel={() => setEditingNote(null)}
        />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Research Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize and manage your research findings
          </p>
        </div>
        <Button onClick={() => setCreatingNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search notes..."
                  aria-label="Search research notes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as NoteCategory | 'all')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Pinned Filter */}
            <Button
              variant={showPinnedOnly ? 'default' : 'outline'}
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            >
              <Pin className="h-4 w-4 mr-2" />
              {showPinnedOnly ? 'Show All' : 'Pinned Only'}
            </Button>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <Button
                variant={selectedTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first research note to get started
            </p>
            <Button onClick={() => setCreatingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note.id} className={cn(note.is_pinned && 'border-primary')}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {note.is_pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
                      <CardTitle className="line-clamp-1">{note.title}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      {note.category && (
                        <Badge variant="outline" className="capitalize">
                          {note.category}
                        </Badge>
                      )}
                      {note.created_at && (
                        <span className="text-xs">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePin(note)}
                      title={note.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className={cn('h-4 w-4', note.is_pinned && 'fill-current')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingNote(note)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNote(note)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {note.content}
                </p>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {note.sources && note.sources.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium mb-2">Sources ({note.sources.length})</p>
                    <div className="space-y-1">
                      {note.sources.slice(0, 2).map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {source.title}
                        </a>
                      ))}
                      {note.sources.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{note.sources.length - 2} more sources
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
