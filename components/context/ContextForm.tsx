'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe, CheckCircle, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useContextStorage } from '@/hooks/useContextStorage'
import { toast } from 'sonner'

/**
 * Context Form Component
 * Allows users to analyze a website domain to extract company context
 */

export function ContextForm() {
  const { businessContext, updateContext, clearContext, hasContext, isLoading } = useContextStorage()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [savedCompanies, setSavedCompanies] = useState<any[]>([])
  
  const EXPECTED_ANALYSIS_TIME = 30 // seconds for Gemini 3 Pro Preview
  
  // Load analyzed URL and saved companies from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      
      const stored = localStorage.getItem('bulk-gpt-analyzed-url')
      if (stored && hasContext) {
        setAnalyzedUrl(stored)
      }

      // Load saved companies
      const COMPANIES_STORAGE_KEY = 'bulk-gpt-saved-companies'
      const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY)
      if (storedCompanies) {
        try {
          const companies = JSON.parse(storedCompanies)
          setSavedCompanies(companies)
        } catch (error) {
          console.error('Failed to parse saved companies:', error)
        }
      }

      // Set default analyzed URL if we have default SCAILE context and no stored URL
      if (!stored && hasContext && businessContext?.companyWebsite) {
        setAnalyzedUrl(businessContext.companyWebsite)
        localStorage.setItem('bulk-gpt-analyzed-url', businessContext.companyWebsite)
      }
    }
  }, [hasContext, businessContext])

  const handleAnalyzeWebsite = useCallback(async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL')
      return
    }

    // Server will handle API key from GEMINI_API_KEY environment variable

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setTimeRemaining(EXPECTED_ANALYSIS_TIME)
    
    // Start progress timer
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min((elapsed / EXPECTED_ANALYSIS_TIME) * 100, 95) // Cap at 95% until complete
      const remaining = Math.max(EXPECTED_ANALYSIS_TIME - Math.floor(elapsed), 0)
      
      setAnalysisProgress(progress)
      setTimeRemaining(remaining)
    }, 100)
    
    try {
      // Call local API endpoint (server will use GEMINI_API_KEY from environment)
      const response = await fetch('/api/analyse-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: websiteUrl.trim(),
          // Don't send API key - let server handle it from environment variables
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to analyze website' }))
        throw new Error(error.message || error.error || 'Failed to analyze website')
      }

      const data = await response.json()

      // Map the simplified response to our context structure
      const contextUpdates: Record<string, any> = {}
      
      // Core info
      if (data.company_name) contextUpdates.companyName = data.company_name
      if (data.company_url) contextUpdates.companyWebsite = data.company_url
      if (data.description) contextUpdates.productDescription = data.description
      if (data.industry) contextUpdates.targetIndustries = data.industry
      if (data.target_audience) contextUpdates.targetAudience = data.target_audience
      if (data.tone) contextUpdates.brandTone = data.tone
      
      // Products/services as comma-separated list
      if (data.products && Array.isArray(data.products) && data.products.length > 0) {
        contextUpdates.products = data.products.join(', ')
      }
      
      // Competitors as comma-separated list
      if (data.competitors && Array.isArray(data.competitors) && data.competitors.length > 0) {
        contextUpdates.competitors = data.competitors.join(', ')
      }
      
      // Pain points as comma-separated list
      if (data.pain_points && Array.isArray(data.pain_points) && data.pain_points.length > 0) {
        contextUpdates.painPoints = data.pain_points.join(', ')
      }
      
      // Value propositions as comma-separated list
      if (data.value_propositions && Array.isArray(data.value_propositions) && data.value_propositions.length > 0) {
        contextUpdates.valuePropositions = data.value_propositions.join(', ')
      }
      
      // Use cases as comma-separated list
      if (data.use_cases && Array.isArray(data.use_cases) && data.use_cases.length > 0) {
        contextUpdates.useCases = data.use_cases.join(', ')
      }
      
      // Content themes as comma-separated list
      if (data.content_themes && Array.isArray(data.content_themes) && data.content_themes.length > 0) {
        contextUpdates.contentThemes = data.content_themes.join(', ')
      }

      updateContext(contextUpdates)

      // Auto-save this as a new company profile
      if (typeof window !== 'undefined' && contextUpdates.companyName) {
        try {
          const COMPANIES_STORAGE_KEY = 'bulk-gpt-saved-companies'
          const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY)
          let companies = storedCompanies ? JSON.parse(storedCompanies) : []
          
          // Check if company already exists (by name)
          const existingCompanyIndex = companies.findIndex((c: any) => 
            c.name?.toLowerCase() === contextUpdates.companyName?.toLowerCase()
          )
          
          const newCompany = {
            id: existingCompanyIndex >= 0 ? companies[existingCompanyIndex].id : 'company-' + Date.now(),
            name: contextUpdates.companyName,
            context: contextUpdates,
            createdAt: existingCompanyIndex >= 0 ? companies[existingCompanyIndex].createdAt : new Date().toISOString()
          }
          
          if (existingCompanyIndex >= 0) {
            // Update existing company
            companies[existingCompanyIndex] = newCompany
            console.log('[ContextForm] Updated existing company profile:', contextUpdates.companyName)
          } else {
            // Add new company
            companies.push(newCompany)
            console.log('[ContextForm] Created new company profile:', contextUpdates.companyName)
          }
          
          localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies))
          setSavedCompanies(companies) // Update local state
        } catch (error) {
          console.error('[ContextForm] Failed to save company profile:', error)
        }
      }

      // Store the analyzed URL
      const normalizedUrl = websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`
      setAnalyzedUrl(normalizedUrl)
      if (typeof window !== 'undefined') {
        localStorage.setItem('bulk-gpt-analyzed-url', normalizedUrl)
      }

      // Complete progress
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setTimeRemaining(0)

      toast.success('Website analyzed successfully')
    } catch (error) {
      console.error('Analysis error:', error)
      clearInterval(progressInterval)
      setAnalysisProgress(0)
      setTimeRemaining(0)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze website')
    } finally {
      setIsAnalyzing(false)
    }
  }, [websiteUrl, updateContext])

  const handleClearAll = useCallback(() => {
    clearContext()
    setAnalyzedUrl(null)
    setShowClearConfirmation(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bulk-gpt-analyzed-url')
    }
    toast.success('Context cleared')
  }, [clearContext])



  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-secondary/50 rounded animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Saved Company Profiles - Show at top for easy switching */}
      {savedCompanies.length > 1 && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Switch Company Profile ({savedCompanies.length} saved)</Label>
              <p className="text-xs text-muted-foreground">Click any profile to switch to it</p>
            </div>
          </div>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {savedCompanies.map((company: any) => (
              <button
                key={company.id}
                onClick={() => {
                  updateContext(company.context)
                  toast.success(`Switched to ${company.name}`)
                }}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                  businessContext?.companyName === company.name 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {company.name}
                    {businessContext?.companyName === company.name && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Current</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.context?.companyWebsite || 'No website'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(company.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Website Analysis Section */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <Label htmlFor="website-url" className="text-sm font-semibold text-foreground">
            Add Company
          </Label>
        </div>
        
        {/* Show analyzed URL if data exists */}
        {analyzedUrl && hasContext && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-primary/20 rounded-md">
            <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Data from:</span>
            <a 
              href={analyzedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-medium truncate flex-1"
            >
              {analyzedUrl}
            </a>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            id="website-url"
            type="text"
            placeholder="Enter website to add new company (e.g., apple.com, microsoft.com)"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isAnalyzing && websiteUrl.trim()) {
                handleAnalyzeWebsite()
              }
            }}
            disabled={isAnalyzing}
            className="text-xs flex-1"
          />
          <Button
            onClick={handleAnalyzeWebsite}
            disabled={!websiteUrl.trim() || isAnalyzing}
            size="sm"
            className="text-xs font-medium"
          >
            {isAnalyzing ? (
              <>
                <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Creating Profile...
              </>
            ) : (
              '+ Add Company'
            )}
          </Button>
        </div>
        
        {/* Progress Bar with Timer */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Analyzing with Gemini 3 Pro...
              </span>
              <span className="font-medium text-primary">
                {timeRemaining > 0 ? `~${timeRemaining}s remaining` : 'Finalizing...'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Add as many companies as you want - each website becomes a new selectable profile
        </p>
        
        {/* Info about automatic company creation and multiple profiles */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">💡 How it works</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Each website you analyze creates a new company profile</p>
            <p>• Go to Keywords/Blogs/Analytics pages to select which company to use</p>
            <p>• Click the edit icon (✏️) to switch between your saved companies</p>
          </div>
        </div>

      </div>

      {/* Divider */}
      {hasContext && <div className="border-t border-border" />}

      {/* Context Display */}
          {hasContext && (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Extracted Context</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirmation(true)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
        </div>

          <div className="grid gap-3">
            {businessContext.companyName && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input value={businessContext.companyName} readOnly className="text-xs bg-muted/50" />
                  </div>
            )}
            
            {businessContext.companyWebsite && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input value={businessContext.companyWebsite} readOnly className="text-xs bg-muted/50" />
                </div>
            )}
            
            {businessContext.targetIndustries && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Industry</Label>
                <Input value={businessContext.targetIndustries} readOnly className="text-xs bg-muted/50" />
                  </div>
            )}
            
            {businessContext.productDescription && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
                  value={businessContext.productDescription} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
              rows={3}
            />
          </div>
            )}
            
            {businessContext.products && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Products/Services</Label>
            <Textarea
                  value={businessContext.products} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
            />
          </div>
          )}
            
            {businessContext.targetAudience && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Target Audience</Label>
                <Input value={businessContext.targetAudience} readOnly className="text-xs bg-muted/50" />
                  </div>
          )}
            
            {businessContext.competitors && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Competitors</Label>
                <Textarea 
                  value={businessContext.competitors} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
            />
          </div>
            )}
            
            {businessContext.brandTone && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Brand Tone</Label>
                <Input value={businessContext.brandTone} readOnly className="text-xs bg-muted/50" />
                  </div>
            )}
            
            {businessContext.painPoints && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pain Points</Label>
            <Textarea
                  value={businessContext.painPoints} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
              rows={3}
                />
            </div>
          )}
            
            {businessContext.valuePropositions && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Value Propositions</Label>
                <Textarea 
                  value={businessContext.valuePropositions} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
            </div>
          )}
            
            {businessContext.useCases && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Use Cases</Label>
                <Textarea 
                  value={businessContext.useCases} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
            </div>
          )}
            
            {businessContext.contentThemes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Content Themes</Label>
                <Textarea 
                  value={businessContext.contentThemes} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
          </div>
              </div>
            )}

      {/* System Instructions Section - Always visible */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">System Instructions</Label>
            <p className="text-xs text-muted-foreground">
              Reusable prompts that will be applied to all blog and keyword generation
            </p>
          </div>
        </div>
        
        <Textarea
          placeholder="Example: Always mention sustainability. Focus on B2B audiences. Use technical language. Emphasize ROI and cost savings."
          value={businessContext.systemInstructions || ''}
          onChange={(e) => updateContext({ systemInstructions: e.target.value })}
          className="text-xs min-h-[100px] font-mono"
          rows={4}
        />
        
        <p className="text-xs text-muted-foreground">
          💡 These instructions will be automatically loaded in the Blog and Keyword generators
        </p>
      </div>

      {/* Client Knowledge Base Section */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Client Knowledge Base</Label>
            <p className="text-xs text-muted-foreground">
              Facts about your company (one per line)
            </p>
          </div>
        </div>
        
        <Textarea
          placeholder="Example:&#10;We target Fortune 500 companies&#10;We specialize in security solutions&#10;Founded in 2020"
          value={businessContext.clientKnowledgeBase || ''}
          onChange={(e) => updateContext({ clientKnowledgeBase: e.target.value })}
          className="text-xs min-h-[80px] font-mono"
          rows={3}
        />
        
        <p className="text-xs text-muted-foreground">
          💡 These facts will be automatically loaded in the Blog generator
        </p>
      </div>

      {/* Content Instructions Section */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Content Instructions</Label>
            <p className="text-xs text-muted-foreground">
              How to write the content (style, format, requirements)
            </p>
          </div>
        </div>
        
        <Textarea
          placeholder="Example: Include statistics, add case studies, use conversational tone, focus on AEO and Answer Engine visibility, include variations with 'AI search'"
          value={businessContext.contentInstructions || ''}
          onChange={(e) => updateContext({ contentInstructions: e.target.value })}
          className="text-xs min-h-[80px]"
          rows={3}
        />
        
        <p className="text-xs text-muted-foreground">
          💡 These instructions will be automatically loaded in the Blog generator
        </p>
      </div>


      {/* Clear Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-sm font-semibold">Clear all context?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              This will clear all extracted context. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirmation(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
      </div>
          </div>
        </div>
      )}

      </div>
  )
}
