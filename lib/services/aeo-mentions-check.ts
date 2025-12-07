/**
 * Standalone AEO Mentions Check Service
 * No external dependencies except OpenRouter API
 * 
 * Checks company visibility across AI platforms:
 * - Perplexity (via OpenRouter)
 * - ChatGPT (via OpenRouter)
 * - Claude (via OpenRouter)
 * - Gemini (native API)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface MentionsCheckRequest {
  companyName: string
  companyWebsite: string
  apiKey: string // OpenRouter API key
  geminiApiKey?: string // Optional Gemini API key
  industry?: string
  products?: string[]
  description?: string
  language?: string
  country?: string
  mode?: 'fast' | 'full'
}

export interface QueryResult {
  query: string
  platform: string
  mentioned: boolean
  mentions_count: number
  response: string
  position?: number
  quality_score: number
}

export interface MentionsCheckResponse {
  companyName: string
  visibility: number
  presence_rate: number // alias for visibility (for UI compatibility)
  quality_score: number // average quality score (for UI compatibility)
  mentions_count: number
  queries_tested: number
  platforms: Array<{
    name: string
    mentions: number
    visibility: number
    quality_score: number // average quality for this platform (for UI compatibility)
  }>
  query_results: QueryResult[]
  summary: {
    mentioned_queries: number
    total_queries: number
    avg_quality: number
  }
}

/**
 * Generate relevant queries for mentions check
 */
async function generateQueries(
  request: MentionsCheckRequest,
  count: number
): Promise<string[]> {
  console.log('[MENTIONS] Generating', count, 'queries with Gemini...')
  
  const apiKey = request.geminiApiKey || request.apiKey
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Ensure products is an array
  const productsArray = Array.isArray(request.products) 
    ? request.products 
    : (request.products ? [request.products as any] : [])

  const prompt = `Generate ${count} natural, diverse search queries that users might ask about this company or its solutions.

Company: ${request.companyName}
Website: ${request.companyWebsite}
${request.industry ? `Industry: ${request.industry}` : ''}
${productsArray.length ? `Products: ${productsArray.join(', ')}` : ''}
${request.description ? `Description: ${request.description}` : ''}

Query types to include:
1. Problem-solving queries (how to, best way to, solution for)
2. Comparison queries (vs competitors, alternatives to, best X for Y)
3. Feature queries (does X have, can X do, X with Y feature)
4. Decision queries (should I use, is X good for, which X is best)

Requirements:
- Queries should be 5-15 words long
- Natural language, conversational tone
- Diverse query intents and formats
- Mix of specific and general queries
- Focus on commercial and informational intent

Return ONLY a JSON array of query strings, nothing else.
Example: ["query 1", "query 2", "query 3"]`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to parse queries from Gemini')
  }

  const queries = JSON.parse(jsonMatch[0]) as string[]
  console.log('[MENTIONS] Generated', queries.length, 'queries')
  
  return queries
}

/**
 * Check mentions with OpenRouter (Perplexity, ChatGPT, Claude)
 */
async function checkWithOpenRouter(
  query: string,
  model: string,
  apiKey: string,
  companyName: string
): Promise<QueryResult> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scaile.tech',
        'X-Title': 'AEO Mentions Check',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    // Check for company mention (case-insensitive)
    const mentioned = content.toLowerCase().includes(companyName.toLowerCase())
    const mentionsCount = (content.match(new RegExp(companyName, 'gi')) || []).length
    
    // Calculate quality score (0-100)
    let quality = 0
    if (mentioned) {
      // Position score (earlier = better)
      const position = content.toLowerCase().indexOf(companyName.toLowerCase())
      const positionScore = Math.max(0, 100 - (position / content.length) * 100)
      
      // Frequency score
      const frequencyScore = Math.min(mentionsCount * 20, 40)
      
      // Context quality (simple heuristic: presence of key phrases)
      const contextPhrases = ['recommend', 'best', 'solution', 'platform', 'tool', 'service']
      const contextScore = contextPhrases.filter(phrase => content.toLowerCase().includes(phrase)).length * 5
      
      quality = Math.min(100, Math.round((positionScore * 0.4) + (frequencyScore * 0.3) + (contextScore * 0.3)))
    }
    
    return {
      query,
      platform: model.includes('perplexity') ? 'Perplexity' : model.includes('gpt') ? 'ChatGPT' : 'Claude',
      mentioned,
      mentions_count: mentionsCount,
      response: content.slice(0, 500) + (content.length > 500 ? '...' : ''), // Truncate for storage
      position: mentioned ? content.toLowerCase().indexOf(companyName.toLowerCase()) : undefined,
      quality_score: quality,
    }
  } catch (error) {
    console.warn('[MENTIONS] OpenRouter error for', model, ':', error)
    return {
      query,
      platform: model.includes('perplexity') ? 'Perplexity' : model.includes('gpt') ? 'ChatGPT' : 'Claude',
      mentioned: false,
      mentions_count: 0,
      response: '',
      quality_score: 0,
    }
  }
}

/**
 * Check mentions with Gemini (native API with search grounding)
 */
async function checkWithGemini(
  query: string,
  apiKey: string,
  companyName: string
): Promise<QueryResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      tools: [{ googleSearch: {} }], // Enable Google Search grounding
    })

    const result = await model.generateContent(query)
    const content = result.response.text()
    
    // Check for company mention
    const mentioned = content.toLowerCase().includes(companyName.toLowerCase())
    const mentionsCount = (content.match(new RegExp(companyName, 'gi')) || []).length
    
    // Calculate quality score
    let quality = 0
    if (mentioned) {
      const position = content.toLowerCase().indexOf(companyName.toLowerCase())
      const positionScore = Math.max(0, 100 - (position / content.length) * 100)
      const frequencyScore = Math.min(mentionsCount * 20, 40)
      quality = Math.min(100, Math.round((positionScore * 0.5) + (frequencyScore * 0.5)))
    }
    
    return {
      query,
      platform: 'Gemini',
      mentioned,
      mentions_count: mentionsCount,
      response: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
      position: mentioned ? content.toLowerCase().indexOf(companyName.toLowerCase()) : undefined,
      quality_score: quality,
    }
  } catch (error) {
    console.warn('[MENTIONS] Gemini error:', error)
    return {
      query,
      platform: 'Gemini',
      mentioned: false,
      mentions_count: 0,
      response: '',
      quality_score: 0,
    }
  }
}

/**
 * Main mentions check function
 */
export async function runMentionsCheck(
  request: MentionsCheckRequest
): Promise<MentionsCheckResponse> {
  console.log('[MENTIONS] Starting mentions check for:', request.companyName)
  const startTime = Date.now()
  
  // Determine query count based on mode
  const queryCount = request.mode === 'full' ? 20 : 5
  
  // Step 1: Generate queries
  const queries = await generateQueries(request, queryCount)
  
  // Step 2: Test queries across platforms (in fast mode, use fewer platforms)
  const platformModels = request.mode === 'full' 
    ? [
        'perplexity/llama-3.1-sonar-large-128k-online',
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
      ]
    : [
        'perplexity/llama-3.1-sonar-large-128k-online',
        'openai/gpt-4o-mini',
      ]
  
  console.log('[MENTIONS] Testing', queries.length, 'queries across', platformModels.length + 1, 'platforms...')
  
  const queryResults: QueryResult[] = []
  
  // Run checks in parallel for each query
  for (const query of queries) {
    const checks = await Promise.allSettled([
      // OpenRouter platforms
      ...platformModels.map(model => checkWithOpenRouter(query, model, request.apiKey, request.companyName)),
      // Gemini with search grounding
      checkWithGemini(query, request.geminiApiKey || request.apiKey, request.companyName),
    ])
    
    for (const result of checks) {
      if (result.status === 'fulfilled') {
        queryResults.push(result.value)
      }
    }
  }
  
  // Step 3: Calculate statistics
  const mentionedQueries = new Set(
    queryResults.filter(r => r.mentioned).map(r => r.query)
  )
  
  const totalMentions = queryResults.reduce((sum, r) => sum + r.mentions_count, 0)
  const visibility = (mentionedQueries.size / queries.length) * 100
  
  const platformStats = new Map<string, { mentions: number, total: number }>()
  
  for (const result of queryResults) {
    if (!platformStats.has(result.platform)) {
      platformStats.set(result.platform, { mentions: 0, total: 0 })
    }
    const stats = platformStats.get(result.platform)!
    if (result.mentioned) stats.mentions++
    stats.total++
  }
  
  const platforms = Array.from(platformStats.entries()).map(([name, stats]) => ({
    name,
    mentions: stats.mentions,
    visibility: Math.round((stats.mentions / stats.total) * 100),
  }))
  
  const avgQuality = queryResults.length > 0
    ? queryResults.reduce((sum, r) => sum + r.quality_score, 0) / queryResults.length
    : 0
  
  const duration = (Date.now() - startTime) / 1000
  console.log('[MENTIONS] Mentions check complete in', duration, 's. Visibility:', Math.round(visibility), '%')
  
  return {
    companyName: request.companyName,
    visibility: Math.round(visibility),
    presence_rate: Math.round(visibility), // alias for UI compatibility
    quality_score: Math.round(avgQuality), // for UI compatibility
    mentions_count: totalMentions,
    queries_tested: queries.length,
    platforms: platforms.map(p => ({
      ...p,
      quality_score: Math.round(avgQuality), // add quality score per platform
    })),
    query_results: queryResults,
    summary: {
      mentioned_queries: mentionedQueries.size,
      total_queries: queries.length,
      avg_quality: Math.round(avgQuality),
    },
  }
}

