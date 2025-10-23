/**
 * Recent Generations List Component
 *
 * Displays a list of recent Ghostwriter generations with:
 * - Generation title and metadata
 * - Word count
 * - Project context
 * - Quick actions
 *
 * Ticket: 1.1
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, Folder, Eye } from 'lucide-react'
import Link from 'next/link'

interface RecentGeneration {
  id: string
  title: string
  wordCount: number
  createdAt: string
  projectName: string
}

interface RecentGenerationsListProps {
  generations: RecentGeneration[]
  onRefresh?: () => void
}

export function RecentGenerationsList({ generations, onRefresh }: RecentGenerationsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>Your latest Ghostwriter writing sessions</CardDescription>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {generations.map((generation) => (
            <div
              key={generation.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{generation.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(generation.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {generation.projectName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-8">
                  <Badge variant="outline" className="text-xs">
                    {generation.wordCount.toLocaleString()} words
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/ghostwriter/${generation.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {generations.length >= 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard/ghostwriter/history">View All Generations</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
