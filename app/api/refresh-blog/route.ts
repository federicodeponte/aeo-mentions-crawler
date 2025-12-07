import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const maxDuration = 300 // 5 minutes

interface RefreshRequest {
  content: string
  content_format?: 'html' | 'markdown' | 'json' | 'text'
  instructions: string[]
  target_sections?: number[]
  output_format?: 'json' | 'html' | 'markdown'
  include_diff?: boolean
  apiKey: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: RefreshRequest = await request.json()
    const {
      content,
      content_format,
      instructions,
      target_sections,
      output_format = 'html',
      include_diff = false,
      apiKey: clientApiKey,
    } = body

    if (!content || !instructions || instructions.length === 0) {
      return NextResponse.json(
        { error: 'Content and instructions are required' },
        { status: 400 }
      )
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const isDev = process.env.NODE_ENV === 'development'

    if (isDev) {
      // Local: Call Python script
      const scriptPath = path.join(process.cwd(), 'scripts', 'refresh-blog.py')

      return new Promise((resolve) => {
        const python = spawn('python3', [scriptPath])
        let stdout = ''
        let stderr = ''

        python.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        python.stderr.on('data', (data) => {
          stderr += data.toString()
          console.error('[REFRESH:Python]', data.toString().trim())
        })

        python.on('close', (code) => {
          if (code !== 0) {
            console.error('[REFRESH] Python error:', stderr)
            resolve(
              NextResponse.json(
                { error: 'Content refresh failed', details: stderr },
                { status: 500 }
              )
            )
            return
          }

          try {
            const result = JSON.parse(stdout)
            const duration = (Date.now() - startTime) / 1000
            console.log('[REFRESH] Completed in', duration, 's')
            resolve(NextResponse.json(result))
          } catch (e) {
            console.error('[REFRESH] Failed to parse output:', e)
            resolve(
              NextResponse.json(
                { error: 'Failed to parse output' },
                { status: 500 }
              )
            )
          }
        })

        // Send input to Python via stdin
        python.stdin.write(
          JSON.stringify({
            content,
            content_format,
            instructions,
            target_sections,
            output_format,
            include_diff,
            api_key: apiKey,
          })
        )
        python.stdin.end()
      })
    }

    // Production: Call Vercel serverless function
    const response = await fetch(`/api/python/refresh-blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        content_format,
        instructions,
        target_sections,
        output_format,
        include_diff,
        api_key: apiKey,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Serverless function error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Content refresh error:', error)
    return NextResponse.json(
      {
        error: 'Failed to refresh content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

