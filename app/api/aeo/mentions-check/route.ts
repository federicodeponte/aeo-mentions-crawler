import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

/**
 * POST /api/aeo/mentions-check
 * AEO Mentions Check - Local helper script approach
 * Checks visibility across: Perplexity, ChatGPT, Claude, Gemini
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

    // Local dev: Direct Python script (subprocess)
    // Production: Vercel serverless function
    const isDev = process.env.NODE_ENV === 'development'
    
    if (isDev) {
      // Local: Call Python script directly
      return new Promise((resolve) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'check-mentions.py')
        const python = spawn('python3', [scriptPath])
        let stdout = ''
        let stderr = ''
        
        python.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        python.stderr.on('data', (data) => {
          stderr += data.toString()
          console.error('[MENTIONS:Python]', data.toString().trim())
        })
        
        python.on('close', (code) => {
          if (code !== 0) {
            console.error('[MENTIONS] Python error:', stderr)
            resolve(NextResponse.json(
              { error: 'Mentions check failed', details: stderr },
              { status: 500 }
            ))
            return
          }
          
          try {
            const result = JSON.parse(stdout)
            const duration = (Date.now() - startTime) / 1000
            console.log('[MENTIONS] Check complete in', duration, 's')
            resolve(NextResponse.json(result))
          } catch (e) {
            console.error('[MENTIONS] Failed to parse output:', e)
            resolve(NextResponse.json(
              { error: 'Failed to parse output' },
              { status: 500 }
            ))
          }
        })
        
        // Send input to Python via stdin
        const requestData = {
          company_name,
          company_analysis,
          company_website,
          api_keys: { gemini: api_key },
          language,
          country,
          num_queries,
          mode,
        }
        
        python.stdin.write(JSON.stringify(requestData))
        python.stdin.end()
      })
    }
    
    // Production: Call Vercel serverless function
    try {
      const response = await fetch('/api/python/check-mentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name,
          company_analysis,
          company_website,
          api_key,
          language,
          country,
          num_queries,
          mode,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Serverless function error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      const duration = (Date.now() - startTime) / 1000
      console.log('[API:MENTIONS] Mentions check complete in', duration, 's')

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

