import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List characters for a project
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
    const role = searchParams.get('role')
    const limit = searchParams.get('limit')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('characters')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: characters, error } = await query

    if (error) {
      console.error('Error fetching characters:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ characters })
  } catch (error) {
    console.error('Error in GET /api/characters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new character
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
      name,
      role,
      importance = 5,
      age,
      gender,
      appearance,
      physical_description,
      personality_traits,
      strengths,
      weaknesses,
      fears,
      desires,
      backstory,
      arc_type,
      character_arc,
      internal_conflict,
      external_conflict,
      first_appearance,
      last_appearance,
      story_function,
      image_url,
      voice_description,
      tags,
      notes,
      metadata,
    } = body

    if (!project_id || !name || !role) {
      return NextResponse.json(
        { error: 'project_id, name, and role are required' },
        { status: 400 }
      )
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: character, error } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        project_id,
        name,
        role,
        importance,
        age,
        gender,
        appearance,
        physical_description,
        personality_traits,
        strengths,
        weaknesses,
        fears,
        desires,
        backstory,
        arc_type,
        character_arc,
        internal_conflict,
        external_conflict,
        first_appearance,
        last_appearance,
        story_function,
        image_url,
        voice_description,
        tags,
        notes,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating character:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ character }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a character
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
      return NextResponse.json({ error: 'Character id is required' }, { status: 400 })
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id
    delete updates.project_id
    delete updates.created_at
    delete updates.updated_at

    const { data: character, error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating character:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    return NextResponse.json({ character })
  } catch (error) {
    console.error('Error in PATCH /api/characters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a character
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
      return NextResponse.json({ error: 'Character id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting character:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
