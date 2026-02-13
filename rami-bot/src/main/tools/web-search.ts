import { getSetting } from '../settings'

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

export interface SearchResponse {
  success: boolean
  results?: SearchResult[]
  error?: string
}

export async function webSearch(
  query: string,
  maxResults: number = 5
): Promise<SearchResponse> {
  const apiKey = await getSetting('tavilyApiKey')
  
  if (!apiKey) {
    return { 
      success: false, 
      error: 'Tavily API key not configured. Please add it in settings.' 
    }
  }

  try {
    console.log('[WebSearch] Searching for:', query)
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(maxResults, 10),
        include_answer: false,
        include_raw_content: false,
        search_depth: 'basic'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Tavily API error: ${error}`)
    }

    const data = await response.json()
    
    const results: SearchResult[] = data.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score
    }))

    console.log('[WebSearch] Found', results.length, 'results')
    
    return { success: true, results }
  } catch (error: any) {
    console.error('[WebSearch] Error:', error.message)
    return { success: false, error: error.message }
  }
}
