'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users,
  MessageSquare,
  Film,
  Loader2,
} from 'lucide-react'
import type { Scene } from '@/lib/screenplay/scene-parser'
import {
  analyzeScreenplay,
  getAIAnalysis,
  type ScreenplayAnalysis,
  type PlotPoint,
  type PacingIssue,
} from '@/lib/ai/screenplay-analyzer'
import { cn } from '@/lib/utils'

type ScriptAnalysisProps = {
  scenes: Scene[]
  genre?: string
  targetLength?: number
}

export function ScriptAnalysis({ scenes, genre = 'Drama', targetLength = 90 }: ScriptAnalysisProps) {
  const [analysis, setAnalysis] = useState<ScreenplayAnalysis | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedFocus, setSelectedFocus] = useState<'structure' | 'characters' | 'dialogue' | 'pacing' | 'overall'>('overall')

  // Run analysis
  useEffect(() => {
    async function runAnalysis() {
      setLoading(true)
      try {
        const result = await analyzeScreenplay(scenes, { genre, targetLength })
        setAnalysis(result)
      } catch (error) {
        console.error('Analysis failed:', error)
      } finally {
        setLoading(false)
      }
    }

    if (scenes.length > 0) {
      runAnalysis()
    }
  }, [scenes, genre, targetLength])

  // Get AI analysis
  const handleAIAnalysis = useCallback(async () => {
    if (scenes.length === 0) return

    setAiLoading(true)
    try {
      const result = await getAIAnalysis(scenes, selectedFocus)
      setAiAnalysis(result)
    } catch (error) {
      console.error('AI analysis failed:', error)
      setAiAnalysis('Failed to generate AI analysis. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }, [scenes, selectedFocus])

  if (loading || !analysis) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Analysis Score
          </CardTitle>
          <CardDescription>Comprehensive screenplay structure and quality assessment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={analysis.overallScore} className="h-3" />
            </div>
            <div className={cn(
              'text-3xl font-bold',
              analysis.overallScore >= 80 && 'text-green-500',
              analysis.overallScore >= 60 && analysis.overallScore < 80 && 'text-yellow-500',
              analysis.overallScore < 60 && 'text-red-500'
            )}>
              {analysis.overallScore}%
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {analysis.overallScore >= 80
              ? 'Excellent screenplay structure. Follows industry standards with strong pacing.'
              : analysis.overallScore >= 60
              ? 'Good foundation with some areas for improvement.'
              : 'Significant structural issues detected. Review recommendations below.'}
          </p>
        </CardContent>
      </Card>

      {/* Three-Act Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Three-Act Structure
          </CardTitle>
          <CardDescription>
            {analysis.structure.followsThreeAct ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Follows standard three-act structure
              </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                Deviates from standard structure
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {analysis.structure.acts.map((act) => (
              <div key={act.act} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Act {act.act}</span>
                  <Badge variant={
                    (act.act === 1 && act.percentage >= 20 && act.percentage <= 30) ||
                    (act.act === 2 && act.percentage >= 45 && act.percentage <= 55) ||
                    (act.act === 3 && act.percentage >= 20 && act.percentage <= 30)
                      ? 'default'
                      : 'destructive'
                  }>
                    {act.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={act.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Scenes {act.startScene}-{act.endScene} ({act.sceneCount} scenes, {Math.round(act.duration)} min)
                </p>
                <p className="text-xs text-muted-foreground">
                  Standard: {act.act === 2 ? '50%' : '25%'}
                </p>
              </div>
            ))}
          </div>

          {analysis.structure.issues.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <p className="text-sm font-medium mb-2">Structure Issues:</p>
              <ul className="text-sm space-y-1">
                {analysis.structure.issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plot Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Plot Points
          </CardTitle>
          <CardDescription>Critical story beats and their placement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.plotPoints.map((point) => (
              <PlotPointCard key={point.type} point={point} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pacing Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pacing Analysis
          </CardTitle>
          <CardDescription>
            Overall pace: <Badge>{analysis.pacing.overallPace}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Act 1 Balance</p>
              <p className="text-2xl font-bold">{analysis.pacing.actBalance.act1.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Act 2 Balance</p>
              <p className="text-2xl font-bold">{analysis.pacing.actBalance.act2.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Act 3 Balance</p>
              <p className="text-2xl font-bold">{analysis.pacing.actBalance.act3.toFixed(1)}%</p>
            </div>
          </div>

          {analysis.pacing.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pacing Issues ({analysis.pacing.issues.length})</p>
              <div className="space-y-2">
                {analysis.pacing.issues.map((issue, index) => (
                  <PacingIssueCard key={index} issue={issue} />
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm font-medium mb-1">Recommendation</p>
            <p className="text-sm">{analysis.pacing.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Character Arcs */}
      {analysis.characterArcs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Character Arcs
            </CardTitle>
            <CardDescription>Main character development analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.characterArcs.map((arc) => (
                <div key={arc.character} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{arc.character}</h4>
                    <Badge variant="outline">{arc.arcType} arc</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{arc.development}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {arc.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1">Strengths</p>
                        <ul className="text-xs space-y-0.5">
                          {arc.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle2 className="h-3 w-3 mt-0.5" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {arc.weaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-yellow-600 mb-1">Areas for Improvement</p>
                        <ul className="text-xs space-y-0.5">
                          {arc.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5" />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Industry Comparison
          </CardTitle>
          <CardDescription>How your screenplay compares to industry standards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Genre</p>
              <p className="text-sm text-muted-foreground">{analysis.industryComparison.genre}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Length</p>
              <p className="text-sm text-muted-foreground">{analysis.industryComparison.lengthComparison}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Structure</p>
              <p className="text-sm text-muted-foreground">{analysis.industryComparison.structureComparison}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Pacing</p>
              <p className="text-sm text-muted-foreground">{analysis.industryComparison.pacingComparison}</p>
            </div>
          </div>

          {analysis.industryComparison.recommendations.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <p className="text-sm font-medium mb-2">Recommendations</p>
              <ul className="text-sm space-y-1">
                {analysis.industryComparison.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-purple-600 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-Powered Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI-Powered Deep Analysis
              </CardTitle>
              <CardDescription>Get detailed insights from AI screenplay expert</CardDescription>
            </div>
            <Select value={selectedFocus} onValueChange={(value: typeof selectedFocus) => setSelectedFocus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall</SelectItem>
                <SelectItem value="structure">Structure</SelectItem>
                <SelectItem value="characters">Characters</SelectItem>
                <SelectItem value="dialogue">Dialogue</SelectItem>
                <SelectItem value="pacing">Pacing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAIAnalysis} disabled={aiLoading}>
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Generate AI Analysis
              </>
            )}
          </Button>

          {aiAnalysis && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PlotPointCard({ point }: { point: PlotPoint }) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className={cn(
        'mt-1 h-2 w-2 rounded-full',
        point.confidence >= 80 && 'bg-green-500',
        point.confidence >= 60 && point.confidence < 80 && 'bg-yellow-500',
        point.confidence < 60 && 'bg-red-500'
      )} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm">{point.name}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Scene {point.sceneNumber}</Badge>
            <Badge variant="secondary" className="text-xs">{Math.round(point.timestamp)} min</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{point.description}</p>
        <div className="flex items-center gap-2">
          <Progress value={point.confidence} className="h-1 flex-1" />
          <span className="text-xs text-muted-foreground">{point.confidence}% confidence</span>
        </div>
      </div>
    </div>
  )
}

function PacingIssueCard({ issue }: { issue: PacingIssue }) {
  const severityColor = issue.severity === 'high' ? 'text-red-600' : issue.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <AlertTriangle className={cn('h-4 w-4 mt-0.5', severityColor)} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm capitalize">{issue.type.replace(/-/g, ' ')}</span>
          <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
            {issue.severity}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{issue.location}</p>
        <p className="text-xs">{issue.recommendation}</p>
      </div>
    </div>
  )
}
