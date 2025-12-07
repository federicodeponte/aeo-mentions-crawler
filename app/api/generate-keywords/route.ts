import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as path from 'path'

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
 * Call Python openkeywords library directly via subprocess.
 * Input sent via stdin, output received via stdout.
 */
async function callPythonKeywordGenerator(input: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-keywords.py')
    
    console.log('[KEYWORDS] Calling Python script:', scriptPath)
    
    // Spawn Python process
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    // Collect stdout
    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    // Collect stderr (for logs and errors)
    python.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      console.log('[KEYWORDS:Python]', text.trim())
    })

    // Handle process completion
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('[KEYWORDS] Python exited with code', code)
        console.error('[KEYWORDS] stderr:', stderr)
        try {
          const errorData = JSON.parse(stderr)
          reject(new Error(`Python error: ${errorData.error}`))
        } catch {
          reject(new Error(`Python process failed with code ${code}: ${stderr || 'No error message'}`))
        }
        return
      }

      // Parse JSON output
      try {
        const result = JSON.parse(stdout)
        console.log('[KEYWORDS] Success:', result.keywords?.length || 0, 'keywords in', result.processing_time_seconds, 's')
        resolve(result)
      } catch (error) {
        console.error('[KEYWORDS] Failed to parse Python output:', stdout.substring(0, 200))
        reject(new Error('Failed to parse Python output'))
      }
    })

    // Handle spawn errors
    python.on('error', (error) => {
      console.error('[KEYWORDS] Failed to spawn Python:', error)
      reject(new Error(`Failed to spawn Python: ${error.message}`))
    })

    // Send input data to Python via stdin
    python.stdin.write(JSON.stringify(input))
    python.stdin.end()
  })
}
