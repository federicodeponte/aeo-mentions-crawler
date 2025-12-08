import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[TEST-SPAWN] Testing child_process.spawn...')
    
    // Simple test: run echo
    const process = spawn('echo', ['Hello from spawn'])
    
    let output = ''
    process.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    return new Promise((resolve) => {
      process.on('close', (code) => {
        console.log('[TEST-SPAWN] Process exited with code:', code)
        resolve(NextResponse.json({ 
          success: true, 
          output, 
          code,
          message: 'child_process.spawn works!' 
        }))
      })
      
      process.on('error', (error) => {
        console.error('[TEST-SPAWN] Process error:', error)
        resolve(NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 }))
      })
      
      // Timeout after 2 seconds
      setTimeout(() => {
        process.kill()
        resolve(NextResponse.json({ 
          success: false, 
          error: 'Timeout' 
        }, { status: 500 }))
      }, 2000)
    })
  } catch (error) {
    console.error('[TEST-SPAWN] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

