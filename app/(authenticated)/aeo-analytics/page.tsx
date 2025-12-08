'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Activity, Target, Info } from 'lucide-react'
import { HealthResults } from '@/components/aeo/HealthResults'
import { MentionsResults } from '@/components/aeo/MentionsResults'
import { useContextStorage } from '@/hooks/useContextStorage'

type CheckType = 'health' | 'mentions' | null

export default function AEOAnalyticsPage() {
  const { businessContext, hasContext } = useContextStorage()
  
  // Input states
  const [healthUrl, setHealthUrl] = useState(businessContext?.companyWebsite || '')
  const [mentionsCompany, setMentionsCompany] = useState(businessContext?.companyName || '')
  const [mentionsIndustry, setMentionsIndustry] = useState(businessContext?.targetIndustries || businessContext?.icp || '')
  const [openrouterKey, setOpenrouterKey] = useState('')
  
  // Loading states
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [loadingMentions, setLoadingMentions] = useState(false)
  
  // Results states
  const [healthResult, setHealthResult] = useState<any>(null)
  const [mentionsResult, setMentionsResult] = useState<any>(null)
  
  // Error states
  const [healthError, setHealthError] = useState<string | null>(null)
  const [mentionsError, setMentionsError] = useState<string | null>(null)
  
  // Active results tab
  const [activeResultsTab, setActiveResultsTab] = useState<CheckType>(null)

  // Load OpenRouter key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('openrouter-api-key')
      if (storedKey) {
        setOpenrouterKey(storedKey)
      }
    }
  }, [])

  const handleHealthCheck = async () => {
    if (!healthUrl) return

    setLoadingHealth(true)
    setHealthError(null)
    setHealthResult(null)

    try {
      const response = await fetch('/api/aeo/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: healthUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Health check failed')
      }

      setHealthResult(data)
      setActiveResultsTab('health')
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to run health check')
    } finally {
      setLoadingHealth(false)
    }
  }

  const handleMentionsCheck = async () => {
    if (!mentionsCompany) {
      setMentionsError('Company name is required')
      return
    }

    // Build company_analysis from business context - properly structured for openanalytics mentions_service
    
    // Parse products field (could be string or array)
    let productsArray = businessContext?.products || []
    if (typeof productsArray === 'string') {
      productsArray = productsArray.split(',').map(p => p.trim()).filter(p => p.length > 0)
    }
    
    // Extract services from products (look for service-related keywords)
    const services = productsArray.filter(p => 
      p.toLowerCase().includes('service') || 
      p.toLowerCase().includes('tracking') || 
      p.toLowerCase().includes('research') ||
      p.toLowerCase().includes('discovery') ||
      p.toLowerCase().includes('package')
    )
    
    // Create hyperniche pain points from industry context + geography
    const industryString = mentionsIndustry || businessContext?.targetIndustries || businessContext?.icp || ''
    const region = businessContext?.countries?.[0] || 'US'
    const pain_points = []
    
    // Industry-specific pain points
    if (industryString.toLowerCase().includes('seo') || industryString.toLowerCase().includes('search')) {
      pain_points.push(
        'improve search visibility', 
        'rank higher in search results',
        'get featured in Google AI Overviews',
        'optimize for voice search queries'
      )
    }
    if (industryString.toLowerCase().includes('ai') || industryString.toLowerCase().includes('aeo')) {
      pain_points.push(
        'optimize for AI search engines', 
        'improve AI visibility',
        'get cited by ChatGPT',
        'rank in Perplexity answers', 
        'appear in Claude responses',
        'optimize content for LLM training data'
      )
    }
    if (industryString.toLowerCase().includes('saas') || industryString.toLowerCase().includes('b2b')) {
      pain_points.push(
        'generate qualified B2B leads',
        'reduce customer acquisition cost',
        'improve product-market fit',
        'increase trial-to-paid conversion'
      )
    }
    
    // Geography-specific pain points with enhanced regional targeting
    if (region === 'US') {
      pain_points.push(
        'comply with US data privacy laws', 
        'target US enterprise customers',
        'penetrate American B2B markets',
        'scale across North American regions',
        'meet US enterprise security requirements'
      )
    } else if (['UK', 'GB'].includes(region)) {
      pain_points.push(
        'comply with GDPR requirements', 
        'target British enterprise customers',
        'penetrate UK B2B markets',
        'scale across London financial district',
        'meet UK regulatory compliance'
      )
    } else if (['EU', 'Europe'].includes(region)) {
      pain_points.push(
        'comply with GDPR requirements', 
        'target European markets',
        'navigate EU regulatory landscape',
        'scale across European Union',
        'meet European data protection standards'
      )
    }
    
    // Size-specific pain points (if we can infer company size)
    if (businessContext?.companyWebsite?.includes('enterprise') || industryString.includes('Enterprise')) {
      pain_points.push('scale for enterprise customers', 'meet enterprise security requirements')
    }
    
    // Determine product category from industry
    const product_category = industryString.includes('GEO') || industryString.includes('AEO') 
      ? 'AI Search Optimization tools' 
      : industryString.includes('SaaS')
      ? 'SaaS tools'
      : businessContext?.productType || 'software tools'

    // Create hyperniche use cases and targeting
    const use_cases = []
    const differentiators = []
    const customer_problems = []
    
    // Generate use cases based on industry + pain points
    if (industryString.toLowerCase().includes('aeo') || industryString.toLowerCase().includes('ai search')) {
      use_cases.push(
        'Enterprise AEO strategy implementation',
        'Multi-platform AI visibility tracking',
        'Competitive AI mention analysis',
        'LLM citation optimization'
      )
      differentiators.push(
        '5-LLM tracking capability',
        'Real-time AI mention monitoring', 
        'Proprietary shadow demand discovery'
      )
      customer_problems.push(
        'invisible to AI search engines',
        'competitors dominating AI answers',
        'losing market share to AI-optimized brands',
        'unable to track AI platform performance'
      )
    }
    
    // Add geography-specific targeting with country-specific modifiers
    const geographicModifiers = []
    const countrySpecificQueries = []
    
    if (region === 'US') {
      geographicModifiers.push('US-based', 'North American', 'American', 'USA-focused', 'stateside')
      countrySpecificQueries.push(
        'how to dominate US market share',
        'best practices for American enterprise sales',
        'how to scale in North American markets'
      )
    } else if (['UK', 'GB'].includes(region)) {
      geographicModifiers.push('UK-based', 'British', 'London-based', 'England-focused', 'British-owned')
      countrySpecificQueries.push(
        'how to penetrate UK enterprise market',
        'best practices for British B2B sales',
        'how to scale in London financial district'
      )
    } else if (['EU', 'Europe'].includes(region)) {
      geographicModifiers.push('European', 'EU-based', 'GDPR-compliant', 'Europe-focused', 'continental')
      countrySpecificQueries.push(
        'how to navigate EU regulatory compliance',
        'best practices for European market entry',
        'how to scale across European Union'
      )
    } else if (['CA', 'Canada'].includes(region)) {
      geographicModifiers.push('Canadian', 'Canada-based', 'Toronto-focused', 'Montreal-based')
      countrySpecificQueries.push(
        'how to dominate Canadian market',
        'best practices for Canadian enterprise sales'
      )
    } else if (['AU', 'Australia'].includes(region)) {
      geographicModifiers.push('Australian', 'Australia-based', 'Sydney-focused', 'Melbourne-based')
      countrySpecificQueries.push(
        'how to penetrate Australian market',
        'best practices for Australian B2B sales'
      )
    }

    const companyAnalysis = {
      companyInfo: {
        name: mentionsCompany,
        website: businessContext?.companyWebsite || '',
        description: businessContext?.valueProposition || businessContext?.productDescription || `${mentionsCompany} is a ${industryString || 'company'}`,
        industry: industryString,
        target_audience: businessContext?.icp ? [businessContext.icp] : [],
        products: productsArray,
        services: services,
        pain_points: pain_points,
        use_cases: use_cases,
        key_features: businessContext?.targetKeywords || [],
        solution_keywords: businessContext?.targetKeywords || [],
        value_propositions: businessContext?.valueProposition ? [businessContext.valueProposition] : [],
        differentiators: differentiators,
        customer_problems: customer_problems,
        product_category: product_category,
        primary_region: region,
        geographic_modifiers: geographicModifiers,
        country_specific_queries: countrySpecificQueries,
        // Add more targeting data for hyperniche queries
        target_company_size: businessContext?.companyWebsite?.includes('enterprise') ? 'enterprise' : 'mid-market',
        regulatory_requirements: region === 'EU' ? ['GDPR'] : region === 'US' ? ['SOC2', 'CCPA'] : region === 'CA' ? ['PIPEDA'] : region === 'AU' ? ['Privacy Act'] : [],
        // Language and market-specific targeting
        market_maturity: region === 'US' ? 'mature' : region === 'UK' ? 'mature' : region === 'EU' ? 'regulated' : 'emerging',
        business_culture: region === 'US' ? 'aggressive-growth' : region === 'UK' ? 'conservative-traditional' : region === 'EU' ? 'compliance-first' : 'balanced',
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
      const industryBasedProduct = mentionsIndustry || businessContext?.targetIndustries || businessContext?.icp
      if (industryBasedProduct) {
        companyAnalysis.companyInfo.products = [`${industryBasedProduct} Solutions`]
      } else {
        companyAnalysis.companyInfo.products = [`${mentionsCompany} Services`]
      }
    }
    
    // Final validation - if still no products/services, show error
    if (companyAnalysis.companyInfo.products.length === 0 && companyAnalysis.companyInfo.services.length === 0) {
      setMentionsError('Unable to determine your products or services. Please add products/services to your Business Context or specify an industry for better query generation.')
      return
    }

    setLoadingMentions(true)
    setMentionsError(null)
    setMentionsResult(null)

    try {
      const response = await fetch('/api/aeo/mentions-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: mentionsCompany,
          company_analysis: companyAnalysis,
          language: 'english',
          country: businessContext?.countries?.[0] || 'US',
          num_queries: 10,
          mode: 'fast',
          api_key: openrouterKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Mentions check failed')
      }

      setMentionsResult(data)
      setActiveResultsTab('mentions')
    } catch (err) {
      setMentionsError(err instanceof Error ? err.message : 'Failed to check mentions')
    } finally {
      setLoadingMentions(false)
    }
  }

  const hasResults = healthResult || mentionsResult

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AEO Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze your AEO performance with health checks and mentions tracking
        </p>
      </div>

      <div className={`grid gap-6 ${hasResults ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-3xl'}`}>
        {/* Left Panel: Input Forms */}
        <div className="space-y-6">
          {/* Health Check Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                AEO Health Check
              </CardTitle>
              <CardDescription>
                Analyze technical SEO, structured data, and AI crawler optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="health-url" className="flex items-center gap-2">
                  Website URL *
                  {businessContext?.companyWebsite === healthUrl && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      From context
                    </span>
                  )}
                </Label>
                <Input
                  id="health-url"
                  type="url"
                  placeholder="https://example.com"
                  value={healthUrl}
                  onChange={(e) => setHealthUrl(e.target.value)}
                  disabled={loadingHealth}
                />
              </div>

              {healthError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{healthError}</p>
                </div>
              )}

              <Button 
                onClick={handleHealthCheck} 
                disabled={loadingHealth || !healthUrl} 
                className="w-full"
              >
                {loadingHealth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loadingHealth ? 'Running Check...' : 'Run Health Check'}
              </Button>
            </CardContent>
          </Card>

          {/* Mentions Check Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                AEO Mentions Check
              </CardTitle>
              <CardDescription>
                Test visibility across AI platforms (ChatGPT, Perplexity, Claude, Gemini)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mentions-company" className="flex items-center gap-2">
                  Company Name *
                  {businessContext?.companyName === mentionsCompany && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      From context
                    </span>
                  )}
                </Label>
                <Input
                  id="mentions-company"
                  type="text"
                  placeholder="Acme Corp"
                  value={mentionsCompany}
                  onChange={(e) => setMentionsCompany(e.target.value)}
                  disabled={loadingMentions}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mentions-industry">
                  Industry (Optional)
                </Label>
                <Input
                  id="mentions-industry"
                  type="text"
                  placeholder="B2B SaaS"
                  value={mentionsIndustry}
                  onChange={(e) => setMentionsIndustry(e.target.value)}
                  disabled={loadingMentions}
                />
              </div>

              {mentionsError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{mentionsError}</p>
                </div>
              )}

              <Button 
                onClick={handleMentionsCheck} 
                disabled={loadingMentions || !mentionsCompany} 
                className="w-full"
              >
                {loadingMentions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loadingMentions ? 'Checking Mentions...' : 'Check Mentions'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Tests with 10 queries across 4 AI platforms (Fast mode)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results in Tabs */}
        {hasResults && (
          <Card className="lg:sticky lg:top-6 lg:self-start">
            <Tabs value={activeResultsTab || 'health'} onValueChange={(v) => setActiveResultsTab(v as CheckType)} className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="health" disabled={!healthResult}>
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">Health Check</span>
                      <span className="sm:hidden">Health</span>
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="mentions" disabled={!mentionsResult}>
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span className="hidden sm:inline">AEO Mentions</span>
                      <span className="sm:hidden">Mentions</span>
                    </span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-0">
                <TabsContent value="health" className="mt-0">
                  {healthResult ? (
                    <HealthResults result={healthResult} url={healthUrl} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Run a health check to see results here</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="mentions" className="mt-0">
                  {mentionsResult ? (
                    <MentionsResults result={mentionsResult} companyName={mentionsCompany} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Run a mentions check to see results here</p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  )
}

