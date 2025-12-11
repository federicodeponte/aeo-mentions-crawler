'use client'

import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'

export default function DebugPage() {
  const handleBasicClick = () => {
    alert('✅ Basic click works!')
    console.log('✅ Basic click works!')
  }

  const handleFetchTest = async () => {
    try {
      console.log('🔍 Testing fetch...')
      const response = await fetch('/api/aeo/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          company_name: 'Debug Test'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('✅ Fetch works! Score: ' + (data.score || data.overall_score))
        console.log('✅ Fetch works:', data)
      } else {
        alert('❌ Fetch failed: ' + response.status)
        console.log('❌ Fetch failed:', response.status)
      }
    } catch (error) {
      alert('❌ Fetch error: ' + error.message)
      console.log('❌ Fetch error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(
        "container mx-auto max-w-4xl py-6 sm:py-8 lg:py-10",
        containerPadding.md
      )}>
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center sm:text-left">
            <h1 className={cn("font-bold tracking-tight mb-2 sm:mb-3", textSizes.lg)}>🔧 Browser Debug Test</h1>
            <p className={cn("text-muted-foreground", textSizes.xs)}>Testing basic browser functionality</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className={cn("font-semibold", textSizes.xs)}>Test 1: Basic Click</h2>
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
              <button 
                onClick={handleBasicClick}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-3 font-medium rounded-lg border-0 transition-colors",
                  "bg-green-600 hover:bg-green-700 text-white cursor-pointer",
                  textSizes.xs
                )}
              >
                🟢 Test Basic Click
              </button>
              <span className={cn("text-muted-foreground", "text-[10px] xs:text-xs sm:text-sm")}>← This should show an alert</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className={cn("font-semibold", textSizes.xs)}>Test 2: API Fetch</h2>
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
              <button 
                onClick={handleFetchTest}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-3 font-medium rounded-lg border-0 transition-colors",
                  "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer",
                  textSizes.xs
                )}
              >
                🔵 Test API Fetch
              </button>
              <span className={cn("text-muted-foreground", "text-[10px] xs:text-xs sm:text-sm")}>← This should make an API call</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className={cn("font-semibold", textSizes.xs)}>Browser Info</h2>
            <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-2">
              <p className={cn("break-all", textSizes.xs)}>
                <strong>User Agent:</strong> <span className="text-muted-foreground">{typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A (Server-side)'}</span>
              </p>
              <p className={textSizes.xs}>
                <strong>JavaScript:</strong> <span className="text-green-600">✅ Enabled (you can see this page)</span>
              </p>
              <p className={textSizes.xs}>
                <strong>Cookies:</strong> <span className={typeof navigator !== 'undefined' && navigator.cookieEnabled ? 'text-green-600' : 'text-red-600'}>{typeof navigator !== 'undefined' && navigator.cookieEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
              </p>
              <p className={textSizes.xs}>
                <strong>Local Storage:</strong> <span className={typeof Storage !== 'undefined' ? 'text-green-600' : 'text-red-600'}>{typeof Storage !== 'undefined' ? '✅ Available' : '❌ Not Available'}</span>
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className={cn("font-semibold", textSizes.xs)}>Instructions</h2>
            <ol className={cn("space-y-1.5 sm:space-y-2 list-decimal list-inside text-foreground", textSizes.xs)}>
              <li>Click the <strong>green button</strong> - you should see an alert</li>
              <li>Click the <strong>blue button</strong> - you should see another alert with API data</li>
              <li>Open browser console (F12) to see any error messages</li>
              <li>Report back which buttons work/don't work</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}