import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    let query = supabase
      .from('document_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    const templates = (data || []).map((template) => ({
      ...template,
      title: template.title ?? template.name ?? 'Untitled Document',
    }))

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Template list error:', error)
    return NextResponse.json(
      { error: 'Failed to load templates' },
      { status: 500 }
    )
  }
}

// POST - Create template from document
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
    const { name, title, description, type, category, content } = body
    const templateTitle = title || name

    if (!templateTitle || !type || !category || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let insertPayload: Record<string, unknown> = {
      description,
      type,
      category,
      content,
      created_by: user.id,
      is_official: false,
    }

    // Prefer the title column, but fall back to name if necessary
    let usesTitleColumn = true
    const { error: titleColumnError } = await supabase
      .from('document_templates')
      .select('title')
      .limit(1)

    if (titleColumnError && titleColumnError.code === '42703') {
      usesTitleColumn = false
    }

    insertPayload = usesTitleColumn
      ? { ...insertPayload, title: templateTitle }
      : { ...insertPayload, name: templateTitle }

    const { data: template, error } = await supabase
      .from('document_templates')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('Template creation error:', error)
      return NextResponse.json(
        { error: error.message ?? 'Failed to create template' },
        { status: 400 }
      )
    }

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      console.warn('refresh_user_plan_usage failed after template insert', refreshError)
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
