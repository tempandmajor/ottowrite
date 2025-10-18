'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Globe, BookmarkPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export type ResearchNote = {
  id: string
  title: string
  content: string
  sources: Array<{ title: string; url: string }>
  created_at: string
}

type ResearchPanelProps = {
  documentId: string
  projectId?: string | null
  context: string
}

export function ResearchPanel({ documentId, projectId = null, context }: ResearchPanelProps) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [activeTab, setActiveTab] = useState<'search' | 'notes'>('search')

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/research/search?document_id=${documentId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }
      const payload = await response.json()
      setNotes(payload.notes ?? [])
    } catch (error) {
      console.error(error)
      toast({ title: 'Error', description: 'Unable to load research notes.', variant: 'destructive' })
    }
  }, [documentId, toast])

  useEffect(() => {
    void fetchNotes()
  }, [fetchNotes])

  const runResearch = async () => {
    if (query.trim().length < 5) {
      toast({
        title: 'Add more detail',
        description: 'Please enter at least 5 characters.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          document_id: documentId,
          project_id: projectId,
          context: includeContext ? context.slice(-5000) : undefined,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Research failed')
      }

      toast({ title: 'Research complete', description: 'Findings added to research notes.' })
      setQuery('')
      await fetchNotes()
      setActiveTab('notes')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Failed to run research',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-none bg-card/80 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" /> Research assistant
        </CardTitle>
        <CardDescription>Search the web, gather references, and save notes to this document.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Search
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4" /> Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="research-query">Ask anything</Label>
              <Input
                id="research-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What causes auroras on gas giants?"
              />
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border border-input"
                  checked={includeContext}
                  onChange={(event) => setIncludeContext(event.target.checked)}
                />
                Include the last 5k characters of this document for context
              </label>
            </div>
            <Button onClick={runResearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching...
                </>
              ) : (
                'Run research'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No research notes yet. Start a search to gather references.
              </p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        Saved {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                    {note.sources && note.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {note.sources.map((source, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {source.title}
                            </a>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
