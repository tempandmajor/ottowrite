import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateCoverageReport,
  type GenerateCoverageParams,
} from '@/lib/ai/coverage-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_FORMATS: GenerateCoverageParams['format'][] = [
  'feature',
  'pilot',
  'episode',
  'short',
  'limited_series',
  'other',
]

function normaliseGenreTags(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }
  return []
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const projectId: string | undefined = body?.project_id
    const scriptTitle: string | undefined = body?.script_title
    const scriptText: string | undefined = body?.script_text
    const format: GenerateCoverageParams['format'] | undefined = body?.format
    const genreTags = normaliseGenreTags(body?.genre_tags)
    const existingLogline: string | undefined = body?.existing_logline
    const developmentNotes: string | undefined = body?.development_notes

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 })
    }

    if (!scriptText || scriptText.trim().length < 200) {
      return NextResponse.json(
        { error: 'Script sample must be at least 200 characters.' },
        { status: 400 }
      )
    }

    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Choose one of feature, pilot, episode, short, limited_series, other.' },
        { status: 400 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, genre')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    const resolvedTitle =
      (scriptTitle && scriptTitle.trim().length > 0 ? scriptTitle.trim() : project.name) ||
      'Untitled Project'

    const combinedGenreTags =
      genreTags.length > 0
        ? genreTags
        : Array.isArray(project.genre)
        ? project.genre.filter((tag: unknown): tag is string => typeof tag === 'string')
        : []

    const MAX_SCRIPT_LENGTH = 60_000
    const normalizedScript = scriptText.trim()
    const truncatedScript =
      normalizedScript.length > MAX_SCRIPT_LENGTH
        ? `${normalizedScript.slice(0, MAX_SCRIPT_LENGTH)}\n\n[Content truncated for analysis due to length.]`
        : normalizedScript

    const { report, usage, model } = await generateCoverageReport({
      projectId: project.id,
      scriptTitle: resolvedTitle,
      scriptText: truncatedScript,
      format,
      genreTags: combinedGenreTags,
      existingLogline: existingLogline?.trim() || undefined,
      developmentNotes: developmentNotes?.trim() || undefined,
    })

    return NextResponse.json({
      report,
      usage,
      model,
    })
  } catch (error) {
    console.error('Coverage generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate coverage.' },
      { status: 500 }
    )
  }
}
