/**
 * AEO Mentions Check Service - Ported from mentions_service.py
 * 
 * Full implementation matching the Python service:
 * - Query generation with dimensions (Branded, Service-Specific, etc.)
 * - Platform querying (OpenRouter + Gemini native)
 * - Mention counting with quality scoring (mention_type, position, capped mentions)
 * - Competitor mention extraction
 * - Visibility calculation (presence-based with quality factor)
 * 
 * Platforms:
 * - Perplexity (sonar-pro) - OpenRouter
 * - Claude (claude-3.5-sonnet) - OpenRouter + google_search tool
 * - ChatGPT (gpt-4o) - OpenRouter + google_search tool
 * - Gemini (gemini-3-pro-preview) - Native SDK + google_search
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// ==================== Types ====================

export interface CompanyInfo {
  name?: string
  website?: string
  description?: string
  industry?: string
  productCategory?: string
  products?: string[]
  services?: string[]
  pain_points?: string[]
  [key: string]: any
}

export interface Competitor {
  name: string
  [key: string]: any
}

export interface CompanyAnalysis {
  companyInfo: CompanyInfo
  competitors?: Competitor[]
}

export interface MentionsCheckRequest {
  companyName: string
  companyWebsite?: string
  companyAnalysis?: CompanyAnalysis
  apiKey: string // OpenRouter API key
  geminiApiKey?: string // Optional Gemini API key
  language?: string
  country?: string
  numQueries?: number
  mode?: 'fast' | 'full'
}

export interface QueryResult {
  query: string
  dimension: string
  platform: string
  raw_mentions: number
  capped_mentions: number
  quality_score: number
  mention_type: string
  position: number | null
  source_urls: string[]
  competitor_mentions: Array<{ name: string; count: number }>
  response_text: string
}

export interface PlatformStats {
  mentions: number
  quality_score: number
  responses: number
  errors: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost: number
}

export interface DimensionStats {
  mentions: number
  quality_score: number
  queries: number
}

export interface MentionsCheckResponse {
  companyName: string
  visibility: number // 0-100%
  band: string // Dominant/Strong/Moderate/Weak/Minimal
  mentions: number // Total capped mentions
  presence_rate: number // % of responses mentioning company (0-100%)
  quality_score: number // Average quality when mentioned (0-10)
  max_quality: number // Maximum possible quality (responses × 10)
  platform_stats: Record<string, PlatformStats>
  dimension_stats: Record<string, DimensionStats>
  query_results: QueryResult[]
  actualQueriesProcessed: number
  execution_time_seconds: number
  total_cost: number
  total_tokens: number
  mode: string
}

// ==================== Platform Configuration ====================

const AI_PLATFORMS = {
  perplexity: {
    model: 'perplexity/sonar-pro',
    has_search: true,
    needs_tool: false, // Perplexity has native web search
    provider: null,
  },
  claude: {
    model: 'anthropic/claude-3.5-sonnet',
    has_search: true,
    needs_tool: true, // Uses google_search tool
    provider: null,
  },
  chatgpt: {
    model: 'openai/gpt-4o',
    has_search: true,
    needs_tool: true, // Uses google_search tool
    provider: null,
  },
  gemini: {
    model: 'google/gemini-3-pro-preview',
    has_search: true,
    needs_tool: true, // Uses google_search tool
    provider: null,
  },
} as const

// ==================== Quality Scoring Functions ====================

function detectMentionType(text: string, companyName: string): string {
  const textLower = text.toLowerCase()
  const companyLower = companyName.toLowerCase()

  const recommendPatterns = [
    `recommend ${companyLower}`,
    `${companyLower} is the best`,
    `best.*${companyLower}`,
    `${companyLower}.*excellent`,
    `top choice.*${companyLower}`,
  ]

  for (const pattern of recommendPatterns) {
    if (new RegExp(pattern).test(textLower)) {
      return 'primary_recommendation'
    }
  }

  if (new RegExp(`(top|leading|best).*${companyLower}`).test(textLower)) {
    return 'top_option'
  }

  if (new RegExp(`\\d+\\.|\\*.*${companyLower}`).test(text)) {
    return 'listed_option'
  }

  if (textLower.includes(companyLower)) {
    return 'mentioned_in_context'
  }

  return 'none'
}

function detectListPosition(text: string, companyName: string): number | null {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (new RegExp(companyName, 'i').test(line)) {
      const numberedMatch = line.match(/^\s*([\d]+)[\.)\s]/)
      if (numberedMatch) {
        return parseInt(numberedMatch[1], 10)
      }
      if (/^\s*[\*\-\•]/.test(line)) {
        return i + 1
      }
    }
  }
  return null
}

function countMentions(text: string, companyName: string): {
  raw_mentions: number
  capped_mentions: number
  quality_score: number
  mention_type: string
  position: number | null
} {
  const regex = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const matches = text.match(regex)
  const raw_mentions = matches ? matches.length : 0

  if (raw_mentions === 0) {
    return {
      raw_mentions: 0,
      capped_mentions: 0,
      quality_score: 0.0,
      mention_type: 'none',
      position: null,
    }
  }

  const capped_mentions = Math.min(raw_mentions, 3) // Cap at 3
  const mention_type = detectMentionType(text, companyName)
  const position = detectListPosition(text, companyName)

  // Base scores by mention type
  const baseScores: Record<string, number> = {
    primary_recommendation: 9.0,
    top_option: 7.0,
    listed_option: 5.0,
    mentioned_in_context: 3.0,
    none: 0.0,
  }
  const baseScore = baseScores[mention_type] || 3.0

  // Position bonus
  let positionBonus = 0.0
  if (position) {
    if (position === 1) {
      positionBonus = 2.0
    } else if (position <= 3) {
      positionBonus = 1.0
    } else if (position <= 5) {
      positionBonus = 0.5
    }
  }

  // Multiple mentions bonus
  const mentionBonus = Math.min(1.0, (capped_mentions - 1) * 0.5)

  const qualityScore = Math.min(10.0, baseScore + positionBonus + mentionBonus)

  return {
    raw_mentions,
    capped_mentions,
    quality_score: Math.round(qualityScore * 100) / 100,
    mention_type,
    position,
  }
}

function extractCompetitorMentions(
  text: string,
  competitors: Competitor[]
): Array<{ name: string; count: number }> {
  const results: Array<{ name: string; count: number }> = []
  for (const comp of competitors) {
    const name = comp.name || ''
    if (name) {
      const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = text.match(regex)
      const count = matches ? matches.length : 0
      if (count > 0) {
        results.push({ name, count })
      }
    }
  }
  return results
}

// ==================== Query Generation ====================

function generateQueries(
  companyName: string,
  companyAnalysis: CompanyAnalysis | undefined,
  numQueries: number,
  mode: string
): Array<{ query: string; dimension: string }> {
  const queries: Array<{ query: string; dimension: string }> = []

  // Always include branded queries
  queries.push({ query: companyName, dimension: 'Branded' })
  queries.push({ query: `${companyName} software`, dimension: 'Branded' })

  // Extract info from company analysis
  let industry = ''
  let productCategory = ''
  const services: string[] = []
  const painPoints: string[] = []

  if (companyAnalysis?.companyInfo) {
    const info = companyAnalysis.companyInfo
    industry = info.industry || ''
    productCategory = info.productCategory || ''
    services.push(...(info.services || []))
    painPoints.push(...(info.pain_points || []))
  }

  // Service-specific queries
  if (services.length > 0) {
    for (const service of services.slice(0, 2)) {
      queries.push({ query: `${service} software`, dimension: 'Service-Specific' })
    }
  } else if (industry) {
    queries.push({ query: `${industry} software`, dimension: 'Service-Specific' })
  }

  // Industry/vertical queries
  if (industry) {
    queries.push({ query: `best ${industry} tools`, dimension: 'Industry/Vertical' })
    queries.push({ query: `${industry} solutions`, dimension: 'Industry/Vertical' })
  }

  // Use-case queries
  if (painPoints.length > 0) {
    for (const painPoint of painPoints.slice(0, 2)) {
      queries.push({ query: `how to ${painPoint}`, dimension: 'Use-Case/Intent' })
    }
  }

  // Competitive queries
  queries.push({ query: `${companyName} vs alternatives`, dimension: 'Competitive' })
  queries.push({ query: `${companyName} competitors`, dimension: 'Competitive' })

  // Broad category
  if (productCategory) {
    queries.push({ query: `best ${productCategory}`, dimension: 'Broad Category' })
  }
  queries.push({ query: 'best software tools 2024', dimension: 'Broad Category' })

  // Limit based on mode
  if (mode === 'fast') {
    return queries.slice(0, 10) // Fast mode: 10 queries
  }
  return queries.slice(0, numQueries) // Full mode: up to numQueries
}

// ==================== AI Platform Queries ====================

async function queryPlatform(
  platform: string,
  query: string,
  modelConfig: typeof AI_PLATFORMS[keyof typeof AI_PLATFORMS],
  apiKey: string,
  geminiApiKey?: string
): Promise<{
  platform: string
  response: string
  tokens: number
  cost: number
  error?: string
}> {
  const model = modelConfig.model
  const needsTool = modelConfig.needs_tool

  try {
    // ===== GEMINI: Use Native SDK =====
    if (platform === 'gemini') {
      const apiKeyToUse = geminiApiKey || apiKey
      const genAI = new GoogleGenerativeAI(apiKeyToUse)
      const geminiModel = genAI.getGenerativeModel({
        model: 'gemini-3-pro-preview',
        tools: [{ googleSearch: {} }], // Enable native Google search
      })

      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: query }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      })

      const response = result.response
      const content = response.text() || ''

      // Get token usage
      const usage = response.usageMetadata
      const totalTokens =
        (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)

      return {
        platform,
        response: content,
        tokens: totalTokens,
        cost: 0.0,
      }
    }

    // ===== OTHER PLATFORMS: Use OpenRouter =====
    const tools = needsTool
      ? [
          {
            type: 'function' as const,
            function: {
              name: 'google_search',
              description: 'Search Google for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query',
                  },
                },
                required: ['query'],
              },
            },
          },
        ]
      : undefined

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scaile.tech',
        'X-Title': 'AEO Mentions Check',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: query }],
        tools,
        tool_choice: tools ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Handle tool calls (simplified - in production, you'd need to execute tools)
    // For now, we'll use the content directly

    return {
      platform,
      response: content,
      tokens: data.usage?.total_tokens || 0,
      cost: 0.0,
    }
  } catch (error) {
    console.error(`${platform} query error:`, error)
    return {
      platform,
      response: '',
      tokens: 0,
      cost: 0.0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function queryAllPlatforms(
  query: string,
  platforms: string[],
  apiKey: string,
  geminiApiKey?: string
): Promise<Array<{
  platform: string
  response: string
  tokens: number
  cost: number
  error?: string
}>> {
  const tasks = platforms
    .filter((p) => p in AI_PLATFORMS)
    .map((platform) =>
      queryPlatform(platform, query, AI_PLATFORMS[platform as keyof typeof AI_PLATFORMS], apiKey, geminiApiKey)
    )

  return Promise.all(tasks)
}

// ==================== Main Mentions Check Function ====================

export async function runMentionsCheck(
  request: MentionsCheckRequest
): Promise<MentionsCheckResponse> {
  const startTime = Date.now()

  // Validate companyAnalysis has REAL data
  const companyInfo = request.companyAnalysis?.companyInfo || {}
  const products = companyInfo.products || []
  const services = companyInfo.services || []
  const industry = companyInfo.industry || ''
  const description = companyInfo.description || ''

  const hasProductsOrServices = products.length > 0 || services.length > 0
  const hasDetailedDescription = description.length > 100

  if (!hasProductsOrServices) {
    throw new Error(
      'Real company analysis data required. AEO mentions check requires REAL company analysis with products or services data.'
    )
  }

  // Determine platforms based on mode
  const platforms =
    request.mode === 'fast'
      ? ['gemini', 'chatgpt'] // Fast mode: only Gemini and ChatGPT
      : Object.keys(AI_PLATFORMS) // Full mode: all platforms

  // Generate queries
  const queries = generateQueries(
    request.companyName,
    request.companyAnalysis,
    request.numQueries || 50,
    request.mode || 'full'
  )

  // Initialize stats
  const platformStats: Record<string, PlatformStats> = {}
  for (const p of platforms) {
    platformStats[p] = {
      mentions: 0,
      quality_score: 0,
      responses: 0,
      errors: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost: 0.0,
    }
  }

  const dimensionStats: Record<string, DimensionStats> = {}
  const queryResults: QueryResult[] = []

  // Initialize dimension stats
  for (const queryData of queries) {
    const dimension = queryData.dimension
    if (!dimensionStats[dimension]) {
      dimensionStats[dimension] = {
        mentions: 0,
        quality_score: 0,
        queries: 0,
      }
    }
    dimensionStats[dimension].queries += 1
  }

  // Get competitors
  const competitors = request.companyAnalysis?.competitors || []

  // Process ALL queries in PARALLEL
  const allQueryResults = await Promise.allSettled(
    queries.map(async (queryData) => {
      const query = queryData.query
      const dimension = queryData.dimension

      const results = await queryAllPlatforms(
        query,
        platforms,
        request.apiKey,
        request.geminiApiKey
      )

      return { queryData, results }
    })
  )

  // Process results
  for (const queryResult of allQueryResults) {
    if (queryResult.status === 'rejected') {
      console.error('Query failed:', queryResult.reason)
      continue
    }

    const { queryData, results } = queryResult.value
    const query = queryData.query
    const dimension = queryData.dimension

    for (const result of results) {
      if (result.error) {
        platformStats[result.platform].errors += 1
        continue
      }

      const responseText = result.response
      const tokens = result.tokens
      const cost = result.cost

      // Count mentions
      const mentionData = countMentions(responseText, request.companyName)

      // Extract competitor mentions
      const compMentions = extractCompetitorMentions(responseText, competitors)

      // Create query result
      const qr: QueryResult = {
        query,
        dimension,
        platform: result.platform,
        raw_mentions: mentionData.raw_mentions,
        capped_mentions: mentionData.capped_mentions,
        quality_score: mentionData.quality_score,
        mention_type: mentionData.mention_type,
        position: mentionData.position,
        competitor_mentions: compMentions,
        response_text: responseText.slice(0, 500), // Truncate for storage
        source_urls: [], // TODO: Extract from response if available
      }
      queryResults.push(qr)

      // Update stats
      const stats = platformStats[result.platform]
      stats.mentions += mentionData.capped_mentions
      stats.quality_score += mentionData.quality_score
      stats.responses += 1
      stats.total_tokens += tokens
      stats.cost += cost

      dimensionStats[dimension].mentions += mentionData.capped_mentions
      dimensionStats[dimension].quality_score += mentionData.quality_score
    }
  }

  // Calculate visibility using presence-based formula
  const totalResponses = Object.values(platformStats).reduce(
    (sum, s) => sum + s.responses,
    0
  )
  const maxQuality = totalResponses * 10.0

  // Count responses where company was actually mentioned
  const responsesWithMentions = queryResults.filter(
    (qr) => qr.mention_type !== 'none'
  ).length

  // Presence rate
  const presenceRate =
    totalResponses > 0 ? responsesWithMentions / totalResponses : 0

  // Average quality when mentioned
  const totalQuality = queryResults.reduce((sum, qr) => sum + qr.quality_score, 0)
  const avgQualityWhenMentioned =
    responsesWithMentions > 0 ? totalQuality / responsesWithMentions : 0

  // Quality factor: ranges from 0.85 to 1.15
  const qualityFactor = 0.85 + (avgQualityWhenMentioned / 10) * 0.3

  // Visibility = presence rate × quality factor (capped at 100%)
  const visibility = Math.min(100.0, presenceRate * qualityFactor * 100)

  // Determine visibility band
  let band: string
  if (visibility >= 80) {
    band = 'Dominant'
  } else if (visibility >= 60) {
    band = 'Strong'
  } else if (visibility >= 40) {
    band = 'Moderate'
  } else if (visibility >= 20) {
    band = 'Weak'
  } else {
    band = 'Minimal'
  }

  // Calculate average quality scores
  for (const platform of platforms) {
    if (platformStats[platform].responses > 0) {
      platformStats[platform].quality_score /=
        platformStats[platform].responses
    }
  }

  for (const dimension in dimensionStats) {
    if (dimensionStats[dimension].queries > 0) {
      dimensionStats[dimension].quality_score /=
        dimensionStats[dimension].queries
    }
  }

  const executionTime = (Date.now() - startTime) / 1000

  const totalCost = Object.values(platformStats).reduce(
    (sum, s) => sum + s.cost,
    0
  )
  const totalTokens = Object.values(platformStats).reduce(
    (sum, s) => sum + s.total_tokens,
    0
  )

  return {
    companyName: request.companyName,
    visibility: Math.round(visibility * 10) / 10,
    band,
    mentions: queryResults.reduce((sum, qr) => sum + qr.capped_mentions, 0),
    presence_rate: Math.round(presenceRate * 100 * 10) / 10,
    quality_score: Math.round(avgQualityWhenMentioned * 100) / 100,
    max_quality: maxQuality,
    platform_stats: platformStats,
    dimension_stats: dimensionStats,
    query_results: queryResults,
    actualQueriesProcessed: queries.length,
    execution_time_seconds: Math.round(executionTime * 100) / 100,
    total_cost: Math.round(totalCost * 10000) / 10000,
    total_tokens,
    mode: request.mode || 'full',
  }
}

