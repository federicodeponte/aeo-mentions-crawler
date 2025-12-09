'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, Activity, Target, Info } from 'lucide-react'
import { HealthResults } from '@/components/aeo/HealthResults'
import { MentionsResults } from '@/components/aeo/MentionsResults'
import { useContextStorage } from '@/hooks/useContextStorage'

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
  { value: 'NZ', label: '🇳🇿 New Zealand' },
]

type CheckType = 'health' | 'mentions' | null

export default function AEOAnalyticsPage() {
  const { businessContext, hasContext } = useContextStorage()
  
  // Input states
  const [healthUrl, setHealthUrl] = useState(businessContext?.companyWebsite || '')
  const [mentionsCompany, setMentionsCompany] = useState(businessContext?.companyName || '')
  
  // Geographic targeting state
  const [language, setLanguage] = useState('en')
  const [country, setCountry] = useState('US')
  
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
    console.log('[DEBUG:MENTIONS] 🚀 Mentions check button clicked')
    console.log('[DEBUG:MENTIONS] Company name:', mentionsCompany)
    console.log('[DEBUG:MENTIONS] Language:', language)
    console.log('[DEBUG:MENTIONS] Country:', country)
    
    if (!mentionsCompany) {
      console.log('[DEBUG:MENTIONS] ❌ Missing company name, aborting')
      setMentionsError('Company name is required')
      return
    }

    // Note: OpenRouter API key is provided via environment variables

    console.log('[DEBUG:MENTIONS] 📋 Building company analysis from business context...')
    console.log('[DEBUG:MENTIONS] 📋 Business context:', businessContext)
    
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
    const industryString = businessContext?.targetIndustries || businessContext?.icp || ''
    const region = country
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
    
    // If no products/services, auto-generate basic products (always provide fallback)
    if (!hasProducts && !hasServices) {
      console.log('[DEBUG:MENTIONS] 🔧 No products/services found, generating fallback...')
      const industryBasedProduct = businessContext?.targetIndustries || businessContext?.icp
      if (industryBasedProduct) {
        companyAnalysis.companyInfo.products = [`${industryBasedProduct} Solutions`]
        console.log('[DEBUG:MENTIONS] 🔧 Generated industry-based product:', companyAnalysis.companyInfo.products)
      } else {
        // Always generate a generic fallback product
        companyAnalysis.companyInfo.products = [`${mentionsCompany} Services`, `${mentionsCompany} Solutions`]
        console.log('[DEBUG:MENTIONS] 🔧 Generated generic products:', companyAnalysis.companyInfo.products)
      }
    }
    
    // Final validation - if still no products/services, show error
    console.log('[DEBUG:MENTIONS] 🔍 Final validation - products:', companyAnalysis.companyInfo.products)
    console.log('[DEBUG:MENTIONS] 🔍 Final validation - services:', companyAnalysis.companyInfo.services)
    
    if (companyAnalysis.companyInfo.products.length === 0 && companyAnalysis.companyInfo.services.length === 0) {
      console.log('[DEBUG:MENTIONS] ❌ Validation failed - no products or services found')
      setMentionsError('Unable to determine your products or services. Please add products/services to your Business Context or specify an industry for better query generation.')
      return
    }
    
    console.log('[DEBUG:MENTIONS] ✅ Validation passed - proceeding to API call')

    // ENHANCED GEOGRAPHIC TARGETING: Always enhance pain points with geographic modifiers
    // This ensures even existing rich company data gets geography-aware queries
    if (true) { // Always enhance, not just when missing
      console.log('[ENHANCE] Adding geographic targeting to existing pain points...')
      
      const industry = companyAnalysis.companyInfo.industry
      const description = companyAnalysis.companyInfo.description
      const products = companyAnalysis.companyInfo.products || []
      const services = companyAnalysis.companyInfo.services || []
      
      // Store original pain points for enhancement
      const originalPainPoints = [...companyAnalysis.companyInfo.pain_points]
      let enhancedPainPoints = []
      
      // If we have existing pain points, enhance them with geographic targeting
      if (originalPainPoints.length > 0) {
        console.log('[ENHANCE] Existing pain points found, adding geographic variations:', originalPainPoints)
        
        // Take existing pain points and add geographic/platform variations
        originalPainPoints.forEach(painPoint => {
          // Add the original pain point
          enhancedPainPoints.push(painPoint)
          
          // Add geography-specific variations
          const region = country
          enhancedPainPoints.push(`${painPoint} for ${region}-based companies`)
          enhancedPainPoints.push(`${painPoint} with ChatGPT for ${region} businesses`)
          enhancedPainPoints.push(`${painPoint} with Perplexity for ${region} companies`)
        })
        
        console.log('[ENHANCE] Enhanced pain points with geographic targeting:', enhancedPainPoints)
      } else {
        console.log('[FALLBACK] No existing pain points, generating industry-based ones...')
        if (industry.toLowerCase().includes('seo') || industry.toLowerCase().includes('search') || industry.toLowerCase().includes('marketing')) {
          enhancedPainPoints.push('improve search rankings', 'increase online visibility', 'boost website traffic')
        } else if (industry.toLowerCase().includes('ai') || industry.toLowerCase().includes('artificial intelligence')) {
          enhancedPainPoints.push('implement AI solutions', 'automate processes', 'improve decision making')
        } else if (industry.toLowerCase().includes('saas') || industry.toLowerCase().includes('software')) {
          enhancedPainPoints.push('streamline workflows', 'reduce manual tasks', 'increase productivity')
        } else if (industry.toLowerCase().includes('ecommerce') || industry.toLowerCase().includes('retail')) {
          enhancedPainPoints.push('increase sales conversion', 'improve customer experience', 'optimize inventory')
        } else if (industry.toLowerCase().includes('fintech') || industry.toLowerCase().includes('finance')) {
          enhancedPainPoints.push('manage financial risk', 'improve compliance', 'streamline transactions')
        }
        
        // If we have a description, infer pain points from it
        if (description && enhancedPainPoints.length < 6) {
          if (description.includes('visibility') || description.includes('rank')) {
            enhancedPainPoints.push('improve online visibility')
          }
          if (description.includes('automat') || description.includes('AI')) {
            enhancedPainPoints.push('automate content creation')
          }
          if (description.includes('track') || description.includes('monitor')) {
            enhancedPainPoints.push('monitor brand mentions')
          }
        }
        
        // Generic fallbacks if still empty
        if (enhancedPainPoints.length === 0) {
          enhancedPainPoints.push('improve efficiency', 'reduce costs', 'increase revenue')
        }
      }
      
      // Update the company analysis with enhanced pain points
      companyAnalysis.companyInfo.pain_points = enhancedPainPoints.slice(0, 8) // Allow more pain points for better targeting
      console.log('[ENHANCE] Final enhanced pain points:', companyAnalysis.companyInfo.pain_points)
      
      // ENHANCED USE CASES: Always enhance with geographic targeting
      const originalUseCases = [...companyAnalysis.companyInfo.use_cases]
      let enhancedUseCases = []
      
      if (originalUseCases.length > 0) {
        console.log('[ENHANCE] Existing use cases found, adding geographic variations:', originalUseCases)
        
        // Take existing use cases and add geographic/platform variations
        originalUseCases.forEach(useCase => {
          // Add the original use case
          enhancedUseCases.push(useCase)
          
          // Add geography-specific variations
          const region = country
          enhancedUseCases.push(`${useCase} for ${region} enterprises`)
          enhancedUseCases.push(`${useCase} with AI platforms for ${region} companies`)
        })
        
        console.log('[ENHANCE] Enhanced use cases with geographic targeting:', enhancedUseCases)
      } else {
        console.log('[FALLBACK] No existing use cases, generating based on products/services...')
        
        // Base use cases on products/services
        products.concat(services).forEach(item => {
          if (item.toLowerCase().includes('content')) {
            enhancedUseCases.push('content optimization', 'content creation')
          } else if (item.toLowerCase().includes('track') || item.toLowerCase().includes('monitor')) {
            enhancedUseCases.push('performance tracking', 'brand monitoring')
          } else if (item.toLowerCase().includes('analytics')) {
            enhancedUseCases.push('data analysis', 'performance measurement')
          } else {
            enhancedUseCases.push(`${item.toLowerCase()} implementation`)
          }
        })
        
        // Generic fallbacks if still empty
        if (enhancedUseCases.length === 0) {
          enhancedUseCases.push('business optimization', 'workflow automation', 'performance improvement')
        }
      }
      
      companyAnalysis.companyInfo.use_cases = enhancedUseCases.slice(0, 6) // Allow more use cases
      console.log('[ENHANCE] Final enhanced use cases:', companyAnalysis.companyInfo.use_cases)
      
      // Generate customer problems if missing
      if (companyAnalysis.companyInfo.customer_problems.length === 0) {
        companyAnalysis.companyInfo.customer_problems = companyAnalysis.companyInfo.pain_points.map(pain => pain.replace('improve', 'struggling to improve').replace('increase', 'need to increase').replace('reduce', 'need to reduce'))
        console.log('[FALLBACK] Generated customer problems:', companyAnalysis.companyInfo.customer_problems)
      }
    }

    // Add debug identifier to track if enhanced data is being used
    companyAnalysis.companyInfo.debug_source = 'frontend_enhanced_v3_geographic_always'
    console.log('[DEBUG] Final company analysis being sent:', companyAnalysis)

    console.log('[DEBUG:MENTIONS] 🔄 Setting loading state and clearing errors...')
    setLoadingMentions(true)
    setMentionsError(null)
    setMentionsResult(null)

    console.log('[DEBUG:MENTIONS] 📡 Making fetch request to /api/aeo/mentions-check...')
    try {
      const response = await fetch('/api/aeo/mentions-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: mentionsCompany,
          company_analysis: companyAnalysis,
          language: LANGUAGES.find(l => l.value === language)?.label.split(' ')[1] || 'english',
          country: country,
          num_queries: 10,
          mode: 'fast',
        }),
      })

      console.log('[DEBUG:MENTIONS] ✅ Fetch request completed, status:', response.status)
      const data = await response.json()
      console.log('[DEBUG:MENTIONS] 📥 Response data received:', data)

      if (!response.ok) {
        console.log('[DEBUG:MENTIONS] ❌ Response not OK, throwing error')
        throw new Error(data.error || data.message || 'Mentions check failed')
      }

      console.log('[DEBUG:MENTIONS] 🎉 Setting mentions result and switching to mentions tab')
      setMentionsResult(data)
      setActiveResultsTab('mentions')
    } catch (err) {
      console.log('[DEBUG:MENTIONS] 💥 Error caught:', err)
      setMentionsError(err instanceof Error ? err.message : 'Failed to check mentions')
    } finally {
      console.log('[DEBUG:MENTIONS] 🏁 Finally block - setting loading to false')
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

              {/* Geographic Targeting Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <SearchableSelect
                    options={LANGUAGES}
                    value={language}
                    onChange={setLanguage}
                    placeholder="Select language..."
                    disabled={loadingMentions}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <SearchableSelect
                    options={COUNTRIES}
                    value={country}
                    onChange={setCountry}
                    placeholder="Select country..."
                    disabled={loadingMentions}
                  />
                </div>
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

