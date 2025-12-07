import { NextRequest, NextResponse } from 'next/server'
import { runMentionsCheck } from '@/lib/services/aeo-mentions-check'

/**
 * POST /api/aeo/mentions-check
 * Standalone AEO Mentions Check (no external dependencies except OpenRouter)
 * Checks visibility across: Perplexity, ChatGPT, Claude, Gemini
 */

export const maxDuration = 300 // 5 minutes for mentions check

interface MentionsCheckRequest {
  company_name: string
  company_website: string
  api_key: string
  gemini_api_key?: string
  industry?: string
  products?: string[]
  description?: string
  language?: string
  country?: string
  mode?: 'fast' | 'full'
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: MentionsCheckRequest = await request.json()
    const { 
      company_name,
      company_website,
      api_key,
      gemini_api_key,
      industry,
      products,
      description,
      language,
      country,
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
        apiKey: api_key,
        geminiApiKey: gemini_api_key,
        industry,
        products,
        description,
        language: language || 'english',
        country: country || 'US',
        mode: mode || 'fast',
      })

      const duration = (Date.now() - startTime) / 1000
      console.log('[API:MENTIONS] Mentions check complete in', duration, 's. Visibility:', result.visibility, '%')

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

