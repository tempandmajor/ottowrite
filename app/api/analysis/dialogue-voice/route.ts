import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeDialogueVoice } from '@/lib/ai/dialogue-voice'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('character_id')

    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('character_voice_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Error fetching dialogue voice analyses:', error)
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 })
  }
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
      return NextResponse.json(
        { error: 'character_id, project_id, dialogue_samples, and target_passage are required' },
        { status: 400 }
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
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, type, genre')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
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

    if (insertError) throw insertError

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error analyzing dialogue voice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze dialogue voice' },
      { status: 500 }
    )
  }
}
