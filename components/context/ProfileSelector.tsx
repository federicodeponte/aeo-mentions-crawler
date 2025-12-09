/**
 * Profile Selector Component
 * Dropdown to select and apply context profiles
 * Essential for agencies managing multiple client contexts
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Play, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { containerPadding, textSizes } from '@/lib/utils/responsive-utils'

interface ContextProfile {
  id: string
  name: string
  description?: string
  usage_count: number
  last_used_at?: string
  is_default: boolean
}

interface ProfileSelectorProps {
  onApplyProfile: (profileId: string) => Promise<void>
  onSaveAsProfile: () => void
  onCreateProfile: () => void
  currentProfileId?: string
  className?: string
}

export function ProfileSelector({
  onApplyProfile,
  onSaveAsProfile,
  onCreateProfile,
  currentProfileId,
  className
}: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<ContextProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/context-profiles')
      if (!response.ok) {
        throw new Error('Failed to fetch profiles')
      }
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Failed to load context profiles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyProfile = async (profileId: string) => {
    try {
      setIsApplying(profileId)
      await onApplyProfile(profileId)
      
      // Refresh profiles to update usage stats
      await fetchProfiles()
      
      toast.success('Profile applied successfully')
    } catch (error) {
      console.error('Error applying profile:', error)
      toast.error('Failed to apply profile')
    } finally {
      setIsApplying(null)
    }
  }

  const formatLastUsed = (lastUsedAt?: string) => {
    if (!lastUsedAt) return 'Never used'
    
    const date = new Date(lastUsedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Used today'
    if (diffDays === 1) return 'Used yesterday'
    if (diffDays < 7) return `Used ${diffDays} days ago`
    if (diffDays < 30) return `Used ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  const currentProfile = profiles.find(p => p.id === currentProfileId)

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-8 sm:h-9 bg-muted rounded-md" />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "justify-between w-full sm:min-w-[200px] md:min-w-[250px]",
              textSizes.xs,
              "h-8 sm:h-9 px-2.5 sm:px-3"
            )}
            disabled={isLoading}
          >
            {currentProfile ? (
              <span className="truncate">
                {currentProfile.name}
                {currentProfile.is_default && (
                  <span className="ml-1 text-[10px] sm:text-xs text-muted-foreground">(default)</span>
                )}
              </span>
            ) : profiles.length > 0 ? (
              <span className="text-muted-foreground hidden sm:inline">Select a profile...</span>
            ) : (
              <span className="text-muted-foreground hidden sm:inline">No profiles yet</span>
            )}
            {!currentProfile && (
              <span className="text-muted-foreground sm:hidden">Profile</span>
            )}
            <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className={cn(
            "w-72 sm:w-80 md:w-96",
            containerPadding.xs
          )}
        >
          {profiles.length > 0 ? (
            <>
              {profiles.map(profile => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => handleApplyProfile(profile.id)}
                  disabled={isApplying === profile.id}
                  className={cn(
                    "flex items-start justify-between",
                    containerPadding.xs,
                    "py-2.5 sm:py-3"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className={cn(
                        "font-medium truncate",
                        textSizes.xs
                      )}>
                        {profile.name}
                        {profile.is_default && (
                          <span className="ml-1 text-[10px] sm:text-xs text-blue-500">(default)</span>
                        )}
                      </span>
                      {isApplying === profile.id && (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                    </div>
                    
                    {profile.description && (
                      <p className={cn(
                        "text-muted-foreground mt-1 truncate",
                        "text-[10px] sm:text-xs"
                      )}>
                        {profile.description}
                      </p>
                    )}
                    
                    <div className={cn(
                      "flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-muted-foreground",
                      "text-[9px] sm:text-xs"
                    )}>
                      <span>Used {profile.usage_count} time{profile.usage_count !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span className="truncate">{formatLastUsed(profile.last_used_at)}</span>
                    </div>
                  </div>
                  
                  {currentProfile?.id !== profile.id && (
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 ml-1.5 sm:ml-2 opacity-50 flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : (
            <DropdownMenuItem disabled className="text-center py-3 sm:py-4">
              <span className={cn("text-muted-foreground", textSizes.xs)}>
                No profiles created yet
              </span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={onSaveAsProfile} 
            className={cn(
              "flex items-center gap-1.5 sm:gap-2",
              containerPadding.xs,
              "py-2 sm:py-2.5"
            )}
          >
            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className={textSizes.xs}>
              <span className="hidden sm:inline">Save Current as Profile...</span>
              <span className="sm:hidden">Save as Profile...</span>
            </span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={onCreateProfile} 
            className={cn(
              "flex items-center gap-1.5 sm:gap-2",
              containerPadding.xs,
              "py-2 sm:py-2.5"
            )}
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className={textSizes.xs}>
              <span className="hidden sm:inline">Create New Profile...</span>
              <span className="sm:hidden">New Profile...</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}