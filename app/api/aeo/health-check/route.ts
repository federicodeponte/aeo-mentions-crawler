import { NextRequest, NextResponse } from 'next/server'
import { runHealthCheck } from '@/lib/services/aeo-health-check'

/**
 * POST /api/aeo/health-check
 * Standalone AEO Health Check (no external dependencies)
 * 29 checks across 4 categories: Technical SEO, Structured Data, AI Crawler, Authority
 */

export const maxDuration = 60 // 1 minute for health check

interface HealthCheckRequest {
  url: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: HealthCheckRequest = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log('[API:HEALTH] Running health check for:', url)
    const startTime = Date.now()

    try {
      const result = await runHealthCheck({ url })
      
      const duration = (Date.now() - startTime) / 1000
      console.log('[API:HEALTH] Health check complete in', duration, 's. Score:', result.score)

      return NextResponse.json(result)
    } catch (error) {
      console.error('[API:HEALTH] Health check error:', error)
      return NextResponse.json(
        {
          error: 'Health check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[API:HEALTH] Request error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

