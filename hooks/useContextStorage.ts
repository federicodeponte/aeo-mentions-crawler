/**
 * Hook for managing business context in localStorage
 * Simplified version for standalone use
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BusinessContext {
  // Core fields
  companyName?: string
  companyWebsite?: string
  icp?: string
  valueProposition?: string
  
  // System instructions (reusable prompts)
  systemInstructions?: string
  
  // Blog-specific fields
  clientKnowledgeBase?: string  // Client Knowledge Base (facts about company)
  contentInstructions?: string   // Content Instructions (how to write)
  
  // Arrays
  countries?: string[]
  products?: string[]
  targetKeywords?: string[]
  competitorKeywords?: string[]
  marketingGoals?: string[]
  
  // Legacy context fields
  tone?: string
  productDescription?: string
  competitors?: string
  targetIndustries?: string
  complianceFlags?: string
  productType?: string
  gtmPlaybook?: string
  
  // Company info
  legalEntity?: string
  vatNumber?: string
  registrationNumber?: string
  imprintUrl?: string
  contactEmail?: string
  contactPhone?: string
  linkedInUrl?: string
  twitterUrl?: string
  githubUrl?: string
}

const STORAGE_KEY = 'bulk-gpt-business-context'

export function useContextStorage() {
  const [businessContext, setBusinessContext] = useState<BusinessContext>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
        setBusinessContext(JSON.parse(stored))
      } else {
        // Set default SCAILE context for test mode
        const defaultContext: BusinessContext = {
          companyName: 'SCAILE',
          companyWebsite: 'https://scaile.tech',
          icp: 'AI startups and tech companies looking to improve their visibility in AI search engines like ChatGPT, Perplexity, Claude, and Gemini',
          valueProposition: 'We help AI startups dominate AI search engines through Answer Engine Optimization (AEO). Our platform ensures your company appears when prospects search in ChatGPT, Perplexity, Claude, and Gemini.',
          productDescription: 'SCAILE provides Answer Engine Optimization (AEO) services to help tech companies increase their visibility in AI-powered search engines. We offer strategic keyword research, content optimization, and analytics specifically designed for AI platforms.',
          products: ['AEO Consulting', 'AI Search Optimization', 'Content Strategy', 'AI Visibility Analytics'],
          countries: ['US', 'Europe', 'Global'],
          targetKeywords: ['answer engine optimization', 'AI search optimization', 'ChatGPT visibility', 'AI content strategy'],
          competitorKeywords: ['SEO consulting', 'content marketing', 'digital marketing'],
          marketingGoals: ['Increase AI search visibility', 'Generate qualified leads from AI platforms', 'Establish thought leadership in AEO'],
          tone: 'Professional, innovative, data-driven',
          targetIndustries: 'AI startups, SaaS companies, Tech companies',
          contactEmail: 'hello@scaile.tech',
          linkedInUrl: 'https://linkedin.com/company/scaile'
        }
        setBusinessContext(defaultContext)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultContext))
      }
    } catch (error) {
      console.error('Failed to load context from localStorage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save to localStorage whenever context changes
  const saveContext = useCallback((newContext: BusinessContext) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContext))
      setBusinessContext(newContext)
    } catch (error) {
      console.error('Failed to save context to localStorage:', error)
    }
  }, [])

  const updateContext = useCallback((updates: Partial<BusinessContext>) => {
    setBusinessContext(prev => {
      const newContext = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newContext))
    } catch (error) {
        console.error('Failed to save context:', error)
      }
      return newContext
    })
  }, [])

  const clearContext = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setBusinessContext({})
    } catch (error) {
      console.error('Failed to clear context:', error)
    }
  }, [])

  const hasContext = Object.keys(businessContext).some(key => {
    const value = businessContext[key as keyof BusinessContext]
    return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  })

  return {
    context: businessContext, // Legacy alias
    businessContext,
    updateContext,
    updateBusinessContext: updateContext, // Alias for compatibility
    clearContext,
    hasContext,
    isLoading,
  }
}
