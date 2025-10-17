import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List issues for an analysis
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
    const analysisId = searchParams.get('analysis_id')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const resolved = searchParams.get('resolved')

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('plot_issues')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (resolved !== null) {
      query = query.eq('is_resolved', resolved === 'true')
    }

    const { data, error } = await query

    if (error) throw error

    const severityPriority: Record<string, number> = {
      critical: 1,
      major: 2,
      minor: 3,
      suggestion: 4,
    }

    const sorted = (data || []).sort((a: any, b: any) => {
      const aRank = severityPriority[a.severity] ?? 5
      const bRank = severityPriority[b.severity] ?? 5
      if (aRank !== bRank) return aRank - bRank
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return aTime - bTime
    })

    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Error fetching plot issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}

// PATCH - Update issue (mark resolved, add notes)
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
    const { id, is_resolved, resolution_notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Issue ID required' }, { status: 400 })
    }

    const updates: any = {}

    if (typeof is_resolved === 'boolean') {
      updates.is_resolved = is_resolved
      if (is_resolved) {
        updates.resolved_at = new Date().toISOString()
      } else {
        updates.resolved_at = null
        updates.resolution_notes = null
      }
    }

    if (resolution_notes !== undefined) {
      updates.resolution_notes = resolution_notes
    }

    const { data, error } = await supabase
      .from('plot_issues')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating issue:', error)
    return NextResponse.json(
      { error: 'Failed to update issue' },
      { status: 500 }
    )
  }
}

// DELETE - Delete individual issue
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
      return NextResponse.json({ error: 'Issue ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('plot_issues')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting issue:', error)
    return NextResponse.json(
      { error: 'Failed to delete issue' },
      { status: 500 }
    )
  }
}
