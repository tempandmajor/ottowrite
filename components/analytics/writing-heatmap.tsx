'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export type HeatmapDay = {
  date: string
  words: number
}

type WritingHeatmapProps = {
  data: HeatmapDay[]
}

const LEVELS = [0, 10, 25, 50, 100, 200]

function colorForWords(words: number) {
  if (words === 0) return 'bg-muted'
  if (words < 10) return 'bg-emerald-100'
  if (words < 25) return 'bg-emerald-200'
  if (words < 50) return 'bg-emerald-300'
  if (words < 100) return 'bg-emerald-400'
  return 'bg-emerald-500 text-emerald-50'
}

export function WritingHeatmap({ data }: WritingHeatmapProps) {
  const weeks = useMemo(() => {
    const bucket: HeatmapDay[][] = []
    let currentWeek: HeatmapDay[] = []

    data.forEach((day, index) => {
      currentWeek.push(day)
      if ((index + 1) % 7 === 0) {
        bucket.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', words: 0 })
      }
      bucket.push(currentWeek)
    }

    return bucket
  }, [data])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Past 30 days</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {LEVELS.map((level) => (
            <div key={level} className="flex items-center gap-1">
              <span
                className={cn(
                  'h-3 w-3 rounded-sm border border-border/60',
                  colorForWords(level === 0 ? 0 : level)
                )}
              />
              {level}
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid auto-cols-[minmax(10px,1fr)] grid-flow-col gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-1">
              {week.map((day, index) => (
                <div
                  key={`${weekIndex}-${index}`}
                  className={cn('h-3 w-3 rounded-sm border border-border/40', colorForWords(day.words))}
                  title={day.date ? `${day.date}: ${day.words} words` : 'No data'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
