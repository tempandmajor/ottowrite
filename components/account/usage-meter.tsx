import { Progress } from '@/components/ui/progress'
import { formatNumber } from '@/lib/number-format'

type UsageMeterProps = {
  label: string
  value: number
  limit: number | null
  percent: number
  unit?: string
  warningThreshold?: number
  warningMessage?: string
}

export function UsageMeter({
  label,
  value,
  limit,
  percent,
  unit,
  warningThreshold,
  warningMessage,
}: UsageMeterProps) {
  const displayUnit = unit ? ` ${unit}` : ''
  const limitLabel = limit === null ? 'Unlimited' : `${formatNumber(limit)}${displayUnit}`
  const showProgress = limit !== null && limit > 0
  const isWarning =
    showProgress && typeof warningThreshold === 'number' && percent >= warningThreshold * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">
          {formatNumber(value)}{displayUnit}
          {limit !== null && ` / ${limitLabel}`}
        </span>
      </div>
      {showProgress ? (
        <Progress value={percent} className="h-2.5" />
      ) : (
        <div className="rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground">
          {limitLabel}
        </div>
      )}
      {isWarning && warningMessage && (
        <p className="text-xs text-amber-600">{warningMessage}</p>
      )}
    </div>
  )
}
