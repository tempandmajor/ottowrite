import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchWeb, extractCitations } from '@/lib/search/search-service'
import { formatSearchResultsForAI } from '@/lib/search/brave-search'
import { generateWithAI } from '@/lib/ai/service'
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response'
import {requireAuth, handleAuthError} from '@/lib/api/auth-helpers'
import { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are an AI research assistant with real-time web access. When asked a question you:
- Analyze the provided web search results to answer the user's question
- Summarize findings concisely and structure the response for writers
- Always cite sources using [Title](URL) format
- Flag uncertain or conflicting information
- If search results are insufficient, clearly state what additional information would be helpful

Focus on accuracy, relevance, and proper source attribution.`

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null }
  }
  return { supabase, user }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return errorResponses.unauthorized()
    }

    const body = await request.json()
    const {
      query,
      document_id,
      project_id,
      context,
    }: {
      query?: string
      document_id?: string | null
      project_id?: string | null
      context?: string | null
    } = body ?? {}

    if (!query || query.trim().length < 5) {
      return errorResponses.badRequest('Query must be at least 5 characters long', { userId: user.id })
    }

    const { data: requestRecord, error: insertError } = await supabase
      .from('research_requests')
      .insert({
        user_id: user.id,
        document_id: document_id ?? null,
        project_id: project_id ?? null,
        query: query.trim(),
        status: 'queued',
      })
      .select()
      .single()

    if (insertError || !requestRecord) {
      logger.error('Failed to store research request', {
        userId: user.id,
        operation: 'research:create_request',
      }, insertError ?? undefined)
      return errorResponses.internalError('Failed to store research request', {
        details: insertError,
        userId: user.id,
      })
    }

    let updatedRecord = requestRecord

    try {
      // Step 1: Perform web search
      const searchResponse = await searchWeb(query.trim(), user.id, {
        provider: 'brave',
        count: 10,
        saveHistory: true,
        projectId: project_id || undefined,
        documentId: document_id || undefined,
        researchRequestId: requestRecord.id,
      })

      // Step 2: Format search results for AI
      const braveSearchContext = {
        query: searchResponse.query,
        results: searchResponse.results,
        totalResults: searchResponse.totalResults,
        searchMetadata: {
          provider: 'brave' as const,
          query: searchResponse.query,
          ...searchResponse.searchMetadata,
        },
      }
      const searchContext = formatSearchResultsForAI(braveSearchContext)

      // Step 3: Generate AI summary using search results
      const prompt = `USER QUERY: ${query.trim()}

WRITING CONTEXT: ${context || 'Not provided.'}

WEB SEARCH RESULTS:
${searchContext}

Based on the search results above, provide a comprehensive answer to the user's query. Include relevant citations using [Title](URL) format.`

      const aiResponse = await generateWithAI({
        model: 'claude-sonnet-4.5',
        prompt,
        context: SYSTEM_PROMPT,
        maxTokens: 2000,
      })

      // Step 4: Extract citations from search results
      const citations = extractCitations(searchResponse.results)

      // Step 5: Save research note
      const { data: note } = await supabase
        .from('research_notes')
        .insert({
          user_id: user.id,
          document_id: document_id ?? null,
          project_id: project_id ?? null,
          research_request_id: requestRecord.id,
          title: query.trim(),
          content: aiResponse.content,
          sources: citations,
        })
        .select()
        .single()

      // Step 6: Update request status
      const { data: updated } = await supabase
        .from('research_requests')
        .update({
          status: 'succeeded',
          response: {
            content: aiResponse.content,
            searchResults: searchResponse.results.slice(0, 5), // Top 5 results
            totalResults: searchResponse.totalResults,
            provider: searchResponse.provider,
          },
          search_provider: searchResponse.provider,
        })
        .eq('id', requestRecord.id)
        .select()
        .single()

      if (updated) {
        updatedRecord = updated
      }

      return successResponse({
        request: updatedRecord,
        note,
        searchResults: searchResponse.results,
        totalResults: searchResponse.totalResults,
      })
    } catch (error) {
          const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Research execution failed', {
        userId: user.id,
        requestId: requestRecord.id,
        operation: 'research:execute',
      }, error instanceof Error ? error : undefined)

      const { data: failed } = await supabase
        .from('research_requests')
        .update({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
        .eq('id', requestRecord.id)
        .select()
        .single()

      if (failed) {
        updatedRecord = failed
      }

      return errorResponses.internalError('Research failed', {
        details: { error, request: updatedRecord },
        userId: user.id,
      })
    }
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error starting research', {
      operation: 'research:post',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to start research', { details: error, status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return errorResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('document_id')

    const query = supabase
      .from('research_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data, error } = documentId
      ? await query.eq('document_id', documentId)
      : await query.limit(50)

    if (error) {
      logger.error('Failed to fetch research notes', {
        userId: user.id,
        documentId: documentId ?? undefined,
        operation: 'research:fetch_notes',
      }, error)
      return errorResponses.internalError('Failed to fetch research notes', {
        details: error,
        userId: user.id,
      })
    }

    return successResponse({ notes: data ?? [] })
  } catch (error) {
        const authError = handleAuthError(error)
    if (authError) return authError

    logger.error('Error fetching research notes', {
      operation: 'research:get',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to fetch research notes', { details: error, status: 500 })
  }
}
