import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List available beat templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const suitableFor = searchParams.get('suitable_for')

    const typeAliases: Record<string, string[]> = {
      series: ['series', 'novel'],
    }

    const filterValues = suitableFor
      ? Array.from(new Set([suitableFor, ...(typeAliases[suitableFor] || []), 'general'].filter(Boolean)))
      : null

    let query = supabase
      .from('beat_templates')
      .select('*')
      .eq('is_public', true)
      .order('total_beats', { ascending: true })

    if (filterValues && filterValues.length > 0) {
      query = query.overlaps('suitable_for', filterValues)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching beat templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch beat templates' },
      { status: 500 }
    )
  }
}
