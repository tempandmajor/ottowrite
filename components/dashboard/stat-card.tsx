import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  helper,
  icon,
  delta,
  tone = 'default',
}: {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  delta?: { value: string; positive?: boolean }
  tone?: 'default' | 'accent'
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card/80 p-6 shadow-card transition hover:shadow-lg',
        tone === 'accent' && 'bg-gradient-to-br from-muted via-card to-card'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {helper && <p className="text-sm text-muted-foreground/80">{helper}</p>}
        </div>
        {icon && <div className="rounded-full bg-secondary p-3 text-secondary-foreground">{icon}</div>}
      </div>
      {delta && (
        <Badge
          variant="outline"
          className={cn(
            'mt-4 border-border bg-secondary/60 text-foreground',
            delta.positive === false && 'border-destructive/40 bg-destructive/15 text-destructive'
          )}
        >
          {delta.positive === false ? '▼' : '▲'} {delta.value}
        </Badge>
      )}
    </div>
  )
}
