import { NextRequest, NextResponse } from 'next/server'
import { runMentionsCheck } from '@/lib/services/aeo-mentions-check-v2'

/**
 * POST /api/aeo/mentions-check
 * AEO Mentions Check - Local TypeScript implementation
 * 
 * Ported from mentions_service.py - same logic, runs locally
 * Checks visibility across: Perplexity, ChatGPT, Claude, Gemini
 */

export const maxDuration = 300 // 5 minutes for mentions check

interface CompanyInfo {
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

interface Competitor {
  name: string
  [key: string]: any
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
  gemini_api_key?: string
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
      gemini_api_key,
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
      const result = await runMentionsCheck({
        companyName: company_name,
        companyWebsite: company_website || '',
        companyAnalysis: company_analysis,
        apiKey: api_key,
        geminiApiKey: gemini_api_key,
        language: language || 'english',
        country: country || 'US',
        numQueries: num_queries || 50,
        mode: mode || 'full',
      })

      const duration = (Date.now() - startTime) / 1000
      console.log(
        '[API:MENTIONS] Mentions check complete in',
        duration,
        's. Visibility:',
        result.visibility,
        '%'
      )

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

