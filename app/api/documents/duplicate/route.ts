import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    const { documentId, newTitle } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Get the original document
    const { data: originalDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Create duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        project_id: originalDoc.project_id,
        title: newTitle || `${originalDoc.title} (Copy)`,
        type: originalDoc.type,
        content: originalDoc.content,
        word_count: originalDoc.word_count,
        position: originalDoc.position + 1,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({ document: duplicate })
  } catch (error) {
    console.error('Document duplication error:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate document' },
      { status: 500 }
    )
  }
}
