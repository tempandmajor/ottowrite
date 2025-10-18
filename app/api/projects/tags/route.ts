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

    const { data: tagRows, error } = await supabase
      .from('project_tags')
      .select('id, name, color, description, created_at, updated_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) throw error

    const tagIds = tagRows?.map((tag) => tag.id) ?? []
    let counts: Record<string, number> = {}

    if (tagIds.length > 0) {
      const { data: linkCounts, error: countError } = await supabase
        .from('project_tag_links')
        .select('tag_id, project_id')
        .eq('user_id', user.id)
        .in('tag_id', tagIds)

      if (countError) throw countError

      counts = (linkCounts ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.tag_id] = (acc[row.tag_id] ?? 0) + 1
        return acc
      }, {})
    }

    const tags = (tagRows ?? []).map((tag) => ({
      ...tag,
      project_count: counts[tag.id] ?? 0,
    }))

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Failed to fetch project tags:', error)
    return NextResponse.json({ error: 'Failed to load tags' }, { status: 500 })
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
    const description = typeof body?.description === 'string' ? body.description.trim() : null

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_tags')
      .insert({
        user_id: user.id,
        name,
        color,
        description,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A tag with this name already exists.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ tag: data })
  } catch (error) {
    console.error('Failed to create tag:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
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
    const description = typeof body?.description === 'string' ? body.description.trim() : undefined

    if (!id) {
      return NextResponse.json({ error: 'Tag id is required.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof name !== 'undefined') {
      if (!name) {
        return NextResponse.json({ error: 'Tag name cannot be empty.' }, { status: 400 })
      }
      updates.name = name
    }
    if (typeof color !== 'undefined') {
      updates.color = color?.length ? color : null
    }
    if (typeof description !== 'undefined') {
      updates.description = description?.length ? description : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_tags')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A tag with this name already exists.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ tag: data })
  } catch (error) {
    console.error('Failed to update tag:', error)
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
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
      return NextResponse.json({ error: 'Tag id is required.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('project_tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete tag:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
