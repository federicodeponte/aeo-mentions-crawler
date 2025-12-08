'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  Loader2, 
  Download, 
  FileText, 
  Info, 
  Search, 
  Award, 
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Globe,
  Crown,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { useContextStorage } from '@/hooks/useContextStorage'
import { generateMentionsReportPdf } from '@/lib/exports/aeo-report-generator'
import { generateMentionsExcel } from '@/lib/exports/aeo-excel-generator'

// Helper function for downloading blobs
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface QueryResult {
  query: string
  dimension: string
  platform: string
  raw_mentions: number
  capped_mentions: number
  quality_score: number
  mention_type: string
  position?: number
  source_urls: string[]
  competitor_mentions: Array<{ name: string; count: number }>
  response_text: string
}

interface PlatformStats {
  mentions: number
  quality_score: number
  responses: number
  errors: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
}

interface DimensionStats {
  mentions: number
  quality_score: number
  queries: number
}

interface MentionsResult {
  companyName: string
  visibility: number
  band: string
  mentions: number
  presence_rate: number
  quality_score: number
  max_quality: number
  platform_stats: Record<string, PlatformStats>
  dimension_stats: Record<string, DimensionStats>
  query_results: QueryResult[]
  actualQueriesProcessed: number
  execution_time_seconds: number
  total_cost: number
  total_tokens: number
  mode: string
}

type FilterPlatform = 'all' | string
type FilterDimension = 'all' | string
type FilterMention = 'all' | 'mentioned' | 'not-mentioned'
type SortColumn = 'query' | 'platform' | 'dimension' | 'mentions' | 'quality'
type SortDirection = 'asc' | 'desc'

export function MentionsCheck() {
  const { businessContext, hasContext } = useContextStorage()
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [apiKey, setApiKey] = useState('server-configured') // Use server API key by default
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MentionsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Table filters and sorting
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all')
  const [filterDimension, setFilterDimension] = useState<FilterDimension>('all')
  const [filterMention, setFilterMention] = useState<FilterMention>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('quality')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedResults, setExpandedResults] = useState<string[]>([])
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  // Auto-populate from context on mount
  useEffect(() => {
    // Auto-populate company name from context
    if (businessContext?.companyName && !companyName) {
      setCompanyName(businessContext.companyName)
    }

    // Auto-populate industry from context (use targetIndustries or icp)
    if (!industry) {
      const industryFromContext = businessContext?.targetIndustries || businessContext?.icp
      if (industryFromContext) {
        setIndustry(industryFromContext)
      }
    }
  }, [businessContext, companyName, industry])

  const handleCheck = async () => {
    if (!companyName) return

    // Build company_analysis from business context - MATCHING openaeoanalytics structure
    const companyAnalysis = {
      companyInfo: {
        name: companyName,
        website: businessContext?.companyWebsite || '',
        description: businessContext?.valueProposition || businessContext?.productDescription || `${companyName} is a ${industry || 'company'}`,
        industry: industry || businessContext?.targetIndustries || businessContext?.icp || '',
        target_audience: businessContext?.icp ? [businessContext.icp] : [],
        products: businessContext?.products || [],
        services: businessContext?.services || [], // Use services from context if available
        pain_points: [], // Not in current context schema
        use_cases: [], // Not in current context schema
        key_features: businessContext?.targetKeywords || [],
        solution_keywords: businessContext?.targetKeywords || [],
        value_propositions: businessContext?.valueProposition ? [businessContext.valueProposition] : [],
        differentiators: [],
        customer_problems: [],
        product_category: businessContext?.productType || undefined,
        primary_region: businessContext?.countries?.[0] || undefined,
      },
      competitors: businessContext?.competitors 
        ? businessContext.competitors.split(',').map(c => ({ name: c.trim() }))
        : []
    }

    // Validate we have products or services, or fall back to generated ones based on company info
    const hasProducts = companyAnalysis.companyInfo.products.length > 0
    const hasServices = companyAnalysis.companyInfo.services.length > 0
    const hasDescription = !!companyAnalysis.companyInfo.description
    const hasIndustry = !!companyAnalysis.companyInfo.industry
    
    // If no products/services but we have description or industry, auto-generate basic products
    if (!hasProducts && !hasServices && (hasDescription || hasIndustry)) {
      const industryBasedProduct = industry || businessContext?.targetIndustries || businessContext?.icp
      if (industryBasedProduct) {
        companyAnalysis.companyInfo.products = [`${industryBasedProduct} Solutions`]
      } else {
        companyAnalysis.companyInfo.products = [`${companyName} Services`]
      }
    }
    
    // Final validation - if still no products/services, show error
    if (companyAnalysis.companyInfo.products.length === 0 && companyAnalysis.companyInfo.services.length === 0) {
      setError('Unable to determine your products or services. Please add products/services to your Business Context or specify an industry for better query generation.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/aeo/mentions-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_analysis: companyAnalysis,
          language: 'english',
          country: businessContext?.countries?.[0] || 'US',
          num_queries: 10,
          mode: 'fast',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Mentions check failed')
      }

      setResult(data)
      // Expand all by default
      if (data.query_results) {
        setExpandedResults(data.query_results.map((_: any, idx: number) => `result-${idx}`))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check mentions')
    } finally {
      setLoading(false)
    }
  }

  const getVisibilityColor = (visibility: number) => {
    if (visibility >= 80) return 'text-green-600 dark:text-green-400'
    if (visibility >= 60) return 'text-blue-600 dark:text-blue-400'
    if (visibility >= 40) return 'text-yellow-600 dark:text-yellow-400'
    if (visibility >= 20) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getBandColor = (band: string) => {
    const colors: Record<string, string> = {
      'Dominant': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'Strong': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'Moderate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'Weak': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'Minimal': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    }
    return colors[band] || colors['Minimal']
  }

  const getMentionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'primary': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'contextual': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'competitive': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'passing': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    }
    return colors[type] || colors['passing']
  }

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400'
    if (score >= 6) return 'text-blue-600 dark:text-blue-400'
    if (score >= 4) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  // Get unique platforms and dimensions for filters
  const platforms = useMemo(() => {
    if (!result) return []
    return Array.from(new Set(result.query_results.map(r => r.platform)))
  }, [result])

  const dimensions = useMemo(() => {
    if (!result) return []
    return Array.from(new Set(result.query_results.map(r => r.dimension)))
  }, [result])

  // Filtered and sorted results
  const filteredAndSortedResults = useMemo(() => {
    if (!result) return []

    let filtered = result.query_results.filter(r => {
      // Filter by platform
      if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false
      
      // Filter by dimension
      if (filterDimension !== 'all' && r.dimension !== filterDimension) return false
      
      // Filter by mention status
      if (filterMention === 'mentioned' && r.capped_mentions === 0) return false
      if (filterMention === 'not-mentioned' && r.capped_mentions > 0) return false
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          r.query.toLowerCase().includes(query) ||
          r.platform.toLowerCase().includes(query) ||
          r.dimension.toLowerCase().includes(query) ||
          r.response_text.toLowerCase().includes(query)
        )
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortColumn) {
        case 'query':
          comparison = a.query.localeCompare(b.query)
          break
        case 'platform':
          comparison = a.platform.localeCompare(b.platform)
          break
        case 'dimension':
          comparison = a.dimension.localeCompare(b.dimension)
          break
        case 'mentions':
          comparison = a.capped_mentions - b.capped_mentions
          break
        case 'quality':
          comparison = a.quality_score - b.quality_score
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [result, filterPlatform, filterDimension, filterMention, searchQuery, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(column === 'quality' || column === 'mentions' ? 'desc' : 'asc')
    }
  }

  const handleExportPDF = async () => {
    if (!result) return
    setExportingPDF(true)
    try {
      const blob = await generateMentionsReportPdf(result, result.companyName)
      const filename = `aeo-mentions-${result.companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportExcel = async () => {
    if (!result) return
    setExportingExcel(true)
    try {
      const blob = await generateMentionsExcel(result, result.companyName)
      const filename = `aeo-mentions-${result.companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('Excel export failed:', error)
      alert('Failed to generate Excel. Please try again.')
    } finally {
      setExportingExcel(false)
    }
  }

  const fromContext = {
    name: businessContext?.companyName === companyName,
    industry: businessContext?.targetIndustries === industry || businessContext?.icp === industry,
  }

  // Check if we have additional context that will be used
  const hasAdditionalContext = !!(
    businessContext?.products?.length ||
    businessContext?.valueProposition ||
    businessContext?.targetKeywords?.length ||
    businessContext?.competitors
  )

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-cyan-950/20 border border-purple-100 dark:border-purple-800/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                AEO Mentions Analysis
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                Discover how AI platforms like ChatGPT, Claude, and Perplexity mention your brand.
                Get actionable insights to improve your Answer Engine Optimization.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <Card className="p-6 shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800 hover:ring-gray-300 dark:hover:ring-gray-700 transition-all duration-200">
        <div className="space-y-6">

          {/* Company Name Input */}
          <div className="space-y-3">
            <Label htmlFor="company" className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Company Name *
              {fromContext.name && (
                <Badge variant="secondary" className="text-xs">
                  <Info className="h-3 w-3 mr-1" />
                  From context
                </Badge>
              )}
            </Label>
            <Input
              id="company"
              type="text"
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
              className="h-12 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>

          {/* Industry Input */}
          <div className="space-y-3">
            <Label htmlFor="industry" className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Industry (Optional)
              {fromContext.industry && (
                <Badge variant="secondary" className="text-xs">
                  <Info className="h-3 w-3 mr-1" />
                  From context
                </Badge>
              )}
            </Label>
            <Input
              id="industry"
              type="text"
              placeholder="B2B SaaS"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={loading}
              className="h-12 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Helps generate more relevant test queries
            </p>
          </div>
        </div>
      </Card>

      {/* Context Cards */}
      {!hasContext && !companyName && (
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 ring-1 ring-blue-200 dark:ring-blue-800/30">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                💡 Tip: Set your company details in the Context page for auto-fill
              </p>
            </div>
          </div>
        </Card>
      )}

      {hasAdditionalContext && (
        <Card className="border-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 ring-1 ring-green-200 dark:ring-green-800/30">
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Enhanced with Context Data
                </h3>
                <div className="flex flex-wrap gap-2">
                  {businessContext?.products?.length > 0 && (
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700 dark:border-green-700 dark:text-green-300">
                      Products: {businessContext.products.slice(0, 2).join(', ')}{businessContext.products.length > 2 && ` +${businessContext.products.length - 2} more`}
                    </Badge>
                  )}
                  {businessContext?.valueProposition && (
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700 dark:border-green-700 dark:text-green-300">
                      Value proposition
                    </Badge>
                  )}
                  {businessContext?.targetKeywords?.length > 0 && (
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700 dark:border-green-700 dark:text-green-300">
                      Target keywords
                    </Badge>
                  )}
                  {businessContext?.competitors && (
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700 dark:border-green-700 dark:text-green-300">
                      Competitors
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Action */}
      <div className="space-y-4">
        <Button
          onClick={handleCheck}
          disabled={loading || !companyName}
          size="lg"
          className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
          <div className="relative flex items-center gap-3">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Analyzing Mentions...</span>
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                <span className="font-medium">Start AEO Mentions Check</span>
              </>
            )}
          </div>
        </Button>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Globe className="w-4 h-4" />
          <span>Tests visibility across 4 AI platforms with 10 queries</span>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {result && (
        <div className="space-y-8">
          {/* Hero Results */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
            <div className="absolute inset-0 bg-grid-white opacity-5" />
            <div className="relative p-8">
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-purple-200">
                    AEO Visibility Score
                  </h3>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-6xl font-bold text-white">
                      {result.visibility}%
                    </span>
                    <div className="flex flex-col items-start">
                      <Badge 
                        className={`${getBandColor(result.band)} border-0 text-sm font-semibold px-3 py-1`}
                      >
                        {result.band}
                      </Badge>
                      {result.visibility >= 80 && <Crown className="w-5 h-5 text-yellow-400 mt-1" />}
                      {result.visibility < 20 && <AlertTriangle className="w-5 h-5 text-orange-400 mt-1" />}
                    </div>
                  </div>
                </div>

                <div className="max-w-md mx-auto">
                  <Progress 
                    value={result.visibility} 
                    className="h-3 bg-white/20" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{result.presence_rate}%</div>
                    <div className="text-sm text-purple-200">Presence Rate</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getQualityColor(result.quality_score)}`}>
                      {result.quality_score.toFixed(1)}/10
                    </div>
                    <div className="text-sm text-purple-200">Avg Quality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{result.mentions}</div>
                    <div className="text-sm text-purple-200">Total Mentions</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-purple-200 pt-4 border-t border-white/20">
                  <span>{result.actualQueriesProcessed} queries analyzed</span>
                  <span>•</span>
                  <span>{result.execution_time_seconds}s processing time</span>
                  <span>•</span>
                  <span>${result.total_cost.toFixed(4)} cost</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Performance */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Platform Performance
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Visibility breakdown across AI platforms
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(result.platform_stats).map(([platform, stats]) => (
                  <div key={platform} className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full -mr-8 -mt-8" />
                    <div className="relative space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                          {platform}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {stats.responses} queries
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Mentions</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {stats.mentions}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Quality</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${getQualityColor(stats.quality_score)}`}>
                              {stats.quality_score.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-400">/10</span>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                          <div 
                            className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-600"
                            style={{ width: `${(stats.quality_score / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Export Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-12 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group"
              onClick={handleExportPDF}
              disabled={exportingPDF}
            >
              <div className="flex items-center gap-3">
                {exportingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                <span className="font-medium">
                  {exportingPDF ? 'Generating PDF...' : 'Export PDF Report'}
                </span>
              </div>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-12 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group"
              onClick={handleExportExcel}
              disabled={exportingExcel}
            >
              <div className="flex items-center gap-3">
                {exportingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                <span className="font-medium">
                  {exportingExcel ? 'Generating Excel...' : 'Export Excel Data'}
                </span>
              </div>
            </Button>
          </div>

          {/* Advanced Filters */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Filter & Search
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Refine your analysis results
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search queries, responses, or platforms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-3">
                  {/* Platform Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={filterPlatform === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setFilterPlatform('all')}
                      >
                        All
                      </Button>
                      {platforms.map(p => (
                        <Button
                          key={p}
                          variant={filterPlatform === p ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setFilterPlatform(p)}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Mention Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={filterMention === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setFilterMention('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterMention === 'mentioned' ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs flex items-center gap-1"
                        onClick={() => setFilterMention('mentioned')}
                      >
                        <Eye className="w-3 h-3" />
                        Mentioned
                      </Button>
                      <Button
                        variant={filterMention === 'not-mentioned' ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs flex items-center gap-1"
                        onClick={() => setFilterMention('not-mentioned')}
                      >
                        <EyeOff className="w-3 h-3" />
                        Not Mentioned
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>
                    Showing <strong>{filteredAndSortedResults.length}</strong> of <strong>{result.query_results.length}</strong> results
                  </span>
                  {filteredAndSortedResults.length !== result.query_results.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterPlatform('all')
                        setFilterMention('all')
                      }}
                      className="text-xs"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Query Results */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detailed Results
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AI responses for each query × platform combination
                  </p>
                </div>
              </div>

              <Accordion
                type="multiple"
                value={expandedResults}
                onValueChange={setExpandedResults}
                className="space-y-3"
              >
                {filteredAndSortedResults.map((queryResult, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`result-${idx}`} 
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between w-full text-left">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="font-medium text-gray-900 dark:text-white mb-1 leading-tight">
                            {queryResult.query}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={queryResult.capped_mentions > 0 ? 'default' : 'outline'} 
                              className="text-xs"
                            >
                              {queryResult.platform}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {queryResult.dimension}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${queryResult.capped_mentions > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {queryResult.capped_mentions} mention{queryResult.capped_mentions !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Quality: <span className={`font-medium ${getQualityColor(queryResult.quality_score)}`}>
                                {queryResult.quality_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          
                          <Badge 
                            className={`${getMentionTypeColor(queryResult.mention_type)} border-0`}
                          >
                            {queryResult.mention_type}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-5 pb-5">
                      <div className="space-y-4 pt-1">
                        {/* AI Response */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              AI Response
                            </h4>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {queryResult.response_text || 'No response text available'}
                          </div>
                        </div>
                        
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800/30">
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Raw Mentions</div>
                            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{queryResult.raw_mentions}</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-3 border border-green-100 dark:border-green-800/30">
                            <div className="text-xs font-medium text-green-600 dark:text-green-400">Quality Score</div>
                            <div className={`text-lg font-bold ${getQualityColor(queryResult.quality_score)}`}>
                              {queryResult.quality_score.toFixed(1)}/10
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800/30">
                            <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Type</div>
                            <div className="text-sm font-bold text-purple-900 dark:text-purple-100 capitalize">
                              {queryResult.mention_type}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg p-3 border border-orange-100 dark:border-orange-800/30">
                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">Dimension</div>
                            <div className="text-sm font-bold text-orange-900 dark:text-orange-100 capitalize">
                              {queryResult.dimension}
                            </div>
                          </div>
                        </div>

                        {/* Position */}
                        {queryResult.position && (
                          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-100 dark:border-yellow-800/30">
                            <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                              Mention Position
                            </div>
                            <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                              Position #{queryResult.position} in response
                            </div>
                          </div>
                        )}

                        {/* Competitor Mentions */}
                        {queryResult.competitor_mentions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Also Mentioned
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {queryResult.competitor_mentions.map((comp, i) => (
                                <Badge 
                                  key={i} 
                                  variant="outline" 
                                  className="border-yellow-200 text-yellow-800 dark:border-yellow-700 dark:text-yellow-300"
                                >
                                  {comp.name} ({comp.count})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Source URLs */}
                        {queryResult.source_urls.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Source URLs
                            </h4>
                            <div className="space-y-1">
                              {queryResult.source_urls.slice(0, 3).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline block truncate transition-colors"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
