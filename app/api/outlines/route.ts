import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateOutline } from '@/lib/ai/outline-generator'
import type { OutlineSection as GeneratedOutlineSection } from '@/lib/ai/outline-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI generation

const mapSectionsForDb = (
  sections: GeneratedOutlineSection[] | undefined,
  outlineId: string,
  userId: string
) => {
  if (!sections || sections.length === 0) return []

  return sections.map((section, index) => ({
    outline_id: outlineId,
    user_id: userId,
    parent_id: null,
    order_position:
      typeof section.order === 'number' && !Number.isNaN(section.order)
        ? section.order
        : index + 1,
    title: section.title || `Section ${index + 1}`,
    description: section.description ?? null,
    notes: section.notes ?? null,
    word_count_target: section.wordCountTarget ?? null,
    page_count_target: section.pageCountTarget ?? null,
    metadata: {
      type: section.type,
      characters: section.characters ?? [],
      locations: section.locations ?? [],
      plotPoints: section.plotPoints ?? [],
    },
  }))
}

// GET - List outlines for a project
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
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('outlines')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching outlines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outlines' },
      { status: 500 }
    )
  }
}

// POST - Generate new outline using AI
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
    const { project_id, premise, format, additional_context, existing_content } = body

    if (!project_id || !premise || !format) {
      return NextResponse.json(
        { error: 'Project ID, premise, and format are required' },
        { status: 400 }
      )
    }

    // Validate format
    const validFormats = ['chapter_summary', 'scene_by_scene', 'treatment', 'beat_outline', 'custom']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format' },
        { status: 400 }
      )
    }

    // Get project details for context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Generate outline using Claude 4.5
    const generatedContent = await generateOutline({
      premise,
      format,
      projectType: project.type,
      genre: project.genre,
      additionalContext: additional_context,
      existingContent: existing_content,
    })

    // Create outline record
    const { data: outline, error: createError } = await supabase
      .from('outlines')
      .insert({
        user_id: user.id,
        project_id,
        title: generatedContent.title || `${format.replace('_', ' ')} Outline`,
        format,
        premise,
        content: generatedContent.sections,
        metadata: {
          project_type: project.type,
          project_genre: project.genre,
          additional_context,
          generated_at: new Date().toISOString(),
          model: generatedContent.model || 'claude-4.5',
        },
      })
      .select()
      .single()

    if (createError) throw createError

    const sectionsForDb = mapSectionsForDb(generatedContent.sections, outline.id, user.id)

    if (sectionsForDb.length > 0) {
      const { error: sectionsError } = await supabase
        .from('outline_sections')
        .insert(sectionsForDb)

      if (sectionsError) {
        console.error('Error inserting outline sections:', sectionsError)
        // Clean up the outline record to avoid inconsistency
        await supabase.from('outlines').delete().eq('id', outline.id).eq('user_id', user.id)
        throw new Error('Failed to store outline sections')
      }
    }

    return NextResponse.json(outline)
  } catch (error) {
    console.error('Error generating outline:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate outline' },
      { status: 500 }
    )
  }
}

// PATCH - Update outline
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Outline ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('outlines')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    if (updates.content && Array.isArray(updates.content)) {
      const sectionsForDb = mapSectionsForDb(
        updates.content as GeneratedOutlineSection[],
        id,
        user.id
      )

      const { error: deleteError } = await supabase
        .from('outline_sections')
        .delete()
        .eq('outline_id', id)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error clearing outline sections:', deleteError)
        throw new Error('Failed to update outline sections')
      }

      if (sectionsForDb.length > 0) {
        const { error: insertError } = await supabase
          .from('outline_sections')
          .insert(sectionsForDb)

        if (insertError) {
          console.error('Error inserting outline sections:', insertError)
          throw new Error('Failed to update outline sections')
        }
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating outline:', error)
    return NextResponse.json(
      { error: 'Failed to update outline' },
      { status: 500 }
    )
  }
}

// DELETE - Delete outline
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
      return NextResponse.json({ error: 'Outline ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('outlines')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting outline:', error)
    return NextResponse.json(
      { error: 'Failed to delete outline' },
      { status: 500 }
    )
  }
}
