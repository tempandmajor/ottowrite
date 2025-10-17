import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List arc stages for a character
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

    const { data: arcStages, error } = await supabase
      .from('character_arcs')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', user.id)
      .order('stage_order', { ascending: true })

    if (error) {
      console.error('Error fetching arc stages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ arcStages })
  } catch (error) {
    console.error('Error in GET /api/characters/arcs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new arc stage
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
      character_id,
      stage_name,
      stage_order,
      description,
      location,
      chapter_scene,
      page_number,
      emotional_state,
      beliefs,
      relationships_status,
      is_completed = false,
      notes,
      metadata,
    } = body

    if (!character_id || !stage_name || stage_order === undefined) {
      return NextResponse.json(
        { error: 'character_id, stage_name, and stage_order are required' },
        { status: 400 }
      )
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, user_id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const { data: arcStage, error } = await supabase
      .from('character_arcs')
      .insert({
        user_id: user.id,
        character_id,
        stage_name,
        stage_order,
        description,
        location,
        chapter_scene,
        page_number,
        emotional_state,
        beliefs,
        relationships_status,
        is_completed,
        notes,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating arc stage:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ arcStage }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters/arcs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update an arc stage
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
      return NextResponse.json({ error: 'Arc stage id is required' }, { status: 400 })
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id
    delete updates.character_id
    delete updates.created_at
    delete updates.updated_at

    const { data: arcStage, error } = await supabase
      .from('character_arcs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating arc stage:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!arcStage) {
      return NextResponse.json({ error: 'Arc stage not found' }, { status: 404 })
    }

    return NextResponse.json({ arcStage })
  } catch (error) {
    console.error('Error in PATCH /api/characters/arcs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete an arc stage
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
      return NextResponse.json({ error: 'Arc stage id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('character_arcs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting arc stage:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/arcs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
