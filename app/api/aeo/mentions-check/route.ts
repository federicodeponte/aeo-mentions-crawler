import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/aeo/mentions-check
 * AEO Mentions Check - Latest Modal Service
 * 
 * Uses the latest Modal AEO service with improved queries and AI platforms
 * Checks visibility across: Perplexity, Gemini, Claude, Mistral, ChatGPT
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
  api_key?: string // Optional now - server can provide fallback
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

    console.log('[API:MENTIONS] Running mentions check for:', company_name)
    console.log('[API:MENTIONS] Company analysis received:', JSON.stringify(company_analysis, null, 2))
    const startTime = Date.now()

    // Use the latest mentions_service.py from openanalytics
    const scriptPath = '/Users/federicodeponte/openanalytics/aeo-checks/mentions_service.py'
    
    // Create a wrapper Python script to run the service
    const wrapperScript = `
import sys
import json
import asyncio
sys.path.insert(0, '/Users/federicodeponte/openanalytics/aeo-checks')

from mentions_service import check_mentions, MentionsCheckRequest, CompanyAnalysis

async def run_check():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Convert to the format expected by mentions_service
        company_analysis = None
        if input_data.get('company_analysis'):
            ca_data = input_data['company_analysis']
            company_analysis = CompanyAnalysis(
                companyInfo=ca_data.get('companyInfo', {}),
                competitors=ca_data.get('competitors', [])
            )
        
        request = MentionsCheckRequest(
            companyName=input_data.get('company_name', ''),
            companyWebsite=input_data.get('company_website', ''),
            companyAnalysis=company_analysis,
            language=input_data.get('language', 'english'),
            country=input_data.get('country', 'US'),
            numQueries=input_data.get('num_queries', 50),
            mode=input_data.get('mode', 'fast'),
            generateInsights=False,
            platforms=None
        )
        
        result = await check_mentions(request)
        result_dict = result.model_dump() if hasattr(result, 'model_dump') else result.dict()
        print(json.dumps(result_dict, default=str))
        
    except Exception as e:
        error_output = {"error": str(e), "type": type(e).__name__}
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_check())
`

    return new Promise((resolve) => {
      const python = require('child_process').spawn('python3', ['-c', wrapperScript])
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

      // Send input to Python
      const requestData = {
        company_name,
        company_analysis,
        company_website,
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

