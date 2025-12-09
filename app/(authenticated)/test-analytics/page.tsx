'use client'

import { useState } from 'react'

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8 text-center">
            🧪 Test Analytics Page
          </h1>
          
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">
              Minimal version with zero dependencies or complex logic
            </p>
            
            {/* BULLETPROOF BUTTON */}
            <button 
              onClick={handleClick}
              disabled={loading}
              style={{
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: loading ? '#cccccc' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Running Analytics...' : '🚀 Run Full Analytics'}
            </button>
            
            {loading && (
              <div className="mt-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-2">This will take ~60 seconds...</p>
              </div>
            )}
          </div>

          {/* RESULTS */}
          {result && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">📊 Results</h2>
              
              {result.error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <strong>Error:</strong> {result.error}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Health Results */}
                  {result.health && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-3 text-blue-800">
                        🏥 AEO Health Score
                      </h3>
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {result.health.overall_score || result.health.score || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Grade: {result.health.grade || 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Mentions Results */}
                  {result.mentions && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-3 text-green-800">
                        🎯 AI Visibility
                      </h3>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {result.mentions.visibility_percentage || result.mentions.total_visibility || 'N/A'}%
                      </div>
                      <div className="text-sm text-gray-600">
                        Total queries: {result.mentions.total_queries || 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Raw Data */}
                  <details className="mt-6">
                    <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                      🔍 View Raw Data
                    </summary>
                    <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
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