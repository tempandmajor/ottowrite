import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { project_id, title } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      )
    }

    // Get the template
    const { data: template, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const templateTitle = title || template.title || template.name

    // Create new document from template
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        title: templateTitle,
        type: template.type,
        content: template.content,
        project_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create document from template' },
        { status: 500 }
      )
    }

    // Increment template usage count
    await supabase.rpc('increment_template_usage', { template_id: id })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error using template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
