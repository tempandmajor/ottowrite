import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('project_folders')
      .select('id, name, color, parent_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ folders: data ?? [] })
  } catch (error) {
    console.error('Failed to fetch project folders:', error)
    return NextResponse.json({ error: 'Failed to load folders' }, { status: 500 })
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
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const color = typeof body?.color === 'string' ? body.color.trim() : null
    const parentId = typeof body?.parent_id === 'string' ? body.parent_id.trim() : null

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required.' }, { status: 400 })
    }

    if (parentId) {
      const { data: parentFolder } = await supabase
        .from('project_folders')
        .select('id')
        .eq('id', parentId)
        .eq('user_id', user.id)
        .single()

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found.' }, { status: 404 })
      }
    }

    const { data, error } = await supabase
      .from('project_folders')
      .insert({
        user_id: user.id,
        name,
        color,
        parent_id: parentId ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ folder: data })
  } catch (error) {
    console.error('Failed to create folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
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
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined
    const color = typeof body?.color === 'string' ? body.color.trim() : undefined
    const parentId = typeof body?.parent_id === 'string' ? body.parent_id.trim() : undefined

    if (!id) {
      return NextResponse.json({ error: 'Folder id is required.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof name === 'string') {
      if (!name) {
        return NextResponse.json({ error: 'Folder name cannot be empty.' }, { status: 400 })
      }
      updates.name = name
    }
    if (typeof color !== 'undefined') {
      updates.color = color && color.length > 0 ? color : null
    }
    if (typeof parentId !== 'undefined') {
      if (parentId === id) {
        return NextResponse.json({ error: 'Folder cannot be its own parent.' }, { status: 400 })
      }
      if (parentId) {
        const { data: parentFolder } = await supabase
          .from('project_folders')
          .select('id')
          .eq('id', parentId)
          .eq('user_id', user.id)
          .single()

        if (!parentFolder) {
          return NextResponse.json({ error: 'Parent folder not found.' }, { status: 404 })
        }
        updates.parent_id = parentId
      } else {
        updates.parent_id = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_folders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ folder: data })
  } catch (error) {
    console.error('Failed to update folder:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
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
    const id = searchParams.get('id')?.trim()

    if (!id) {
      return NextResponse.json({ error: 'Folder id is required.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('project_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete folder:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
