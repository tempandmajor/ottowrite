import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET events for a location or project
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
    const locationId = searchParams.get('location_id')

    if (!projectId && !locationId) {
      return NextResponse.json(
        { error: 'project_id or location_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('location_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching location events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (error) {
    console.error('Error in GET /api/locations/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create location event
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
      location_id,
      title,
      occurs_at,
      description,
      importance = 5,
      key_characters,
      tags,
      metadata,
    } = body

    if (!project_id || !location_id || !title) {
      return NextResponse.json(
        { error: 'project_id, location_id and title are required' },
        { status: 400 }
      )
    }

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
      .from('location_events')
      .insert({
        user_id: user.id,
        project_id,
        location_id,
        title,
        occurs_at,
        description,
        importance,
        key_characters,
        tags,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating location event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update location event
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
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    delete updates.user_id
    delete updates.project_id
    delete updates.location_id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabase
      .from('location_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating location event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (error) {
    console.error('Error in PATCH /api/locations/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE location event
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
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('location_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting location event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/locations/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
