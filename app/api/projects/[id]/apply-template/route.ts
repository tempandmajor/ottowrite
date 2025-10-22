/**
 * API Route: Apply Folder Template to Project
 * POST /api/projects/[id]/apply-template
 * TICKET-005: Folder templates
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTemplateById, type TemplateFolder } from '@/lib/binder/folder-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ApplyTemplateRequest {
  templateId: string
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Recursively create folders and documents from template structure
 */
async function createFoldersRecursive(
  supabase: any,
  projectId: string,
  userId: string,
  folders: TemplateFolder[],
  parentFolderId: string | null = null,
  startPosition: number = 0
): Promise<{ count: number; error: Error | null }> {
  let createdCount = 0
  let currentPosition = startPosition

  for (const folder of folders) {
    try {
      // Create the folder/document
      const { data: created, error: createError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          user_id: userId,
          title: folder.title,
          is_folder: true,
          folder_type: folder.type,
          parent_folder_id: parentFolderId,
          position: currentPosition,
          content: null, // Folders cannot have content
          word_count: 0,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating folder:', createError)
        return { count: createdCount, error: createError }
      }

      createdCount++
      currentPosition++

      // Recursively create children
      if (folder.children && folder.children.length > 0) {
        const { count: childCount, error: childError } = await createFoldersRecursive(
          supabase,
          projectId,
          userId,
          folder.children,
          created.id,
          0 // Children start at position 0 within their parent
        )

        if (childError) {
          return { count: createdCount + childCount, error: childError }
        }

        createdCount += childCount
      }
    } catch (error) {
      console.error('Unexpected error creating folder:', error)
      return {
        count: createdCount,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  return { count: createdCount, error: null }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: projectId } = await params

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: ApplyTemplateRequest = await request.json()
    const { templateId } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Get template
    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current highest position in project to append new folders
    const { data: existingDocs, error: positionError } = await supabase
      .from('documents')
      .select('position')
      .eq('project_id', projectId)
      .is('parent_folder_id', null) // Only root-level documents
      .order('position', { ascending: false })
      .limit(1)

    if (positionError) {
      console.error('Error getting position:', positionError)
      return NextResponse.json({ error: 'Failed to determine position' }, { status: 500 })
    }

    const startPosition = existingDocs && existingDocs.length > 0 ? existingDocs[0].position + 1 : 0

    // Create folders from template
    const { count, error: createError } = await createFoldersRecursive(
      supabase,
      projectId,
      user.id,
      template.folders,
      null, // Root level (no parent)
      startPosition
    )

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create folders', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templateId: template.id,
      templateName: template.name,
      foldersCreated: count,
    })
  } catch (error) {
    console.error('Error applying template:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
