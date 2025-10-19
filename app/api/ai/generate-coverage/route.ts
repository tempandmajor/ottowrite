import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateCoverageReport,
  type GenerateCoverageParams,
} from '@/lib/ai/coverage-service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'

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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    const plan = profile.subscription_tier ?? 'free'

    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, 1)
    if (!requestQuota.allowed) {
      const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1)
      return NextResponse.json(
        {
          error: `You have reached the ${formattedPlan} plan limit of ${requestQuota.limit} AI requests this month.`,
          limit: requestQuota.limit,
          used: requestQuota.used,
          upgradeRequired: true,
        },
        { status: 429 }
      )
    }

    const monthlyLimit = getMonthlyAIWordLimit(plan)
    const currentUsage = profile.ai_words_used_this_month ?? 0
    if (currentUsage >= monthlyLimit) {
      return NextResponse.json(
        {
          error: 'Monthly AI word limit exceeded',
          limit: monthlyLimit,
          used: currentUsage,
          upgradeRequired: true,
        },
        { status: 429 }
      )
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

    const combinedText = [
      report.logline,
      report.synopsis.onePage,
      report.synopsis.twoPage,
      report.coverageNotes.summary,
      ...report.coverageNotes.strengths,
      ...report.coverageNotes.weaknesses,
      ...report.coverageNotes.characterNotes,
      ...report.coverageNotes.plotNotes,
      ...report.coverageNotes.dialogueNotes,
      ...report.coverageNotes.pacingNotes,
      ...report.coverageNotes.additionalNotes,
      report.marketability.assessment,
      ...report.marketability.audienceSegments,
      ...report.marketability.comparableTitles,
      ...report.marketability.distributionNotes,
      ...report.marketability.riskFactors,
      report.verdict.explanation,
    ]
      .filter(Boolean)
      .join(' ')

    const wordsGenerated = combinedText.trim().length === 0 ? 0 : combinedText.trim().split(/\s+/).length

    await supabase.from('ai_usage').insert([
      {
        user_id: user.id,
        document_id: null,
        model,
        words_generated: wordsGenerated,
        prompt_tokens: usage?.inputTokens ?? 0,
        completion_tokens: usage?.outputTokens ?? 0,
        total_cost: usage?.totalCost ?? 0,
        prompt_preview: truncatedScript.substring(0, 200),
      },
    ])

    await supabase
      .from('user_profiles')
      .update({
        ai_words_used_this_month: currentUsage + wordsGenerated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      console.warn('refresh_user_plan_usage failed after coverage generation', refreshError)
    }

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
