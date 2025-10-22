import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {/* Icon and label */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Value */}
          <Skeleton className="h-8 w-16" />
          {/* Subtitle/change indicator */}
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsCardRow({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
