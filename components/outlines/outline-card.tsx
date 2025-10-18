'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Eye, FileText, Trash2, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type Outline = {
  id: string
  title: string
  format: string
  premise: string | null
  content: any
  created_at: string
  updated_at: string
}

type OutlineCardProps = {
  outline: Outline
  projectId: string
  onDelete: () => void
}

const formatLabels: Record<string, { label: string; color: string }> = {
  chapter_summary: { label: 'Chapter Summary', color: 'bg-blue-100 text-blue-800' },
  scene_by_scene: { label: 'Scene-by-Scene', color: 'bg-green-100 text-green-800' },
  treatment: { label: 'Treatment', color: 'bg-purple-100 text-purple-800' },
  beat_outline: { label: 'Beat Outline', color: 'bg-orange-100 text-orange-800' },
  custom: { label: 'Custom', color: 'bg-gray-100 text-gray-800' },
}

export function OutlineCard({ outline, projectId, onDelete }: OutlineCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatInfo = formatLabels[outline.format] || formatLabels.custom
  const sectionCount = Array.isArray(outline.content) ? outline.content.length : 0
  const createdAgo = formatDistanceToNow(new Date(outline.created_at), { addSuffix: true })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{outline.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {outline.premise || 'No premise provided'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/projects/${projectId}/outlines/${outline.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                <FileText className="mr-2 h-4 w-4" />
                {expanded ? 'Hide' : 'Preview'} Sections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={formatInfo.color}>{formatInfo.label}</Badge>
            <Badge variant="outline">
              {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
            </Badge>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created {createdAgo}</span>
          </div>

          {/* Preview Sections */}
          {expanded && Array.isArray(outline.content) && outline.content.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-semibold">Sections:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {outline.content.slice(0, 10).map((section: any, index: number) => (
                  <div
                    key={index}
                    className="text-sm p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{section.title}</p>
                    {section.description && (
                      <p className="text-muted-foreground line-clamp-2 text-xs mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                ))}
                {outline.content.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {outline.content.length - 10} more sections
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/dashboard/projects/${projectId}/outlines/${outline.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Full Outline
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
