'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorldElement } from '@/components/world/world-element-card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

const RELATIONSHIP_KEYWORDS = [
  ['king', 'queen', 'monarch'],
  ['rebellion', 'resistance', 'insurgency'],
  ['religion', 'cult', 'faith'],
  ['technology', 'magic'],
]

type ConsistencyResult = {
  issue: string
  severity: 'major' | 'minor'
  elements: string[]
}

type Props = {
  elements: WorldElement[]
}

export function ConsistencyChecker({ elements }: Props) {
  const results = useMemo<ConsistencyResult[]>(() => {
    if (!elements || elements.length < 2) return []

    const issues: ConsistencyResult[] = []

    const groupedByName = new Map<string, WorldElement[]>()
    for (const element of elements) {
      const normalized = element.name.trim().toLowerCase()
      if (!groupedByName.has(normalized)) {
        groupedByName.set(normalized, [])
      }
      groupedByName.get(normalized)!.push(element)
    }

    for (const [, group] of groupedByName.entries()) {
      if (group.length > 1) {
        const distinctDescriptions = new Set(group.map((item) => item.summary?.trim()).filter(Boolean))
        if (distinctDescriptions.size > 1) {
          issues.push({
            issue: `“${group[0].name}” appears in multiple entries with conflicting summaries.`,
            severity: 'major',
            elements: group.map((item) => item.id),
          })
        }
      }
    }

    const keywordConflicts = new Map<string, { types: Set<string>; ids: Set<string> }>()
    for (const element of elements) {
      const body = `${element.summary ?? ''} ${element.description ?? ''}`.toLowerCase()
      for (const keywordGroup of RELATIONSHIP_KEYWORDS) {
        const matches = keywordGroup.filter((keyword) => body.includes(keyword))
        if (matches.length >= 1) {
          const key = keywordGroup.join('|')
          if (!keywordConflicts.has(key)) {
            keywordConflicts.set(key, { types: new Set(), ids: new Set() })
          }
          const entry = keywordConflicts.get(key)!
          entry.types.add(element.type)
          entry.ids.add(element.id)
        }
      }
    }

    for (const [, entry] of keywordConflicts.entries()) {
      if (entry.types.size > 1 && entry.ids.size > 1) {
        issues.push({
          issue:
            'Multiple factions/cultures reference the same thematic keywords. Confirm relationships are intentional.',
          severity: 'minor',
          elements: Array.from(entry.ids),
        })
      }
    }

    return issues
  }, [elements])

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consistency scan</CardTitle>
          <CardDescription>No major issues detected across world entries.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add more entries or run an AI analysis for deeper validation.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-amber-300/50 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-100">
          <AlertTriangle className="h-5 w-5" />
          Potential inconsistencies
        </CardTitle>
        <CardDescription>
          Review these entries to ensure your world bible stays coherent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {results.map((result, index) => (
          <div key={index} className="rounded-lg border border-amber-200 bg-background/80 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={result.severity === 'major' ? 'border-red-400 text-red-600' : 'border-amber-400 text-amber-600'}
              >
                {result.severity === 'major' ? 'Major' : 'Minor'}
              </Badge>
              <span className="text-foreground">{result.issue}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
