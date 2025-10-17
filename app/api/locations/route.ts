import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET locations for a project
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
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('locations')
      .select(
        `
          *,
          location_events (
            id,
            title,
            occurs_at,
            description,
            importance,
            key_characters,
            tags,
            created_at,
            updated_at
          )
        `
      )
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ locations: data ?? [] })
  } catch (error) {
    console.error('Error in GET /api/locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - create location
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
      category = 'other',
      summary,
      history,
      culture,
      climate,
      key_features,
      tags,
      image_url,
      metadata,
    } = body

    if (!project_id || !name || !category) {
      return NextResponse.json(
        { error: 'project_id, name and category are required' },
        { status: 400 }
      )
    }

    // verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        user_id: user.id,
        project_id,
        name,
        category,
        summary,
        history,
        culture,
        climate,
        key_features,
        tags,
        image_url,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update location
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
      return NextResponse.json({ error: 'Location id is required' }, { status: 400 })
    }

    delete updates.user_id
    delete updates.project_id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data })
  } catch (error) {
    console.error('Error in PATCH /api/locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE location
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
      return NextResponse.json({ error: 'Location id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
