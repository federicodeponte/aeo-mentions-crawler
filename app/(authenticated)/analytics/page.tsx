'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, AlertCircle, Sparkles, Bot, Activity, Target } from 'lucide-react'
import { HealthResults } from '@/components/aeo/HealthResults'
import { MentionsResults } from '@/components/aeo/MentionsResults'
import { useContextStorage } from '@/hooks/useContextStorage'

import { toast } from 'sonner'

const LOADING_MESSAGES = [
  '🔍 Analyzing website technical health',
  '🧠 Understanding your company context',
  '🎯 Identifying AI visibility opportunities',
  '💡 Generating semantic queries',
  '🤖 Querying AI platforms (Gemini, ChatGPT)',
  '✨ Compiling comprehensive analytics',
]

export default function AnalyticsPage() {
  const { businessContext } = useContextStorage()
  const [url, setUrl] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [apiKey, setApiKey] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [healthProgress, setHealthProgress] = useState<'idle' | 'running' | 'done'>('idle')
  const [mentionsProgress, setMentionsProgress] = useState<'idle' | 'running' | 'done'>('idle')
  
  // Progress bar state
  const [overallProgress, setOverallProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Rotating message state
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  
  const [healthResult, setHealthResult] = useState<any>(null)
  const [mentionsResult, setMentionsResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const ANALYTICS_STATE_KEY = 'analytics_state'

  // Restore analytics state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(ANALYTICS_STATE_KEY)
    if (!savedState) return

    try {
      const state = JSON.parse(savedState)
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
      
      // Only restore if less than 2 minutes elapsed (reasonable timeout)
      if (elapsed < 120) {
        setLoading(true)
        setUrl(state.url)
        setCompanyName(state.companyName)
        
        // Calculate current progress
        const currentProgress = Math.min((elapsed / 50) * 95, 95)
        const remainingTime = Math.max(0, 50 - elapsed)
        
        setOverallProgress(currentProgress)
        setTimeRemaining(remainingTime)
        
        toast.info('Resuming analytics check...')
        
        // Continue progress bar
        progressIntervalRef.current = setInterval(() => {
          setOverallProgress(prev => {
            const newProgress = prev + (95 / 50)
            return Math.min(newProgress, 95)
          })
          setTimeRemaining(prev => Math.max(0, prev - 1))
        }, 1000)
      } else {
        // Expired, clear it
        sessionStorage.removeItem(ANALYTICS_STATE_KEY)
      }
    } catch (e) {
      console.error('Failed to restore analytics state:', e)
      sessionStorage.removeItem(ANALYTICS_STATE_KEY)
    }
  }, [])

  // Auto-populate from context and settings on mount
  useEffect(() => {
    if (businessContext?.companyWebsite && !url) {
      setUrl(businessContext.companyWebsite)
    }
    if (businessContext?.companyName && !companyName) {
      setCompanyName(businessContext.companyName)
    }
    
    // Load OpenRouter API key from settings
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('openrouter-api-key')
      setApiKey(storedKey)
    }
  }, [businessContext, url, companyName])

  // Rotating messages effect
  useEffect(() => {
    if (!loading) return

    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2000)

    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)

    return () => {
      clearInterval(messageTimer)
      clearInterval(dotTimer)
    }
  }, [loading])

  const handleRunAnalytics = async () => {
    if (!url || !companyName) {
      toast.error('Please enter company name and URL')
      return
    }

    if (!apiKey) {
      toast.error('Please set your OpenRouter API key in Settings first')
      return
    }

    if (!businessContext?.products || businessContext.products.length === 0) {
      toast.error('Please add products/services in Business Context first')
      return
    }

    setLoading(true)
    setError(null)
    setHealthResult(null)
    setMentionsResult(null)
    setHealthProgress('idle')
    setMentionsProgress('idle')
    
    // Start progress tracking
    // Health: ~10s, Mentions: ~40s (fast mode: 10 queries × 2 platforms) = total ~50s
    setTimeRemaining(50)
    setOverallProgress(0)
    
    // Save analytics state to sessionStorage for persistence
    const analyticsState = {
      startTime: Date.now(),
      url,
      companyName,
    }
    sessionStorage.setItem(ANALYTICS_STATE_KEY, JSON.stringify(analyticsState))
    
    progressIntervalRef.current = setInterval(() => {
      setOverallProgress(prev => {
        const newProgress = prev + (95 / 50) // 95% in 50 seconds
        return Math.min(newProgress, 95)
      })
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    try {
      // Run both checks in parallel
      setHealthProgress('running')
      setMentionsProgress('running')

      console.log('[ANALYTICS] Starting analytics checks...')
      console.log('[ANALYTICS] URL:', url)
      console.log('[ANALYTICS] Company:', companyName)
      console.log('[ANALYTICS] Has API key:', !!apiKey)
      console.log('[ANALYTICS] Has products:', businessContext?.products?.length || 0)

      const [healthResponse, mentionsResponse] = await Promise.allSettled([
        // Health Check (~10 seconds)
        fetch('/api/aeo/health-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }).then(async (res) => {
          console.log('[HEALTH] Response status:', res.status)
          const data = await res.json()
          console.log('[HEALTH] Response data keys:', Object.keys(data))
          if (!res.ok) {
            console.error('[HEALTH] Error:', data)
            throw new Error(data.error || 'Health check failed')
          }
          console.log('[HEALTH] Success! Score:', data.score)
          setHealthProgress('done')
          return data
        }).catch(err => {
          console.error('[HEALTH] Fetch failed:', err)
          throw err
        }),
        
        // Mentions Check (~40 seconds for fast mode: 10 queries × 2 platforms)
        fetch('/api/aeo/mentions-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName,
            company_website: url,
            api_key: apiKey,
            gemini_api_key: localStorage.getItem('gemini-api-key') || undefined,
            industry: businessContext?.targetIndustries || '',
            products: businessContext?.products || [],
            description: businessContext?.valueProposition || businessContext?.productDescription || '',
            language: 'english',
            country: businessContext?.countries?.[0] || 'US',
            mode: 'fast', // fast = 5 queries × 3 platforms
          }),
        }).then(async (res) => {
          console.log('[MENTIONS] Response status:', res.status)
          const data = await res.json()
          console.log('[MENTIONS] Response data keys:', Object.keys(data))
          if (!res.ok) {
            console.error('[MENTIONS] Error:', data)
            throw new Error(data.error || 'Mentions check failed')
          }
          console.log('[MENTIONS] Success! Visibility:', data.visibility, '%')
          setMentionsProgress('done')
          return data
        }).catch(err => {
          console.error('[MENTIONS] Fetch failed:', err)
          throw err
        }),
      ])

      // Handle health check result
      if (healthResponse.status === 'fulfilled') {
        console.log('[ANALYTICS] Health check completed successfully')
        setHealthResult(healthResponse.value)
        setHealthProgress('done')
      } else {
        console.error('[ANALYTICS] Health check failed:', healthResponse.reason)
        setHealthProgress('idle')
        toast.error(`Health Check failed: ${healthResponse.reason?.message || 'Unknown error'}`)
      }

      // Handle mentions check result
      if (mentionsResponse.status === 'fulfilled') {
        console.log('[ANALYTICS] Mentions check completed successfully')
        setMentionsResult(mentionsResponse.value)
        setMentionsProgress('done')
      } else {
        console.error('[ANALYTICS] Mentions check failed:', mentionsResponse.reason)
        setMentionsProgress('idle')
        toast.error(`Mentions Check failed: ${mentionsResponse.reason?.message || 'Unknown error'}`)
      }

      // Set error if both failed
      if (healthResponse.status === 'rejected' && mentionsResponse.status === 'rejected') {
        setError('Both analytics checks failed. Please try again.')
      } else if (healthResponse.status === 'fulfilled' || mentionsResponse.status === 'fulfilled') {
        // Success - clear session storage
        sessionStorage.removeItem(ANALYTICS_STATE_KEY)
        
        // Store in localStorage for LOG page
        const timestamp = new Date().toISOString()
        const logEntry = {
          id: `analytics-${Date.now()}`,
          type: 'analytics',
          timestamp,
          company: companyName,
          url,
          healthResult: healthResponse.status === 'fulfilled' ? healthResponse.value : null,
          mentionsResult: mentionsResponse.status === 'fulfilled' ? mentionsResponse.value : null,
        }
        
        const existingLogs = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
        existingLogs.unshift(logEntry) // Add to start
        localStorage.setItem('bulk-gpt-logs', JSON.stringify(existingLogs.slice(0, 50))) // Keep last 50
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run analytics')
      sessionStorage.removeItem(ANALYTICS_STATE_KEY)
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      setOverallProgress(100)
      setTimeRemaining(0)
      setLoading(false)
    }
  }

  const hasContextData = Boolean(businessContext?.companyWebsite && businessContext?.companyName)
  const hasApiKey = Boolean(apiKey)
  const hasProducts = Boolean(businessContext?.products && businessContext.products.length > 0)
  const canRun = hasContextData // Button enabled only if we have context data

  return (
    <div className="h-full flex">
      {/* Left Panel - Input Form */}
      <div className="w-96 border-r border-border p-6 overflow-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Run Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Full AEO analysis: health + visibility
            </p>
          </div>

          {/* AEO Type Selector */}
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              <h3 className="text-sm font-semibold">AEO (Answer Engine Optimization)</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Full AI visibility analysis: technical health check across 29 factors + competitive mentions tracking across AI platforms (Perplexity, ChatGPT, Claude, Gemini).
            </p>
          </div>

          {/* Company Context Display */}
          {hasContextData ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-primary/90">Using Company Context</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Company:</span>
                  <span className="text-xs font-medium">{companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">URL:</span>
                  <span className="text-xs font-medium truncate max-w-[200px]">{url}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-blue-500">No Company Context Set</p>
              <p className="text-xs text-muted-foreground">
                Go to{' '}
                <a href="/context" className="text-primary hover:underline">
                  Business Context
                </a>{' '}
                to set up your company details first.
              </p>
            </div>
          )}

          {/* Context Warning - only if products missing */}
          {!hasProducts && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing context data:</strong> Please add products/services in{' '}
                <a href="/context" className="text-primary hover:underline">
                  Business Context
                </a>
                {' '}for mentions analysis.
              </AlertDescription>
            </Alert>
          )}

          {/* API Key Warning - only if not set */}
          {!hasApiKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>API key required:</strong> Set your OpenRouter key in{' '}
                <a href="/settings" className="text-primary hover:underline">
                  Settings
                </a>
                {' '}for mentions analysis.
              </AlertDescription>
            </Alert>
          )}

          {/* Run Button */}
          <Button
            onClick={handleRunAnalytics}
            disabled={!canRun || loading}
            className="w-full"
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            {loading ? 'Running Analytics...' : 'Run Full Analytics'}
          </Button>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              {/* Animated icon */}
              <div className="relative w-16 h-16 mx-auto">
                {/* Outer ring */}
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                {/* Middle ring */}
                <div className="absolute inset-1 w-14 h-14 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
                {/* Inner sparkle */}
                <div className="w-16 h-16 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                </div>
              </div>

              {/* Loading message */}
              <div className="space-y-2">
                <div className="h-16 flex items-center justify-center px-6">
                  <span
                    key={messageIndex}
                    className="text-sm font-medium text-foreground animate-[fadeIn_0.3s_ease-in-out] text-center whitespace-nowrap"
                  >
                    {LOADING_MESSAGES[messageIndex]}{dots}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center h-5">
                  ~{timeRemaining}s remaining
                </p>
              </div>

              {/* Progress indicators */}
              <div className="w-full max-w-xs mx-auto space-y-3">
                {/* Overall progress bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>AEO Health</span>
                    <Badge variant={healthProgress === 'done' ? 'default' : 'secondary'} className="text-xs">
                      {healthProgress === 'running' ? 'Running...' : healthProgress === 'done' ? '✓' : 'Pending'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>AI Mentions</span>
                    <Badge variant={mentionsProgress === 'done' ? 'default' : 'secondary'} className="text-xs">
                      {mentionsProgress === 'running' ? 'Running...' : mentionsProgress === 'done' ? '✓' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                
                {/* Navigate away message */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 Fast mode: 10 queries across 2 AI platforms
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Health check (~10s) + Mentions analysis (~40s)
                  </p>
                </div>
              </div>

              {/* Add keyframes */}
              <style jsx global>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          </div>
        )}

        {!healthResult && !mentionsResult && !loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Enter company details and click Run to start
              </p>
            </div>
          </div>
        )}

        {(healthResult || mentionsResult) && !loading && (
          <div className="h-full overflow-auto">
            <Tabs defaultValue={healthResult ? 'health' : 'mentions'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="health" disabled={!healthResult}>
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>AEO Health</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="mentions" disabled={!mentionsResult}>
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>AEO Mentions</span>
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="health" className="mt-0">
                {healthResult ? (
                  <HealthResults result={healthResult} url={url} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run a health check to see results here</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="mentions" className="mt-0">
                {mentionsResult ? (
                  <MentionsResults result={mentionsResult} companyName={companyName} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run a mentions check to see results here</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
