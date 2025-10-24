import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('beat_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) throw error

    return NextResponse.json({ cards: data ?? [] })
  } catch (error) {
    console.error('Error fetching beat cards:', error)
    return NextResponse.json({ error: 'Failed to fetch beat board' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { project_id, title, description, beat_type, color, position } = body ?? {}

    if (!project_id || !title) {
      return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('beat_cards')
      .insert({
        user_id: user.id,
        project_id,
        title: title.trim(),
        description: description ?? null,
        beat_type: beat_type ?? 'A',
        color: color ?? 'neutral',
        position: position ?? Date.now(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ card: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating beat card:', error)
    return NextResponse.json({ error: 'Failed to create beat card' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const body = await request.json()
    const { id, ...updates } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const sanitized = { ...updates }
    delete sanitized.user_id
    delete sanitized.project_id
    delete sanitized.created_at
    delete sanitized.updated_at

    const { data, error } = await supabase
      .from('beat_cards')
      .update(sanitized)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ card: data })
  } catch (error) {
    console.error('Error updating beat card:', error)
    return NextResponse.json({ error: 'Failed to update beat card' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
    await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('beat_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting beat card:', error)
    return NextResponse.json({ error: 'Failed to delete beat card' }, { status: 500 })
  }
}
