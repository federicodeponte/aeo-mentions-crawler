/**
 * Save Profile Dialog Component
 * Modal dialog to save current context as a reusable profile
 */

'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'

interface SaveProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  currentContext: any // The current form data to save as profile
}

export function SaveProfileDialog({
  isOpen,
  onClose,
  onSaved,
  currentContext
}: SaveProfileDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false
  })

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Profile name is required')
      return
    }

    try {
      setIsSaving(true)
      
      const profileData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_default: formData.is_default,
        
        // Map current context to profile fields
        tone: currentContext.tone || undefined,
        value_proposition: currentContext.valueProposition || undefined,
        product_description: currentContext.productDescription || undefined,
        company_name: currentContext.companyName || undefined,
        company_website: currentContext.companyWebsite || undefined,
        target_countries: currentContext.targetCountries || undefined,
        target_industries: currentContext.targetIndustries || undefined,
        icp: currentContext.icp || undefined,
        countries: currentContext.countries || [],
        products: currentContext.products || [],
        marketing_goals: currentContext.marketingGoals || [],
        competitors: currentContext.competitors || undefined,
        target_keywords: currentContext.targetKeywords || [],
        competitor_keywords: currentContext.competitorKeywords || [],
        gtm_playbook: currentContext.gtmPlaybook || undefined,
        product_type: currentContext.productType || undefined,
        compliance_flags: currentContext.complianceFlags || undefined,
        legal_entity: currentContext.legalEntity || undefined,
        vat_number: currentContext.vatNumber || undefined,
        registration_number: currentContext.registrationNumber || undefined,
        contact_email: currentContext.contactEmail || undefined,
        contact_phone: currentContext.contactPhone || undefined,
        linkedin_url: currentContext.linkedInUrl || undefined,
        twitter_url: currentContext.twitterUrl || undefined,
        github_url: currentContext.githubUrl || undefined,
      }

      const response = await fetch('/api/context-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save profile')
      }

      toast.success('Profile saved successfully')
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        is_default: false
      })
      
      onSaved()
      onClose()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error(error.message || 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setFormData({
        name: '',
        description: '',
        is_default: false
      })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "w-[95vw] max-w-[425px] sm:w-full",
        "max-h-[90vh] overflow-y-auto",
        containerPadding.xs
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            "flex items-center gap-1.5 sm:gap-2",
            textSizes.sm
          )}>
            <Save className="h-4 w-4 sm:h-5 sm:w-5" />
            Save as Profile
          </DialogTitle>
          <DialogDescription className={cn(
            textSizes.xs,
            "text-muted-foreground"
          )}>
            Save your current business context as a reusable profile for future projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label 
              htmlFor="profile-name" 
              className={cn("font-medium", textSizes.xs)}
            >
              Profile Name *
            </Label>
            <Input
              id="profile-name"
              placeholder="e.g., SaaS Startup, E-commerce Client"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              maxLength={100}
              disabled={isSaving}
              className={cn(textSizes.xs, "h-8 sm:h-9")}
            />
            <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
              {formData.name.length}/100 characters
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label 
              htmlFor="profile-description" 
              className={cn("font-medium", textSizes.xs)}
            >
              Description
            </Label>
            <Textarea
              id="profile-description"
              placeholder="Brief description of when to use this profile..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
              disabled={isSaving}
              className={cn(textSizes.xs, "min-h-[60px] sm:min-h-[80px]")}
            />
            <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
              {formData.description.length}/500 characters
            </p>
          </div>

          <div className="flex items-start sm:items-center space-x-2">
            <Checkbox
              id="is-default"
              checked={formData.is_default}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_default: !!checked }))
              }
              disabled={isSaving}
              className="mt-0.5 sm:mt-0"
            />
            <div className="space-y-1">
              <Label 
                htmlFor="is-default" 
                className={cn("font-medium cursor-pointer", textSizes.xs)}
              >
                Set as default profile
              </Label>
              <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                Default profile will be automatically applied to new projects.
              </p>
            </div>
          </div>
        </div>

        <div className={cn(
          "flex flex-col sm:flex-row justify-end gap-2 sm:gap-3",
          "pt-3 sm:pt-0"
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className={cn(
              "sm:order-1 order-2",
              textSizes.xs,
              "h-8 sm:h-9"
            )}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className={cn(
              "sm:order-2 order-1",
              textSizes.xs,
              "h-8 sm:h-9"
            )}
          >
            {isSaving ? (
              <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-1.5 sm:mr-2" />
            ) : (
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}