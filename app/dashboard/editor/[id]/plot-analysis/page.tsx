'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Play,
  History,
  ListChecks,
} from 'lucide-react'
import Link from 'next/link'
import { PlotIssueList } from '@/components/plot-analysis/plot-issue-list'
import type { AnalysisType, IssueSeverity } from '@/lib/ai/plot-analyzer'

type Document = {
  id: string
  title: string
  type: string
  word_count: number
}

type PlotAnalysis = {
  id: string
  analysis_type: AnalysisType
  status: string
  summary: string | null
  issues: any[]
  word_count: number
  created_at: string
}

export default function PlotAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [document, setDocument] = useState<Document | null>(null)
  const [analyses, setAnalyses] = useState<PlotAnalysis[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<PlotAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisType, setAnalysisType] = useState<AnalysisType>('full')
  const [issueStats, setIssueStats] = useState({
    total: 0,
    unresolved: 0,
    critical: 0,
    major: 0,
    resolved: 0,
  })
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary')

  const sortedAnalyses = useMemo(
    () =>
      [...analyses].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [analyses]
  )

  const completedAnalyses = useMemo(
    () => sortedAnalyses.filter((analysis) => analysis.status === 'completed'),
    [sortedAnalyses]
  )

  const loadDocument = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, type, word_count')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setDocument(data)
    } catch (error) {
      console.error('Error loading document:', error)
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [params.id, router, toast])

  const loadAnalyses = useCallback(async () => {
    try {
      const response = await fetch(`/api/plot-analysis?document_id=${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch analyses')

      const data = await response.json()
      setAnalyses(data)

      // Auto-select most recent completed analysis
      const completed = data.filter((a: PlotAnalysis) => a.status === 'completed')
      if (completed.length > 0) {
        setSelectedAnalysis((current) => {
          if (!current) {
            return completed[0]
          }
          const stillExists = completed.find((item: PlotAnalysis) => item.id === current.id)
          return stillExists ?? completed[0]
        })
      }
    } catch (error) {
      console.error('Error loading analyses:', error)
    }
  }, [params.id])

  const loadIssueSummary = useCallback(async (analysisId: string) => {
    setIssuesLoading(true)
    try {
      const response = await fetch(`/api/plot-analysis/issues?analysis_id=${analysisId}`)
      if (!response.ok) throw new Error('Failed to fetch issues')

      const data = await response.json()
      const total = data.length
      const unresolvedIssues = data.filter((issue: any) => !issue.is_resolved)
      const resolved = total - unresolvedIssues.length
      const countBySeverity = (severity: IssueSeverity) =>
        unresolvedIssues.filter((issue: any) => issue.severity === severity).length

      setIssueStats({
        total,
        unresolved: unresolvedIssues.length,
        critical: countBySeverity('critical'),
        major: countBySeverity('major'),
        resolved,
      })
    } catch (error) {
      console.error('Error loading issue summary:', error)
      setIssueStats({ total: 0, unresolved: 0, critical: 0, major: 0, resolved: 0 })
    } finally {
      setIssuesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocument()
    loadAnalyses()
  }, [loadDocument, loadAnalyses])

  useEffect(() => {
    if (selectedAnalysis?.status === 'completed') {
      loadIssueSummary(selectedAnalysis.id)
    } else {
      setIssueStats({ total: 0, unresolved: 0, critical: 0, major: 0, resolved: 0 })
      setIssuesLoading(false)
    }
  }, [selectedAnalysis?.id, selectedAnalysis?.status, loadIssueSummary])

  useEffect(() => {
    if (!selectedAnalysis && completedAnalyses.length > 0) {
      setSelectedAnalysis(completedAnalyses[0])
      return
    }

    if (selectedAnalysis) {
      const matching = analyses.find((analysis) => analysis.id === selectedAnalysis.id)
      if (!matching && completedAnalyses.length > 0) {
        setSelectedAnalysis(completedAnalyses[0])
      } else if (matching && matching !== selectedAnalysis) {
        setSelectedAnalysis(matching)
      }
    }
  }, [analyses, completedAnalyses, selectedAnalysis])

  const runAnalysis = async () => {
    if (!document) return

    setAnalyzing(true)

    try {
      const response = await fetch('/api/plot-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: document.id,
          analysis_type: analysisType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze')
      }

      const newAnalysis = await response.json()

      toast({
        title: 'Analysis Complete',
        description: `Found ${newAnalysis.issues?.length || 0} issues`,
      })

      setSelectedAnalysis(newAnalysis)
      setActiveTab('summary')
      if (newAnalysis.status === 'completed') {
        loadIssueSummary(newAnalysis.id)
      } else {
        setIssueStats({ total: 0, unresolved: 0, critical: 0, major: 0, resolved: 0 })
      }
      loadAnalyses()
    } catch (error) {
      console.error('Error running analysis:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to analyze document',
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!document) {
    return null
  }

  const isDocumentTooShort = (document.word_count || 0) < 100
  const issueCount = issueStats.unresolved
  const criticalCount = issueStats.critical
  const majorCount = issueStats.major
  const resolvedCount = issueStats.resolved
  const documentTypeLabel = document.type ? document.type.replace('_', ' ') : 'Document'
  const activeAnalysisTimestamp = selectedAnalysis
    ? new Date(selectedAnalysis.created_at).toLocaleString()
    : null

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/editor/${document.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Plot Analysis</h1>
            <p className="text-muted-foreground mt-1">{document.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize">
            {documentTypeLabel}
          </Badge>
          <Badge variant="secondary">{document.word_count.toLocaleString()} words</Badge>
          {selectedAnalysis && (
            <Badge
              variant={selectedAnalysis.status === 'completed' ? 'secondary' : 'outline'}
              className="uppercase tracking-wide"
            >
              Latest run • {selectedAnalysis.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Analysis Controls */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI-Powered Plot Hole Detection
          </CardTitle>
          <CardDescription>
            Analyze your manuscript for timeline issues, character continuity, logic gaps, and more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="analysis-type" className="text-sm font-medium">
                Analysis Type
              </Label>
              <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
                <SelectTrigger id="analysis-type">
                  <SelectValue placeholder="Select analysis focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Analysis (recommended)</SelectItem>
                  <SelectItem value="timeline">Timeline Only</SelectItem>
                  <SelectItem value="character">Character Continuity</SelectItem>
                  <SelectItem value="logic">Logic & Consistency</SelectItem>
                  <SelectItem value="quick">Quick Scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing || isDocumentTooShort} size="lg">
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {isDocumentTooShort ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>
                  Add at least 100 words to the document to unlock richer analysis results.
                </span>
              </>
            ) : (
              <span>
                Run new analyses after major revisions so the issue tracker reflects the latest
                draft.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'summary' | 'history')}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList className="grid grid-cols-2 md:w-auto">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
          {selectedAnalysis && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {activeAnalysisTimestamp}
              <Badge variant={selectedAnalysis.status === 'completed' ? 'secondary' : 'outline'}>
                {selectedAnalysis.status}
              </Badge>
            </div>
          )}
        </div>

        <TabsContent value="summary" className="space-y-4">
          {selectedAnalysis ? (
            selectedAnalysis.status === 'completed' ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Summary</CardTitle>
                    <CardDescription>
                      {activeAnalysisTimestamp} • {selectedAnalysis.word_count.toLocaleString()} words
                      analyzed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedAnalysis.summary && (
                      <p className="text-sm leading-relaxed">{selectedAnalysis.summary}</p>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                        <Badge variant="secondary" className="text-base">
                          {issueCount}
                        </Badge>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Open issues
                          </p>
                          <p className="text-sm font-medium">{issueCount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                        <Badge variant="outline" className="text-base">
                          {issueStats.total}
                        </Badge>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Total recorded
                          </p>
                          <p className="text-sm font-medium">{issueStats.total}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                        <Badge
                          className="bg-green-100 text-green-800 text-base"
                          variant="secondary"
                        >
                          {resolvedCount}
                        </Badge>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Resolved
                          </p>
                          <p className="text-sm font-medium">{resolvedCount}</p>
                        </div>
                      </div>
                      {criticalCount > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                          <Badge className="bg-red-100 text-red-800 text-base">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {criticalCount}
                          </Badge>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Critical
                            </p>
                            <p className="text-sm font-medium">{criticalCount}</p>
                          </div>
                        </div>
                      )}
                      {majorCount > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                          <Badge className="bg-orange-100 text-orange-800 text-base">
                            {majorCount}
                          </Badge>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Major
                            </p>
                            <p className="text-sm font-medium">{majorCount}</p>
                          </div>
                        </div>
                      )}
                      {issuesLoading && (
                        <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Fetching
                            </p>
                            <p className="text-sm font-medium">Refreshing issue stats…</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {issueStats.total === 0 && !issuesLoading && (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">No plot issues detected yet.</span>
                      </div>
                    )}

                    {issueStats.total > 0 && issueCount === 0 && !issuesLoading && (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">
                          All tracked issues are resolved. Great work!
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {issueStats.total > 0 && (
                  <PlotIssueList
                    analysisId={selectedAnalysis.id}
                    onUpdate={() => {
                      loadIssueSummary(selectedAnalysis.id)
                      loadAnalyses()
                    }}
                  />
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <div>
                    <p className="font-medium">Analysis is still running</p>
                    <p className="text-sm text-muted-foreground">
                      Keep this tab open — we’ll pull in issues as soon as the AI finishes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          ) : analyses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-semibold">No analyses yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Run your first plot analysis to check for continuity issues.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Select an analysis from the history tab to review findings.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {sortedAnalyses.length > 0 ? (
            sortedAnalyses.map((analysis) => {
              const isActive = selectedAnalysis?.id === analysis.id
              return (
                <Card
                  key={analysis.id}
                  className={isActive ? 'border-primary/50 shadow-sm' : undefined}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base capitalize">
                          {analysis.analysis_type.replace(/_/g, ' ')}
                        </CardTitle>
                        <CardDescription>
                          {new Date(analysis.created_at).toLocaleString()} •{' '}
                          {analysis.word_count.toLocaleString()} words analyzed
                        </CardDescription>
                      </div>
                      <Badge variant={analysis.status === 'completed' ? 'secondary' : 'outline'}>
                        {analysis.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {analysis.summary || 'No summary generated yet.'}
                    </p>
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'outline'}
                      onClick={() => {
                        setSelectedAnalysis(analysis)
                        setActiveTab('summary')
                      }}
                    >
                      {isActive ? 'Viewing' : 'View Summary'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Analyses will appear here after you run them.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
