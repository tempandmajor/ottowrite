import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorldElement } from '@/lib/ai/world-element'

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
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('world_elements')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ elements: data ?? [] })
  } catch (error) {
    console.error('Error fetching world elements:', error)
    return NextResponse.json({ error: 'Failed to fetch world elements' }, { status: 500 })
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

    const body = await request.json()
    const {
      project_id,
      type,
      name,
      summary,
      description,
      properties,
      tags,
      related_element_ids,
      image_urls,
      ai_prompt,
      use_ai,
    } = body || {}

    if (!project_id || !type || (!name && !use_ai)) {
      return NextResponse.json(
        { error: 'project_id, type, and name (unless AI generation is requested) are required' },
        { status: 400 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, type, genre')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let finalName: string | undefined = name
    let finalSummary: string | undefined = summary
    let finalDescription: string | undefined = description
    let finalProperties: Record<string, unknown> | undefined = properties
    let finalTags: string[] | undefined = Array.isArray(tags) ? tags : undefined
    let aiMetadata: Record<string, unknown> | undefined

    if (use_ai) {
      const prompt = String(ai_prompt ?? '').trim()
      if (!prompt || prompt.length < 10) {
        return NextResponse.json(
          { error: 'Please provide a prompt of at least 10 characters for AI generation.' },
          { status: 400 }
        )
      }

      const existingResponse = await supabase
        .from('world_elements')
        .select('name, type, summary')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(12)

      const generated = await generateWorldElement({
        projectType: project.type,
        genre: project.genre,
        type,
        prompt,
        existingElements: existingResponse.data ?? [],
      })

      finalName = generated.name
      finalSummary = generated.summary
      finalDescription = generated.description
      finalProperties = generated.properties
      finalTags = generated.tags
      aiMetadata = {
        prompt,
        generatedAt: new Date().toISOString(),
        model: 'claude-sonnet-4.5',
      }
    }

    if (!finalName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: element, error: insertError } = await supabase
      .from('world_elements')
      .insert({
        user_id: user.id,
        project_id,
        type,
        name: finalName,
        summary: finalSummary ?? null,
        description: finalDescription ?? null,
        properties: finalProperties ?? {},
        tags: finalTags ?? [],
        related_element_ids: related_element_ids ?? [],
        image_urls: image_urls ?? [],
        ai_metadata: aiMetadata ?? null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ element }, { status: 201 })
  } catch (error) {
    console.error('Error creating world element:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create world element' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    delete updates.user_id
    delete updates.project_id
    delete updates.created_at
    delete updates.updated_at

    const { data: element, error } = await supabase
      .from('world_elements')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ element })
  } catch (error) {
    console.error('Error updating world element:', error)
    return NextResponse.json({ error: 'Failed to update world element' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('world_elements')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting world element:', error)
    return NextResponse.json({ error: 'Failed to delete world element' }, { status: 500 })
  }
}
