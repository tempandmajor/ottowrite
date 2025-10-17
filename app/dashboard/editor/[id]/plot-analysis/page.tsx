'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Sparkles, Play } from 'lucide-react'
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

  useEffect(() => {
    loadDocument()
    loadAnalyses()
  }, [params.id])

  const loadDocument = async () => {
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
  }

  const loadAnalyses = async () => {
    try {
      const response = await fetch(`/api/plot-analysis?document_id=${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch analyses')

      const data = await response.json()
      setAnalyses(data)

      // Auto-select most recent completed analysis
      const completed = data.filter((a: PlotAnalysis) => a.status === 'completed')
      if (completed.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(completed[0])
      }
    } catch (error) {
      console.error('Error loading analyses:', error)
    }
  }

  const loadIssueSummary = async (analysisId: string) => {
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
  }

  useEffect(() => {
    if (selectedAnalysis) {
      loadIssueSummary(selectedAnalysis.id)
    } else {
      setIssueStats({ total: 0, unresolved: 0, critical: 0, major: 0, resolved: 0 })
      setIssuesLoading(false)
    }
  }, [selectedAnalysis?.id])

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
      loadIssueSummary(newAnalysis.id)
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

  const issueCount = issueStats.unresolved
  const criticalCount = issueStats.critical
  const majorCount = issueStats.major
  const resolvedCount = issueStats.resolved

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Analysis Type</label>
              <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
                <SelectTrigger>
                  <SelectValue />
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
            <Button onClick={runAnalysis} disabled={analyzing} size="lg">
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

          {document.word_count < 100 && (
            <p className="text-sm text-muted-foreground">
              ⚠️ Document should have at least 100 words for meaningful analysis
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {selectedAnalysis && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>
                {new Date(selectedAnalysis.created_at).toLocaleString()} •{' '}
                {selectedAnalysis.word_count.toLocaleString()} words analyzed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAnalysis.summary && (
                <p className="text-sm">{selectedAnalysis.summary}</p>
              )}

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg">
                    {issueCount}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Open Issues</span>
                </div>
                {issueStats.total > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg">
                      {issueStats.total}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Total Recorded</span>
                  </div>
                )}
                {resolvedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 text-lg">
                      {resolvedCount}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Resolved</span>
                  </div>
                )}
                {issuesLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating…
                  </div>
                )}
                {criticalCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800 text-lg">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {criticalCount}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Critical</span>
                  </div>
                )}
                {majorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-800 text-lg">
                      {majorCount}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Major</span>
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
                  <span className="font-medium">All tracked issues are resolved. Great work!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issues List */}
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
      )}

      {/* Empty State */}
      {!selectedAnalysis && analyses.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">No analyses yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Run your first plot analysis to check for continuity issues
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
