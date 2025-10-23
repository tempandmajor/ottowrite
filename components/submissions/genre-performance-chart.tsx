'use client'

/**
 * Genre Performance Chart Component
 *
 * Displays performance metrics by genre.
 *
 * Ticket: MS-4.3
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface GenrePerformance {
  genre: string
  totalSubmissions: number
  partnersContacted: number
  totalViews: number
  totalRequests: number
  totalAcceptances: number
  totalRejections: number
  acceptanceRate: number
}

interface GenrePerformanceChartProps {
  userId: string
}

export function GenrePerformanceChart({ userId }: GenrePerformanceChartProps) {
  const [genres, setGenres] = useState<GenrePerformance[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGenres = useCallback(async () => {
    if (!userId) {
      setGenres([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/submissions/analytics/genres')

      if (!response.ok) {
        throw new Error('Failed to fetch genres')
      }

      const data = await response.json()
      setGenres(data.genres)
    } catch (error) {
      console.error('Error fetching genres:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchGenres()
  }, [fetchGenres])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance by Genre</CardTitle>
          <CardDescription>Compare how different genres perform</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (genres.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance by Genre</CardTitle>
          <CardDescription>Compare how different genres perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No genre data yet. Create submissions with genres to see performance insights.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find max values for scaling
  const maxSubmissions = Math.max(...genres.map((g) => g.totalSubmissions))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance by Genre</CardTitle>
        <CardDescription>Compare how different genres perform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {genres.map((genre) => (
            <div key={genre.genre} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{genre.genre}</h4>
                  <Badge variant="secondary">{genre.totalSubmissions} submissions</Badge>
                </div>
                {genre.totalAcceptances + genre.totalRejections > 0 && (
                  <Badge
                    variant={genre.acceptanceRate >= 20 ? 'default' : 'secondary'}
                    className={
                      genre.acceptanceRate >= 20
                        ? 'bg-green-500 hover:bg-green-600'
                        : genre.acceptanceRate >= 10
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : ''
                    }
                  >
                    {genre.acceptanceRate.toFixed(1)}% accepted
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  style={{
                    width: `${(genre.totalSubmissions / maxSubmissions) * 100}%`,
                  }}
                />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Partners</p>
                  <p className="font-medium">{genre.partnersContacted}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Views</p>
                  <p className="font-medium">{genre.totalViews}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Requests</p>
                  <p className="font-medium">{genre.totalRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Accepted</p>
                  <p className="font-medium text-green-600">{genre.totalAcceptances}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Declined</p>
                  <p className="font-medium text-red-600">{genre.totalRejections}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
