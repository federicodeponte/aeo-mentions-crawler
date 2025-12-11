/**
 * Keyword Generator Component
 * Generates AEO-optimized keywords using Gemini AI (standalone, no Modal)
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { COUNTRIES, LANGUAGES } from '@/lib/constants/countries-languages'
import { useContextStorage } from '@/hooks/useContextStorage'
import { CompanySelector } from '@/components/context/CompanySelector'
import { toast } from 'sonner'

const LOADING_MESSAGES = [
  '🔍 Analyzing your business context',
  '🧠 Understanding your target audience',
  '🎯 Identifying AEO opportunities',
  '💡 Generating keyword clusters',
  '🤖 Optimizing for AI platforms',
  '✨ Finalizing recommendations',
]

// Cursor-style subprocess steps with realistic timing (based on actual API test: 460s)
const CURSOR_SUBPROCESS_STEPS = [
  { 
    id: 'context',
    name: 'Analyzing Business Context', 
    duration: 45, // seconds
    substeps: ['Loading company data', 'Parsing business context', 'Identifying market focus']
  },
  { 
    id: 'research',
    name: 'Market Intelligence Research', 
    duration: 90,
    substeps: ['Competitor analysis', 'Forum & community research', 'Google trends analysis']
  },
  { 
    id: 'generate',
    name: 'AI Keyword Generation', 
    duration: 120,
    substeps: ['Gemini AI processing', 'Intent classification', 'Semantic deduplication']
  },
  { 
    id: 'optimize',
    name: 'AEO & SERP Analysis', 
    duration: 150,
    substeps: ['SERP analysis', 'Volume lookup', 'Answer engine optimization']
  },
  { 
    id: 'finalize',
    name: 'Content Brief Generation', 
    duration: 55,
    substeps: ['Content briefs', 'Final validation', 'Export preparation']
  }
] // Total: 460 seconds (7min 40sec) - matches actual API timing test

interface Keyword {
  keyword: string
  intent: string // question, commercial, transactional, comparison, informational
  score: number // company-fit score (0-100)
  cluster_name?: string // semantic cluster grouping
  is_question: boolean
  source: string // ai_generated, research_reddit, research_quora, research_niche, gap_analysis, serp_paa
  volume?: number // monthly search volume
  difficulty?: number // keyword difficulty (0-100)
  aeo_opportunity?: number // AEO opportunity score (0-100)
  has_featured_snippet?: boolean
  has_paa?: boolean
  serp_analyzed?: boolean
  // Legacy fields for backward compatibility
  aeo_type?: string
  search_intent?: string
  relevance_score?: number
  ai_citation_potential?: string
  competition_level?: string
}

interface KeywordResults {
  keywords: Keyword[]
  metadata: {
    company_name: string
    company_url: string
    total_keywords: number
    generation_time: number
  }
}

// Constants moved to shared file for DRY principles

export function KeywordGenerator() {
  const { businessContext, hasContext } = useContextStorage()
  
  // Form state - automatically use context if available
  const [language, setLanguage] = useState('de') // Default to German
  const [country, setCountry] = useState('DE')    // Default to German market
  const [numKeywords, setNumKeywords] = useState(50)
  
  // Progress tracking
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Cursor-style subprocess progression
  const [currentSubprocess, setCurrentSubprocess] = useState(0)
  const [currentSubstep, setCurrentSubstep] = useState(0)
  const [subprocessProgress, setSubprocessProgress] = useState(0)
  const [visibleSubprocesses, setVisibleSubprocesses] = useState<number[]>([])
  const [completedSubprocesses, setCompletedSubprocesses] = useState<number[]>([])
  const [dots, setDots] = useState('')
  const subprocessStartTime = useRef<number>(0)
  
  // Results state
  const [results, setResults] = useState<KeywordResults | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Persistent generation tracking
  const GENERATION_STATE_KEY = 'keyword_generation_state'

  // Restore generation state on mount
  useEffect(() => {
    // FORCE CLEAR OLD SESSION STATE (temporary debug)
    sessionStorage.removeItem(GENERATION_STATE_KEY)
    return // Skip restoration for now
    
    const savedState = sessionStorage.getItem(GENERATION_STATE_KEY)
    if (!savedState) return

    try {
      const state = JSON.parse(savedState)
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
      
      // Only restore if less than 2 minutes elapsed (reasonable timeout)
      if (elapsed < 120) {
        setIsGenerating(true)
        setLanguage(state.language)
        setCountry(state.country)
        setNumKeywords(state.numKeywords)
        
        // Calculate current progress
        const currentProgress = Math.min((elapsed / 120) * 95, 95)
        const remainingTime = Math.max(0, 120 - elapsed)
        
        setProgress(currentProgress)
        setTimeRemaining(remainingTime)
        
        toast.info('Resuming keyword generation...')
        
        // Continue progress bar
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            const newProgress = prev + (95 / 120)
            return Math.min(newProgress, 95)
          })
          setTimeRemaining(prev => Math.max(0, prev - 1))
        }, 1000)
      } else {
        // Expired, clear it
        sessionStorage.removeItem(GENERATION_STATE_KEY)
      }
    } catch (e) {
      console.error('Failed to restore generation state:', e)
      sessionStorage.removeItem(GENERATION_STATE_KEY)
    }
  }, [])
  

  // Cursor-style subprocess progression effect
  useEffect(() => {
    if (!isGenerating) {
      setCurrentSubprocess(0)
      setCurrentSubstep(0)
      setSubprocessProgress(0)
      setVisibleSubprocesses([])
      setCompletedSubprocesses([])
      return
    }

    // Start with first subprocess visible
    setVisibleSubprocesses([0])
    setCurrentSubprocess(0)
    setCurrentSubstep(0)
    setSubprocessProgress(0)
    subprocessStartTime.current = Date.now()

    const subprocessTimer = setInterval(() => {
      const elapsed = (Date.now() - subprocessStartTime.current) / 1000
      const currentSubprocessData = CURSOR_SUBPROCESS_STEPS[currentSubprocess]
      
      if (!currentSubprocessData) return
      
      const progressPct = Math.min((elapsed / currentSubprocessData.duration) * 100, 100)
      setSubprocessProgress(progressPct)
      
      // Update substep based on progress
      const substepProgress = Math.floor((progressPct / 100) * currentSubprocessData.substeps.length)
      setCurrentSubstep(Math.min(substepProgress, currentSubprocessData.substeps.length - 1))
      
      // Move to next subprocess when current one is complete
      if (progressPct >= 100 && currentSubprocess < CURSOR_SUBPROCESS_STEPS.length - 1) {
        setCompletedSubprocesses(prev => [...prev, currentSubprocess])
        const nextSubprocess = currentSubprocess + 1
        setCurrentSubprocess(nextSubprocess)
        setVisibleSubprocesses(prev => [...prev, nextSubprocess])
        setCurrentSubstep(0)
        setSubprocessProgress(0)
        subprocessStartTime.current = Date.now()
      } else if (progressPct >= 100) {
        // All subprocesses complete
        setCompletedSubprocesses(prev => [...prev, currentSubprocess])
      }
    }, 200) // Update every 200ms for smooth animation

    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    return () => {
      clearInterval(subprocessTimer)
      clearInterval(dotTimer)
    }
  }, [isGenerating, currentSubprocess])
  
  // Get company info from context
  const companyName = businessContext.companyName || ''
  const companyUrl = businessContext.companyWebsite || ''

  const handleGenerate = useCallback(async () => {
    if (!companyName.trim() || !companyUrl.trim()) {
      toast.error('Please enter company name and URL')
      return
    }

    // Note: API key is optional on client - server will use GEMINI_API_KEY env var as fallback

    setIsGenerating(true)
    setResults(null)
    setProgress(0)
    setTimeRemaining(120) // Updated to 120 seconds for more realistic timing
    console.log('[DEBUG] Setting time remaining to 120 seconds')

    // Save generation state to sessionStorage for persistence
    const generationState = {
      startTime: Date.now(),
      language,
      country,
      numKeywords,
    }
    sessionStorage.setItem(GENERATION_STATE_KEY, JSON.stringify(generationState))

    // Start progress bar
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (95 / 120) // Reach 95% in 120 seconds
        return Math.min(newProgress, 95)
      })
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    try {
      console.log('[KEYWORDS] Starting keyword generation...')
      console.log('[KEYWORDS] Company:', companyName.trim())
      console.log('[KEYWORDS] URL:', companyUrl.trim())
      console.log('[KEYWORDS] Count:', numKeywords)
      console.log('[KEYWORDS] Has context:', !!businessContext)

      const response = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          company_url: companyUrl.trim(),
          language,
          country,
          num_keywords: numKeywords,
          // Pass all rich context
          description: businessContext.productDescription,
          products: businessContext.products,
          target_audience: businessContext.icp,
          competitors: businessContext.competitors,
          value_propositions: businessContext.valueProposition,
          tone: businessContext.tone,
        }),
      })

      console.log('[KEYWORDS] Response status:', response.status)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate keywords' }))
        console.error('[KEYWORDS] Error response:', error)
        throw new Error(error.error || error.message || 'Failed to generate keywords')
      }

      const data = await response.json()
      console.log('[KEYWORDS] Success! Generated', data.keywords?.length || 0, 'keywords')
      console.log('[KEYWORDS] Response keys:', Object.keys(data))
      setResults(data)
      toast.success(`Generated ${data.keywords.length} keywords in ${data.metadata.generation_time.toFixed(1)}s`)
      
      // Clear generation state on success
      sessionStorage.removeItem(GENERATION_STATE_KEY)
      
      // Store in localStorage for LOG page
      const timestamp = new Date().toISOString()
      const logEntry = {
        id: `kw-${Date.now()}`,
        type: 'keywords',
        timestamp,
        company: companyName.trim(),
        url: companyUrl.trim(),
        language,
        country,
        count: data.keywords.length,
        generationTime: data.metadata.generation_time,
        keywords: data.keywords,
      }
      
      const existingLogs = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
      existingLogs.unshift(logEntry) // Add to start
      localStorage.setItem('bulk-gpt-logs', JSON.stringify(existingLogs.slice(0, 50))) // Keep last 50
    } catch (error) {
      console.error('Keyword generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate keywords')
      // Clear generation state on error
      sessionStorage.removeItem(GENERATION_STATE_KEY)
    } finally {
      setIsGenerating(false)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      setProgress(100)
      setTimeRemaining(0)
    }
  }, [companyName, companyUrl, language, country, numKeywords, businessContext])

  return (
    <div className="h-full flex">
      {/* Left Panel - Input Form */}
      <div className="w-96 border-r border-border p-6 overflow-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Generate Keywords</h2>
            <p className="text-xs text-muted-foreground">
              AI-powered AEO keyword research for maximum AI visibility
            </p>
          </div>

          {/* Company Context Selector */}
          <CompanySelector />

          {/* AEO Explanation */}
          <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-l-4 border-purple-500 rounded-r-lg p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-lg">🤖</span>
              AEO (Answer Engine Optimization)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Optimized for AI platforms like Perplexity, ChatGPT, Claude & Gemini. 
              Focus on conversational queries, questions, and natural language patterns.
            </p>
          </div>

          {/* No Context Warning */}
          {!hasContext && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-blue-500">No Company Context Set</p>
              <p className="text-xs text-muted-foreground">
                Go to{' '}
                <a href="/context" className="text-primary hover:underline">
                  CONTEXT
                </a>
                {' '}tab to analyze a company website first.
              </p>
            </div>
          )}



          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country" className="text-xs font-medium">
                  Country
                </Label>
                <SearchableSelect
                  options={COUNTRIES}
                  value={country}
                  onValueChange={setCountry}
                  placeholder="Type to search countries..."
                  disabled={isGenerating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language" className="text-xs font-medium">
                  Language
                </Label>
                <SearchableSelect
                  options={LANGUAGES}
                  value={language}
                  onValueChange={setLanguage}
                  placeholder="Type to search languages..."
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="num-keywords" className="text-xs font-medium">
                Number of Keywords
              </Label>
              <Input
                id="num-keywords"
                type="number"
                min={10}
                max={200}
                value={numKeywords}
                onChange={(e) => setNumKeywords(Math.max(10, Math.min(200, parseInt(e.target.value) || 50)))}
                className="text-sm"
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!hasContext || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Keywords
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Results Table */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {isGenerating && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Header with overall progress */}
            <div className="flex-shrink-0 p-4 border-b border-border/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Generating Keywords</h3>
                  <span className="text-sm text-muted-foreground">~{timeRemaining}s remaining</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(progress)}% complete
                </div>
              </div>
            </div>

            {/* Cursor-style subprocess cards */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3 max-w-2xl">
                {CURSOR_SUBPROCESS_STEPS.map((subprocess, index) => {
                  const isVisible = visibleSubprocesses.includes(index)
                  const isActive = index === currentSubprocess
                  const isCompleted = completedSubprocesses.includes(index)
                  const isPending = !isVisible
                  
                  if (!isVisible) return null // Subprocess cards appear sequentially
                  
                  return (
                    <div
                      key={subprocess.id}
                      className={`border rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20'
                          : isCompleted
                          ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Status indicator */}
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                              isCompleted
                                ? 'bg-green-500 text-white'
                                : isActive
                                ? 'bg-purple-500 text-white animate-pulse'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isCompleted ? '✓' : isActive ? '⚡' : index + 1}
                          </div>
                          
                          {/* Subprocess content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-medium text-sm ${
                                isActive
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : isCompleted
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-foreground'
                              }`}>
                                {subprocess.name}
                              </h4>
                              
                              {/* Time indicator */}
                              <span className={`text-xs px-2 py-1 rounded ${
                                isCompleted
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : isActive
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {isCompleted ? 'Done' : isActive ? `${subprocess.duration}s` : `${subprocess.duration}s`}
                              </span>
                            </div>
                            
                            {/* Current substep */}
                            {isActive && (
                              <div className="space-y-2">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                  {subprocess.substeps[currentSubstep]}{dots}
                                </p>
                                
                                {/* Individual progress bar */}
                                <div className="w-full bg-purple-100 dark:bg-purple-900/30 rounded-full h-1">
                                  <div
                                    className="bg-purple-500 h-1 rounded-full transition-all duration-200 ease-out"
                                    style={{ width: `${subprocessProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Completed substeps summary */}
                            {isCompleted && (
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {subprocess.substeps.length} tasks completed
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {/* Bottom message */}
                {visibleSubprocesses.length > 0 && (
                  <div className="mt-6 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                      Feel free to navigate away • Results will be saved in the LOG tab
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!results && !isGenerating && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Enter company details and click Generate to start
              </p>
            </div>
          </div>
        )}

        {results && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold">{results.keywords.length} Keywords Generated</h3>
                <p className="text-xs text-muted-foreground">
                  For {results.metadata.company_name} • {results.metadata.generation_time.toFixed(1)}s
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export to CSV with all new OpenKeyword fields
                  const csvContent = [
                    ['Keyword', 'Intent', 'Score', 'Cluster', 'Source', 'Volume', 'Difficulty', 'AEO Opportunity', 'Featured Snippet', 'PAA', 'Is Question'].join(','),
                    ...results.keywords.map(k => [
                      `"${k.keyword}"`,
                      k.intent || k.search_intent || '',
                      k.score || k.relevance_score || 0,
                      k.cluster_name || '',
                      k.source || 'ai_generated',
                      k.volume || 0,
                      k.difficulty || 0,
                      k.aeo_opportunity || 0,
                      k.has_featured_snippet ? 'Yes' : 'No',
                      k.has_paa ? 'Yes' : 'No',
                      k.is_question ? 'Yes' : 'No'
                    ].join(','))
                  ].join('\n')
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  
                  // Better filename with timestamp
                  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
                  const companySlug = results.metadata.company_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
                  a.download = `aeo-keywords-${companySlug}-${timestamp}-${results.keywords.length}kw.csv`
                  
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Export CSV
              </Button>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium min-w-[250px]">Keyword</th>
                    <th className="text-left p-3 font-medium">Intent</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">Cluster</th>
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-left p-3 font-medium">Volume</th>
                    <th className="text-left p-3 font-medium">Difficulty</th>
                    <th className="text-left p-3 font-medium">AEO Opp.</th>
                    <th className="text-left p-3 font-medium">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {results.keywords.map((keyword, index) => (
                    <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{index + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {keyword.is_question && <span className="text-xs" title="Question keyword">❓</span>}
                          <span className="font-medium">{keyword.keyword}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          (keyword.intent || keyword.search_intent) === 'question' || (keyword.intent || keyword.search_intent) === 'informational' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          (keyword.intent || keyword.search_intent) === 'commercial' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          (keyword.intent || keyword.search_intent) === 'transactional' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          (keyword.intent || keyword.search_intent) === 'comparison' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {keyword.intent || keyword.search_intent || 'informational'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                (keyword.score || keyword.relevance_score || 0) >= 80 ? 'bg-green-500' :
                                (keyword.score || keyword.relevance_score || 0) >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${keyword.score || keyword.relevance_score || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{keyword.score || keyword.relevance_score || 0}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{keyword.cluster_name || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          keyword.source?.includes('research') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          keyword.source === 'gap_analysis' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          keyword.source === 'serp_paa' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {keyword.source === 'research_reddit' ? '🔴 Reddit' :
                           keyword.source === 'research_quora' ? '🟠 Quora' :
                           keyword.source === 'research_niche' ? '💬 Forums' :
                           keyword.source === 'gap_analysis' ? '🎯 Gap' :
                           keyword.source === 'serp_paa' ? '💡 PAA' :
                           '🤖 AI'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {keyword.volume && keyword.volume > 0 ? keyword.volume.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {/* Difficulty: Only show if analyzed (not default 50, or explicitly set via SERP/volume lookup) */}
                        {keyword.serp_analyzed || (keyword.difficulty !== undefined && keyword.difficulty !== 50 && keyword.difficulty > 0) ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            (keyword.difficulty ?? 0) < 30 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            (keyword.difficulty ?? 0) < 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {keyword.difficulty}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3">
                        {keyword.aeo_opportunity !== undefined && keyword.aeo_opportunity > 0 ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            keyword.aeo_opportunity >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            keyword.aeo_opportunity >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {keyword.aeo_opportunity}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {keyword.has_featured_snippet && <span className="text-sm" title="Featured Snippet">🌟</span>}
                          {keyword.has_paa && <span className="text-sm" title="People Also Ask">💬</span>}
                          {!keyword.has_featured_snippet && !keyword.has_paa && <span className="text-muted-foreground text-xs">-</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

