import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const maxDuration = 300 // 5 minutes for generation

interface KeywordRequest {
  company_name: string
  company_url: string
  language: string
  country: string
  num_keywords: number
  apiKey: string
  description?: string
  industry?: string
  products?: string
  services?: string
  target_audience?: string
  competitors?: string
  pain_points?: string
  value_propositions?: string
  use_cases?: string
  content_themes?: string
  tone?: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: KeywordRequest = await request.json()
    const { company_name, company_url, apiKey } = body

    if (!company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required. Please set it in Settings.' },
        { status: 400 }
      )
    }

    console.log('[API:KEYWORDS] Generating keywords for:', company_name)
    const startTime = Date.now()

    // Use Vercel Python serverless function (production) or local subprocess (dev)
    const isDev = process.env.NODE_ENV === 'development'
    
    if (isDev) {
      // Local development: Use subprocess to call Python script
      return new Promise((resolve) => {
      const pythonScriptPath = path.join(process.cwd(), 'scripts', 'generate-keywords.py')
      const pythonProcess = spawn('python3', [pythonScriptPath])

      let pythonOutput = ''
      let pythonError = ''

      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString()
        console.error(`[API:KEYWORDS] Python stderr: ${data.toString().trim()}`)
      })

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`[API:KEYWORDS] Python process exited with code ${code}`)
          console.error(`[API:KEYWORDS] Python full error: ${pythonError}`)
          resolve(
            NextResponse.json(
              {
                error: 'Failed to generate keywords',
                message: `Python process failed: ${pythonError || 'Unknown error'}`,
              },
              { status: 500 }
            )
          )
          return
        }

        try {
          const result = JSON.parse(pythonOutput)
          const generationTime = (Date.now() - startTime) / 1000
          console.log('[API:KEYWORDS] Generated', result.keywords?.length || 0, 'keywords in', generationTime, 's')

          // Ensure metadata is present for frontend compatibility
          if (!result.metadata) {
            result.metadata = {}
          }
          result.metadata.company_name = company_name
          result.metadata.company_url = company_url
          result.metadata.total_keywords = result.keywords?.length || 0
          result.metadata.generation_time = generationTime

          resolve(NextResponse.json(result))
        } catch (parseError) {
          console.error('[API:KEYWORDS] Failed to parse Python output:', parseError)
          console.error('[API:KEYWORDS] Raw Python output:', pythonOutput)
          resolve(
            NextResponse.json(
              {
                error: 'Failed to parse keyword generation output',
                message: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
              },
              { status: 500 }
            )
          )
        }
      })

      pythonProcess.stdin.write(JSON.stringify(body))
      pythonProcess.stdin.end()
    })
    } else {
      // Production: Use Vercel Python serverless function
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/python/generate-keywords`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_name: body.company_name,
            company_url: body.company_url,
            company_description: body.description,
            industry: body.industry,
            target_audience: body.target_audience,
            products: body.products?.split(',').map(p => p.trim()),
            competitors: body.competitors?.split(',').map(c => c.trim()),
            language: body.language,
            country: body.country,
            target_count: body.num_keywords,
            mode: 'generate',
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Serverless function error: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        const generationTime = (Date.now() - startTime) / 1000
        
        console.log('[API:KEYWORDS] Generated', result.keywords?.length || 0, 'keywords in', generationTime, 's')
        
        return NextResponse.json(result)
      } catch (error) {
        console.error('[API:KEYWORDS] Serverless function error:', error)
        return NextResponse.json(
          {
            error: 'Failed to generate keywords',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('[API:KEYWORDS] Request error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
