import * as React from 'react'
import { cn } from '@/lib/utils'

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div
          className="h-full w-full flex-1 rounded-full bg-primary transition-all"
          style={{ transform: `translateX(${Math.max(0, Math.min(100, value)) - 100}%)` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'
