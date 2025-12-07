import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 600 // 10 minutes for full keyword generation

/**
 * POST /api/generate-keywords
 * 
 * Calls openkeywords Python library directly via subprocess.
 * No TypeScript conversion needed - just pipe data to/from Python.
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    console.log('[API:KEYWORDS] Received request:', {
      companyName: body.companyName || body.company_name,
      companyUrl: body.companyUrl || body.company_url,
      targetCount: body.targetCount || body.num_keywords,
      has_api_key: !!body.apiKey,
    })

    // Call Python script
    const result = await callPythonKeywordGenerator(body)

    console.log('[API:KEYWORDS] Generated', result.keywords?.length || 0, 'keywords')
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API:KEYWORDS] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate keywords',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Call local keyword generator service via HTTP
 */
async function callPythonKeywordGenerator(input: any): Promise<any> {
  const KEYWORD_ENDPOINT = process.env.KEYWORD_GENERATOR_ENDPOINT || 'http://localhost:8002'
  
  console.log('[KEYWORDS] Calling local service:', KEYWORD_ENDPOINT)
  
  // Transform input to match local service API
  const requestBody = {
    company_name: input.companyName || input.company_name,
    company_url: input.companyUrl || input.company_url,
    company_description: input.companyDescription || input.company_description,
    industry: input.industry,
    target_audience: input.targetAudience || input.target_audience,
    products: input.products,
    competitors: input.competitors,
    language: input.language || 'en',
    country: input.country || 'US',
    target_count: input.targetCount || input.num_keywords || 50,
    mode: input.mode || 'generate', // 'generate' or 'refresh'
    existing_keywords: input.existingKeywords || input.existing_keywords,
  }

  const response = await fetch(`${KEYWORD_ENDPOINT}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || `Service error: ${response.status}`)
  }

  return await response.json()
}
