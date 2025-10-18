import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Pencil, Trash2, Sparkles } from 'lucide-react'

export type WorldElement = {
  id: string
  type: string
  name: string
  summary?: string | null
  description?: string | null
  tags?: string[] | null
  properties?: Record<string, unknown> | null
  ai_metadata?: Record<string, unknown> | null
  image_urls?: string[] | null
  created_at?: string
  updated_at?: string
}

type WorldElementCardProps = {
  element: WorldElement
  onEdit: (element: WorldElement) => void
  onDelete: (element: WorldElement) => void
  className?: string
}

const typeLabels: Record<string, string> = {
  location: 'Location',
  culture: 'Culture',
  faction: 'Faction',
  magic_system: 'Magic System',
  technology: 'Technology',
  history: 'History',
  language: 'Language',
  artifact: 'Artifact',
  other: 'Entry',
}

const typeColors: Record<string, string> = {
  location: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100',
  culture: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
  faction: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100',
  magic_system: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100',
  technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100',
  history: 'bg-slate-200 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100',
  language: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100',
  artifact: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100',
  other: 'bg-muted text-foreground',
}

export function WorldElementCard({ element, onEdit, onDelete, className }: WorldElementCardProps) {
  const { type, name, summary, tags, ai_metadata } = element
  const typeLabel = typeLabels[type] ?? type
  const typeColor = typeColors[type] ?? 'bg-muted text-foreground'

  return (
    <Card className={cn('border border-border/70 transition hover:shadow-md', className)}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className={cn('uppercase tracking-wide', typeColor)}>{typeLabel}</Badge>
            {typeof ai_metadata?.prompt === 'string' && ai_metadata.prompt.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" /> AI-generated
              </span>
            )}
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">{name}</CardTitle>
          {summary && <CardDescription className="text-sm text-muted-foreground">{summary}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(element)} aria-label="Edit element">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(element)}
            aria-label="Delete element"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {element.description && (
          <p className="whitespace-pre-wrap text-muted-foreground">{element.description}</p>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {element.properties && Object.keys(element.properties).length > 0 && (
          <div className="grid gap-1 text-xs">
            {Object.entries(element.properties).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-muted-foreground">
                <span className="font-medium capitalize text-foreground">{key.replace(/_/g, ' ')}:</span>
                <span className="flex-1">
                  {typeof value === 'string'
                    ? value
                    : Array.isArray(value)
                    ? value.join(', ')
                    : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {element.updated_at && (
            <span>
              Updated {formatDistanceToNow(new Date(element.updated_at), { addSuffix: true })}
            </span>
          )}
          {element.created_at && (
            <span>
              Created {formatDistanceToNow(new Date(element.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
