'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'

export default function TestAnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleClick = async () => {
    console.log('🚀 BUTTON CLICKED - STARTING ANALYTICS')
    setLoading(true)
    setResult(null)

    try {
      // Health check
      console.log('🔍 Starting health check...')
      const healthResponse = await fetch('/api/aeo/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          company_name: 'Test Company'
        })
      })

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`)
      }

      const healthData = await healthResponse.json()
      console.log('✅ Health check complete:', healthData)

      // Mentions check  
      console.log('🎯 Starting mentions check...')
      const mentionsResponse = await fetch('/api/aeo/mentions-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Test Company',
          website_url: 'https://example.com'
        })
      })

      if (!mentionsResponse.ok) {
        throw new Error(`Mentions check failed: ${mentionsResponse.status}`)
      }

      const mentionsData = await mentionsResponse.json()
      console.log('✅ Mentions check complete:', mentionsData)

      setResult({
        health: healthData,
        mentions: mentionsData
      })

    } catch (error) {
      console.error('❌ Analytics failed:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(
        "container mx-auto max-w-4xl py-6 sm:py-8",
        containerPadding.md
      )}>
        <div className="bg-card rounded-lg border border-border shadow-sm p-4 sm:p-6 lg:p-8">
          <h1 className={cn("font-bold tracking-tight mb-6 sm:mb-8 text-center", textSizes.lg)}>
            🧪 Test Analytics Page
          </h1>
          
          <div className="text-center mb-6 sm:mb-8">
            <p className={cn("text-muted-foreground mb-3 sm:mb-4", textSizes.xs)}>
              Minimal version with zero dependencies or complex logic
            </p>
            
            {/* BULLETPROOF BUTTON */}
            <button 
              onClick={handleClick}
              disabled={loading}
              className={cn(
                "px-6 sm:px-8 py-3 sm:py-4 font-bold rounded-lg transition-all duration-200 border-0",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed",
                textSizes.xs,
                "sm:text-base"
              )}
            >
              {loading ? '⏳ Running Analytics...' : '🚀 Run Full Analytics'}
            </button>
            
            {loading && (
              <div className="mt-3 sm:mt-4">
                <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-2 sm:border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className={cn("text-muted-foreground mt-2", "text-[10px] xs:text-xs sm:text-sm")}>This will take ~60 seconds...</p>
              </div>
            )}
          </div>

          {/* RESULTS */}
          {result && (
            <div className="mt-6 sm:mt-8">
              <h2 className={cn("font-bold tracking-tight mb-3 sm:mb-4", textSizes.base)}>📊 Results</h2>
              
              {result.error ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
                  <strong>Error:</strong> <span className={textSizes.xs}>{result.error}</span>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Health Results */}
                  {result.health && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6">
                      <h3 className={cn("font-semibold mb-2 sm:mb-3 text-blue-800 dark:text-blue-200", textSizes.xs)}>
                        🏥 AEO Health Score
                      </h3>
                      <div className={cn("font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2", "text-2xl sm:text-3xl")}>
                        {result.health.overall_score || result.health.score || 'N/A'}
                      </div>
                      <div className={cn("text-blue-700 dark:text-blue-300", "text-[10px] xs:text-xs sm:text-sm")}>
                        Grade: {result.health.grade || 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Mentions Results */}
                  {result.mentions && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:p-6">
                      <h3 className={cn("font-semibold mb-2 sm:mb-3 text-green-800 dark:text-green-200", textSizes.xs)}>
                        🎯 AI Visibility
                      </h3>
                      <div className={cn("font-bold text-green-600 dark:text-green-400 mb-1 sm:mb-2", "text-2xl sm:text-3xl")}>
                        {result.mentions.visibility_percentage || result.mentions.total_visibility || 'N/A'}%
                      </div>
                      <div className={cn("text-green-700 dark:text-green-300", "text-[10px] xs:text-xs sm:text-sm")}>
                        Total queries: {result.mentions.total_queries || 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Raw Data */}
                  <details className="mt-4 sm:mt-6">
                    <summary className={cn("cursor-pointer font-semibold text-foreground hover:text-primary transition-colors", textSizes.xs)}>
                      🔍 View Raw Data
                    </summary>
                    <pre className={cn(
                      "mt-2 bg-muted p-3 sm:p-4 rounded-lg overflow-auto max-h-64 sm:max-h-96",
                      "text-[9px] xs:text-[10px] sm:text-xs"
                    )}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}