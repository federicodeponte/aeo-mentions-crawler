import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

/**
 * POST /api/aeo/mentions-check
 * AEO Mentions Check - Python script approach
 * 
 * Calls check-mentions.py which uses services/aeo-checks/mentions_service.py
 * Same code as openaeoanalytics repo, runs locally
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

    // Call Python script directly (same pattern as generate-keywords.py, generate-blog.py)
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
          resolve(
            NextResponse.json(
              { error: 'Mentions check failed', details: stderr },
              { status: 500 }
            )
          )
          return
        }

        try {
          const result = JSON.parse(stdout)
          
          // Check for error in result
          if (result.error) {
            resolve(
              NextResponse.json(
                { error: 'Mentions check failed', message: result.error },
                { status: 500 }
              )
            )
            return
          }

          const duration = (Date.now() - startTime) / 1000
          console.log(
            '[API:MENTIONS] Mentions check complete in',
            duration,
            's. Visibility:',
            result.visibility,
            '%'
          )
          resolve(NextResponse.json(result))
        } catch (e) {
          console.error('[MENTIONS] Failed to parse output:', e)
          console.error('[MENTIONS] Raw output:', stdout)
          resolve(
            NextResponse.json(
              { error: 'Failed to parse output', details: stdout.substring(0, 500) },
              { status: 500 }
            )
          )
        }
      })

      // Send input to Python via stdin
      const requestData = {
        company_name,
        company_analysis,
        company_website,
        api_key,
        gemini_api_key,
        language,
        country,
        num_queries,
        mode,
      }

      python.stdin.write(JSON.stringify(requestData))
      python.stdin.end()
    })
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

