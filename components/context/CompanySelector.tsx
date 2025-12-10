'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [newCompanyName, setNewCompanyName] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  // Load saved companies from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPANIES_STORAGE_KEY)
      if (stored) {
        const companies = JSON.parse(stored)
        setSavedCompanies(companies)
        
        // Find current company based on context
        const currentCompany = companies.find((c: SavedCompany) => 
          c.context.companyName === businessContext.companyName
        )
        if (currentCompany) {
          setSelectedCompanyId(currentCompany.id)
        }
      }
    } catch (error) {
      console.error('Failed to load saved companies:', error)
    }
  }, [businessContext.companyName])

  const saveCurrentCompany = () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name')
      return
    }

    const newCompany: SavedCompany = {
      id: Date.now().toString(),
      name: newCompanyName.trim(),
      context: businessContext,
      createdAt: new Date().toISOString()
    }

    const updatedCompanies = [...savedCompanies, newCompany]
    setSavedCompanies(updatedCompanies)
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(updatedCompanies))
    
    setSelectedCompanyId(newCompany.id)
    setShowSaveDialog(false)
    setNewCompanyName('')
    toast.success(`Company "${newCompany.name}" saved`)
  }

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
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">
            Company Context
          </Label>
        </div>
        <span className="text-xs text-muted-foreground">
          {savedCompanies.length} saved
        </span>
      </div>

      <div className="flex gap-2">
        <Select value={selectedCompanyId || 'none'} onValueChange={switchCompany}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={currentCompanyName} />
          </SelectTrigger>
          <SelectContent>
            {savedCompanies.length === 0 ? (
              <SelectItem value="none" disabled>
                No saved companies
              </SelectItem>
            ) : (
              savedCompanies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{company.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {company.context.companyWebsite || 'No website'}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="px-3"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Save Company Dialog */}
      {showSaveDialog && (
        <div className="border border-border rounded-lg p-3 bg-background/50 space-y-3">
          <Label htmlFor="company-name" className="text-xs font-medium">
            Save current context as:
          </Label>
          <div className="flex gap-2">
            <Input
              id="company-name"
              placeholder="Company name..."
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveCurrentCompany()
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false)
                }
              }}
              className="flex-1 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={saveCurrentCompany}>
              Save
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Current Company Info */}
      <div className="text-xs text-muted-foreground bg-background/30 rounded p-2">
        <div className="font-medium">{businessContext.companyName || 'SCAILE'}</div>
        {businessContext.companyWebsite && (
          <div className="truncate">{businessContext.companyWebsite}</div>
        )}
        {businessContext.icp && (
          <div className="line-clamp-2 mt-1">{businessContext.icp}</div>
        )}
      </div>
    </div>
  )
}