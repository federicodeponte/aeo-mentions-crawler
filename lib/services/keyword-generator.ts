/**
 * Standalone Keyword Generator Service
 * No external dependencies - all processing in TypeScript
 * 
 * Features:
 * - Google Autocomplete (real user queries)
 * - Google Trends (rising queries, interest over time)
 * - Gemini SERP analysis (AEO scoring)
 * - Clustering and ranking
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import googleTrends from 'google-trends-api'

export interface KeywordRequest {
  companyName: string
  companyUrl: string
  industry?: string
  products?: string[]
  services?: string[]
  targetAudience?: string
  competitors?: string[]
  targetLocation: string
  targetCount: number
  language: string
  apiKey: string
}

export interface Keyword {
  keyword: string
  source: string
  search_volume?: number
  competition?: string
  trend?: string
  cluster?: string
  aeo_score?: number
  aeo_analysis?: string
  relevance_score: number
  final_score: number
}

export interface KeywordCluster {
  name: string
  keywords: Keyword[]
  total_keywords: number
  avg_score: number
}

export interface KeywordResponse {
  keywords: Keyword[]
  clusters: KeywordCluster[]
  statistics: {
    total_keywords: number
    sources: Record<string, number>
    avg_relevance: number
    top_clusters: string[]
  }
}

/**
 * Generate seed keywords using Gemini
 */
async function generateSeedKeywords(
  request: KeywordRequest
): Promise<string[]> {
  console.log('[KEYWORDS] Generating seed keywords with Gemini...')
  
  const genAI = new GoogleGenerativeAI(request.apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `You are a keyword research expert. Generate ${Math.min(request.targetCount, 50)} highly relevant search keywords for this company.

Company: ${request.companyName}
Website: ${request.companyUrl}
${request.industry ? `Industry: ${request.industry}` : ''}
${request.products?.length ? `Products: ${request.products.join(', ')}` : ''}
${request.services?.length ? `Services: ${request.services.join(', ')}` : ''}
${request.targetAudience ? `Target Audience: ${request.targetAudience}` : ''}

Focus on:
1. Commercial intent keywords (people looking to buy/sign up)
2. Informational keywords (how-to, guides, comparisons)
3. Long-tail keywords (3-5 words, specific user intent)
4. Question-based keywords (what, how, why, when)

Return ONLY a JSON array of keyword strings, nothing else.
Example: ["keyword 1", "keyword 2", "keyword 3"]`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to parse keyword response from Gemini')
  }

  const keywords = JSON.parse(jsonMatch[0]) as string[]
  console.log('[KEYWORDS] Generated', keywords.length, 'seed keywords')
  
  return keywords
}

/**
 * Get Google Autocomplete suggestions for a keyword
 */
async function getAutocompleteSuggestions(keyword: string): Promise<string[]> {
  try {
    // Google Autocomplete endpoint
    const url = `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}`
    const response = await fetch(url)
    const data = await response.json()
    
    // Response format: [query, [suggestions]]
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
      return data[1].slice(0, 5) // Top 5 suggestions
    }
    
    return []
  } catch (error) {
    console.warn('[AUTOCOMPLETE] Failed for:', keyword, error)
    return []
  }
}

/**
 * Get Google Trends data for a keyword
 */
async function getTrendsData(keyword: string, country: string): Promise<{
  trend: string
  relatedQueries: string[]
}> {
  try {
    // Get interest over time (last 3 months)
    const interestData = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      geo: country.toUpperCase(),
    })
    
    const interest = JSON.parse(interestData)
    let trend = 'stable'
    
    // Analyze trend direction
    if (interest.default?.timelineData?.length > 1) {
      const data = interest.default.timelineData
      const recent = data.slice(-3).map((d: any) => d.value[0])
      const earlier = data.slice(0, 3).map((d: any) => d.value[0])
      
      const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length
      const earlierAvg = earlier.reduce((a: number, b: number) => a + b, 0) / earlier.length
      
      if (recentAvg > earlierAvg * 1.2) trend = 'rising'
      else if (recentAvg < earlierAvg * 0.8) trend = 'declining'
    }

    // Get related queries
    const relatedData = await googleTrends.relatedQueries({
      keyword,
      geo: country.toUpperCase(),
    })
    
    const related = JSON.parse(relatedData)
    const relatedQueries: string[] = []
    
    if (related.default?.rankedList) {
      for (const list of related.default.rankedList) {
        if (list.rankedKeyword) {
          relatedQueries.push(...list.rankedKeyword.slice(0, 3).map((k: any) => k.query))
        }
      }
    }

    return { trend, relatedQueries: relatedQueries.slice(0, 5) }
  } catch (error) {
    console.warn('[TRENDS] Failed for:', keyword, error)
    return { trend: 'unknown', relatedQueries: [] }
  }
}

/**
 * Calculate AEO score using Gemini with Google Search grounding
 */
async function calculateAEOScore(
  keyword: string,
  request: KeywordRequest
): Promise<{ score: number, analysis: string }> {
  try {
    const genAI = new GoogleGenerativeAI(request.apiKey)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      tools: [{ googleSearch: {} }], // Enable Google Search grounding for real SERP data
    })

    const prompt = `Analyze this search query for Answer Engine Optimization (AEO) potential for ${request.companyName}.

Query: "${keyword}"

Company Context:
- Name: ${request.companyName}
- Website: ${request.companyUrl}
${request.industry ? `- Industry: ${request.industry}` : ''}
${request.products?.length ? `- Products: ${request.products.join(', ')}` : ''}
${request.services?.length ? `- Services: ${request.services.join(', ')}` : ''}

Use Google Search to check:
1. What AI engines (Perplexity, ChatGPT, Gemini) currently show for this query
2. Whether ${request.companyName} or competitors appear in results
3. If the query has commercial intent vs informational
4. User intent and answer format (direct answer, list, comparison)

Score 0-100 based on:
- AEO opportunity (low competition = higher score)
- Commercial intent alignment with company offerings
- Answer format suitability (questions = high, branded = low)
- Current visibility gap

Return ONLY valid JSON:
{"score": <0-100>, "analysis": "<2 sentence explanation>"}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return {
        score: Math.max(0, Math.min(100, data.score || 50)),
        analysis: data.analysis || 'No analysis available'
      }
    }
    
    // Fallback to basic relevance scoring
    return { 
      score: calculateBasicRelevance(keyword, request),
      analysis: 'AEO analysis unavailable - using basic relevance'
    }
  } catch (error) {
    console.warn('[KEYWORDS] AEO scoring failed for:', keyword, error)
    return { 
      score: calculateBasicRelevance(keyword, request),
      analysis: 'AEO analysis failed - using basic relevance'
    }
  }
}

/**
 * Calculate basic relevance score (fallback if Gemini fails)
 */
function calculateBasicRelevance(
  keyword: string,
  request: KeywordRequest
): number {
  let score = 50 // Base score
  
  const lowerKeyword = keyword.toLowerCase()
  const companyName = request.companyName.toLowerCase()
  
  // Check company name match
  if (lowerKeyword.includes(companyName)) {
    score += 20
  }
  
  // Check product/service match
  const products = request.products?.map(p => p.toLowerCase()) || []
  const services = request.services?.map(s => s.toLowerCase()) || []
  const allTerms = [...products, ...services]
  
  for (const term of allTerms) {
    if (lowerKeyword.includes(term)) {
      score += 15
      break
    }
  }
  
  // Check industry match
  if (request.industry && lowerKeyword.includes(request.industry.toLowerCase())) {
    score += 10
  }
  
  // Keyword length bonus (long-tail)
  const wordCount = keyword.split(' ').length
  if (wordCount >= 3 && wordCount <= 5) {
    score += 10
  }
  
  // Question keywords bonus
  if (/^(what|how|why|when|where|which|who)\s/i.test(keyword)) {
    score += 5
  }
  
  return Math.min(score, 100)
}

/**
 * Cluster keywords by semantic similarity
 */
function clusterKeywords(keywords: Keyword[], clusterCount: number = 6): KeywordCluster[] {
  // Simple clustering based on shared words
  const clusters: Map<string, Keyword[]> = new Map()
  
  for (const keyword of keywords) {
    const words = keyword.keyword.toLowerCase().split(' ')
    let bestCluster: string | null = null
    let bestOverlap = 0
    
    // Find best matching cluster
    for (const [clusterName, clusterKeywords] of clusters) {
      const clusterWords = clusterName.toLowerCase().split(' ')
      const overlap = words.filter(w => clusterWords.includes(w)).length
      
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestCluster = clusterName
      }
    }
    
    // Add to existing cluster or create new one
    if (bestCluster && bestOverlap >= 2) {
      clusters.get(bestCluster)!.push(keyword)
    } else {
      // Create new cluster (use first 2-3 significant words)
      const significantWords = words.filter(w => w.length > 3).slice(0, 3)
      const clusterName = significantWords.join(' ') || keyword.keyword
      clusters.set(clusterName, [keyword])
    }
  }
  
  // Convert to cluster objects and sort by avg score
  const clusterArray: KeywordCluster[] = []
  
  for (const [name, kws] of clusters) {
    const avgScore = kws.reduce((sum, k) => sum + k.final_score, 0) / kws.length
    
    clusterArray.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      keywords: kws.sort((a, b) => b.final_score - a.final_score),
      total_keywords: kws.length,
      avg_score: Math.round(avgScore),
    })
  }
  
  // Sort clusters by avg score and limit to requested count
  return clusterArray
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, clusterCount)
}

/**
 * Main keyword generation function
 */
export async function generateKeywords(
  request: KeywordRequest
): Promise<KeywordResponse> {
  console.log('[KEYWORDS] Starting generation for:', request.companyName)
  const startTime = Date.now()
  
  // Step 1: Generate seed keywords with Gemini
  const seedKeywords = await generateSeedKeywords(request)
  
  // Step 2: Expand with Autocomplete and Trends
  const allKeywordStrings = new Set(seedKeywords)
  const sources: Record<string, number> = { seed: seedKeywords.length }
  
  console.log('[KEYWORDS] Expanding with Autocomplete and Trends...')
  
  // Process top seed keywords for expansion
  const topSeeds = seedKeywords.slice(0, 10)
  
  for (const seed of topSeeds) {
    // Get autocomplete suggestions
    const suggestions = await getAutocompleteSuggestions(seed)
    for (const sug of suggestions) {
      allKeywordStrings.add(sug)
    }
    sources.autocomplete = (sources.autocomplete || 0) + suggestions.length
    
    // Get trends data
    const { relatedQueries } = await getTrendsData(seed, request.targetLocation)
    for (const query of relatedQueries) {
      allKeywordStrings.add(query)
    }
    sources.trends = (sources.trends || 0) + relatedQueries.length
  }
  
  console.log('[KEYWORDS] Collected', allKeywordStrings.size, 'total keywords')
  
  // Step 3: Score and rank keywords with AEO analysis
  console.log('[KEYWORDS] Running AEO analysis with Gemini (search grounding)...')
  const keywords: Keyword[] = []
  
  // Process keywords in batches for AEO scoring (to avoid rate limits)
  const keywordArray = Array.from(allKeywordStrings)
  const batchSize = 5
  
  for (let i = 0; i < keywordArray.length; i += batchSize) {
    const batch = keywordArray.slice(i, i + batchSize)
    
    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (kw) => {
        const { score: aeoScore, analysis } = await calculateAEOScore(kw, request)
        const { trend } = await getTrendsData(kw, request.targetLocation)
        
        // Calculate final score (AEO score is primary, trend is modifier)
        let finalScore = aeoScore
        if (trend === 'rising') finalScore = Math.min(100, finalScore + 10)
        else if (trend === 'declining') finalScore = Math.max(0, finalScore - 10)
        
        return {
          keyword: kw,
          source: seedKeywords.includes(kw) ? 'seed' : 'expansion',
          trend,
          aeo_score: aeoScore,
          aeo_analysis: analysis,
          relevance_score: calculateBasicRelevance(kw, request),
          final_score: Math.round(finalScore),
        }
      })
    )
    
    // Add successful results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        keywords.push(result.value)
      }
    }
    
    // Brief pause between batches to respect rate limits
    if (i + batchSize < keywordArray.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Sort by final score and limit to target count
  const topKeywords = keywords
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, request.targetCount)
  
  // Step 4: Cluster keywords
  const clusters = clusterKeywords(topKeywords, 6)
  
  // Calculate statistics
  const avgRelevance = topKeywords.reduce((sum, k) => sum + k.relevance_score, 0) / topKeywords.length
  
  const duration = (Date.now() - startTime) / 1000
  console.log('[KEYWORDS] Generation complete in', duration, 'seconds')
  
  return {
    keywords: topKeywords,
    clusters,
    statistics: {
      total_keywords: topKeywords.length,
      sources,
      avg_relevance: Math.round(avgRelevance),
      top_clusters: clusters.slice(0, 3).map(c => c.name),
    },
  }
}

