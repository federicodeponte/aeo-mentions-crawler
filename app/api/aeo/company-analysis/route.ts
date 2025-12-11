import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    console.log('[API:COMPANY_ANALYSIS] Running company analysis')
    
    const body = await request.json()
    const { company_name, company_website } = body

    if (!company_name || !company_website) {
      return NextResponse.json(
        { error: 'Missing required fields: company_name, company_website' },
        { status: 400 }
      )
    }

    // Call the Python script for company analysis
    const scriptPath = './scripts/analyze-company.py'
    
    return new Promise((resolve) => {
      let output = ''
      let errorOutput = ''

      const childProcess = spawn('python3', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY }
      })

      // Send input data to Python script
      childProcess.stdin.write(JSON.stringify({
        company_name,
        company_website,
        mode: 'full'
      }))
      childProcess.stdin.end()

      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString()
      })

      childProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString()
        console.error('[COMPANY_ANALYSIS:Python]', data.toString())
      })

      childProcess.on('close', (code: number) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            console.log('[API:COMPANY_ANALYSIS] Company analysis completed successfully')
            resolve(NextResponse.json(result))
          } catch (e) {
            console.error('[API:COMPANY_ANALYSIS] Failed to parse Python output:', e)
            resolve(NextResponse.json(
              { error: 'Company analysis failed', details: errorOutput },
              { status: 500 }
            ))
          }
        } else {
          console.error('[API:COMPANY_ANALYSIS] Python script failed with code:', code)
          resolve(NextResponse.json(
            { error: 'Company analysis failed', details: errorOutput },
            { status: 500 }
          ))
        }
      })
    })

  } catch (error) {
    console.error('[API:COMPANY_ANALYSIS] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}