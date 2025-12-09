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
import { useMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'

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
  const { businessContext, hasContext } = useContextStorage()
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

  // Mobile detection and tab state
  const { isMobile } = useMobile()
  const [mobileActiveTab, setMobileActiveTab] = useState<string>('input')

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

  // Auto-switch mobile tab to Results when processing starts
  useEffect(() => {
    if (isMobile && loading) {
      setMobileActiveTab('results')
    }
  }, [isMobile, loading])

  const handleRunAnalytics = async () => {
    // Auto-generate fallbacks if missing
    const finalCompanyName = companyName || businessContext?.companyName || 'Test Company'
    const finalUrl = url || businessContext?.companyWebsite || 'https://example.com'
    
    console.log('[ANALYTICS] Using company:', finalCompanyName)
    console.log('[ANALYTICS] Using URL:', finalUrl)

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
      url: finalUrl,
      companyName: finalCompanyName,
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
      console.log('[ANALYTICS] URL:', finalUrl)
      console.log('[ANALYTICS] Company:', finalCompanyName)
      console.log('[ANALYTICS] Has API key:', !!apiKey)
      console.log('[ANALYTICS] Has products:', businessContext?.products?.length || 0)

      // Build full company_analysis object from businessContext (before Promise.allSettled)
      // businessContext.competitors is a string (comma-separated), need to parse it
      const competitorsList = businessContext?.competitors ? businessContext.competitors.split(',').map((c: string) => c.trim()).filter(Boolean).map((c: string) => ({ name: c })) : []

      const companyAnalysis = {
          companyInfo: {
            name: finalCompanyName,
            website: finalUrl,
            description: businessContext?.valueProposition || businessContext?.productDescription || '',
            industry: businessContext?.targetIndustries || businessContext?.icp || '',
            products: businessContext?.products || [],
            // Map other available fields from businessContext
            // Note: Some fields may not exist in BusinessContext interface, so we use empty arrays/strings as defaults
            target_audience: [],
            services: [],
            pain_points: [],
            use_cases: [],
            key_features: [],
            solution_keywords: businessContext?.targetKeywords || [],
            value_propositions: businessContext?.valueProposition ? [businessContext.valueProposition] : [],
            differentiators: [],
            customer_problems: [],
            product_category: businessContext?.productType || '',
            primary_region: businessContext?.countries?.[0] || 'US',
          },
          competitors: competitorsList,
        }

      // ENHANCED FALLBACK LOGIC: Always generate comprehensive company analysis
      if (companyAnalysis?.companyInfo) {
        const products = companyAnalysis.companyInfo.products || []
        const services = companyAnalysis.companyInfo.services || []
        const industryStr = companyAnalysis.companyInfo.industry || ''

        // Always generate fallback products if missing
        if (products.length === 0 && services.length === 0) {
          companyAnalysis.companyInfo.products = [`${finalCompanyName} Services`, `${finalCompanyName} Solutions`]
          console.log('[FALLBACK] Analytics Generated products:', companyAnalysis.companyInfo.products)
        }

        // Always generate comprehensive pain points
        if (companyAnalysis.companyInfo.pain_points.length === 0) {
          const fallbackPainPoints = []
          
          if (industryStr.toLowerCase().includes('seo') || industryStr.toLowerCase().includes('search')) {
            fallbackPainPoints.push('improve search rankings', 'increase online visibility', 'boost website traffic')
          } else if (industryStr.toLowerCase().includes('marketing')) {
            fallbackPainPoints.push('generate more leads', 'improve conversion rates', 'increase brand awareness')
          } else if (industryStr.toLowerCase().includes('saas') || industryStr.toLowerCase().includes('software')) {
            fallbackPainPoints.push('user acquisition', 'reduce churn', 'improve product adoption')
          } else if (industryStr.toLowerCase().includes('ecommerce') || industryStr.toLowerCase().includes('retail')) {
            fallbackPainPoints.push('increase sales', 'reduce cart abandonment', 'improve customer retention')
          } else {
            // Generic business pain points with geographic targeting
            fallbackPainPoints.push(
              'increase revenue', 'improve efficiency', 'reduce costs',
              'comply with US data privacy laws', 'target US enterprise customers',
              'penetrate American B2B markets', 'scale across North American regions'
            )
          }
          
          companyAnalysis.companyInfo.pain_points = fallbackPainPoints.slice(0, 8)
          console.log('[FALLBACK] Analytics Generated pain points:', companyAnalysis.companyInfo.pain_points)
        }

        // Always generate comprehensive data fields required by Python service
        if (companyAnalysis.companyInfo.differentiators.length === 0) {
          companyAnalysis.companyInfo.differentiators = [
            'AI-powered solutions',
            'Real-time analytics',
            'Enterprise-grade security'
          ]
        }

        if (companyAnalysis.companyInfo.customer_problems.length === 0) {
          companyAnalysis.companyInfo.customer_problems = companyAnalysis.companyInfo.pain_points.map(
            pain => pain.replace('improve', 'struggling to improve').replace('increase', 'need to increase').replace('reduce', 'need to reduce')
          )
        }

        // Add geographic targeting data
        companyAnalysis.companyInfo.geographic_modifiers = ['US-based', 'North American', 'American']
        companyAnalysis.companyInfo.country_specific_queries = [
          'how to dominate US market share',
          'best practices for American enterprise sales'
        ]
        
        // Generate use cases if missing
        if (companyAnalysis.companyInfo.use_cases.length === 0) {
          const fallbackUseCases = []
          
          // Base use cases on products/services
          products.concat(services).forEach(item => {
            if (item.toLowerCase().includes('content')) {
              fallbackUseCases.push('content optimization', 'content creation')
            } else if (item.toLowerCase().includes('track') || item.toLowerCase().includes('monitor')) {
              fallbackUseCases.push('performance tracking', 'brand monitoring')
            } else if (item.toLowerCase().includes('analytics')) {
              fallbackUseCases.push('data analysis', 'performance measurement')
            }
          })
          
          // Generic fallbacks if still empty
          if (fallbackUseCases.length === 0) {
            fallbackUseCases.push(
              'business optimization', 'workflow automation', 'performance improvement',
              'US market penetration', 'enterprise client acquisition', 'competitive analysis'
            )
          }
          
          companyAnalysis.companyInfo.use_cases = fallbackUseCases.slice(0, 6)
          console.log('[FALLBACK] Analytics Generated use cases:', companyAnalysis.companyInfo.use_cases)
        }

        // Always ensure target audience is populated
        if (companyAnalysis.companyInfo.target_audience.length === 0) {
          companyAnalysis.companyInfo.target_audience = [
            'B2B enterprises', 'US-based companies', 'Technology firms'
          ]
        }

        // Add debug identifier to track if enhanced data is being used
        companyAnalysis.companyInfo.debug_source = 'analytics_enhanced_v2_comprehensive'
        console.log('[DEBUG] Analytics Final company analysis being sent:', companyAnalysis)
      }

      const [healthResponse, mentionsResponse] = await Promise.allSettled([
        // Health Check (~10 seconds)
        fetch('/api/aeo/health-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl }),
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
        
        // Mentions Check (~40 seconds for fast mode: 10 queries x 2 platforms)
        fetch('/api/aeo/mentions-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: finalCompanyName,
            company_website: finalUrl,
            // Note: API key provided via environment variables
            gemini_api_key: localStorage.getItem('gemini-api-key') || undefined,
            company_analysis: companyAnalysis,
            language: 'english',
            country: businessContext?.countries?.[0] || 'US',
            mode: 'fast', // fast = 5 queries x 3 platforms
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
          company: finalCompanyName,
          url: finalUrl,
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
  const hasProducts = Boolean(businessContext?.products && businessContext.products.length > 0)

  return (
    <div className="h-full flex">
      {/* Desktop: Two-panel layout */}
      <div className="hidden md:flex h-full flex-1">
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
                  <span className="text-xs font-medium">{companyName || 'Test Company'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">URL:</span>
                  <span className="text-xs font-medium truncate max-w-[200px]">{url || 'https://example.com'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-blue-500">No Company Context Set</p>
              <p className="text-xs text-muted-foreground">
                Using demo data. Set up your{' '}
                <a href="/context" className="text-primary hover:underline">
                  Business Context
                </a>{' '}
                for personalized results.
              </p>
            </div>
          )}

          {/* Optional enhancement note */}
          {!hasProducts && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 Add your products/services in{' '}
                <a href="/context" className="text-primary hover:underline">
                  Business Context
                </a>
                {' '}for more targeted results
              </p>
            </div>
          )}


          {/* Run Button */}
          <Button
            onClick={handleRunAnalytics}
            disabled={!hasContext || loading}
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

        {!loading && (
          <div className="h-full flex flex-col">
            <Tabs defaultValue="health" className="w-full flex-1 flex flex-col min-h-0">
              <div className="flex-shrink-0 pb-4">
                <div className="flex justify-center">
                  <TabsList className="w-auto">
                    <TabsTrigger value="health" className="flex-row gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span>AEO Health</span>
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="flex-row gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span>AEO Mentions</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <TabsContent value="health" className="mt-0 h-full">
                  {healthResult ? (
                    <HealthResults result={healthResult} url={url} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Run a health check to see results here</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="mentions" className="mt-0 h-full">
                  {mentionsResult ? (
                    <MentionsResults result={mentionsResult} companyName={companyName} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Run a mentions check to see results here</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
        </div>
      </div>

      {/* Mobile: Tab layout */}
      <div className="md:hidden h-full flex flex-col min-h-0 overflow-hidden">
        <Tabs value={mobileActiveTab} onValueChange={setMobileActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className={cn(
            "flex-shrink-0 w-full rounded-none border-b border-border/40",
            "bg-gradient-to-b from-secondary/30 to-secondary/15"
          )}>
            <TabsTrigger 
              value="input" 
              className="flex-1 data-[state=active]:bg-background/60 data-[state=active]:shadow-sm"
            >
              <span className={textSizes.xs}>Input</span>
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              className={cn(
                "flex-1 flex items-center gap-2",
                "data-[state=active]:bg-background/60 data-[state=active]:shadow-sm"
              )}
            >
              <span className={textSizes.xs}>Results</span>
              {(healthResult || mentionsResult) && (
                <span className="inline-flex items-center justify-center rounded-md bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                  ✓
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
            <div className={cn("flex-1 overflow-auto", containerPadding.md)}>
              <div className="space-y-6">
                <div>
                  <h2 className={cn("font-semibold mb-1", textSizes.sm)}>Run Analytics</h2>
                  <p className={cn("text-muted-foreground", textSizes.xs)}>
                    Full AEO analysis: health + visibility
                  </p>
                </div>

                {/* AEO Type Selector */}
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-500" />
                    <h3 className={cn("font-semibold", textSizes.xs)}>AEO (Answer Engine Optimization)</h3>
                  </div>
                  <p className={cn("text-muted-foreground leading-relaxed", "text-[10px] sm:text-xs")}>
                    Full AI visibility analysis: technical health check across 29 factors + competitive mentions tracking across AI platforms (Perplexity, ChatGPT, Claude, Gemini).
                  </p>
                </div>

                {/* Company Context Display */}
                {hasContextData ? (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
                    <p className={cn("font-medium text-primary/90", textSizes.xs)}>Using Company Context</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>Company:</span>
                        <span className={cn("font-medium truncate max-w-[200px]", "text-[10px] sm:text-xs")}>{companyName || 'Test Company'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>URL:</span>
                        <span className={cn("font-medium truncate max-w-[200px]", "text-[10px] sm:text-xs")}>{url || 'https://example.com'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
                    <p className={cn("font-medium text-blue-500", textSizes.xs)}>No Company Context Set</p>
                    <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                      Using demo data. Set up your{' '}
                      <a href="/context" className="text-primary hover:underline">
                        Business Context
                      </a>{' '}
                      for personalized results.
                    </p>
                  </div>
                )}

                {/* Optional enhancement note */}
                {!hasProducts && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                    <p className={cn("text-blue-600 dark:text-blue-400", "text-[10px] sm:text-xs")}>
                      💡 Add your products/services in{' '}
                      <a href="/context" className="text-primary hover:underline">
                        Business Context
                      </a>
                      {' '}for more targeted results
                    </p>
                  </div>
                )}

                {/* Run Button */}
                <Button
                  onClick={handleRunAnalytics}
                  disabled={!hasContext || loading}
                  className="w-full"
                  size="lg"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {loading ? 'Running Analytics...' : 'Run Full Analytics'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
            <div className="flex-1 flex flex-col overflow-hidden">
              {loading && (
                <div className="h-full flex items-center justify-center">
                  <div className={cn("text-center space-y-4 max-w-md", containerPadding.md)}>
                    {/* Animated icon */}
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                      <div className="absolute inset-1 w-14 h-14 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
                      <div className="w-16 h-16 flex items-center justify-center">
                        <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                      </div>
                    </div>

                    {/* Loading message */}
                    <div className="space-y-2">
                      <div className="h-16 flex items-center justify-center px-6">
                        <span
                          key={messageIndex}
                          className={cn(
                            "font-medium text-foreground animate-[fadeIn_0.3s_ease-in-out] text-center whitespace-nowrap",
                            textSizes.xs
                          )}
                        >
                          {LOADING_MESSAGES[messageIndex]}{dots}
                        </span>
                      </div>
                      <p className={cn("text-muted-foreground text-center h-5", "text-[10px] sm:text-xs")}>
                        ~{timeRemaining}s remaining
                      </p>
                    </div>

                    {/* Progress indicators */}
                    <div className="w-full max-w-xs mx-auto space-y-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${overallProgress}%` }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={textSizes.xs}>AEO Health</span>
                          <Badge variant={healthProgress === 'done' ? 'default' : 'secondary'} className={textSizes.xs}>
                            {healthProgress === 'running' ? 'Running...' : healthProgress === 'done' ? '✓' : 'Pending'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={textSizes.xs}>AI Mentions</span>
                          <Badge variant={mentionsProgress === 'done' ? 'default' : 'secondary'} className={textSizes.xs}>
                            {mentionsProgress === 'running' ? 'Running...' : mentionsProgress === 'done' ? '✓' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                        <p className={cn("text-blue-600 dark:text-blue-400 font-medium", "text-[10px] sm:text-xs")}>
                          💡 Fast mode: 10 queries across 2 AI platforms
                        </p>
                        <p className={cn("text-muted-foreground mt-1", "text-[9px] sm:text-xs")}>
                          Health check (~10s) + Mentions analysis (~40s)
                        </p>
                      </div>
                    </div>

                    <style jsx global>{`
                      @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-4px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                  </div>
                </div>
              )}

              {!loading && (
                <div className="h-full flex flex-col">
                  <Tabs defaultValue="health" className="w-full flex-1 flex flex-col min-h-0">
                    <div className={cn("flex-shrink-0", containerPadding.sm, "pb-4")}>
                      <div className="flex justify-center">
                        <TabsList className="w-auto">
                          <TabsTrigger value="health" className="flex-row gap-1.5">
                            <Activity className="h-3.5 w-3.5" />
                            <span className={textSizes.xs}>AEO Health</span>
                          </TabsTrigger>
                          <TabsTrigger value="mentions" className="flex-row gap-1.5">
                            <Target className="h-3.5 w-3.5" />
                            <span className={textSizes.xs}>AEO Mentions</span>
                          </TabsTrigger>
                        </TabsList>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <TabsContent value="health" className="mt-0 h-full">
                        {healthResult ? (
                          <div className={containerPadding.sm}>
                            <HealthResults result={healthResult} url={url} />
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className={textSizes.xs}>Run a health check to see results here</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="mentions" className="mt-0 h-full">
                        {mentionsResult ? (
                          <div className={containerPadding.sm}>
                            <MentionsResults result={mentionsResult} companyName={companyName} />
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className={textSizes.xs}>Run a mentions check to see results here</p>
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
