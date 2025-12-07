import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/aeo/mentions-check
 * AEO Mentions Check - routes to Modal service for full analysis
 * Checks visibility across: Perplexity, ChatGPT, Claude, Gemini
 * 
 * This now calls the Modal aeo-checks service which provides richer data:
 * - Query generation based on company analysis
 * - Dimension categorization (problem-solving, comparison, feature, decision)
 * - Mention type classification (primary, contextual, competitive, passing)
 * - Competitor detection
 * - Source URL extraction
 */

export const maxDuration = 300 // 5 minutes for mentions check

interface CompanyInfo {
  name: string
  website?: string
  description?: string
  industry?: string
  target_audience?: string[]
  products?: string[]
  services?: string[]
  pain_points?: string[]
  use_cases?: string[]
  key_features?: string[]
  solution_keywords?: string[]
  value_propositions?: string[]
  differentiators?: string[]
  customer_problems?: string[]
  product_category?: string
  primary_region?: string
}

interface Competitor {
  name: string
}

interface CompanyAnalysis {
  companyInfo: CompanyInfo
  competitors?: Competitor[]
}

interface MentionsCheckRequest {
  company_name: string
  company_analysis?: CompanyAnalysis
  company_website?: string
  api_key: string
  language?: string
  country?: string
  num_queries?: number
  mode?: 'fast' | 'full'
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: MentionsCheckRequest = await request.json()
    const { 
      company_name,
      company_analysis,
      company_website,
      api_key,
      language,
      country,
      num_queries,
      mode,
    } = body

    if (!company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    if (!api_key) {
      return NextResponse.json(
        { error: 'OpenRouter API key is required' },
        { status: 400 }
      )
    }

    console.log('[API:MENTIONS] Running mentions check for:', company_name)
    const startTime = Date.now()

    try {
      // Call Modal aeo-checks service /mentions/check endpoint
      const modalEndpoint = process.env.MODAL_AEO_ENDPOINT || 'https://clients--aeo-checks-fastapi-app.modal.run/mentions/check'
      
      const payload = {
        company_name,
        company_analysis: company_analysis || {
          companyInfo: {
            name: company_name,
            website: company_website || '',
          }
        },
        api_key,
        language: language || 'english',
        country: country || 'US',
        num_queries: num_queries || 10,
        mode: mode || 'fast',
      }

      console.log('[API:MENTIONS] Calling Modal service:', modalEndpoint)
      const response = await fetch(modalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[API:MENTIONS] Modal service error:', response.status, errorText)
        throw new Error(`Modal service error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      const duration = (Date.now() - startTime) / 1000
      console.log('[API:MENTIONS] Mentions check complete in', duration, 's. Visibility:', result.visibility)

      return NextResponse.json(result)
    } catch (error) {
      console.error('[API:MENTIONS] Mentions check error:', error)
      return NextResponse.json(
        {
          error: 'Mentions check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[API:MENTIONS] Request error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

