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

interface ResearchSource {
  keyword: string
  quote: string
  url: string
  platform: string
  source_title?: string
  source_author?: string
  source_date?: string
  upvotes?: number
  comments_count?: number
}

interface ContentBriefSource {
  type: string
  platform?: string
  url?: string
  title?: string
  quote?: string
  position?: number
}

interface ContentBrief {
  content_angle: string
  target_questions: string[]
  content_gap: string
  audience_pain_point: string
  recommended_word_count?: number
  fs_opportunity_type?: string
  sources?: ContentBriefSource[]
}

interface SERPRanking {
  position: number
  url: string
  title: string
  description: string
  domain: string
  meta_tags?: Record<string, any>
}

interface CompleteSERPData {
  organic_results: SERPRanking[]
  featured_snippet?: {
    type: string
    text: string
    source_url: string
  }
  paa_questions?: Array<{
    question: string
    answer: string
    source_url: string
  }>
  avg_word_count?: number
  common_content_types?: string[]
}

interface GoogleTrendsData {
  current_interest: number
  trend_direction: string
  is_seasonal: boolean
  rising_related?: string[]
  top_regions?: string[]
}

interface Keyword {
  keyword: string
  intent: string // question, commercial, transactional, comparison, informational
  score: number // company-fit score (0-100)
  cluster_name?: string // semantic cluster grouping
  is_question: boolean
  source: string // ai_generated, research_reddit, research_quora, research_niche, gap_analysis, serp_paa, autocomplete
  volume?: number // monthly search volume
  difficulty?: number // keyword difficulty (0-100)
  aeo_opportunity?: number // AEO opportunity score (0-100)
  has_featured_snippet?: boolean
  has_paa?: boolean
  serp_analyzed?: boolean
  // ENHANCED DATA CAPTURE fields
  research_data?: {
    sources: ResearchSource[]
    total_sources_found: number
    platforms_searched: string[]
    most_mentioned_pain_points?: string[]
  }
  content_brief?: ContentBrief
  serp_data?: CompleteSERPData
  trends_data?: GoogleTrendsData
  autocomplete_data?: {
    seed_keyword: string
    suggestions: string[]
    question_keywords: string[]
    long_tail_keywords: string[]
  }
  // Quick access fields
  research_summary?: string
  research_source_urls?: string[]
  top_ranking_urls?: string[]
  featured_snippet_url?: string
  paa_questions_with_urls?: Array<{question: string; url: string}>
  citations?: any[]
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
  const [enableGoogleTrends, setEnableGoogleTrends] = useState(true)  // Default enabled
  const [enableAutocomplete, setEnableAutocomplete] = useState(true)  // Default enabled
  
  // Simulated progress tracking (for UX engagement)
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState('')
  const [currentSubstage, setCurrentSubstage] = useState('')
  
  // Refs for stage tracking (persist across renders)
  const stageIndexRef = useRef(0)
  const substageIndexRef = useRef(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Dots animation state
  const [dots, setDots] = useState('')
  
  // Results state
  const [results, setResults] = useState<KeywordResults | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Persistent generation tracking
  const GENERATION_STATE_KEY = 'keyword_generation_state'

  // Restore generation state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(GENERATION_STATE_KEY)
    if (!savedState) return

    try {
      const state = JSON.parse(savedState)
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
      
      // Only restore if less than 8 minutes elapsed (reasonable timeout for 5-7 min generation)
      if (elapsed < 480) {
        setIsGenerating(true)
        setLanguage(state.language)
        setCountry(state.country)
        setNumKeywords(state.numKeywords)
        
        // Calculate current progress (based on 360 sec average = 6 min)
        const currentProgress = Math.min((elapsed / 360) * 95, 95)
        
        setProgress(currentProgress)
        toast.info('Resuming keyword generation...')
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

  // Dots animation effect
  useEffect(() => {
    if (!isGenerating) return

    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)

    return () => {
      clearInterval(dotTimer)
    }
  }, [isGenerating])

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [])
  
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
    setCurrentStage('')
    setCurrentSubstage('')

    // Save generation state to sessionStorage for persistence
    const generationState = {
      startTime: Date.now(),
      language,
      country,
      numKeywords,
    }
    sessionStorage.setItem(GENERATION_STATE_KEY, JSON.stringify(generationState))

    // Estimated time: ~6 minutes (360 seconds) for keyword generation
    const estimatedTime = 360
    setProgress(0)

    // Stage definitions
    const stages = [
      { 
        name: 'company_analysis', 
        label: '1/7: Analyzing company context', 
        substages: ['Extracting products/services', 'Identifying target audience', 'Finding differentiators'],
        duration: 30, 
        end: 10 
      },
      { 
        name: 'configuration', 
        label: '2/7: Configuring generation', 
        substages: ['Setting up parameters', 'Loading context', 'Preparing tools'],
        duration: 20, 
        end: 15 
      },
      { 
        name: 'ai_generation', 
        label: '3/7: AI keyword generation', 
        substages: ['Gemini deep research', 'Google Search grounding', 'Hyper-niche variations'],
        duration: 120, 
        end: 40 
      },
      { 
        name: 'research', 
        label: '4/7: Research & enrichment', 
        substages: ['Scraping Reddit/Quora', 'Extracting quotes', 'Building research data'],
        duration: 90, 
        end: 60 
      },
      { 
        name: 'serp_analysis', 
        label: '5/7: SERP analysis', 
        substages: ['Analyzing top 10 results', 'Extracting meta tags', 'Identifying content gaps'],
        duration: 60, 
        end: 75 
      },
      { 
        name: 'deduplication', 
        label: '6/7: Deduplication & scoring', 
        substages: ['Removing duplicates', 'Semantic clustering', 'Calculating scores'],
        duration: 30, 
        end: 85 
      },
      { 
        name: 'clustering', 
        label: '7/7: Final clustering', 
        substages: ['Grouping keywords', 'Assigning clusters', 'Sorting by relevance'],
        duration: 20, 
        end: 95 
      },
    ]

    // Reset refs
    stageIndexRef.current = 0
    substageIndexRef.current = 0
    
    // Initialize first stage immediately
    if (stages.length > 0) {
      setCurrentStage(stages[0].label)
      if (stages[0].substages && stages[0].substages.length > 0) {
        setCurrentSubstage(stages[0].substages[0])
      }
    }

    // Start progress tracking (matching analytics/blogs pattern exactly)
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (95 / estimatedTime) // 95% in 360 seconds = ~0.264% per second
        const rounded = Math.min(newProgress, 95)
        
        // Update stages based on progress
        if (stageIndexRef.current < stages.length && rounded >= stages[stageIndexRef.current].end) {
          stageIndexRef.current++
          substageIndexRef.current = 0
          console.log('[PROGRESS] Stage', stageIndexRef.current, stages[stageIndexRef.current]?.label)
        }
        
        // Update current stage display
        if (stageIndexRef.current < stages.length) {
          const stage = stages[stageIndexRef.current]
          setCurrentStage(stage.label)
          if (stage.substages && stage.substages.length > 0) {
            const subIdx = substageIndexRef.current % stage.substages.length
            setCurrentSubstage(stage.substages[subIdx])
            substageIndexRef.current++
          } else {
            setCurrentSubstage('')
          }
        } else {
          setCurrentStage('7/7: Finalizing results')
          setCurrentSubstage('Preparing output')
        }
        
        return rounded
      })
    }, 1000) // Update every 1 second (matching analytics/blogs)

    try {
      console.log('[KEYWORDS] Starting keyword generation...')
      console.log('[KEYWORDS] Company:', companyName.trim())
      console.log('[KEYWORDS] URL:', companyUrl.trim())
      console.log('[KEYWORDS] Count:', numKeywords)

      // Make the API call while progress animates
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
          // FREE add-ons
          enable_google_trends: enableGoogleTrends,
          enable_autocomplete: enableAutocomplete,
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

      // Get JSON response
      const result = await response.json()

      console.log('[KEYWORDS] Success! Generated', result.keywords?.length || 0, 'keywords')
      
      setResults(result)
      toast.success(`Generated ${result.keywords.length} keywords!`)
      
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
        count: result.keywords.length,
        generationTime: result.metadata.generation_time,
        keywords: result.keywords,
      }
      
      const existingLogs = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
      existingLogs.unshift(logEntry)
      localStorage.setItem('bulk-gpt-logs', JSON.stringify(existingLogs.slice(0, 50)))
    } catch (error) {
      console.error('Keyword generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate keywords')
      sessionStorage.removeItem(GENERATION_STATE_KEY)
    } finally {
      // Clean up progress interval (matching analytics/blogs pattern)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(100)
      setIsGenerating(false)
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
        {isGenerating && !results && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-3xl w-full px-4">
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

              {/* Engaging 7-stage progress (simulated) */}
              <div className="space-y-8">
                {/* Current Stage - Clean and Minimal */}
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-foreground">
                      {currentStage || 'Starting...'}
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                      {currentSubstage || 'Initializing'}{dots}
                    </p>
                  </div>
                  
                  {/* Overall progress bar - bigger and cleaner */}
                  <div className="w-full max-w-2xl mx-auto space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">⏱️ ~5-7 minutes</span>
                      <span className="font-mono font-semibold text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                        style={{ 
                          width: `${Math.max(0, Math.min(100, progress))}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 7-stage breakdown - clean and minimal */}
                <div className="w-full max-w-xl mx-auto space-y-1.5">
                  {[
                    { key: 'company_analysis', icon: '🔍', label: 'Company Analysis', range: [0, 10], duration: '~30s' },
                    { key: 'configuration', icon: '⚙️', label: 'Configuration', range: [10, 15], duration: '~20s' },
                    { key: 'ai_generation', icon: '🤖', label: 'AI Generation', range: [15, 40], duration: '~2min' },
                    { key: 'research', icon: '📚', label: 'Research & Enrichment', range: [40, 60], duration: '~90s' },
                    { key: 'serp_analysis', icon: '🔎', label: 'SERP Analysis', range: [60, 75], duration: '~1min' },
                    { key: 'deduplication', icon: '🎯', label: 'Deduplication', range: [75, 85], duration: '~30s' },
                    { key: 'clustering', icon: '📊', label: 'Final Clustering', range: [85, 95], duration: '~20s' },
                  ].map((stage, idx) => {
                    const [start, end] = stage.range
                    const isActive = progress >= start && progress < end
                    const isComplete = progress >= end
                    const stageProgress = Math.min(Math.max(((progress - start) / (end - start)) * 100, 0), 100)
                    
                    return (
                      <div 
                        key={stage.key}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                          isActive ? 'bg-primary/10 border border-primary/20' : 
                          isComplete ? 'opacity-50' : 
                          'opacity-30'
                        }`}
                      >
                        <span className="text-lg shrink-0">
                          {isComplete ? '✅' : isActive ? '⏳' : stage.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className={`text-xs ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {idx + 1}. {stage.label}
                            </span>
                            {isActive && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {stage.duration}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                isComplete ? 'bg-green-500' : 
                                isActive ? 'bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse transition-[width] duration-[800ms] ease-linear' : 
                                'bg-muted-foreground/20 transition-all duration-500'
                              }`}
                              style={{ width: `${isComplete ? 100 : stageProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Navigate away message - minimal */}
                <div className="border border-border/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    💡 Feel free to navigate away — Results saved in{' '}
                    <a href="/log" className="text-primary hover:underline font-medium">
                      LOG
                    </a>
                  </p>
                </div>
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
                    ['Keyword', 'Intent', 'Score', 'Cluster', 'Source', 'Volume', 'Difficulty', 'AEO Opportunity', 'Featured Snippet', 'PAA', 'Is Question', 'Research Summary', 'Research URLs', 'Content Angle', 'Target Questions', 'Content Gap', 'Audience Pain Point', 'Top SERP URLs', 'Featured Snippet URL', 'PAA Questions', 'Citations', 'Trends Interest', 'Trends Direction'].join(','),
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
                      k.is_question ? 'Yes' : 'No',
                      // Enhanced data fields
                      `"${k.research_summary || ''}"`,
                      `"${k.research_source_urls?.join(' | ') || ''}"`,
                      `"${k.content_brief?.content_angle || ''}"`,
                      `"${k.content_brief?.target_questions?.join('; ') || ''}"`,
                      `"${k.content_brief?.content_gap || ''}"`,
                      `"${k.content_brief?.audience_pain_point || ''}"`,
                      `"${k.top_ranking_urls?.join(' | ') || ''}"`,
                      `"${k.featured_snippet_url || ''}"`,
                      `"${k.paa_questions_with_urls?.map(q => q.question).join('; ') || ''}"`,
                      k.citations?.length || 0,
                      k.trends_data?.current_interest || '',
                      k.trends_data?.trend_direction || ''
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
                    <th className="text-left p-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.keywords.map((keyword, index) => {
                    const isExpanded = expandedRows.has(index)
                    const hasEnhancedData = !!(
                      keyword.research_data?.sources?.length ||
                      keyword.content_brief ||
                      keyword.serp_data ||
                      keyword.trends_data ||
                      keyword.citations?.length
                    )
                    
                    return (
                      <>
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
                      <td className="p-3">
                        {hasEnhancedData ? (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedRows)
                              if (isExpanded) {
                                newExpanded.delete(index)
                              } else {
                                newExpanded.add(index)
                              }
                              setExpandedRows(newExpanded)
                            }}
                            className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                          >
                            {isExpanded ? '▼ Hide' : '▶ View'}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Row with Enhanced Data */}
                    {isExpanded && hasEnhancedData && (
                      <tr key={`${index}-expanded`} className="bg-muted/20">
                        <td colSpan={11} className="p-6">
                          <div className="space-y-6">
                            
                            {/* Research Data */}
                            {keyword.research_data?.sources && keyword.research_data.sources.length > 0 && (
                              <div className="border border-border rounded-lg p-4 bg-card">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <span>🔍</span>
                                  Research Sources ({keyword.research_data.sources.length})
                                </h4>
                                <div className="space-y-3">
                                  {keyword.research_data.sources.slice(0, 3).map((source, i) => (
                                    <div key={i} className="text-xs border-l-2 border-primary/50 pl-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{source.platform}</span>
                                        {source.upvotes && <span className="text-muted-foreground">▲ {source.upvotes}</span>}
                                      </div>
                                      {source.quote && <p className="text-muted-foreground italic mb-1">"{source.quote}"</p>}
                                      {source.url && (
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                          {source.source_title || 'View source'} →
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Content Brief */}
                            {keyword.content_brief && (
                              <div className="border border-border rounded-lg p-4 bg-card">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <span>📝</span>
                                  Content Brief
                                </h4>
                                <div className="space-y-2 text-xs">
                                  {keyword.content_brief.content_angle && (
                                    <div>
                                      <strong>Angle:</strong> {keyword.content_brief.content_angle}
                                    </div>
                                  )}
                                  {keyword.content_brief.audience_pain_point && (
                                    <div>
                                      <strong>Pain Point:</strong> {keyword.content_brief.audience_pain_point}
                                    </div>
                                  )}
                                  {keyword.content_brief.content_gap && (
                                    <div>
                                      <strong>Content Gap:</strong> {keyword.content_brief.content_gap}
                                    </div>
                                  )}
                                  {keyword.content_brief.target_questions && keyword.content_brief.target_questions.length > 0 && (
                                    <div>
                                      <strong>Questions to Answer:</strong>
                                      <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                                        {keyword.content_brief.target_questions.slice(0, 3).map((q, i) => (
                                          <li key={i}>{q}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {keyword.content_brief.sources && keyword.content_brief.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <strong className="text-xs text-muted-foreground">Sources:</strong>
                                      <div className="mt-2 space-y-1.5">
                                        {keyword.content_brief.sources.map((source, i) => (
                                          <div key={i} className="text-xs flex items-start gap-2">
                                            <span className="text-muted-foreground shrink-0">
                                              {source.type === 'research' && '🔍'}
                                              {source.type === 'serp' && '🔎'}
                                              {source.type === 'paa' && '❓'}
                                              {source.type === 'trends' && '📊'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              {source.platform && (
                                                <span className="font-medium">{source.platform}</span>
                                              )}
                                              {source.title && (
                                                <span className="text-muted-foreground">
                                                  {source.platform ? ': ' : ''}{source.title}
                                                </span>
                                              )}
                                              {source.url && (
                                                <a 
                                                  href={source.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="text-primary hover:underline ml-1"
                                                >
                                                  →
                                                </a>
                                              )}
                                              {source.position && (
                                                <span className="text-muted-foreground ml-1">
                                                  (Position {source.position})
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* SERP Data */}
                            {keyword.serp_data?.organic_results && keyword.serp_data.organic_results.length > 0 && (
                              <div className="border border-border rounded-lg p-4 bg-card">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <span>🔎</span>
                                  Top SERP Results ({keyword.serp_data.organic_results.length})
                                </h4>
                                <div className="space-y-2">
                                  {keyword.serp_data.organic_results.slice(0, 5).map((result, i) => (
                                    <div key={i} className="text-xs border-l-2 border-green-500/50 pl-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-muted-foreground">#{result.position}</span>
                                        <span className="text-muted-foreground">{result.domain}</span>
                                      </div>
                                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                                        {result.title}
                                      </a>
                                      {result.description && <p className="text-muted-foreground mt-1">{result.description.slice(0, 150)}...</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Trends Data */}
                            {keyword.trends_data && (
                              <div className="border border-border rounded-lg p-4 bg-card">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <span>📊</span>
                                  Google Trends
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <strong>Interest:</strong> {keyword.trends_data.current_interest}/100
                                  </div>
                                  <div>
                                    <strong>Trend:</strong> {keyword.trends_data.trend_direction}
                                  </div>
                                  <div>
                                    <strong>Seasonal:</strong> {keyword.trends_data.is_seasonal ? 'Yes' : 'No'}
                                  </div>
                                  {keyword.trends_data.rising_related && keyword.trends_data.rising_related.length > 0 && (
                                    <div className="col-span-2">
                                      <strong>Rising:</strong> {keyword.trends_data.rising_related.slice(0, 3).join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Citations */}
                            {keyword.citations && keyword.citations.length > 0 && (
                              <div className="border border-border rounded-lg p-4 bg-card">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <span>📚</span>
                                  Citations ({keyword.citations.length})
                                </h4>
                                <div className="space-y-2 text-xs">
                                  {keyword.citations.slice(0, 3).map((citation, i) => (
                                    <div key={i} className="border-l-2 border-blue-500/50 pl-3">
                                      <div className="font-mono text-muted-foreground">{citation.format_apa || citation.source}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

