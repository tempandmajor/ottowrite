'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  BarChart3,
  MessageSquare,
  Zap,
  Target,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react'
import {
  type WritingMetrics,
  getReadabilityLevel,
  getVocabularyLevel,
} from '@/lib/analytics/writing-metrics'
import { cn } from '@/lib/utils'

type MetricsDisplayProps = {
  metrics: WritingMetrics
  title?: string
}

export function MetricsDisplay({ metrics, title = 'Writing Metrics' }: MetricsDisplayProps) {
  const readabilityInfo = getReadabilityLevel(metrics.readability.fleschKincaid)
  const vocabularyInfo = getVocabularyLevel(metrics.vocabulary.diversity)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive analysis of your writing style and readability
        </p>
      </div>

      {/* Composition Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Words</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.composition.words.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.composition.sentences} sentences
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reading Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.readability.readingTime} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~238 words/min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paragraphs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pacing.paragraphs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.pacing.avgWordsPerParagraph} words avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dialogue</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pacing.dialoguePercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.composition.dialogueLines} lines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Readability Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Readability Analysis
          </CardTitle>
          <CardDescription>Flesch-Kincaid reading ease and grade level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Reading Ease Score</span>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', readabilityInfo.color)}>
                  {metrics.readability.fleschKincaid}
                </span>
                <Badge variant="outline" className={readabilityInfo.color}>
                  {readabilityInfo.level}
                </Badge>
              </div>
            </div>
            <Progress value={metrics.readability.fleschKincaid} className="h-2" />
            <p className="text-xs text-muted-foreground">{readabilityInfo.description}</p>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Grade Level</span>
              <span className="text-sm font-semibold">
                {metrics.readability.gradeLevel} (US)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentence Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sentence Structure
          </CardTitle>
          <CardDescription>Length analysis and distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Average Length</p>
              <p className="text-2xl font-bold">{metrics.sentences.avgLength} words</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shortest</p>
              <p className="text-2xl font-bold">{metrics.sentences.shortest} words</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Longest</p>
              <p className="text-2xl font-bold">{metrics.sentences.longest} words</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Length Distribution</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Short (1-10 words)</span>
                <span className="font-medium">{metrics.sentences.distribution.short}</span>
              </div>
              <Progress
                value={(metrics.sentences.distribution.short / metrics.sentences.total) * 100}
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Medium (11-20 words)</span>
                <span className="font-medium">{metrics.sentences.distribution.medium}</span>
              </div>
              <Progress
                value={(metrics.sentences.distribution.medium / metrics.sentences.total) * 100}
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Long (21-30 words)</span>
                <span className="font-medium">{metrics.sentences.distribution.long}</span>
              </div>
              <Progress
                value={(metrics.sentences.distribution.long / metrics.sentences.total) * 100}
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Very Long (31+ words)</span>
                <span className="font-medium">{metrics.sentences.distribution.veryLong}</span>
              </div>
              <Progress
                value={(metrics.sentences.distribution.veryLong / metrics.sentences.total) * 100}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vocabulary Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Vocabulary Analysis
          </CardTitle>
          <CardDescription>Word variety and complexity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Vocabulary Diversity</span>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', vocabularyInfo.color)}>
                  {(metrics.vocabulary.diversity * 100).toFixed(1)}%
                </span>
                <Badge variant="outline" className={vocabularyInfo.color}>
                  {vocabularyInfo.level}
                </Badge>
              </div>
            </div>
            <Progress value={metrics.vocabulary.diversity * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{vocabularyInfo.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Unique Words</p>
              <p className="text-2xl font-bold">{metrics.vocabulary.uniqueWords}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Word Length</p>
              <p className="text-2xl font-bold">{metrics.vocabulary.avgWordLength} chars</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Complex Words</p>
              <p className="text-2xl font-bold">{metrics.vocabulary.complexWords}</p>
            </div>
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
          <CardDescription>Action vs description balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Words per Paragraph</p>
              <p className="text-2xl font-bold">{metrics.pacing.avgWordsPerParagraph}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sentences per Paragraph</p>
              <p className="text-2xl font-bold">{metrics.pacing.avgSentencesPerParagraph}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Action to Description Ratio</span>
              <span className="text-sm font-semibold">
                {metrics.pacing.actionToDescriptionRatio.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.pacing.actionToDescriptionRatio > 1.5
                ? 'Fast-paced with mostly short sentences (action-heavy)'
                : metrics.pacing.actionToDescriptionRatio > 0.8
                ? 'Balanced mix of action and description'
                : 'Slow-paced with mostly long sentences (description-heavy)'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
