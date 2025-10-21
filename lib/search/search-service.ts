/**
 * Unified Web Search Service
 * Handles web search with multiple providers and history tracking
 */

import { createClient } from '@/lib/supabase/server'
import { searchWithBrave, type BraveSearchResponse } from './brave-search'

export type SearchProvider = 'brave' | 'serpapi'

export type SearchOptions = {
  provider?: SearchProvider
  count?: number
  freshness?: 'pd' | 'pw' | 'pm' | 'py'
  country?: string
  language?: string
  safeSearch?: boolean
  saveHistory?: boolean
  projectId?: string
  documentId?: string
  researchRequestId?: string
}

export type SearchResult = {
  title: string
  url: string
  description: string
  age?: string
  language?: string
  favicon?: string
}

export type SearchResponse = {
  query: string
  results: SearchResult[]
  totalResults: number
  provider: SearchProvider
  searchMetadata: Record<string, any>
  historyId?: string
}

/**
 * Search the web with automatic provider selection
 */
export async function searchWeb(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const {
    provider = 'brave',
    saveHistory = true,
    projectId,
    documentId,
    researchRequestId,
    ...searchOptions
  } = options

  let searchResponse: BraveSearchResponse

  // Execute search based on provider
  switch (provider) {
    case 'brave':
      searchResponse = await searchWithBrave(query, searchOptions)
      break
    case 'serpapi':
      throw new Error('SerpAPI integration not yet implemented')
    default:
      throw new Error(`Unsupported search provider: ${provider}`)
  }

  const response: SearchResponse = {
    query,
    results: searchResponse.results,
    totalResults: searchResponse.totalResults,
    provider,
    searchMetadata: searchResponse.searchMetadata,
  }

  // Save to search history if requested
  if (saveHistory) {
    const historyId = await saveSearchHistory(
      userId,
      query,
      provider,
      searchResponse.results,
      searchResponse.totalResults,
      searchResponse.searchMetadata,
      {
        projectId,
        documentId,
        researchRequestId,
      }
    )
    response.historyId = historyId
  }

  return response
}

/**
 * Save search to history
 */
async function saveSearchHistory(
  userId: string,
  query: string,
  provider: SearchProvider,
  results: SearchResult[],
  resultCount: number,
  metadata: Record<string, any>,
  context: {
    projectId?: string
    documentId?: string
    researchRequestId?: string
  }
): Promise<string | undefined> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        project_id: context.projectId || null,
        document_id: context.documentId || null,
        research_request_id: context.researchRequestId || null,
        query,
        provider,
        results,
        result_count: resultCount,
        search_metadata: metadata,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to save search history:', error)
      return undefined
    }

    return data?.id
  } catch (error) {
    console.error('Error saving search history:', error)
    return undefined
  }
}

/**
 * Get search history for a user
 */
export async function getSearchHistory(
  userId: string,
  options: {
    projectId?: string
    documentId?: string
    limit?: number
  } = {}
): Promise<Array<{
  id: string
  query: string
  provider: SearchProvider
  results: SearchResult[]
  resultCount: number
  createdAt: string
}>> {
  const supabase = await createClient()
  const { projectId, documentId, limit = 50 } = options

  let query = supabase
    .from('search_history')
    .select('id, query, provider, results, result_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (documentId) {
    query = query.eq('document_id', documentId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch search history:', error)
    return []
  }

  return (
    data?.map((row) => ({
      id: row.id,
      query: row.query,
      provider: row.provider as SearchProvider,
      results: row.results as SearchResult[],
      resultCount: row.result_count,
      createdAt: row.created_at,
    })) || []
  )
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No results found.'
  }

  return results
    .map((result, index) => {
      return `**${index + 1}. [${result.title}](${result.url})**\n${result.description}`
    })
    .join('\n\n')
}

/**
 * Extract citations from search results
 */
export function extractCitations(results: SearchResult[]): Array<{
  title: string
  url: string
  description: string
}> {
  return results.map((result) => ({
    title: result.title,
    url: result.url,
    description: result.description,
  }))
}
