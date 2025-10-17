import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePlotHoles, extractTextContent } from '@/lib/ai/plot-analyzer'
import type { AnalysisType } from '@/lib/ai/plot-analyzer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI analysis

// GET - List analyses for a document
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
    const documentId = searchParams.get('document_id')
    const projectId = searchParams.get('project_id')

    if (!documentId && !projectId) {
      return NextResponse.json(
        { error: 'Document ID or Project ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('plot_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (documentId) {
      query = query.eq('document_id', documentId)
    } else if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching plot analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

// POST - Create new analysis
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
    const { document_id, analysis_type = 'full' } = body

    if (!document_id) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      )
    }

    // Validate analysis type
    const validTypes: AnalysisType[] = ['full', 'timeline', 'character', 'logic', 'quick']
    if (!validTypes.includes(analysis_type)) {
      return NextResponse.json(
        { error: 'Invalid analysis type' },
        { status: 400 }
      )
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Extract text content
    const textContent = extractTextContent(document.content)

    if (!textContent || textContent.trim().length < 100) {
      return NextResponse.json(
        { error: 'Document content too short for analysis (minimum 100 characters)' },
        { status: 400 }
      )
    }

    // Create analysis record with pending status
    const { data: analysis, error: createError } = await supabase
      .from('plot_analyses')
      .insert({
        user_id: user.id,
        document_id: document.id,
        project_id: document.project_id,
        analysis_type,
        status: 'analyzing',
        content_snapshot: document.content,
        word_count: textContent.split(/\s+/).length,
      })
      .select()
      .single()

    if (createError) throw createError

    try {
      // Perform AI analysis
      const analysisResult = await analyzePlotHoles({
        content: textContent,
        analysisType: analysis_type,
        projectType: document.type,
      })

      // Update analysis with results
      const { error: updateError } = await supabase
        .from('plot_analyses')
        .update({
          status: 'completed',
          summary: analysisResult.summary,
          issues: analysisResult.issues,
          metadata: {
            model: analysisResult.model,
            issue_count: analysisResult.issues.length,
          },
        })
        .eq('id', analysis.id)

      if (updateError) throw updateError

      // Insert individual issues
      if (analysisResult.issues.length > 0) {
        const issuesForDb = analysisResult.issues.map((issue) => ({
          analysis_id: analysis.id,
          user_id: user.id,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          location: issue.location || null,
          line_reference: issue.lineReference || null,
          suggestion: issue.suggestion || null,
        }))

        const { error: issuesError } = await supabase
          .from('plot_issues')
          .insert(issuesForDb)

        if (issuesError) {
          console.error('Error inserting issues:', issuesError)
          // Don't fail the whole request, just log
        }
      }

      // Fetch complete analysis with issues
      const { data: completeAnalysis } = await supabase
        .from('plot_analyses')
        .select('*')
        .eq('id', analysis.id)
        .single()

      return NextResponse.json(completeAnalysis)
    } catch (analysisError) {
      // Mark analysis as failed
      await supabase
        .from('plot_analyses')
        .update({
          status: 'failed',
          metadata: {
            error: analysisError instanceof Error ? analysisError.message : 'Unknown error',
          },
        })
        .eq('id', analysis.id)

      throw analysisError
    }
  } catch (error) {
    console.error('Error creating plot analysis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze plot' },
      { status: 500 }
    )
  }
}

// DELETE - Delete analysis
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
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('plot_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting analysis:', error)
    return NextResponse.json(
      { error: 'Failed to delete analysis' },
      { status: 500 }
    )
  }
}
