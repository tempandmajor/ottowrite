import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  helper,
  icon,
  delta,
  tone = 'default',
  tooltip,
}: {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  delta?: { value: string; positive?: boolean }
  tone?: 'default' | 'accent'
  tooltip?: string
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
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
              {label}
            </p>
            {tooltip && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex text-muted-foreground/60 transition hover:text-muted-foreground"
                      aria-label={`Information about ${label}`}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
