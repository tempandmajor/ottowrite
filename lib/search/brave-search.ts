/**
 * Brave Search API Integration
 * Provides real-time web search with clean results
 */

export type BraveSearchResult = {
  title: string
  url: string
  description: string
  age?: string
  language?: string
  favicon?: string
}

export type BraveSearchResponse = {
  query: string
  results: BraveSearchResult[]
  totalResults: number
  searchMetadata: {
    provider: 'brave'
    query: string
    freshness?: string
    country?: string
    language?: string
    safeSearch?: boolean
  }
}

/**
 * Search the web using Brave Search API
 */
export async function searchWithBrave(
  query: string,
  options: {
    count?: number
    freshness?: 'pd' | 'pw' | 'pm' | 'py' // past day/week/month/year
    country?: string
    language?: string
    safeSearch?: boolean
  } = {}
): Promise<BraveSearchResponse> {
  const {
    count = 10,
    freshness,
    country = 'US',
    language = 'en',
    safeSearch = true,
  } = options

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    throw new Error('BRAVE_SEARCH_API_KEY is not configured')
  }

  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
    country,
    search_lang: language,
    safesearch: safeSearch ? 'strict' : 'off',
  })

  if (freshness) {
    params.append('freshness', freshness)
  }

  const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Parse Brave's response format
  const results: BraveSearchResult[] = (data.web?.results || []).map((result: any) => ({
    title: result.title || '',
    url: result.url || '',
    description: result.description || '',
    age: result.age,
    language: result.language,
    favicon: result.profile?.img,
  }))

  return {
    query,
    results,
    totalResults: data.web?.results?.length || 0,
    searchMetadata: {
      provider: 'brave',
      query,
      freshness,
      country,
      language,
      safeSearch,
    },
  }
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(response: BraveSearchResponse): string {
  const { query, results } = response

  if (results.length === 0) {
    return `No search results found for: "${query}"`
  }

  const formatted = results
    .slice(0, 10) // Limit to top 10 for context size
    .map((result, index) => {
      return `[${index + 1}] ${result.title}
URL: ${result.url}
${result.description}
${result.age ? `Age: ${result.age}` : ''}`
    })
    .join('\n\n')

  return `Search results for: "${query}"\n\n${formatted}`
}

/**
 * Extract source citations from search results
 */
export function extractSourceCitations(results: BraveSearchResult[]): Array<{
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
