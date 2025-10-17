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

    // Get the original document
    const { data: originalDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Create duplicate with "(Copy)" suffix
    const { data: duplicate, error: createError } = await supabase
      .from('documents')
      .insert({
        title: `${originalDoc.title} (Copy)`,
        type: originalDoc.type,
        content: originalDoc.content,
        project_id: originalDoc.project_id,
        user_id: user.id,
        word_count: originalDoc.word_count,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to duplicate document' },
        { status: 500 }
      )
    }

    return NextResponse.json(duplicate)
  } catch (error) {
    console.error('Error duplicating document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
