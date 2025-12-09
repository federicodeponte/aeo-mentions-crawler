/**
 * Blog Generator Component
 * Generates AEO-optimized blog articles using Gemini AI (standalone, no Modal)
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sparkles, Loader2, Download, Plus, X, Upload, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useContextStorage } from '@/hooks/useContextStorage'
import { useMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'
import { toast } from 'sonner'
import { BlogResultsTable } from './BlogResultsTable'

const LOADING_MESSAGES = [
  '🔍 Researching your topic',
  '📚 Gathering relevant information',
  '✍️ Crafting compelling content',
  '🎯 Optimizing for AEO',
  '🤖 Refining for AI platforms',
  '✨ Finalizing your article',
]

const TONE_EXAMPLES = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Business-focused, formal',
    example: '"Our platform delivers measurable ROI through advanced analytics."',
    bestFor: 'B2B content, corporate blogs, whitepapers'
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Conversational, relaxed',
    example: '"Let\'s dive into how this tool can make your life easier."',
    bestFor: 'Consumer blogs, social content, lifestyle'
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Developer/engineer-focused',
    example: '"The API implements OAuth 2.0 with JWT token validation."',
    bestFor: 'Documentation, dev blogs, technical guides'
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm, approachable',
    example: '"We\'re here to help you succeed every step of the way!"',
    bestFor: 'Customer support, onboarding, community'
  },
  {
    value: 'authoritative',
    label: 'Authoritative',
    description: 'Expert, thought-leadership',
    example: '"Based on 10 years of research, we\'ve identified three key trends."',
    bestFor: 'Industry reports, analyst content, expert columns'
  },
  {
    value: 'educational',
    label: 'Educational',
    description: 'Teaching-focused, clear',
    example: '"Here\'s a step-by-step guide to understanding machine learning."',
    bestFor: 'Tutorials, courses, how-to guides, explainers'
  },
]

interface Citation {
  id: number
  type: string
  source: string
  url: string
  text: string
}

interface InternalLink {
  anchor_text: string
  target_slug: string
  target_title: string
  url?: string
}

interface FAQItem {
  question: string
  answer: string
}

interface PAAItem {
  question: string
  answer: string
}

interface BlogResult {
  title: string
  content: string
  metadata: {
    keyword: string
    word_count: number
    generation_time: number
    company_name: string
    company_url: string
    aeo_score?: number
    job_id?: string
    slug?: string
  }
  
  // Enhanced data (NEW)
  meta_title?: string
  meta_description?: string
  citations?: Citation[]
  citations_count?: number
  internal_links?: InternalLink[]
  internal_links_count?: number
  toc?: Record<string, string>
  faq?: FAQItem[]
  faq_count?: number
  paa?: PAAItem[]
  paa_count?: number
  image_url?: string
  image_alt_text?: string
  image_prompt?: string
  publication_date?: string
  read_time_minutes?: number
}

interface BatchKeyword {
  keyword: string
  word_count?: number
  instructions?: string
}

interface BatchResult {
  batch_id: string
  total: number
  successful: number
  failed: number
  results: Array<{
    keyword: string
    title?: string
    content?: string
    word_count?: number
    aeo_score?: number
    error?: string
  }>
  generation_time: number
}

export function BlogGenerator() {
  const { businessContext, hasContext, updateContext } = useContextStorage()
  
  // Form state
  const [batchMode, setBatchMode] = useState(false)
  const [primaryKeyword, setPrimaryKeyword] = useState('')
  const [batchKeywords, setBatchKeywords] = useState<BatchKeyword[]>([
    { keyword: '' }
  ])
  const [wordCount, setWordCount] = useState(1000)
  const [tone, setTone] = useState('professional')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [systemPrompts, setSystemPrompts] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null)
  
  // Progress tracking
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Mobile detection and tab state
  const { isMobile } = useMobile()
  const [mobileActiveTab, setMobileActiveTab] = useState<string>('input')
  
  // Track if user is actively editing fields (prevent context overwrites)
  const isEditingRef = useRef<{ systemPrompts: boolean; additionalInstructions: boolean }>({
    systemPrompts: false,
    additionalInstructions: false,
  })
  
  // Rotating message state
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  
  // Results state
  const [result, setResult] = useState<BlogResult | null>(null)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Persistent generation tracking
  const GENERATION_STATE_KEY = 'blog_generation_state'

  // Restore generation state on mount
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    try {
      const savedState = sessionStorage.getItem(GENERATION_STATE_KEY)
      if (!savedState) return

      try {
        const state = JSON.parse(savedState)
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
        
        // Only restore if less than 5 minutes elapsed (blogs take longer)
        if (elapsed < 300) {
          setIsGenerating(true)
          setBatchMode(state.batchMode)
          if (state.batchMode) {
            setBatchKeywords(state.batchKeywords || [])
          } else {
            setPrimaryKeyword(state.primaryKeyword || '')
          }
          setWordCount(state.wordCount || 1000)
          setTone(state.tone || 'professional')
          
          // Calculate current progress (estimate 2min for single, 5min for batch)
          const expectedTime = state.batchMode ? 300 : 120
          const currentProgress = Math.min((elapsed / expectedTime) * 95, 95)
          const remainingTime = Math.max(0, expectedTime - elapsed)
          
          setProgress(currentProgress)
          setTimeRemaining(remainingTime)
          
          toast.info('Resuming blog generation...')
          
          // Continue progress bar
          intervalId = setInterval(() => {
            setProgress(prev => {
              const newProgress = prev + (95 / expectedTime)
              return Math.min(newProgress, 95)
            })
            setTimeRemaining(prev => Math.max(0, prev - 1))
          }, 1000)
          
          progressIntervalRef.current = intervalId
        } else {
          // Expired, clear it
          try {
            sessionStorage.removeItem(GENERATION_STATE_KEY)
          } catch (e) {
            console.warn('Failed to clear expired state:', e)
          }
        }
      } catch (e) {
        console.error('Failed to parse generation state:', e)
        try {
          sessionStorage.removeItem(GENERATION_STATE_KEY)
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      console.error('Failed to access sessionStorage:', e)
    }
    
    // Cleanup interval on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [])
  
  // Load Gemini API key and system instructions from localStorage/context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini-api-key')
      setGeminiApiKey(storedKey)
      
      // Only load from context if user is NOT actively editing (prevent overwrites)
      if (!isEditingRef.current.systemPrompts) {
        // Load Client Knowledge Base from context (preferred) or fallback to systemInstructions
        if (businessContext.clientKnowledgeBase) {
          setSystemPrompts(businessContext.clientKnowledgeBase)
        } else if (businessContext.systemInstructions) {
          setSystemPrompts(businessContext.systemInstructions)
        }
      }
      
      // Only load from context if user is NOT actively editing
      if (!isEditingRef.current.additionalInstructions) {
        // Load Content Instructions from context
        if (businessContext.contentInstructions) {
          setAdditionalInstructions(businessContext.contentInstructions)
        }
      }
    }
  }, [businessContext.clientKnowledgeBase, businessContext.contentInstructions, businessContext.systemInstructions])

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

  // Auto-switch mobile tab to Results when generation starts
  useEffect(() => {
    if (isMobile && isGenerating) {
      setMobileActiveTab('results')
    }
  }, [isMobile, isGenerating])
  
  // Get company info from context
  const companyName = businessContext.companyName || ''
  const companyUrl = businessContext.companyWebsite || ''

  const handleCsvUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        // Parse CSV (supports: "keyword", "keyword,word_count", or "keyword,word_count,instructions")
        const keywords = lines
          .map(line => {
            const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
            return {
              keyword: parts[0],
              word_count: parts[1] && !isNaN(parseInt(parts[1])) ? parseInt(parts[1]) : undefined,
              instructions: parts[2] || undefined,
            }
          })
          .filter(k => k.keyword && k.keyword.length > 0)
          .slice(0, 50) // Max 50 keywords

        if (keywords.length === 0) {
          toast.error('No valid keywords found in CSV')
          return
        }

        setBatchKeywords(keywords)
        toast.success(`Loaded ${keywords.length} keywords from CSV`)
      } catch (error) {
        console.error('CSV parse error:', error)
        toast.error('Failed to parse CSV file')
      }
    }

    reader.onerror = () => {
      toast.error('Failed to read CSV file')
    }

    reader.readAsText(file)
    
    // Reset file input
    event.target.value = ''
  }, [])

  const handleGenerate = useCallback(async () => {
    // Prevent multiple simultaneous generations
    if (isGenerating) {
      toast.warning('Generation already in progress')
      return
    }

    if (!batchMode && !primaryKeyword.trim()) {
      toast.error('Please enter a primary keyword')
      return
    }

    if (batchMode) {
      const validKeywords = batchKeywords.filter(k => k.keyword.trim())
      if (validKeywords.length === 0) {
        toast.error('Please enter at least one keyword for batch generation')
        return
      }
    }

    if (!companyName.trim() || !companyUrl.trim()) {
      toast.error('Please analyze a company website in the CONTEXT tab first.')
      return
    }

    // API key is optional - server will use env variable if not provided

    // Clear any existing abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsGenerating(true)
    setResult(null)
    setBatchResult(null)
    setProgress(0)
    
    const estimatedTime = batchMode ? batchKeywords.filter(k => k.keyword.trim()).length * 90 : 60
    setTimeRemaining(estimatedTime)

    // Save generation state to sessionStorage for persistence
    try {
      const generationState = {
        startTime: Date.now(),
        batchMode,
        primaryKeyword,
        batchKeywords,
        wordCount,
        tone,
      }
      sessionStorage.setItem(GENERATION_STATE_KEY, JSON.stringify(generationState))
    } catch (e) {
      console.warn('Failed to save generation state:', e)
      // Continue anyway - not critical
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (95 / estimatedTime)
        return Math.min(newProgress, 95)
      })
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    try {
      const requestBody = batchMode ? {
        keyword: 'batch',
        word_count: wordCount,
        tone: tone,
        system_prompts: systemPrompts.trim() ? systemPrompts.trim().split('\n').filter(p => p.trim()) : [],
        additional_instructions: additionalInstructions.trim(),
        company_name: companyName.trim(),
        company_url: companyUrl.trim(),
        apiKey: geminiApiKey,
        business_context: businessContext,
        batch_mode: true,
        batch_keywords: batchKeywords.filter(k => k.keyword.trim()),
      } : {
        keyword: primaryKeyword.trim(),
        word_count: wordCount,
        tone: tone,
        system_prompts: systemPrompts.trim() ? systemPrompts.trim().split('\n').filter(p => p.trim()) : [],
        additional_instructions: additionalInstructions.trim(),
        company_name: companyName.trim(),
        company_url: companyUrl.trim(),
        apiKey: geminiApiKey,
        business_context: businessContext,
      }

      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate blog' }))
        throw new Error(error.error || error.message || 'Failed to generate blog')
      }

      const data = await response.json()

      // Validate response structure
      if (batchMode) {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format')
        }
        
        const successful = data.successful ?? 0
        const total = data.total ?? 0
        
        setBatchResult(data)
        
        if (successful > 0) {
          toast.success(`Generated ${successful} of ${total} blog articles in ${(data.generation_time || 0).toFixed(1)}s`)
        } else {
          toast.error(`Failed to generate any blogs. ${data.failed || 0} failed.`)
        }
        
        // Clear generation state on success
        try {
          sessionStorage.removeItem(GENERATION_STATE_KEY)
        } catch (e) {
          console.warn('Failed to clear generation state:', e)
        }
        
        // Store batch in localStorage
        try {
          const timestamp = new Date().toISOString()
          const logEntry = {
            id: `batch-${Date.now()}`,
            type: 'blog_batch',
            timestamp,
            company: companyName.trim(),
            url: companyUrl.trim(),
            batchId: data.batch_id,
            total: total,
            successful: successful,
            failed: data.failed || 0,
            generationTime: data.generation_time || 0,
            results: data.results || [],
          }
          
          const existingLogsStr = localStorage.getItem('bulk-gpt-logs')
          let existingLogs: any[] = []
          try {
            existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : []
          } catch (e) {
            console.warn('Failed to parse existing logs, starting fresh:', e)
            existingLogs = []
          }
          
          existingLogs.unshift(logEntry)
          localStorage.setItem('bulk-gpt-logs', JSON.stringify(existingLogs.slice(0, 50)))
        } catch (e) {
          console.warn('Failed to save batch to localStorage:', e)
          // Continue anyway - not critical
        }
      } else {
        // Validate single blog response structure
        if (!data || typeof data !== 'object' || !data.metadata) {
          throw new Error('Invalid response format: missing metadata')
        }
        
        const wordCount = data.metadata.word_count ?? 0
        const generationTime = data.metadata.generation_time ?? 0
        
        setResult(data)
        toast.success(`Generated blog article (${wordCount} words) in ${generationTime.toFixed(1)}s`)
        
        // Clear generation state on success
        try {
          sessionStorage.removeItem(GENERATION_STATE_KEY)
        } catch (e) {
          console.warn('Failed to clear generation state:', e)
        }
        
        // Store in localStorage for LOG page
        try {
          const timestamp = new Date().toISOString()
          const logEntry = {
            id: `blog-${Date.now()}`,
            type: 'blog',
            timestamp,
            company: companyName.trim(),
            url: companyUrl.trim(),
            keyword: primaryKeyword.trim(),
            wordCount: wordCount,
            generationTime: generationTime,
            title: data.title || '',
            content: data.content || '',
            aeoScore: data.metadata.aeo_score,
          }
          
          const existingLogsStr = localStorage.getItem('bulk-gpt-logs')
          let existingLogs: any[] = []
          try {
            existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : []
          } catch (e) {
            console.warn('Failed to parse existing logs, starting fresh:', e)
            existingLogs = []
          }
          
          existingLogs.unshift(logEntry)
          localStorage.setItem('bulk-gpt-logs', JSON.stringify(existingLogs.slice(0, 50)))
        } catch (e) {
          console.warn('Failed to save blog to localStorage:', e)
          // Continue anyway - not critical
        }
      }
    } catch (error) {
      // Don't show error if request was aborted (component unmounted)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Blog generation aborted')
        return
      }
      
      console.error('Blog generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate blog')
      
      // Clear generation state on error
      try {
        sessionStorage.removeItem(GENERATION_STATE_KEY)
      } catch (e) {
        console.warn('Failed to clear generation state:', e)
      }
    } finally {
      setIsGenerating(false)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(100)
      setTimeRemaining(0)
      abortControllerRef.current = null
    }
  }, [batchMode, primaryKeyword, batchKeywords, wordCount, systemPrompts, additionalInstructions, companyName, companyUrl, geminiApiKey, businessContext, isGenerating])

  return (
    <div className="h-full flex">
      {/* Desktop: Two-panel layout */}
      <div className="hidden md:flex h-full flex-1">
        {/* Left Panel - Input Form */}
        <div className="w-96 border-r border-border p-6 overflow-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Generate Blog Article</h2>
            <p className="text-xs text-muted-foreground">
              AI-powered content creation optimized for AEO
            </p>
          </div>

          {/* AEO Explanation */}
          <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-l-4 border-purple-500 rounded-r-lg p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-lg">✍️</span>
              AEO-Optimized Content
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Creates comprehensive articles designed to rank in AI search engines and answer engines.
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
            {/* Batch Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="batch-mode" className="text-sm font-medium cursor-pointer">
                  Batch Generation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate multiple blogs with internal linking
                </p>
              </div>
              <Switch
                id="batch-mode"
                checked={batchMode}
                onCheckedChange={(checked) => {
                  setBatchMode(checked)
                  setResult(null)
                  setBatchResult(null)
                }}
                disabled={isGenerating}
              />
            </div>

            {/* Single Keyword Input */}
            {!batchMode && (
              <div className="space-y-2">
                <Label htmlFor="keyword" className="text-xs font-medium">
                  Primary Keyword <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="keyword"
                  type="text"
                  placeholder="e.g., AI-powered project management"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  className="text-sm"
                  disabled={isGenerating}
                />
              </div>
            )}

            {/* Batch Keywords Input */}
            {batchMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Keywords <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      className="h-7 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload CSV
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBatchKeywords([...batchKeywords, { keyword: '' }])}
                      disabled={isGenerating || batchKeywords.length >= 50}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchKeywords.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={`Keyword ${index + 1}`}
                        value={item.keyword}
                        onChange={(e) => {
                          const updated = [...batchKeywords]
                          updated[index].keyword = e.target.value
                          setBatchKeywords(updated)
                        }}
                        className="text-sm flex-1"
                        disabled={isGenerating}
                      />
                      {batchKeywords.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBatchKeywords(batchKeywords.filter((_, i) => i !== index))
                          }}
                          disabled={isGenerating}
                          className="h-9 px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    💡 CSV Format
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Format: <code className="bg-background px-1 py-0.5 rounded">keyword[,word_count][,instructions]</code>
                  </p>
                  <code className="text-xs block bg-background p-1.5 rounded mt-1 font-mono">
                    AI in healthcare<br/>
                    Machine learning basics,1500<br/>
                    Data science tools,2000,Include case studies
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  🔗 Blogs will automatically link to each other for better SEO
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="word-count" className="text-xs font-medium">
                  Word Count {batchMode && <span className="text-muted-foreground">(default)</span>}
                </Label>
                <Input
                  id="word-count"
                  type="number"
                  min={500}
                  max={3000}
                  value={wordCount}
                  onChange={(e) => setWordCount(Math.max(500, Math.min(3000, parseInt(e.target.value) || 1000)))}
                  className="text-sm"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="tone" className="text-xs font-medium">
                    Tone
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted cursor-help"
                      >
                        examples?
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="max-h-96 overflow-y-auto">
                        {TONE_EXAMPLES.map((toneEx, idx) => (
                          <div
                            key={toneEx.value}
                            className={`p-3 ${idx !== TONE_EXAMPLES.length - 1 ? 'border-b border-border' : ''} ${
                              tone === toneEx.value ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{toneEx.label}</div>
                              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">
                                {toneEx.example}
                              </div>
                              <div className="text-xs text-muted-foreground">→ {toneEx.bestFor}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isGenerating}
                >
                  {TONE_EXAMPLES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Options - Collapsible */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-3 py-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <span className="text-xs">Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-3 space-y-3 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="system-prompts" className="text-xs font-medium">
                      Client Knowledge Base
                    </Label>
                    <Textarea
                      id="system-prompts"
                      placeholder="Company facts (one per line):&#10;We target Fortune 500&#10;We specialize in security"
                      value={systemPrompts}
                      onFocus={() => {
                        isEditingRef.current.systemPrompts = true
                      }}
                      onBlur={() => {
                        isEditingRef.current.systemPrompts = false
                      }}
                      onChange={(e) => {
                        setSystemPrompts(e.target.value)
                        // Save to context
                        updateContext({ clientKnowledgeBase: e.target.value })
                      }}
                      className="text-xs resize-none font-mono"
                      rows={3}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Facts about your company
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions" className="text-xs font-medium">
                      Content Instructions
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="e.g., Include statistics, add case studies"
                      value={additionalInstructions}
                      onFocus={() => {
                        isEditingRef.current.additionalInstructions = true
                      }}
                      onBlur={() => {
                        isEditingRef.current.additionalInstructions = false
                      }}
                      onChange={(e) => {
                        setAdditionalInstructions(e.target.value)
                        // Save to context
                        updateContext({ contentInstructions: e.target.value })
                      }}
                      className="text-xs resize-none"
                      rows={2}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-muted-foreground">
                      How to write the content
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!hasContext || isGenerating || isRefreshing || (!batchMode && !primaryKeyword.trim()) || (batchMode && !batchKeywords.some(k => k.keyword.trim()))}
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
                  {batchMode ? `Generate ${batchKeywords.filter(k => k.keyword.trim()).length} Blogs` : 'Generate Blog Article'}
                </>
              )}
            </Button>
          </div>
        </div>
        </div>

        {/* Right Panel - Results/Loading */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
        {isGenerating && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              {/* Animated icon */}
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-1 w-14 h-14 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
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

              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto space-y-3">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {/* Navigate away message - FIXED HEIGHT */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center h-[76px] flex flex-col justify-center min-w-[300px]">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
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

        {!result && !batchResult && !isGenerating && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {batchMode ? 'Enter keywords and click Generate to start batch' : 'Enter a keyword and click Generate to start'}
              </p>
            </div>
          </div>
        )}

        {batchResult && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Batch Generation Complete</h3>
                <p className="text-xs text-muted-foreground">
                  {batchResult.successful} of {batchResult.total} blogs generated • {batchResult.generation_time.toFixed(1)}s
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const successfulBlogs = batchResult.results.filter(r => !r.error)
                  const csvContent = [
                    [
                      'Keyword', 'Title', 'Word Count', 'Read Time', 'AEO Score', 'Status',
                      'Meta Title', 'Meta Description', 'Citations', 'Internal Links', 
                      'FAQ Count', 'PAA Count', 'Image URL', 'Publication Date'
                    ].join(','),
                    ...batchResult.results.map(r => [
                      `"${r.keyword}"`,
                      `"${r.title || ''}"`,
                      r.word_count || 0,
                      r.read_time_minutes || 0,
                      r.aeo_score || 0,
                      r.error ? 'Failed' : 'Success',
                      `"${r.meta_title || ''}"`,
                      `"${r.meta_description || ''}"`,
                      r.citations_count || 0,
                      r.internal_links_count || 0,
                      r.faq_count || 0,
                      r.paa_count || 0,
                      `"${r.image_url || ''}"`,
                      `"${r.publication_date || ''}"`
                    ].join(','))
                  ].join('\n')

                  const blob = new Blob([csvContent], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  
                  const timestamp = new Date().toISOString().split('T')[0]
                  a.download = `batch-blogs-${timestamp}-${batchResult.batch_id.slice(-8)}.csv`
                  
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Batch summary exported')
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <div className="divide-y divide-border">
                {batchResult.results.map((blogResult, index) => (
                  <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{index + 1}.</span>
                          <span className="text-sm font-semibold">{blogResult.keyword}</span>
                          {blogResult.error ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Success
                            </span>
                          )}
                        </div>
                        {blogResult.title && (
                          <p className="text-sm text-muted-foreground pl-6">{blogResult.title}</p>
                        )}
                        {blogResult.error && (
                          <p className="text-xs text-destructive pl-6">{blogResult.error}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pl-6">
                          {blogResult.word_count && (
                            <span>{blogResult.word_count} words</span>
                          )}
                          {blogResult.aeo_score !== undefined && (
                            <span className="font-medium text-primary">AEO: {blogResult.aeo_score}/100</span>
                          )}
                        </div>
                      </div>
                      {blogResult.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const markdown = `# ${blogResult.title}\n\n${blogResult.content}`
                            const blob = new Blob([markdown], { type: 'text/markdown' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            
                            const timestamp = new Date().toISOString().split('T')[0]
                            const keywordSlug = blogResult.keyword.replace(/[^a-z0-9]/gi, '-').toLowerCase()
                            a.download = `blog-${keywordSlug}-${timestamp}.md`
                            
                            a.click()
                            URL.revokeObjectURL(url)
                            toast.success('Blog exported')
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="flex flex-col h-full overflow-hidden">
            <BlogResultsTable 
              result={result}
              onDownload={() => {
                // Export as Markdown
                const markdown = `# ${result.title}\n\n${result.content}`
                const blob = new Blob([markdown], { type: 'text/markdown' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                
                const timestamp = new Date().toISOString().split('T')[0]
                const keywordSlug = result.metadata.keyword.replace(/[^a-z0-9]/gi, '-').toLowerCase()
                a.download = `blog-${keywordSlug}-${timestamp}.md`
                
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Blog exported as Markdown')
              }}
            />
            
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                    if (!result.content) {
                      toast.error('No content to refresh')
                      return
                    }
                    
                    // API key is optional - server will use env variable if not provided
                    
                    setIsRefreshing(true)
                    
                    // Create abort controller for refresh
                    const refreshAbortController = new AbortController()
                    
                    try {
                      // Build instructions from context (consistent format with generation)
                      const instructions: string[] = []
                      
                      // Use same format as generation: split by newlines for Client Knowledge Base
                      if (businessContext.clientKnowledgeBase) {
                        const knowledgeBaseLines = businessContext.clientKnowledgeBase
                          .split('\n')
                          .filter(line => line.trim())
                        instructions.push(...knowledgeBaseLines)
                      }
                      
                      // Add Content Instructions as single instruction
                      if (businessContext.contentInstructions) {
                        instructions.push(businessContext.contentInstructions)
                      }
                      
                      // Fallback to systemInstructions if no specific instructions
                      if (businessContext.systemInstructions && instructions.length === 0) {
                        const systemLines = businessContext.systemInstructions
                          .split('\n')
                          .filter(line => line.trim())
                        instructions.push(...systemLines)
                      }
                      
                      // Fallback if no instructions set
                      if (instructions.length === 0) {
                        instructions.push('Update to latest information', 'Improve clarity')
                      }
                      
                      const response = await fetch('/api/refresh-blog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          content: result.content,
                          content_format: 'html',
                          instructions: instructions,
                          output_format: 'html',
                          apiKey: geminiApiKey,
                        }),
                        signal: refreshAbortController.signal,
                      })
                      
                      if (!response.ok) {
                        // Parse error response for better error messages
                        let errorMessage = 'Refresh failed'
                        try {
                          const errorData = await response.json()
                          errorMessage = errorData.error || errorData.message || errorMessage
                        } catch {
                          // If JSON parse fails, use status text
                          errorMessage = `Refresh failed: ${response.status} ${response.statusText}`
                        }
                        throw new Error(errorMessage)
                      }
                      
                      const refreshData = await response.json()
                      
                      // Validate response structure
                      if (!refreshData || typeof refreshData !== 'object') {
                        throw new Error('Invalid response format')
                      }
                      
                      if (refreshData.success && refreshData.refreshed_html) {
                        setResult({
                          ...result,
                          content: refreshData.refreshed_html,
                        })
                        toast.success('Blog refreshed successfully')
                      } else {
                        throw new Error(refreshData.error || 'Refresh failed')
                      }
                    } catch (error) {
                      // Don't show error if request was aborted
                      if (error instanceof Error && error.name === 'AbortError') {
                        console.log('Refresh aborted')
                        return
                      }
                      
                      toast.error(error instanceof Error ? error.message : 'Failed to refresh blog')
                    } finally {
                      setIsRefreshing(false)
                    }
                  }}
                  disabled={isGenerating || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: result.content }} />
            </div>
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
              {(result || batchResult) && (
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
                  <h2 className={cn("font-semibold mb-1", textSizes.sm)}>Generate Blog Article</h2>
                  <p className={cn("text-muted-foreground", textSizes.xs)}>
                    AI-powered content creation optimized for AEO
                  </p>
                </div>

                {/* AEO Explanation */}
                <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-l-4 border-purple-500 rounded-r-lg p-4 space-y-1">
                  <p className={cn("font-semibold text-foreground flex items-center gap-2", textSizes.xs)}>
                    <span className="text-lg">✍️</span>
                    AEO-Optimized Content
                  </p>
                  <p className={cn("text-muted-foreground leading-relaxed", "text-[10px] sm:text-xs")}>
                    Creates comprehensive articles designed to rank in AI search engines and answer engines.
                  </p>
                </div>

                {/* Company Context */}
                {!hasContext && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
                    <p className={cn("font-medium text-blue-500", textSizes.xs)}>No Company Context Set</p>
                    <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                      Set up your{' '}
                      <a href="/context" className="text-primary hover:underline">
                        Business Context
                      </a>{' '}
                      for personalized content generation.
                    </p>
                  </div>
                )}

                {hasContext && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
                    <p className={cn("font-medium text-primary/90", textSizes.xs)}>Using Company Context</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>Company:</span>
                        <span className={cn("font-medium truncate max-w-[200px]", "text-[10px] sm:text-xs")}>{companyName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Batch Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="batch-mode"
                    checked={batchMode}
                    onCheckedChange={setBatchMode}
                  />
                  <Label htmlFor="batch-mode" className={cn("font-medium", textSizes.xs)}>
                    Batch Mode {batchKeywords.length > 1 && `(${batchKeywords.length} keywords)`}
                  </Label>
                </div>

                {/* Keyword Input */}
                {!batchMode ? (
                  <div>
                    <Label className={cn("font-medium", textSizes.xs)}>Primary Keyword</Label>
                    <Input
                      placeholder="e.g., AI content marketing"
                      value={primaryKeyword}
                      onChange={(e) => setPrimaryKeyword(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className={cn("font-medium", textSizes.xs)}>Keywords for Batch Generation</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          ref={fileInputRef}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className={textSizes.xs}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Import CSV
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {batchKeywords.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder={`Keyword ${index + 1}`}
                            value={item.keyword}
                            onChange={(e) => {
                              const newKeywords = [...batchKeywords]
                              newKeywords[index] = { keyword: e.target.value }
                              setBatchKeywords(newKeywords)
                            }}
                            className={textSizes.xs}
                          />
                          {batchKeywords.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newKeywords = batchKeywords.filter((_, i) => i !== index)
                                setBatchKeywords(newKeywords.length > 0 ? newKeywords : [{ keyword: '' }])
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBatchKeywords([...batchKeywords, { keyword: '' }])}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        <span className={textSizes.xs}>Add Keyword</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Word Count */}
                <div>
                  <Label className={cn("font-medium", textSizes.xs)}>Word Count: {wordCount}</Label>
                  <input
                    type="range"
                    min="500"
                    max="3000"
                    step="250"
                    value={wordCount}
                    onChange={(e) => setWordCount(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>500</span>
                    <span>3000</span>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!batchMode && !primaryKeyword.trim()) || (batchMode && !batchKeywords.some(k => k.keyword.trim()))}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className={textSizes.xs}>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span className={textSizes.xs}>
                        Generate {batchMode ? `${batchKeywords.filter(k => k.keyword.trim()).length} Articles` : 'Article'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
            <div className="flex-1 flex flex-col overflow-hidden">
              {isGenerating && (
                <div className="h-full flex items-center justify-center">
                  <div className={cn("text-center space-y-4 max-w-md", containerPadding.md)}>
                    {/* Progress indicator */}
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                      <div className="absolute inset-1 w-14 h-14 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
                      <div className="w-16 h-16 flex items-center justify-center">
                        <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                      </div>
                    </div>

                    {/* Current message */}
                    <div className="space-y-2">
                      <p className={cn("font-medium text-foreground", textSizes.xs)}>
                        {LOADING_MESSAGES[messageIndex]}{dots}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                        ~{timeRemaining}s remaining
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isGenerating && !result && !batchResult && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className={cn("text-muted-foreground", textSizes.xs)}>
                      Generate an article to see results here
                    </p>
                  </div>
                </div>
              )}

              {(result || batchResult) && (
                <div className="flex-1 overflow-y-auto">
                  <div className={containerPadding.sm}>
                    {batchResult ? (
                      <div>
                        <h3 className={cn("font-semibold mb-4", textSizes.sm)}>
                          Batch Results ({batchResult.results.length} articles)
                        </h3>
                        <div className="space-y-3">
                          {batchResult.results.map((blogResult, index) => (
                            <div key={index} className="border border-border rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <span className={cn("font-medium", textSizes.xs)}>
                                  {index + 1}. {blogResult.keyword}
                                </span>
                                <span className={cn(
                                  "px-2 py-1 rounded text-xs font-medium",
                                  blogResult.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                )}>
                                  {blogResult.status}
                                </span>
                              </div>
                              {blogResult.title && (
                                <p className={cn("text-muted-foreground font-medium", "text-[10px] sm:text-xs")}>
                                  {blogResult.title}
                                </p>
                              )}
                              {blogResult.word_count && (
                                <p className={cn("text-muted-foreground", "text-[9px] sm:text-xs")}>
                                  {blogResult.word_count} words
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : result && (
                      <div className="space-y-4">
                        <div>
                          <h3 className={cn("font-semibold", textSizes.sm)}>{result.title}</h3>
                          <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                            {result.word_count} words
                          </p>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[11px] sm:text-sm">
                          <div dangerouslySetInnerHTML={{ __html: result.content }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
  
  // Cleanup on unmount - clear intervals and abort requests
  useEffect(() => {
    return () => {
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])
}

