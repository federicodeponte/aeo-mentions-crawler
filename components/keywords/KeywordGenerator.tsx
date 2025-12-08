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
import { useContextStorage } from '@/hooks/useContextStorage'
import { toast } from 'sonner'

const LOADING_MESSAGES = [
  '🔍 Analyzing your business context',
  '🧠 Understanding your target audience',
  '🎯 Identifying AEO opportunities',
  '💡 Generating keyword clusters',
  '🤖 Optimizing for AI platforms',
  '✨ Finalizing recommendations',
]

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

const LANGUAGES = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'es', label: '🇪🇸 Spanish' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'it', label: '🇮🇹 Italian' },
  { value: 'pt', label: '🇵🇹 Portuguese' },
  { value: 'nl', label: '🇳🇱 Dutch' },
  { value: 'pl', label: '🇵🇱 Polish' },
  { value: 'ru', label: '🇷🇺 Russian' },
  { value: 'ja', label: '🇯🇵 Japanese' },
  { value: 'zh', label: '🇨🇳 Chinese' },
  { value: 'ko', label: '🇰🇷 Korean' },
  { value: 'ar', label: '🇸🇦 Arabic' },
  { value: 'hi', label: '🇮🇳 Hindi' },
  { value: 'tr', label: '🇹🇷 Turkish' },
  { value: 'sv', label: '🇸🇪 Swedish' },
  { value: 'no', label: '🇳🇴 Norwegian' },
  { value: 'da', label: '🇩🇰 Danish' },
  { value: 'fi', label: '🇫🇮 Finnish' },
  { value: 'cs', label: '🇨🇿 Czech' },
  { value: 'hu', label: '🇭🇺 Hungarian' },
  { value: 'ro', label: '🇷🇴 Romanian' },
  { value: 'uk', label: '🇺🇦 Ukrainian' },
  { value: 'el', label: '🇬🇷 Greek' },
  { value: 'he', label: '🇮🇱 Hebrew' },
  { value: 'id', label: '🇮🇩 Indonesian' },
  { value: 'th', label: '🇹🇭 Thai' },
  { value: 'vi', label: '🇻🇳 Vietnamese' },
  { value: 'bg', label: '🇧🇬 Bulgarian' },
  { value: 'hr', label: '🇭🇷 Croatian' },
  { value: 'sk', label: '🇸🇰 Slovak' },
  { value: 'sl', label: '🇸🇮 Slovenian' },
  { value: 'lt', label: '🇱🇹 Lithuanian' },
  { value: 'lv', label: '🇱🇻 Latvian' },
  { value: 'et', label: '🇪🇪 Estonian' },
  { value: 'sr', label: '🇷🇸 Serbian' },
  { value: 'bn', label: '🇧🇩 Bengali' },
  { value: 'fa', label: '🇮🇷 Persian' },
  { value: 'ur', label: '🇵🇰 Urdu' },
  { value: 'ms', label: '🇲🇾 Malay' },
  { value: 'tl', label: '🇵🇭 Filipino' },
  { value: 'sw', label: '🇰🇪 Swahili' },
  { value: 'af', label: '🇿🇦 Afrikaans' },
]

const COUNTRIES = [
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'ES', label: '🇪🇸 Spain' },
  { value: 'IT', label: '🇮🇹 Italy' },
  { value: 'NL', label: '🇳🇱 Netherlands' },
  { value: 'BE', label: '🇧🇪 Belgium' },
  { value: 'CH', label: '🇨🇭 Switzerland' },
  { value: 'AT', label: '🇦🇹 Austria' },
  { value: 'SE', label: '🇸🇪 Sweden' },
  { value: 'NO', label: '🇳🇴 Norway' },
  { value: 'DK', label: '🇩🇰 Denmark' },
  { value: 'FI', label: '🇫🇮 Finland' },
  { value: 'PL', label: '🇵🇱 Poland' },
  { value: 'CZ', label: '🇨🇿 Czech Republic' },
  { value: 'HU', label: '🇭🇺 Hungary' },
  { value: 'RO', label: '🇷🇴 Romania' },
  { value: 'GR', label: '🇬🇷 Greece' },
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'IE', label: '🇮🇪 Ireland' },
  { value: 'BR', label: '🇧🇷 Brazil' },
  { value: 'MX', label: '🇲🇽 Mexico' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'CL', label: '🇨🇱 Chile' },
  { value: 'CO', label: '🇨🇴 Colombia' },
  { value: 'PE', label: '🇵🇪 Peru' },
  { value: 'VE', label: '🇻🇪 Venezuela' },
  { value: 'UY', label: '🇺🇾 Uruguay' },
  { value: 'JP', label: '🇯🇵 Japan' },
  { value: 'CN', label: '🇨🇳 China' },
  { value: 'KR', label: '🇰🇷 South Korea' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'HK', label: '🇭🇰 Hong Kong' },
  { value: 'TW', label: '🇹🇼 Taiwan' },
  { value: 'MY', label: '🇲🇾 Malaysia' },
  { value: 'TH', label: '🇹🇭 Thailand' },
  { value: 'ID', label: '🇮🇩 Indonesia' },
  { value: 'PH', label: '🇵🇭 Philippines' },
  { value: 'VN', label: '🇻🇳 Vietnam' },
  { value: 'BD', label: '🇧🇩 Bangladesh' },
  { value: 'PK', label: '🇵🇰 Pakistan' },
  { value: 'AE', label: '🇦🇪 UAE' },
  { value: 'SA', label: '🇸🇦 Saudi Arabia' },
  { value: 'IL', label: '🇮🇱 Israel' },
  { value: 'TR', label: '🇹🇷 Turkey' },
  { value: 'EG', label: '🇪🇬 Egypt' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'KE', label: '🇰🇪 Kenya' },
  { value: 'MA', label: '🇲🇦 Morocco' },
  { value: 'DZ', label: '🇩🇿 Algeria' },
  { value: 'NZ', label: '🇳🇿 New Zealand' },
  { value: 'RU', label: '🇷🇺 Russia' },
  { value: 'UA', label: '🇺🇦 Ukraine' },
  { value: 'BG', label: '🇧🇬 Bulgaria' },
  { value: 'HR', label: '🇭🇷 Croatia' },
  { value: 'RS', label: '🇷🇸 Serbia' },
  { value: 'SK', label: '🇸🇰 Slovakia' },
  { value: 'SI', label: '🇸🇮 Slovenia' },
  { value: 'LT', label: '🇱🇹 Lithuania' },
  { value: 'LV', label: '🇱🇻 Latvia' },
  { value: 'EE', label: '🇪🇪 Estonia' },
  { value: 'IR', label: '🇮🇷 Iran' },
  { value: 'IQ', label: '🇮🇶 Iraq' },
  { value: 'QA', label: '🇶🇦 Qatar' },
  { value: 'KW', label: '🇰🇼 Kuwait' },
  { value: 'OM', label: '🇴🇲 Oman' },
  { value: 'JO', label: '🇯🇴 Jordan' },
  { value: 'LB', label: '🇱🇧 Lebanon' },
  { value: 'LK', label: '🇱🇰 Sri Lanka' },
  { value: 'NP', label: '🇳🇵 Nepal' },
  { value: 'MM', label: '🇲🇲 Myanmar' },
  { value: 'KH', label: '🇰🇭 Cambodia' },
  { value: 'LA', label: '🇱🇦 Laos' },
  { value: 'MN', label: '🇲🇳 Mongolia' },
  { value: 'KZ', label: '🇰🇿 Kazakhstan' },
  { value: 'UZ', label: '🇺🇿 Uzbekistan' },
  { value: 'GE', label: '🇬🇪 Georgia' },
  { value: 'AM', label: '🇦🇲 Armenia' },
  { value: 'AZ', label: '🇦🇿 Azerbaijan' },
  { value: 'ET', label: '🇪🇹 Ethiopia' },
  { value: 'GH', label: '🇬🇭 Ghana' },
  { value: 'TZ', label: '🇹🇿 Tanzania' },
  { value: 'UG', label: '🇺🇬 Uganda' },
  { value: 'SN', label: '🇸🇳 Senegal' },
  { value: 'CI', label: '🇨🇮 Ivory Coast' },
  { value: 'CM', label: '🇨🇲 Cameroon' },
  { value: 'Global', label: '🌍 Global' },
]

export function KeywordGenerator() {
  const { businessContext, hasContext } = useContextStorage()
  
  // Form state - automatically use context if available
  const [language, setLanguage] = useState('en')
  const [country, setCountry] = useState('US')
  const [numKeywords, setNumKeywords] = useState(50)
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null)
  
  // Progress tracking with sub-stages
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Sub-stage tracking
  const [currentStage, setCurrentStage] = useState('')
  const [currentSubstage, setCurrentSubstage] = useState('')
  const [stageProgress, setStageProgress] = useState<Record<string, number>>({
    company_analysis: 0,
    configuration: 0,
    ai_generation: 0,
    research: 0,
    serp_analysis: 0,
    deduplication: 0,
    clustering: 0,
    finalization: 0,
  })
  
  // Rotating message state
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  
  // Results state
  const [results, setResults] = useState<KeywordResults | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Persistent generation tracking
  const GENERATION_STATE_KEY = 'keyword_generation_state'

  // Restore generation state on mount
  useEffect(() => {
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
        const currentProgress = Math.min((elapsed / 70) * 95, 95)
        const remainingTime = Math.max(0, 70 - elapsed)
        
        setProgress(currentProgress)
        setTimeRemaining(remainingTime)
        
        toast.info('Resuming keyword generation...')
        
        // Continue progress bar
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            const newProgress = prev + (95 / 70)
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
  
  // Load Gemini API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini-api-key')
      setGeminiApiKey(storedKey)
    }
  }, [])

  // Rotating messages effect
  useEffect(() => {
    if (!isGenerating) return

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
  }, [isGenerating])
  
  // Get company info from context
  const companyName = businessContext.companyName || ''
  const companyUrl = businessContext.companyWebsite || ''

  const handleGenerate = useCallback(async () => {
    if (!companyName.trim() || !companyUrl.trim()) {
      toast.error('Please enter company name and URL')
      return
    }

    // API key is optional - server will use env variable if not provided
    // This maintains backward compatibility with BYOK users

    setIsGenerating(true)
    setResults(null)
    setProgress(0)
    setTimeRemaining(480) // Realistic estimate: 8 minutes for full generation
    setCurrentStage('')
    setCurrentSubstage('')
    setStageProgress({
      company_analysis: 0,
      configuration: 0,
      ai_generation: 0,
      research: 0,
      serp_analysis: 0,
      deduplication: 0,
      clustering: 0,
      finalization: 0,
    })

    // Save generation state to sessionStorage for persistence
    const generationState = {
      startTime: Date.now(),
      language,
      country,
      numKeywords,
    }
    sessionStorage.setItem(GENERATION_STATE_KEY, JSON.stringify(generationState))

    try {
      console.log('[KEYWORDS] Starting streaming keyword generation...')
      console.log('[KEYWORDS] Company:', companyName.trim())
      console.log('[KEYWORDS] URL:', companyUrl.trim())
      console.log('[KEYWORDS] Count:', numKeywords)

      const response = await fetch('/api/generate-keywords-stream', {
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
          apiKey: geminiApiKey,
          // Pass all rich context
          description: businessContext.productDescription,
          products: businessContext.products,
          target_audience: businessContext.targetAudience,
          competitors: businessContext.competitors,
          pain_points: businessContext.painPoints,
          value_propositions: businessContext.valuePropositions,
          use_cases: businessContext.useCases,
          content_themes: businessContext.contentThemes,
          tone: businessContext.brandTone,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate keywords' }))
        throw new Error(error.error || error.message || 'Failed to generate keywords')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult = null

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              // Update progress
              setProgress(data.progress)
              setCurrentStage(data.stage)
              setCurrentSubstage(data.substage || '')
              setStageProgress(prev => ({
                ...prev,
                [data.stage]: data.progress
              }))

              // Estimate time remaining based on progress
              const remainingPercent = 100 - data.progress
              const estimatedTotal = 480 // 8 minutes
              const remaining = Math.floor((remainingPercent / 100) * estimatedTotal)
              setTimeRemaining(remaining)
            } else if (data.type === 'result') {
              // Final result
              finalResult = data
            } else if (data.type === 'error') {
              throw new Error(data.error || 'Generation failed')
            }
          } catch (e) {
            console.error('[KEYWORDS] Failed to parse SSE message:', line, e)
          }
        }
      }

      if (finalResult) {
        console.log('[KEYWORDS] Success! Generated', finalResult.keywords?.length || 0, 'keywords')
        setResults(finalResult)
        toast.success(`Generated ${finalResult.keywords.length} keywords!`)
        
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
          count: finalResult.keywords.length,
          generationTime: finalResult.metadata.generation_time,
          keywords: finalResult.keywords,
        }
        
        const existingLogs = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
        existingLogs.unshift(logEntry)
        localStorage.setItem('bulk-gpt-logs', JSON.stringify(existingLogs.slice(0, 50)))
      }
    } catch (error) {
      console.error('Keyword generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate keywords')
      sessionStorage.removeItem(GENERATION_STATE_KEY)
    } finally {
      setIsGenerating(false)
      setProgress(100)
      setTimeRemaining(0)
    }
  }, [companyName, companyUrl, language, country, numKeywords, geminiApiKey, businessContext])

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

          {/* API key is now configured server-side in .env.local */}

          {/* Show company info from context */}
          {hasContext && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-primary/90">Using Company Context</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Company:</span>
                  <span className="text-xs font-medium">{companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">URL:</span>
                  <span className="text-xs font-medium truncate max-w-[200px]">{companyUrl}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="language" className="text-xs font-medium">
                  Language
                </Label>
                <SearchableSelect
                  options={LANGUAGES}
                  value={language}
                  onValueChange={setLanguage}
                  placeholder="Type to search languages..."
                  disabled={isGenerating}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label htmlFor="country" className="text-xs font-medium">
                  Country
                </Label>
                <SearchableSelect
                  options={COUNTRIES}
                  value={country}
                  onValueChange={setCountry}
                  placeholder="Type to search countries..."
                  disabled={isGenerating}
                  className="w-full"
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

              {/* Message with rotation */}
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

              {/* Main Progress bar */}
              <div className="w-full max-w-md mx-auto space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Overall Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Sub-process stages */}
                <div className="space-y-3 text-xs">
                  {/* Company Analysis */}
                  <div className={`space-y-1 ${stageProgress.company_analysis > 0 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.company_analysis === 15 ? '✅' : '🔍'}>
                        </span>
                        Company Analysis
                      </span>
                      {stageProgress.company_analysis > 0 && (
                        <span className="text-muted-foreground">{currentStage === 'company_analysis' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${(stageProgress.company_analysis / 15) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* AI Generation */}
                  <div className={`space-y-1 ${stageProgress.ai_generation > 0 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.ai_generation === 40 ? '✅' : '🤖'}>
                        </span>
                        AI Keyword Generation
                      </span>
                      {stageProgress.ai_generation > 20 && (
                        <span className="text-muted-foreground">{currentStage === 'ai_generation' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((stageProgress.ai_generation - 20) / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Research */}
                  <div className={`space-y-1 ${stageProgress.research > 40 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.research === 60 ? '✅' : '📚'}>
                        </span>
                        Research Phase
                      </span>
                      {stageProgress.research > 40 && (
                        <span className="text-muted-foreground">{currentStage === 'research' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-green-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((stageProgress.research - 40) / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* SERP Analysis */}
                  <div className={`space-y-1 ${stageProgress.serp_analysis > 60 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.serp_analysis === 80 ? '✅' : '🔎'}>
                        </span>
                        SERP Analysis
                      </span>
                      {stageProgress.serp_analysis > 60 && (
                        <span className="text-muted-foreground">{currentStage === 'serp_analysis' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((stageProgress.serp_analysis - 60) / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Deduplication */}
                  <div className={`space-y-1 ${stageProgress.deduplication > 80 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.deduplication === 90 ? '✅' : '🎯'}>
                        </span>
                        Deduplication
                      </span>
                      {stageProgress.deduplication > 80 && (
                        <span className="text-muted-foreground">{currentStage === 'deduplication' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((stageProgress.deduplication - 80) / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Clustering */}
                  <div className={`space-y-1 ${stageProgress.clustering > 90 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.clustering === 95 ? '✅' : '📊'}>
                        </span>
                        Clustering
                      </span>
                      {stageProgress.clustering > 90 && (
                        <span className="text-muted-foreground">{currentStage === 'clustering' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-pink-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((stageProgress.clustering - 90) / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Finalization */}
                  <div className={`space-y-1 ${stageProgress.finalization > 95 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={stageProgress.finalization === 100 ? '✅' : '✨'}>
                        </span>
                        Finalization
                      </span>
                      {stageProgress.finalization > 95 && (
                        <span className="text-muted-foreground">{currentStage === 'finalization' ? currentSubstage : 'complete'}</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-teal-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((stageProgress.finalization - 95) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Navigate away message */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 Feel free to navigate away
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Results will be saved in the{' '}
                    <a href="/log" className="text-primary hover:underline font-medium">
                      LOG
                    </a>
                    {' '}tab
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
                            keyword.difficulty < 30 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            keyword.difficulty < 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
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

