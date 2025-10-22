'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Save, Pin, PinOff, Loader2 } from 'lucide-react'

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

type NoteEditorProps = {
  note?: ResearchNote
  onSave: (note: ResearchNote) => Promise<void>
  onCancel?: () => void
}

const CATEGORIES: Array<{ value: NoteCategory; label: string }> = [
  { value: 'reference', label: 'Reference' },
  { value: 'character', label: 'Character' },
  { value: 'worldbuilding', label: 'World Building' },
  { value: 'plot', label: 'Plot' },
  { value: 'setting', label: 'Setting' },
  { value: 'research', label: 'Research' },
  { value: 'other', label: 'Other' },
]

export function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  const [category, setCategory] = useState<NoteCategory | undefined>(note?.category)
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      return
    }

    setSaving(true)
    try {
      await onSave({
        id: note?.id,
        title: title.trim(),
        content: content.trim(),
        tags,
        category,
        is_pinned: isPinned,
        sources: note?.sources || [],
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{note?.id ? 'Edit Note' : 'New Research Note'}</CardTitle>
          <Button
            variant={isPinned ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsPinned(!isPinned)}
          >
            {isPinned ? (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pinned
              </>
            ) : (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Pin
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          {note?.id ? 'Update your research note' : 'Create a new research note'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="note-title">Title</Label>
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            maxLength={200}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="note-category">Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as NoteCategory)}>
            <SelectTrigger id="note-category">
              <SelectValue placeholder="Select a category (optional)" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="note-content">Content</Label>
          <Textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your research notes here..."
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {content.length} characters • Supports Markdown
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Add tags..."
              maxLength={30}
            />
            <Button type="button" variant="outline" size="icon" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sources (if from search) */}
        {note?.sources && note.sources.length > 0 && (
          <div className="space-y-2">
            <Label>Sources</Label>
            <div className="text-sm space-y-2">
              {note.sources.map((source, index) => (
                <div key={index} className="p-2 bg-muted rounded-md">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {source.title}
                  </a>
                  {source.description && (
                    <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Discard Changes
            </Button>
          )}
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim() || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Research Note'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
