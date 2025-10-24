import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePlotHoles, extractTextContent } from '@/lib/ai/plot-analyzer'
import type { AnalysisType } from '@/lib/ai/plot-analyzer'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI analysis

// GET - List analyses for a document
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)
  await requireDefaultRateLimit(request, user.id)

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('document_id')
    const projectId = searchParams.get('project_id')

    if (!documentId && !projectId) {
      return errorResponses.badRequest('Document ID or Project ID required', {
        userId: user.id,
      })
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

    if (error) {
      logger.error('Error fetching plot analyses', {
        userId: user.id,
        documentId: documentId ?? undefined,
        projectId: projectId ?? undefined,
        operation: 'plot_analysis:fetch',
      }, error)
      return errorResponses.internalError('Failed to fetch analyses', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse(data || [])
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in GET /api/plot-analysis', {
      operation: 'plot_analysis:get',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to fetch analyses', { details: error })
  }
}

// POST - Create new analysis
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { document_id, analysis_type = 'full' } = body

    if (!document_id) {
      return errorResponses.badRequest('Document ID required', { userId: user.id })
    }

    // Validate analysis type
    const validTypes: AnalysisType[] = ['full', 'timeline', 'character', 'logic', 'quick']
    if (!validTypes.includes(analysis_type)) {
      return errorResponses.badRequest(
        `Invalid analysis type. Valid types: ${validTypes.join(', ')}`,
        { userId: user.id }
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
      return errorResponses.notFound('Document not found', { userId: user.id })
    }

    // Extract text content
    const textContent = extractTextContent(document.content)

    if (!textContent || textContent.trim().length < 100) {
      return errorResponses.badRequest(
        `Document content too short for analysis (minimum 100 characters, got ${textContent?.length || 0})`,
        { userId: user.id }
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
          logger.error('Error inserting plot issues', {
            userId: user.id,
            analysisId: analysis.id,
            operation: 'plot_analysis:insert_issues',
          }, issuesError)
          // Don't fail the whole request, just log
        }
      }

      // Fetch complete analysis with issues
      const { data: completeAnalysis } = await supabase
        .from('plot_analyses')
        .select('*')
        .eq('id', analysis.id)
        .single()

      return successResponse(completeAnalysis)
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

      logger.error('Plot analysis failed', {
        userId: user.id,
        analysisId: analysis.id,
        documentId: document_id,
        analysisType: analysis_type,
        operation: 'plot_analysis:ai_analysis',
      }, analysisError instanceof Error ? analysisError : undefined)

      throw analysisError
    }
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error creating plot analysis', {
      operation: 'plot_analysis:post',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError(
      error instanceof Error ? error.message : 'Failed to analyze plot',
      { details: error }
    )
  }
}

// DELETE - Delete analysis
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponses.badRequest('Analysis ID required', { userId: user.id })
    }

    const { error } = await supabase
      .from('plot_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting plot analysis', {
        userId: user.id,
        analysisId: id,
        operation: 'plot_analysis:delete',
      }, error)
      return errorResponses.internalError('Failed to delete analysis', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ success: true })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error in DELETE /api/plot-analysis', {
      operation: 'plot_analysis:delete',
    }, error instanceof Error ? error : undefined)
    return errorResponses.internalError('Failed to delete analysis', { details: error })
  }
}
