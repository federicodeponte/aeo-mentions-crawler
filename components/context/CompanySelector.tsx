'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Edit2, Plus } from 'lucide-react'
import { useContextStorage, BusinessContext } from '@/hooks/useContextStorage'
import { toast } from 'sonner'

interface SavedCompany {
  id: string
  name: string
  context: BusinessContext
  createdAt: string
}

interface CompanySelectorProps {
  className?: string
}

const COMPANIES_STORAGE_KEY = 'bulk-gpt-saved-companies'

export function CompanySelector({ className = '' }: CompanySelectorProps) {
  const { businessContext, updateContext } = useContextStorage()
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  // Load saved companies from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPANIES_STORAGE_KEY)
      let companies: SavedCompany[] = []
      
      if (stored) {
        companies = JSON.parse(stored)
      }
      
      // Auto-save current context if it has a company name and isn't already saved
      if (businessContext.companyName && companies.length === 0) {
        const defaultCompany: SavedCompany = {
          id: 'default-' + Date.now(),
          name: businessContext.companyName,
          context: businessContext,
          createdAt: new Date().toISOString()
        }
        companies = [defaultCompany]
        localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies))
      }
      
      setSavedCompanies(companies)
      
      // Find current company based on context
      const currentCompany = companies.find((c: SavedCompany) => 
        c.context.companyName === businessContext.companyName
      )
      if (currentCompany) {
        setSelectedCompanyId(currentCompany.id)
      }
    } catch (error) {
      console.error('Failed to load saved companies:', error)
    }
  }, [businessContext.companyName])

  const switchCompany = (companyId: string) => {
    if (!companyId || companyId === 'none') return
    
    const company = savedCompanies.find(c => c.id === companyId)
    if (!company) return

    updateContext(company.context)
    setSelectedCompanyId(companyId)
    toast.success(`Switched to ${company.name}`)
  }

  const currentCompanyName = selectedCompanyId 
    ? savedCompanies.find(c => c.id === selectedCompanyId)?.name 
    : businessContext.companyName || 'Current Company'

  return (
    <div className={`${className}`}>
      <div className="border border-border rounded-lg p-3 bg-background/30">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-foreground">
            Using Company Context
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            className="h-7 w-7 p-0"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">Company:</span> {businessContext.companyName || 'SCAILE'}
          </div>
          {businessContext.companyWebsite && (
            <div className="text-sm">
              <span className="font-medium">URL:</span> {businessContext.companyWebsite}
            </div>
          )}
        </div>
      </div>

      {/* Change Company Dialog */}
      {showSaveDialog && (
        <div className="mt-3 border border-border rounded-lg p-3 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Company Context</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open('/context', '_blank')
                setShowSaveDialog(false)
              }}
              className="h-7 w-7 p-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {savedCompanies.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {savedCompanies.map(company => (
                <Button
                  key={company.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => {
                    switchCompany(company.id)
                    setShowSaveDialog(false)
                  }}
                >
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {company.context.companyWebsite || 'No website'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No saved companies. Click + to add one.
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSaveDialog(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}