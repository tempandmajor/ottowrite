import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function CharacterCardSkeleton() {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          {/* Character image */}
          <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />

          <div className="flex-1 space-y-2">
            {/* Character name */}
            <Skeleton className="h-6 w-32" />
            {/* Role badge */}
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          {/* Actions menu */}
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Description lines */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />

        {/* Stats row */}
        <div className="flex gap-6 pt-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CharacterCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CharacterCardSkeleton key={i} />
      ))}
    </div>
  )
}
