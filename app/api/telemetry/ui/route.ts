import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/monitoring/structured-logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { event, context } = payload as { event?: unknown; context?: unknown }

    if (typeof event !== 'string' || event.trim().length === 0) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    const metadata =
      context && typeof context === 'object'
        ? (context as Record<string, unknown>)
        : undefined

    logger.analytics({
      event,
      userId: user.id,
      metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('UI telemetry logging failed:', error)
    return NextResponse.json({ error: 'Telemetry failed' }, { status: 500 })
  }
}
