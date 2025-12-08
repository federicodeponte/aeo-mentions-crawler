/**
 * Streaming keyword generation API with real-time progress updates
 * Returns Server-Sent Events (SSE) for progress tracking
 */

import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Force Node.js runtime for child_process support
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface KeywordRequest {
  company_name: string
  company_url?: string
  analyze_url?: string
  apiKey?: string
  // Company context
  description?: string
  industry?: string
  products?: string[]
  services?: string[]
  competitors?: string[]
  target_audience?: string
  target_location?: string
  pain_points?: string[]
  use_cases?: string[]
  brand_voice?: string
  solution_keywords?: string[]
  // Generation config
  target_count?: number
  min_score?: number
  enable_research?: boolean
  enable_serp_analysis?: boolean
  min_word_count?: number
  research_focus?: boolean
  language?: string
  region?: string
  country?: string
  num_keywords?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: KeywordRequest = await request.json()
    const { company_name, company_url, apiKey: clientApiKey } = body

    if (!company_name) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use client-provided API key or fallback to server env variable
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key is not configured. Please contact support.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[API:KEYWORDS:STREAM] Starting streaming generation for:', company_name)

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Spawn Python process
          const pythonScript = path.join(process.cwd(), 'scripts', 'generate-keywords-streaming.py')
          console.log('[API:KEYWORDS:STREAM] Python script path:', pythonScript)
          
          const pythonProcess = spawn('python3', [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe'],
          })

          // Send input data to Python
          const inputData = JSON.stringify({
            ...body,
            apiKey,
            target_count: body.num_keywords || body.target_count || 50,
          })
          console.log('[API:KEYWORDS:STREAM] Sending input:', inputData.length, 'bytes')
          
          pythonProcess.stdin.write(inputData)
          pythonProcess.stdin.end()

        // Handle progress updates from stderr
        pythonProcess.stderr.on('data', (data) => {
          const lines = data.toString().split('\n').filter((line: string) => line.trim())
          
          for (const line of lines) {
            try {
              const progressData = JSON.parse(line)
              
              // Send progress update as SSE
              const sseMessage = `data: ${JSON.stringify(progressData)}\n\n`
              controller.enqueue(encoder.encode(sseMessage))
            } catch (e) {
              // Not JSON, just log
              console.log('[PYTHON]', line)
            }
          }
        })

        // Handle final result from stdout
        let stdoutData = ''
        pythonProcess.stdout.on('data', (data) => {
          stdoutData += data.toString()
        })

        // Handle process completion
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdoutData)
              
              // Send final result
              const sseMessage = `data: ${JSON.stringify(result)}\n\n`
              controller.enqueue(encoder.encode(sseMessage))
              
              console.log('[API:KEYWORDS:STREAM] Generation complete:', result.metadata?.total_keywords, 'keywords')
            } catch (e) {
              console.error('[API:KEYWORDS:STREAM] Failed to parse result:', e)
              const errorMessage = `data: ${JSON.stringify({ type: "error", error: "Failed to parse result" })}\n\n`
              controller.enqueue(encoder.encode(errorMessage))
            }
          } else {
            console.error('[API:KEYWORDS:STREAM] Python process exited with code:', code)
            const errorMessage = `data: ${JSON.stringify({ type: "error", error: `Process exited with code ${code}` })}\n\n`
            controller.enqueue(encoder.encode(errorMessage))
          }
          
          controller.close()
        })

          pythonProcess.on('error', (error) => {
            console.error('[API:KEYWORDS:STREAM] Python process error:', error)
            const errorMessage = `data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`
            controller.enqueue(encoder.encode(errorMessage))
            controller.close()
          })
        } catch (error) {
          console.error('[API:KEYWORDS:STREAM] Stream setup error:', error)
          const errorMessage = `data: ${JSON.stringify({ 
            type: "error", 
            error: error instanceof Error ? error.message : 'Stream setup failed' 
          })}\n\n`
          controller.enqueue(encoder.encode(errorMessage))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[API:KEYWORDS:STREAM] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to start keyword generation',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

