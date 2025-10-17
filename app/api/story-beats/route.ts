import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List beats for a project
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
    const beatType = searchParams.get('beat_type')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('story_beats')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('order_position', { ascending: true })

    if (beatType) {
      query = query.eq('beat_type', beatType)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching story beats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch story beats' },
      { status: 500 }
    )
  }
}

// POST - Create or initialize beats from template
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
    const { project_id, template_name, beats } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      )
    }

    // If template_name provided, initialize from template
    if (template_name) {
      const { data: createdBeats, error: rpcError } = await supabase.rpc(
        'initialize_beats_from_template',
        {
          p_project_id: project_id,
          p_user_id: user.id,
          p_template_name: template_name,
        }
      )

      if (rpcError) {
        const isTemplateMissing = rpcError.message?.toLowerCase().includes('template not found')
        return NextResponse.json(
          { error: isTemplateMissing ? 'Template not found' : 'Failed to initialize beats' },
          { status: isTemplateMissing ? 404 : 500 }
        )
      }

      return NextResponse.json(createdBeats || [])
    }

    // Otherwise, create individual beats
    if (beats && Array.isArray(beats)) {
      const { data: createdBeats, error: createError } = await supabase
        .from('story_beats')
        .insert(
          beats.map((beat) => ({
            ...beat,
            project_id,
            user_id: user.id,
          }))
        )
        .select()

      if (createError) throw createError

      return NextResponse.json(createdBeats)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error creating story beats:', error)
    return NextResponse.json(
      { error: 'Failed to create story beats' },
      { status: 500 }
    )
  }
}

// PATCH - Update beat
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Beat ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('story_beats')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating story beat:', error)
    return NextResponse.json(
      { error: 'Failed to update story beat' },
      { status: 500 }
    )
  }
}

// DELETE - Delete beat
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
      return NextResponse.json({ error: 'Beat ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('story_beats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting story beat:', error)
    return NextResponse.json(
      { error: 'Failed to delete story beat' },
      { status: 500 }
    )
  }
}
