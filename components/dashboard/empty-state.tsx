import type { ComponentType } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Action = {
  label: string
  href?: string
  onClick?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  action?: Action
  secondaryAction?: Action
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card/70 px-6 py-10 text-center shadow-card">
      <span className="rounded-full bg-primary/10 p-3 text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {action && (
          action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )
        )}
        {secondaryAction && (
          secondaryAction.href ? (
            <Button variant="outline" asChild>
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )
        )}
      </div>
    </div>
  )
}
