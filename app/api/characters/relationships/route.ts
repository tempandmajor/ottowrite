import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List relationships for a project or character
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
    const characterId = searchParams.get('character_id')

    if (!projectId && !characterId) {
      return NextResponse.json(
        { error: 'project_id or character_id is required' },
        { status: 400 }
      )
    }

    if (characterId) {
      // Get relationships for a specific character using the RPC function
      const { data: relationships, error } = await supabase.rpc('get_character_relationships', {
        p_character_id: characterId,
      })

      if (error) {
        console.error('Error fetching character relationships:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ relationships })
    } else {
      // Get all relationships for a project
      const { data: relationships, error } = await supabase
        .from('character_relationships')
        .select(`
          *,
          character_a:characters!character_relationships_character_a_id_fkey(id, name, role),
          character_b:characters!character_relationships_character_b_id_fkey(id, name, role)
        `)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching project relationships:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ relationships })
    }
  } catch (error) {
    console.error('Error in GET /api/characters/relationships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new relationship
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
      character_a_id,
      character_b_id,
      relationship_type,
      description,
      strength = 5,
      is_positive = true,
      status = 'current',
      starts_at,
      ends_at,
      key_moments,
      notes,
      metadata,
    } = body

    if (!project_id || !character_a_id || !character_b_id || !relationship_type) {
      return NextResponse.json(
        { error: 'project_id, character_a_id, character_b_id, and relationship_type are required' },
        { status: 400 }
      )
    }

    if (character_a_id === character_b_id) {
      return NextResponse.json(
        { error: 'Cannot create relationship with the same character' },
        { status: 400 }
      )
    }

    // Verify both characters belong to user and project
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id')
      .in('id', [character_a_id, character_b_id])
      .eq('project_id', project_id)
      .eq('user_id', user.id)

    if (charError || !characters || characters.length !== 2) {
      return NextResponse.json({ error: 'Characters not found' }, { status: 404 })
    }

    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .insert({
        user_id: user.id,
        project_id,
        character_a_id,
        character_b_id,
        relationship_type,
        description,
        strength,
        is_positive,
        status,
        starts_at,
        ends_at,
        key_moments,
        notes,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ relationship }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters/relationships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a relationship
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
      return NextResponse.json({ error: 'Relationship id is required' }, { status: 400 })
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id
    delete updates.project_id
    delete updates.character_a_id
    delete updates.character_b_id
    delete updates.created_at
    delete updates.updated_at

    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    return NextResponse.json({ relationship })
  } catch (error) {
    console.error('Error in PATCH /api/characters/relationships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a relationship
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
      return NextResponse.json({ error: 'Relationship id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('character_relationships')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/relationships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
