import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const { error } = await supabase.from('autosave_failures').insert({
      user_id: user.id,
      document_id: body.document_id,
      failure_type: body.failure_type,
      error_message: body.error_message,
      client_hash: body.client_hash,
      server_hash: body.server_hash,
      retry_count: body.retry_count ?? 0,
      user_agent: body.user_agent,
      content_preview: body.content_preview,
    })

    if (error) {
      console.error('Failed to log autosave failure:', error)
      return NextResponse.json({ error: 'Failed to log failure' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing autosave failure log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
