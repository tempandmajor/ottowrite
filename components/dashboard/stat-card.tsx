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
  priority = 'normal',
}: {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  delta?: { value: string; positive?: boolean }
  tone?: 'default' | 'accent' | 'primary' | 'secondary'
  tooltip?: string
  priority?: 'high' | 'normal'
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card/80 shadow-card transition hover:shadow-lg',
        tone === 'accent' && 'bg-gradient-to-br from-accent/10 via-card to-card border-accent/20',
        tone === 'primary' && 'bg-gradient-to-br from-primary/10 via-card to-card border-primary/20',
        tone === 'secondary' && 'bg-gradient-to-br from-secondary via-card to-card',
        priority === 'high' ? 'p-7 md:p-8' : 'p-6'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className={cn(
              'font-medium uppercase tracking-wide text-muted-foreground/90',
              priority === 'high' ? 'text-sm' : 'text-xs'
            )}>
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
          <p className={cn(
            'font-bold tracking-tight text-foreground',
            priority === 'high' ? 'text-4xl md:text-5xl' : 'text-3xl'
          )}>{value}</p>
          {helper && <p className={cn(
            'text-muted-foreground/80',
            priority === 'high' ? 'text-base' : 'text-sm'
          )}>{helper}</p>}
        </div>
        {icon && <div className={cn(
          'rounded-full bg-secondary text-secondary-foreground',
          priority === 'high' ? 'p-4' : 'p-3'
        )}>{icon}</div>}
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
