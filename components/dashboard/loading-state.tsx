import { Skeleton } from '@/components/ui/skeleton'

export function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
