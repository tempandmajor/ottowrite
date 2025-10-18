'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Copy, ClipboardList, Clock, Users } from 'lucide-react'

type BreakdownSheetsProps = {
  scriptText: string
}

type NamedCount = {
  name: string
  count: number
}

type SceneSummary = {
  slug: string
  location: string
  timeOfDay: string
}

const slugRegex = /^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.|EXT\/INT\.)/
const characterRegex = /^[A-Z0-9' .\-()]{2,40}$/
const ignoredTokens = new Set([
  'INT',
  'EXT',
  'EST',
  'INT/EXT',
  'EXT/INT',
  'I/E',
  'DAY',
  'NIGHT',
  'CONTINUOUS',
  'LATER',
  'MOMENTS',
  'SAME',
  'DUSK',
  'DAWN',
  'AFTERNOON',
  'MORNING',
  'EVENING',
  'CUT',
  'DISSOLVE',
  'FADE',
  'SMASH',
  'MATCH',
  'WIPE',
  'TO',
  'ANGLE',
  'ON',
])

function parseScenes(scriptText: string): SceneSummary[] {
  return scriptText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => slugRegex.test(line))
    .map((slugLine) => {
      const withoutPrefix = slugLine.replace(slugRegex, '').trim()
      const [locationPart, timePart = ''] = withoutPrefix.split(/[-–—]/).map((part) => part.trim())
      const location = locationPart?.length ? locationPart : 'Unknown location'
      const timeOfDay = timePart?.length ? timePart : 'Unspecified'
      return {
        slug: slugLine,
        location,
        timeOfDay: timeOfDay.toUpperCase(),
      }
    })
}

function parseCharacters(scriptText: string): NamedCount[] {
  const lines = scriptText.split(/\r?\n/).map((line) => line.trim())
  const counts = new Map<string, number>()

  lines.forEach((line, index) => {
    if (!line || slugRegex.test(line)) return
    if (!characterRegex.test(line)) return
    if (line.split(' ').length > 6) return
    const previous = lines[index - 1]
    if (previous && previous.length > 0 && !previous.endsWith(')')) return
    const key = line.toUpperCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

function parseLocations(scenes: SceneSummary[]): NamedCount[] {
  const counts = new Map<string, number>()
  scenes.forEach((scene) => {
    const key = scene.location.toUpperCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

function parseProps(scriptText: string): NamedCount[] {
  const lines = scriptText.split(/\r?\n/)
  const counts = new Map<string, number>()

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line || slugRegex.test(line) || characterRegex.test(line)) return
    const matches = line.match(/\b[A-Z][A-Z0-9]{2,}\b/g)
    if (!matches) return
    matches.forEach((token) => {
      if (ignoredTokens.has(token)) return
      counts.set(token, (counts.get(token) ?? 0) + 1)
    })
  })

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function BreakdownSheets({ scriptText }: BreakdownSheetsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const hasScript = scriptText.trim().length > 0

  const { scenes, characters, locations, props, runtimeMinutes } = useMemo(() => {
    if (!hasScript) {
      return {
        scenes: [] as SceneSummary[],
        characters: [] as NamedCount[],
        locations: [] as NamedCount[],
        props: [] as NamedCount[],
        runtimeMinutes: 0,
      }
    }
    const parsedScenes = parseScenes(scriptText)
    const parsedCharacters = parseCharacters(scriptText)
    const parsedLocations = parseLocations(parsedScenes)
    const parsedProps = parseProps(scriptText)
    const lineCount = scriptText.split(/\r?\n/).filter((line) => line.trim().length > 0).length
    const pages = Math.max(1, Math.round(lineCount / 55))
    return {
      scenes: parsedScenes,
      characters: parsedCharacters,
      locations: parsedLocations,
      props: parsedProps,
      runtimeMinutes: pages,
    }
  }, [hasScript, scriptText])

  const copyList = useCallback(
    async (label: string, items: NamedCount[]) => {
      const text = items.map((item) => `${item.name}\t${item.count}`).join('\n')
      try {
        await navigator.clipboard.writeText(text)
        setCopiedKey(label)
        setTimeout(() => setCopiedKey(null), 2000)
      } catch {
        setCopiedKey(null)
      }
    },
    []
  )

  if (!hasScript) {
    return (
      <Card className="border border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Production breakdown</CardTitle>
          <CardDescription>Paste your screenplay to generate shot lists, locations, and props.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Scene, location, and prop summaries will appear here once script pages are analysed.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle>Production breakdown</CardTitle>
        <CardDescription>Auto-generated sheets for scheduling, budgeting, and art department briefs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<Clock className="h-4 w-4" />}
            label="Estimated runtime"
            value={`${runtimeMinutes} min`}
            helper="Based on 1 page ≈ 1 minute."
          />
          <SummaryCard
            icon={<ClipboardList className="h-4 w-4" />}
            label="Scenes detected"
            value={scenes.length.toString()}
            helper="Scene headings following INT./EXT."
          />
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label="Speaking roles"
            value={characters.length.toString()}
            helper="Uppercase cues preceding dialogue."
          />
        </div>

        <section className="space-y-3">
          <HeaderWithCopy
            label="Top characters"
            onCopy={() => copyList('characters', characters)}
            copied={copiedKey === 'characters'}
          />
          {characters.length === 0 ? (
            <EmptyHint message="No speaking parts detected. Ensure character cues are uppercase and separated from action." />
          ) : (
            <TagCloud items={characters.slice(0, 12)} />
          )}
        </section>

        <section className="space-y-3">
          <HeaderWithCopy
            label="Locations"
            onCopy={() => copyList('locations', locations)}
            copied={copiedKey === 'locations'}
          />
          {locations.length === 0 ? (
            <EmptyHint message="We couldn’t parse any locations. Check that scene headings follow INT./EXT. LOCATION - TIME." />
          ) : (
            <TagCloud items={locations.slice(0, 12)} />
          )}
        </section>

        <section className="space-y-3">
          <HeaderWithCopy
            label="Props & featured elements"
            onCopy={() => copyList('props', props)}
            copied={copiedKey === 'props'}
          />
          {props.length === 0 ? (
            <EmptyHint message="No capitalised props detected in action lines yet." />
          ) : (
            <TagCloud items={props.slice(0, 12)} />
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Scene stripboard</h3>
          {scenes.length === 0 ? (
            <EmptyHint message="Add scene headings to populate the stripboard." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {scenes.slice(0, 8).map((scene, index) => (
                <div key={`${scene.slug}-${index}`} className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm">
                  <p className="font-semibold text-foreground">{scene.slug}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Location
                    <span className="ml-1 font-medium text-foreground">{scene.location}</span>
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Time
                    <span className="ml-1 font-medium text-foreground">{scene.timeOfDay}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}

type SummaryCardProps = {
  icon: ReactNode
  label: string
  value: string
  helper: string
}

function SummaryCard({ icon, label, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  )
}

type HeaderWithCopyProps = {
  label: string
  copied: boolean
  onCopy: () => void
}

function HeaderWithCopy({ label, copied, onCopy }: HeaderWithCopyProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <Button variant="outline" size="sm" onClick={onCopy}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            Copy list
          </>
        )}
      </Button>
    </div>
  )
}

type TagCloudProps = {
  items: NamedCount[]
}

function TagCloud({ items }: TagCloudProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.name} variant="secondary" className="flex items-center gap-2">
          <span className="font-medium uppercase tracking-wide">{item.name}</span>
          <span className="rounded bg-background/60 px-1.5 py-0.5 text-[11px] text-foreground">{item.count}</span>
        </Badge>
      ))}
    </div>
  )
}

type EmptyHintProps = {
  message: string
}

function EmptyHint({ message }: EmptyHintProps) {
  return (
    <p className="rounded-xl border border-dashed border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
      {message}
    </p>
  )
}
