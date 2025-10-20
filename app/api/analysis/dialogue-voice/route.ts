import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeDialogueVoice } from '@/lib/ai/dialogue-voice'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('character_id')

    if (!characterId) {
      return errorResponses.badRequest('character_id is required', { userId: user.id })
    }

    const { data, error } = await supabase
      .from('character_voice_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch dialogue voice analyses', {
        userId: user.id,
        characterId,
        operation: 'dialogue_voice:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch analyses', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse(data ?? [])
  } catch (error) {
    logger.error('Error fetching dialogue voice analyses', {
      operation: 'dialogue_voice:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch analyses', { details: error })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const body = (await request.json()) as {
      character_id?: string
      project_id?: string
      dialogue_samples?: string[]
      target_passage?: string
    }

    const characterId = body.character_id
    const projectId = body.project_id
    const dialogueSamples = (body.dialogue_samples ?? []).map((sample) => sample.trim()).filter(Boolean)
    const targetPassage = (body.target_passage ?? '').trim()

    if (!characterId || !projectId || dialogueSamples.length === 0 || !targetPassage) {
      return errorResponses.badRequest(
        'character_id, project_id, dialogue_samples, and target_passage are required',
        { userId: user.id }
      )
    }

    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('id, name, project_id, voice_description, role')
      .eq('id', characterId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (characterError || !character) {
      return errorResponses.notFound('Character not found', { userId: user.id })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, type, genre')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return errorResponses.notFound('Project not found', { userId: user.id })
    }

    const analysis = await analyzeDialogueVoice({
      characterName: character.name,
      projectType: project.type,
      genre: project.genre,
      voiceDescription: character.voice_description,
      dialogueSamples,
      targetPassage,
    })

    const { data: record, error: insertError } = await supabase
      .from('character_voice_analyses')
      .insert({
        user_id: user.id,
        project_id: projectId,
        character_id: characterId,
        dialogue_samples: dialogueSamples,
        target_passage: targetPassage,
        analysis,
        model: analysis.comparison ? 'claude-sonnet-4.5' : null,
        confidence: analysis.comparison?.confidence ?? null,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to store dialogue voice analysis', {
        userId: user.id,
        characterId,
        projectId,
        operation: 'dialogue_voice:store',
      }, insertError)
      return errorResponses.internalError('Failed to store analysis', {
        details: insertError,
        userId: user.id,
      })
    }

    return successResponse(record, 201)
  } catch (error) {
    logger.error('Error analyzing dialogue voice', {
      operation: 'dialogue_voice:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to analyze dialogue voice', { details: error })
  }
}
