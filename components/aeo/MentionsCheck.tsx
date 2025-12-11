'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { COUNTRIES, LANGUAGES } from '@/lib/constants/countries-languages'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, Download, FileText, Info, TrendingUp, TrendingDown, Search, Award } from 'lucide-react'
import { useContextStorage } from '@/hooks/useContextStorage'
import { generateMentionsPDF } from '@/lib/exports/aeo-report-generator'
import { generateMentionsExcel, downloadBlob } from '@/lib/exports/aeo-excel-generator'

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
  const [market, setMarket] = useState('DE') // Default to German market
  const [language, setLanguage] = useState('de') // Default to German language (ISO code)
  const [apiKey, setApiKey] = useState('')
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

  // Auto-populate from context and settings on mount
  useEffect(() => {
    // Load OpenRouter API key from settings
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('openrouter-api-key')
      if (storedKey && !apiKey) {
        setApiKey(storedKey)
      }
    }

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

    // Auto-populate market from context countries
    if (businessContext?.countries?.length && market === 'DE') {
      const contextCountry = businessContext.countries[0]
      setMarket(contextCountry)
    }
  }, [businessContext, apiKey, companyName, industry, market])

  const handleCheck = async () => {
    if (!companyName) return
    if (!apiKey) {
      setError('OpenRouter API key is required for mentions check')
      return
    }

    // Build company_analysis from business context - MATCHING openaeoanalytics structure
    const companyAnalysis = {
      companyInfo: {
        name: companyName,
        website: businessContext?.companyWebsite || '',
        description: businessContext?.valueProposition || businessContext?.productDescription || `${companyName} is a ${industry || 'company'}`,
        industry: industry || businessContext?.targetIndustries || businessContext?.icp || '',
        target_audience: businessContext?.icp ? [businessContext.icp] : [],
        products: businessContext?.products || [],
        services: [], // Could map from products if needed
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

    // Validate we have products or services
    const hasProducts = companyAnalysis.companyInfo.products.length > 0
    const hasServices = companyAnalysis.companyInfo.services.length > 0
    
    if (!hasProducts && !hasServices) {
      setError('Please add products or services to your Business Context first. This is required to generate relevant queries for the mentions check.')
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
          language: language === 'de' ? 'german' : language === 'en' ? 'english' : language, // Convert ISO to backend format
          country: market,
          num_queries: 10,
          mode: 'fast',
          api_key: apiKey,
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

    const filtered = result.query_results.filter(r => {
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

  const handleExportPDF = () => {
    if (!result) return
    setExportingPDF(true)
    try {
      const blob = generateMentionsPDF(result)
      const filename = `aeo-mentions-${result.companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportExcel = () => {
    if (!result) return
    setExportingExcel(true)
    try {
      const blob = generateMentionsExcel(result)
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
    apiKey: apiKey && typeof window !== 'undefined' && localStorage.getItem('openrouter-api-key') === apiKey,
  }

  // Check if we have additional context that will be used
  const hasAdditionalContext = !!(
    businessContext?.products?.length ||
    businessContext?.valueProposition ||
    businessContext?.targetKeywords?.length ||
    businessContext?.competitors
  )

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="openrouter-key" className="flex items-center gap-2">
            OpenRouter API Key *
            {fromContext.apiKey && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                From settings
              </span>
            )}
          </Label>
          <Input
            id="openrouter-key"
            type="password"
            placeholder="sk-or-v1-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Set in{' '}
            <a href="/settings" className="text-primary hover:underline">
              Settings
            </a>
            {' '}or paste here. Get your key from{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company" className="flex items-center gap-2">
            Company Name *
            {fromContext.name && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                From context
              </span>
            )}
          </Label>
          <Input
            id="company"
            type="text"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry" className="flex items-center gap-2">
            Industry (Optional)
            {fromContext.industry && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                From context
              </span>
            )}
          </Label>
          <Input
            id="industry"
            type="text"
            placeholder="B2B SaaS"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Helps generate more relevant test queries
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-xs font-medium">
              Country
            </Label>
            <SearchableSelect
              options={COUNTRIES}
              value={market}
              onValueChange={setMarket}
              placeholder="Type to search countries..."
              disabled={loading}
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
              disabled={loading}
            />
          </div>
        </div>

        {!hasContext && !companyName && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-400">
              💡 Tip: Set your company details in the Context page for auto-fill
            </p>
          </Card>
        )}

        {hasAdditionalContext && (
          <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-green-800 dark:text-green-400 space-y-1">
                <p className="font-medium">Using context data to enhance mentions check:</p>
                <ul className="list-disc list-inside space-y-0.5 text-green-700 dark:text-green-500">
                  {businessContext?.products?.length > 0 && (
                    <li>Products: {businessContext.products.slice(0, 2).join(', ')}{businessContext.products.length > 2 && ` +${businessContext.products.length - 2} more`}</li>
                  )}
                  {businessContext?.valueProposition && (
                    <li>Value proposition</li>
                  )}
                  {businessContext?.targetKeywords?.length > 0 && (
                    <li>Target keywords</li>
                  )}
                  {businessContext?.competitors && (
                    <li>Competitors</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <Button
          onClick={handleCheck}
          disabled={loading || !companyName || !apiKey}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Checking Mentions...' : 'Check AEO Mentions'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Tests visibility across 4 AI platforms with 10 queries (Fast mode) • Takes ~2 minutes • Market: {market} • Language: {language === 'de' ? 'German' : language === 'en' ? 'English' : language}
        </p>
      </div>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {result && (
        <div className="space-y-8">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    AEO Visibility Score
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-4xl font-bold ${getVisibilityColor(result.visibility)}`}>
                      {result.visibility}%
                    </span>
                  </div>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getBandColor(result.band)}`}>
                    {result.band}
                  </span>
                </div>

                <div>
                  <Progress value={result.visibility} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                  <div>
                    <div className="text-muted-foreground">Presence Rate</div>
                    <div className="text-xl font-semibold">{result.presence_rate}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg Quality</div>
                    <div className={`text-xl font-semibold ${getQualityColor(result.quality_score)}`}>
                      {result.quality_score.toFixed(1)}/10
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Mentions
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-bold text-primary">
                      {result.mentions}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Queries</div>
                    <div className="text-xl font-semibold">{result.actualQueriesProcessed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Time</div>
                    <div className="text-xl font-semibold">{result.execution_time_seconds}s</div>
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Mode: {result.mode} • Cost: ${result.total_cost.toFixed(4)}
                </div>
              </div>
            </Card>
          </div>

          {/* Platform Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Platform Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(result.platform_stats).map(([platform, stats]) => (
                <div key={platform} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium">{platform}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mentions</span>
                      <span className="font-semibold">{stats.mentions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality</span>
                      <span className={`font-semibold ${getQualityColor(stats.quality_score)}`}>
                        {stats.quality_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responses</span>
                      <span className="font-semibold">{stats.responses}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleExportPDF}
              disabled={exportingPDF}
            >
              {exportingPDF ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {exportingPDF ? 'Generating PDF...' : 'Export PDF Report'}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleExportExcel}
              disabled={exportingExcel}
            >
              {exportingExcel ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exportingExcel ? 'Generating Excel...' : 'Export Excel Data'}
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search queries, responses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Platforms</option>
                    {platforms.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={filterDimension}
                    onChange={(e) => setFilterDimension(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Dimensions</option>
                    {dimensions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={filterMention}
                    onChange={(e) => setFilterMention(e.target.value as FilterMention)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Results</option>
                    <option value="mentioned">Mentioned</option>
                    <option value="not-mentioned">Not Mentioned</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredAndSortedResults.length} of {result.query_results.length} results
              </div>
            </div>
          </Card>

          {/* Results Table */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Query Results
            </h3>
            <Accordion
              type="multiple"
              value={expandedResults}
              onValueChange={setExpandedResults}
              className="space-y-2"
            >
              {filteredAndSortedResults.map((result, idx) => (
                <AccordionItem key={idx} value={`result-${idx}`} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4 text-left">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.query}</div>
                        <div className="flex gap-2 mt-1 text-xs">
                          <span className="text-muted-foreground">{result.platform}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{result.dimension}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {result.capped_mentions} mention{result.capped_mentions !== 1 ? 's' : ''}
                          </div>
                          <div className={`text-xs ${getQualityColor(result.quality_score)}`}>
                            Quality: {result.quality_score.toFixed(1)}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMentionTypeColor(result.mention_type)}`}>
                          {result.mention_type}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3 pt-2">
                      {/* Response Text */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          AI Response:
                        </div>
                        <div className="text-sm p-3 bg-muted rounded-md">
                          {result.response_text || 'No response text available'}
                        </div>
                      </div>

                      {/* Position */}
                      {result.position && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Mention Position:
                          </div>
                          <div className="text-sm">
                            Position #{result.position} in response
                          </div>
                        </div>
                      )}

                      {/* Competitor Mentions */}
                      {result.competitor_mentions.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Competitor Mentions:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.competitor_mentions.map((comp, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded text-xs"
                              >
                                {comp.name} ({comp.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source URLs */}
                      {result.source_urls.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Source URLs:
                          </div>
                          <div className="space-y-1">
                            {result.source_urls.slice(0, 3).map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline block truncate"
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
          </Card>
        </div>
      )}
    </div>
  )
}
