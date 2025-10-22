'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SceneCard, type SceneCardData } from '@/components/screenplay/scene-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus } from 'lucide-react'

const COLOR_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'a', label: 'Plot A (Blue)' },
  { value: 'b', label: 'Plot B (Purple)' },
  { value: 'c', label: 'Plot C (Rose)' },
]

type BeatBoardProps = {
  projectId: string
}

export function BeatBoard({ projectId }: BeatBoardProps) {
  const { toast } = useToast()
  const [cards, setCards] = useState<SceneCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<SceneCardData | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    beatType: 'A',
    color: 'neutral',
  })

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/beat-board?project_id=${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to load beat cards')
      }
      const payload = await response.json()
      setCards(payload.cards ?? [])
    } catch (error) {
      console.error(error)
      toast({ title: 'Error', description: 'Could not load beat cards.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    void fetchCards()
  }, [fetchCards])

  const openCreate = () => {
    setEditingCard(null)
    setForm({ title: '', description: '', beatType: 'A', color: 'neutral' })
    setDialogOpen(true)
  }

  const openEdit = (card: SceneCardData) => {
    setEditingCard(card)
    setForm({
      title: card.title,
      description: card.description ?? '',
      beatType: card.beat_type,
      color: card.color,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (card: SceneCardData) => {
    if (!confirm(`Delete card "${card.title}"?`)) return
    const response = await fetch(`/api/beat-board?id=${card.id}`, { method: 'DELETE' })
    if (response.ok) {
      setCards((prev) => prev.filter((c) => c.id !== card.id))
      toast({ title: 'Card deleted' })
    } else {
      const body = await response.json().catch(() => ({}))
      toast({ title: 'Error', description: body.error ?? 'Could not delete card', variant: 'destructive' })
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title required', description: 'Add a title for the beat card.', variant: 'destructive' })
      return
    }

    const payload = {
      project_id: projectId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      beat_type: form.beatType,
      color: form.color,
    }

    const response = await fetch('/api/beat-board', {
      method: editingCard ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCard ? { id: editingCard.id, ...payload } : payload),
    })

    const body = await response.json()

    if (response.ok) {
      toast({ title: editingCard ? 'Card updated' : 'Card created' })
      setDialogOpen(false)
      setEditingCard(null)
      setForm({ title: '', description: '', beatType: 'A', color: 'neutral' })
      await fetchCards()
    } else {
      toast({ title: 'Error', description: body.error ?? 'Failed to save card', variant: 'destructive' })
    }
  }

  const boardColumns = useMemo(() => {
    const groups: Record<string, SceneCardData[]> = { A: [], B: [], C: [] }
    cards.forEach((card) => {
      const type = card.beat_type?.toUpperCase?.() ?? 'A'
      if (!groups[type]) groups[type] = []
      groups[type].push(card)
    })
    return groups
  }, [cards])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Beat board</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add card
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading beat cards...
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
          Create your first beat card to start arranging your scenes.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(boardColumns).map(([key, group]) => (
            <div key={key} className="space-y-3 rounded-xl border bg-card/60 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plot {key}</p>
              {group.map((card) => (
                <SceneCard key={card.id} card={card} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Edit beat card' : 'New beat card'}</DialogTitle>
            <DialogDescription>Summarize a scene or beat. Drag/substitute ordering coming soon.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-description">Description</Label>
              <Textarea
                id="card-description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="space-y-2 flex-1">
                <Label>Plot track</Label>
                <Select value={form.beatType} onValueChange={(value) => setForm((prev) => ({ ...prev, beatType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Plot A</SelectItem>
                    <SelectItem value="B">Plot B</SelectItem>
                    <SelectItem value="C">Plot C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1">
                <Label>Color</Label>
                <Select value={form.color} onValueChange={(value) => setForm((prev) => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close Beat Card
            </Button>
            <Button onClick={handleSubmit}>{editingCard ? 'Update Beat Card' : 'Add New Card'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
