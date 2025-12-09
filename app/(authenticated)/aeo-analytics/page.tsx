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
    if (!mentionsCompany || !openrouterKey) {
      setMentionsError('Company name and OpenRouter API key are required')
      return
    }

    // Build company_analysis from business context
    const companyAnalysis = {
      companyInfo: {
        name: mentionsCompany,
        website: businessContext?.companyWebsite || '',
        description: businessContext?.valueProposition || businessContext?.productDescription || `${mentionsCompany} is a ${mentionsIndustry || 'company'}`,
        industry: mentionsIndustry || businessContext?.targetIndustries || businessContext?.icp || '',
        target_audience: businessContext?.icp ? [businessContext.icp] : [],
        products: businessContext?.products || [],
        services: [],
        pain_points: [],
        use_cases: [],
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
    
    if (!hasProducts) {
      setMentionsError('Please add products to your Business Context first. This is required to generate relevant queries.')
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
                <Label htmlFor="openrouter-key">
                  OpenRouter API Key *
                </Label>
                <Input
                  id="openrouter-key"
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  disabled={loadingMentions}
                />
                <p className="text-xs text-muted-foreground">
                  Get your key from{' '}
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
                disabled={loadingMentions || !mentionsCompany || !openrouterKey} 
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

