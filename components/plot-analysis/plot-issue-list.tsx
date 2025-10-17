'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react'
import { getSeverityColor, getCategoryLabel } from '@/lib/ai/plot-analyzer'
import type { IssueSeverity, IssueCategory } from '@/lib/ai/plot-analyzer'

type PlotIssue = {
  id: string
  severity: IssueSeverity
  category: IssueCategory
  title: string
  description: string
  location?: string | null
  line_reference?: string | null
  suggestion?: string | null
  is_resolved: boolean
  resolved_at?: string | null
  resolution_notes?: string | null
  created_at: string
}

type PlotIssueListProps = {
  analysisId: string
  onUpdate?: () => void
}

export function PlotIssueList({ analysisId, onUpdate }: PlotIssueListProps) {
  const { toast } = useToast()
  const [issues, setIssues] = useState<PlotIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [resolvingIssue, setResolvingIssue] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterResolved, setFilterResolved] = useState<string>('unresolved')

  useEffect(() => {
    loadIssues()
  }, [analysisId, filterSeverity, filterResolved])

  const loadIssues = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ analysis_id: analysisId })
      if (filterSeverity !== 'all') params.append('severity', filterSeverity)
      if (filterResolved !== 'all') params.append('resolved', filterResolved === 'resolved' ? 'true' : 'false')

      const response = await fetch(`/api/plot-analysis/issues?${params}`)
      if (!response.ok) throw new Error('Failed to fetch issues')

      const data = await response.json()
      setIssues(data)
    } catch (error) {
      console.error('Error loading issues:', error)
      toast({
        title: 'Error',
        description: 'Failed to load issues',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleResolve = async (issueId: string, isResolved: boolean) => {
    try {
      const response = await fetch('/api/plot-analysis/issues', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: issueId,
          is_resolved: !isResolved,
          resolution_notes: !isResolved ? resolutionNotes[issueId] || null : null,
        }),
      })

      if (!response.ok) throw new Error('Failed to update issue')

      toast({
        title: 'Success',
        description: !isResolved ? 'Issue marked as resolved' : 'Issue reopened',
      })

      loadIssues()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating issue:', error)
      toast({
        title: 'Error',
        description: 'Failed to update issue',
        variant: 'destructive',
      })
    }
  }

  const getCategoryIcon = (category: IssueCategory) => {
    switch (category) {
      case 'timeline':
        return <Clock className="h-4 w-4" />
      case 'character_continuity':
        return <User className="h-4 w-4" />
      case 'logic':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const filteredIssues = issues

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading issues...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues Found</CardTitle>
        <CardDescription>Click on an issue to see details and suggestions</CardDescription>

        {/* Filters */}
        <div className="flex gap-4 pt-4">
          <div className="flex-1">
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="suggestion">Suggestions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={filterResolved} onValueChange={setFilterResolved}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const isExpanded = expandedIssue === issue.id
            const isResolving = resolvingIssue === issue.id

            return (
              <Card
                key={issue.id}
                className={`cursor-pointer transition-colors ${
                  issue.is_resolved ? 'opacity-60 bg-muted/50' : ''
                }`}
                onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
              >
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getCategoryIcon(issue.category)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{issue.title}</h4>
                            {issue.is_resolved && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline">{getCategoryLabel(issue.category)}</Badge>
                            {issue.location && (
                              <span className="text-xs text-muted-foreground">{issue.location}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="space-y-4 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                        {/* Description */}
                        <div>
                          <h5 className="text-sm font-semibold mb-2">Issue Description</h5>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>

                        {/* Line Reference */}
                        {issue.line_reference && (
                          <div>
                            <h5 className="text-sm font-semibold mb-2">Reference</h5>
                            <p className="text-sm text-muted-foreground italic">
                              "{issue.line_reference}"
                            </p>
                          </div>
                        )}

                        {/* Suggestion */}
                        {issue.suggestion && (
                          <div>
                            <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              Suggestion
                            </h5>
                            <p className="text-sm text-muted-foreground">{issue.suggestion}</p>
                          </div>
                        )}

                        {/* Resolution Notes */}
                        {issue.is_resolved && issue.resolution_notes && (
                          <div>
                            <h5 className="text-sm font-semibold mb-2">Resolution Notes</h5>
                            <p className="text-sm text-muted-foreground">{issue.resolution_notes}</p>
                          </div>
                        )}

                        {/* Resolution Actions */}
                        <div className="space-y-2">
                          {!issue.is_resolved && isResolving && (
                            <Textarea
                              placeholder="Add resolution notes (optional)..."
                              value={resolutionNotes[issue.id] || ''}
                              onChange={(e) =>
                                setResolutionNotes({ ...resolutionNotes, [issue.id]: e.target.value })
                              }
                              rows={2}
                            />
                          )}

                          <div className="flex gap-2">
                            {!issue.is_resolved ? (
                              <>
                                {!isResolving ? (
                                  <Button
                                    size="sm"
                                    onClick={() => setResolvingIssue(issue.id)}
                                    variant="outline"
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Mark Resolved
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => toggleResolve(issue.id, false)}
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setResolvingIssue(null)
                                        setResolutionNotes({ ...resolutionNotes, [issue.id]: '' })
                                      }}
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleResolve(issue.id, true)}
                              >
                                Reopen Issue
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredIssues.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No issues match the current filters
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
